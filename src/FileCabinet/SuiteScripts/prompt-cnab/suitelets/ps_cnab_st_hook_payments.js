/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/search', 'N/record', 'N/task', 'N/format'],
    function (search, record, task, format) {

        function onRequest(context) {

            const requestBody = JSON.parse(context.request.body)
            const uniqueId = requestBody.uniqueId
            const statusReturn = requestBody.status

            if (statusReturn === 'PAID') {

                const paidOccurrence = requestBody.ocurrences.find(function (ocurrence) { return ocurrence.message == "PAGAMENTO EFETUADO" })
                const paidDate = new Date(paidOccurrence.ocurrenceDate)

                var psPayment = search.create({
                    type: 'customrecord_ps_payment',
                    filters: [{
                        name: 'custrecord_ps_pay_id',
                        operator: search.Operator.IS,
                        values: uniqueId
                    }],
                    columns: [
                        { name: 'custrecord_ps_pay_subsidiary' },
                        { name: 'custrecord_ps_pay_entity' },
                        { name: 'custrecord_ps_pay_transaction' },
                        { name: 'custrecord_ps_pay_installment' },
                        { name: 'custrecord_ps_pay_amount' },
                        { name: 'internalid' },
                    ]
                })
                    .run()
                    .getRange({
                        start: 0,
                        end: 1
                    })
                    .reduce(function (acc, result) {
                        const columns = result.columns
                        acc.subsidiary = result.getValue(columns[0])
                        acc.vendor = result.getValue(columns[1])
                        acc.vendorBillId = result.getValue(columns[2])
                        acc.installmentNumber = result.getValue(columns[3])
                        acc.payAmount = result.getValue(columns[4])
                        acc.payId = result.getValue(columns[5])
                        return acc
                    }, {})

                log.debug('WebHook', 'ID: ' + uniqueId + ' Vendor Bill: ' + psPayment.vendorBillId)

                var psPayRecord = record.load({
                    type: 'customrecord_ps_payment',
                    id: psPayment.payId,
                    isDynamic: false,
                });

                if (psPayRecord.getValue('custrecord_ps_pay_status') !== '2') {

                    const vendorPayment = record.transform({
                        fromType: record.Type.VENDOR_BILL,
                        fromId: psPayment.vendorBillId,
                        toType: record.Type.VENDOR_PAYMENT,
                        isDynamic: true
                    })

                    var tempForecastAccount = search.create({
                        type: 'customrecord_sit_parcela',
                        filters: [
                            {
                                name: 'custrecord_sit_parcela_l_transacao',
                                operator: search.Operator.IS,
                                values: psPayment.vendorBillId
                            },
                            {
                                name: 'custrecord_sit_parcela_i_numero',
                                operator: search.Operator.IS,
                                values: psPayment.installmentNumber
                            },
                        ],
                        columns: [
                            {
                                name: 'custrecord_sit_parcela_l_conta_prev'
                            }
                        ]
                    })
                        .run()
                        .getRange({
                            start: 0,
                            end: 1
                        })
                        .reduce(function (acc, result) {
                            return result.getValue(result.columns[0])
                        }, '')

                    const forecastAccountId = tempForecastAccount

                    var paidParcel = search.create({
                        type: 'customrecord_sit_parcela',
                        filters: [
                            {
                                name: 'custrecord_sit_parcela_l_transacao',
                                operator: search.Operator.IS,
                                values: psPayment.vendorBillId
                            },
                            {
                                name: 'custrecord_sit_parcela_i_numero',
                                operator: search.Operator.IS,
                                values: psPayment.installmentNumber
                            },
                        ],
                        columns: [
                            { name: 'internalid' },
                        ]
                    })
                        .run()
                        .getRange({
                            start: 0,
                            end: 1
                        })
                        .reduce(function (acc, result) {
                            return result.getValue(result.columns[0])
                        }, '')

                    const paidParcelRecordType = 'customrecord_sit_parcela_qui'
                    const paidParcelBatch = record.create({ type: paidParcelRecordType })
                    paidParcelBatch.setValue({ fieldId: 'custrecord_sit_parcela_qui_l_tran_pag', value: psPayment.vendorBillId })
                    paidParcelBatch.setValue({ fieldId: 'custrecord_sit_parcela_qui_l_parcela', value: paidParcel })
                    paidParcelBatch.setValue({ fieldId: 'custrecord_sit_parcela_qui_n_valor_pago', value: psPayment.payAmount })
                    paidParcelBatch.setValue({ fieldId: 'custrecord_sit_parcela_qui_d_data_pag', value: paidDate })
                    paidParcelBatch.setValue({ fieldId: 'custrecord_sit_parcela_qui_t_efetivado', value: 'S' })
                    paidParcelBatch.setValue({ fieldId: 'custrecord_sit_parcela_qui_t_chave_tran', value: uniqueId })
                    const paidParcelBatchId = paidParcelBatch.save()

                    vendorPayment.setValue({ fieldId: 'account', value: forecastAccountId })

                    const applySublistId = 'apply'
                    const applyCount = vendorPayment.getLineCount({ sublistId: applySublistId })
                    //            var installmentFound, dueDate

                    //            installmentFound = false

                    for (var i = 0; i < applyCount; i++) {
                        vendorPayment.selectLine({ sublistId: applySublistId, line: i })
                        var applied = vendorPayment.getCurrentSublistValue({ sublistId: applySublistId, fieldId: 'apply' })

                        if (!applied) continue

                        vendorPayment.setCurrentSublistValue({ sublistId: applySublistId, fieldId: 'apply', value: true })
                        vendorPayment.setCurrentSublistValue({ sublistId: applySublistId, fieldId: 'amount', value: psPayment.payAmount })

                    }

                    vendorPayment.setValue({ fieldId: 'trandate', value: paidDate })
                    vendorPayment.setValue({ fieldId: 'approvalstatus', value: 2 }) // Approved
                    vendorPayment.setValue({ fieldId: 'custbody_ps_pay_van', value: true })

                    vendorPayment.save({ ignoreMandatoryFields: true })

                    psPayRecord.setValue({
                        fieldId: 'custrecord_ps_pay_status',
                        value: 2,
                    })
                    psPayRecord.save()

                    try {
                        task.create({
                            taskType: task.TaskType.SCHEDULED_SCRIPT,
                            scriptId: 'customscript_ps_sc_payproof_van',
                            deploymentId: 'customdeploy_ps_sc_payproof_van',
                            params: {
                                custscript_ps_sc_subsidiary: psPayment.subsidiary,
                                custscript_ps_sc_vendorBillId: psPayment.vendorBillId,
                            }
                        })
                    } catch (error) {
                        log.debug(`ERROR VAN - ERRO: ${error}`)
                    }

                }
            } else {
                // Outras mensagens 
                var psPaymentRefusedId = search.create({
                    type: 'customrecord_ps_payment',
                    filters: [{
                        name: 'custrecord_ps_pay_id',
                        operator: search.Operator.IS,
                        values: uniqueId
                    }],
                    columns: [
                        { name: 'internalid' },
                    ]
                })
                    .run()
                    .getRange({
                        start: 0,
                        end: 1
                    })
                    .reduce(function (acc, result) {
                        return result.getValue(result.columns[0])
                    }, '')

                var psPayRecord = record.load({
                    type: 'customrecord_ps_payment',
                    id: psPaymentRefusedId,
                    isDynamic: false,
                });

                psPayRecord.setValue({
                    fieldId: 'custrecord_ps_pay_errors',
                    value: JSON.stringify(requestBody.ocurrences),
                })
                psPayRecord.setValue({
                    fieldId: 'custrecord_ps_pay_status',
                    value: 5,
                })

                psPayRecord.save()
            }
            return { "message": "ok" }
        }
        return {
            onRequest: onRequest
        };
    });
