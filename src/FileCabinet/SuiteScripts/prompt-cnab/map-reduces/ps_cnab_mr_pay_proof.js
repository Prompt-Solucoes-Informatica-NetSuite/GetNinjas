/**
 *@NApiVersion 2.1
 *@NScriptType MapReduceScript
 */
define(['N/runtime', 'N/record', 'N/url', 'N/search', '../modules/tecnospeed/index'],
    function (runtime, record, url, search, Tecnospeed) {

        function getInputData() {
            log.debug('entrei no script')
            const params = _getPaymentReturn()
            const paymentReturn = JSON.parse(params)
            const billReferencesText = paymentReturn.payment.tags[0].split('#')[1]
            const billReferences = billReferencesText.split('/')
            const vendorBillId = billReferences[0]

            const vendorFields = search.lookupFields({
                type: 'vendorbill',
                id: vendorBillId,
                columns: ['custbody_o2s_parcela_l_tp_servico', 'externalid']
            })

            const subsidiaryId = search.lookupFields({
                type: 'customrecord_ps_payment_return',
                id: parseInt(paymentReturn.paymentReturnId),
                columns: ['custrecord_ps_prt_subsidiary']
            }).custrecord_ps_prt_subsidiary

            const subsidiaryCpfCnpj = search.lookupFields({
                type: search.Type.SUBSIDIARY,
                id: subsidiaryId[0].value,
                columns: ['custrecord_psg_br_cnpj']
            }).custrecord_psg_br_cnpj


            const tecnospeedApi = new Tecnospeed()
            const paymentApi = tecnospeedApi.Payment({ cpfCnpj: subsidiaryCpfCnpj })
            const paymentApiResponse = paymentApi.fetchPaymentReturn(paymentReturn.payment.uniqueId)
            const bankAccountFields = _fetchBankAccountByAccountHash(paymentApiResponse.accountHash)
            const bank = _fetchNameBankByCode(paymentApiResponse.beneficiary.bankCode)
            const cnpjWithoutMask = subsidiaryCpfCnpj.replace(/[^\d]+/g, '')
            const serviceType = vendorFields.custbody_o2s_parcela_l_tp_servico[0].text
            const externalId = vendorFields.externalid[0].value

            log.debug('bank', bank)
            log.debug('serviceType', serviceType)
            log.debug('externalId', externalId)

            const paymentProof = {
                custrecord_ps_cnab_pay_payer_cnpj: cnpjWithoutMask,
                custrecord_ps_cnab_pay_payer_legalname: subsidiaryId[0].text,
                custrecord_ps_cnab_pay_payer_bank: bankAccountFields[0].bank,
                custrecord_ps_cnab_pay_payer_agency: bankAccountFields[0].agency,
                custrecord_ps_cnab_pay_payer_agencydigit: bankAccountFields[0].agencyDigit,
                custrecord_ps_cnab_pay_payer_chec_acc: bankAccountFields[0].account,
                custrecord_ps_cnab_payer_account_digit: bankAccountFields[0].accountDigit,
                custrecord_ps_cnab_beneficiary_cpfcnpj: paymentApiResponse.beneficiary.cpfCnpj,
                custrecord_ps_cnab_pay_beneficiary_name: paymentApiResponse.beneficiary.name,
                custrecord_ps_cnab_pay_payment_form: paymentApiResponse.paymentType === 1 ? 'TRANSFERÊNCIA' : 'BOLETO', //paymentFormAPI[0].name,
                custrecord_ps_cnab_pay_ticket_type: serviceType, //ajustar
                custrecord_ps_cnab_pay_payment_type: bankAccountFields[0].accountType,
                custrecord_ps_cnab_pay_digitable_line: paymentApiResponse.barcode || null,
                custrecord_ps_cnab_pay_paydate: paymentApiResponse.paymentDate || '',
                custrecord_ps_cnab_pay_discount: paymentApiResponse.discountAmount || null,
                custrecord_ps_cnab_pay_amount_paid: paymentApiResponse.amount || null,
                custrecord_ps_cnab_pay_interest_fine: paymentApiResponse.interestAmount || null,
                custrecord_ps_cnab_pay_bank: bank[0].bank || null, // tratar	
                custrecord_ps_cnab_pay_bene_agency: paymentApiResponse.beneficiary.agency || null,
                custrecord_ps_cnab_pay_agency_digit: paymentApiResponse.beneficiary.agencyDigit || null,
                custrecord_ps_cnab_pay_account: paymentApiResponse.beneficiary.accountNumber || null,
                custrecord_ps_cnab_pay_account_digit: paymentApiResponse.beneficiary.accountNumberDigit || null,
                custrecord_ps_canb_pay_aut_register: paymentApiResponse.authenticationRegister || null,
                custrecord_ps_cnab_pay_external_id: externalId,
                custrecord_ps_cnab_pay_transaction: vendorBillId
            }

            log.debug('antes do map', paymentProof)

            return [paymentProof]
        }

        function map(context) {
            const payment = JSON.parse(context.value)
            const cDate = new Date(payment.custrecord_ps_cnab_pay_paydate)
            const cDate2 = new Date(cDate.getFullYear(), cDate.getMonth(), cDate.getDate() + 1)

            log.debug('payment', payment)

            const recordPaymentProof = record.create({ type: 'customrecord_ps_cnab_pay_proof' })
            recordPaymentProof.setValue({ fieldId: 'custrecord_ps_cnab_pay_payer_cnpj', value: payment.custrecord_ps_cnab_pay_payer_cnpj })
            recordPaymentProof.setValue({ fieldId: 'custrecord_ps_cnab_pay_payer_legalname', value: payment.custrecord_ps_cnab_pay_payer_legalname })
            recordPaymentProof.setValue({ fieldId: 'custrecord_ps_cnab_pay_payer_bank', value: payment.custrecord_ps_cnab_pay_payer_bank })
            recordPaymentProof.setValue({ fieldId: 'custrecord_ps_cnab_pay_payer_agency', value: payment.custrecord_ps_cnab_pay_payer_agency })
            recordPaymentProof.setValue({ fieldId: 'custrecord_ps_cnab_pay_payer_agencydigit', value: payment.custrecord_ps_cnab_pay_payer_agencydigit })
            recordPaymentProof.setValue({ fieldId: 'custrecord_ps_cnab_pay_payer_chec_acc', value: payment.custrecord_ps_cnab_pay_payer_chec_acc })
            recordPaymentProof.setValue({ fieldId: 'custrecord_ps_cnab_payer_account_digit', value: payment.custrecord_ps_cnab_payer_account_digit })
            recordPaymentProof.setValue({ fieldId: 'custrecord_ps_cnab_beneficiary_cpfcnpj', value: payment.custrecord_ps_cnab_beneficiary_cpfcnpj })
            recordPaymentProof.setValue({ fieldId: 'custrecord_ps_cnab_pay_beneficiary_name', value: payment.custrecord_ps_cnab_pay_beneficiary_name })
            recordPaymentProof.setValue({ fieldId: 'custrecord_ps_cnab_pay_payment_form', value: payment.custrecord_ps_cnab_pay_payment_form })
            // recordPaymentProof.setValue({ fieldId: 'custrecord_ps_cnab_pay_ticket_type', value: payment.custrecord_ps_cnab_pay_ticket_type })
            recordPaymentProof.setValue({ fieldId: 'custrecord_ps_cnab_pay_payment_type', value: payment.custrecord_ps_cnab_pay_payment_type })
            recordPaymentProof.setValue({ fieldId: 'custrecord_ps_cnab_pay_digitable_line', value: payment.custrecord_ps_cnab_pay_digitable_line })
            recordPaymentProof.setValue({ fieldId: 'custrecord_ps_cnab_pay_paydate', value: cDate2 })
            recordPaymentProof.setValue({ fieldId: 'custrecord_ps_cnab_pay_discount', value: payment.custrecord_ps_cnab_pay_discount })
            recordPaymentProof.setValue({ fieldId: 'custrecord_ps_cnab_pay_amount_paid', value: payment.custrecord_ps_cnab_pay_amount_paid })
            recordPaymentProof.setValue({ fieldId: 'custrecord_ps_cnab_pay_interest_fine', value: payment.custrecord_ps_cnab_pay_interest_fine })
            recordPaymentProof.setValue({ fieldId: 'custrecord_ps_cnab_pay_bank', value: payment.custrecord_ps_cnab_pay_bank })
            recordPaymentProof.setValue({ fieldId: 'custrecord_ps_cnab_pay_bene_agency', value: payment.custrecord_ps_cnab_pay_bene_agency })
            recordPaymentProof.setValue({ fieldId: 'custrecord_ps_cnab_pay_agency_digit', value: payment.custrecord_ps_cnab_pay_agency_digit })
            recordPaymentProof.setValue({ fieldId: 'custrecord_ps_cnab_pay_account', value: payment.custrecord_ps_cnab_pay_account })
            recordPaymentProof.setValue({ fieldId: 'custrecord_ps_cnab_pay_account_digit', value: payment.custrecord_ps_cnab_pay_account_digit })
            recordPaymentProof.setValue({ fieldId: 'custrecord_ps_canb_pay_aut_register', value: payment.custrecord_ps_canb_pay_aut_register })
            recordPaymentProof.setValue({ fieldId: 'custrecord_ps_cnab_pay_external_id', value: payment.custrecord_ps_cnab_pay_external_id })
            recordPaymentProof.setValue({ fieldId: 'custrecord_ps_cnab_pay_transaction', value: payment.custrecord_ps_cnab_pay_transaction })
            recordPaymentProof.save()

            log.debug('recordPaymentProof', recordPaymentProof)

        }

        function summarize(summary) {
            return null
        }

        /**
        * Get payment return.
        *
        * @returns {string}
        * @private
        */
        function _getPaymentReturn() {
            log.debug('entrei')
            return runtime.getCurrentScript().getParameter({ name: 'custscript_ps_cnab_mr_pay_proof' })
        }

        /**
         * Fetch bank accounts by subsidiary.
         *
         * @param accountHash
         * @returns {{name: string, id: number}[]}
         * @private
         */
        function _fetchBankAccountByAccountHash(accountHash) {
            return search.create({
                type: 'customrecord_ps_bank_account',
                filters: [{
                    name: 'custrecord_ps_bac_id_payment',
                    operator: search.Operator.IS,
                    values: accountHash
                }, {
                    name: 'isinactive',
                    operator: search.Operator.IS,
                    values: false
                }],
                columns: [
                    { name: 'custrecord_ps_bac_bank' },
                    { name: 'custrecord_ps_bac_agency_number' },
                    { name: 'custrecord_ps_bac_account_number' },
                    { name: 'custrecord_ps_bac_acctype' },
                    { name: 'custrecord_ps_bac_agency_digit' },
                    { name: 'custrecord_ps_bac_account_digit' },
                ]
            })
                .run()
                .getRange({
                    start: 0,
                    end: 1
                })
                .map(function (result) {
                    return {
                        id: result.id,
                        bank: result.getText(result.columns[0]),
                        agency: result.getValue(result.columns[1]),
                        account: result.getValue(result.columns[2]),
                        accountType: result.getText(result.columns[3]),
                        agencyDigit: result.getText(result.columns[4]),
                        accountDigit: result.getText(result.columns[5])
                    }
                })
        }
        /**
         * Fetch name bank by code.
         *
         * @param codeBank
         * @returns {{name: string, id: number}[]}
         * @private
         */
        function _fetchNameBankByCode(codeBank) {
            return search.create({
                type: 'customrecord_ps_bank',
                filters: [{
                    name: 'custrecord_ps_ban_code',
                    operator: search.Operator.IS,
                    values: codeBank
                }],
                columns: [
                    { name: 'name' },
                ]
            })
                .run()
                .getRange({
                    start: 0,
                    end: 1
                })
                .map(function (result) {
                    return {
                        bank: result.getValue(result.columns[0]),
                    }
                })
        }

        return {
            getInputData: getInputData,
            map: map,
            summarize: summarize
        }
    });