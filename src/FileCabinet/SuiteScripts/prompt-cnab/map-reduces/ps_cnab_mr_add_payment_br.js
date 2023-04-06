/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
define(['N/runtime', 'N/search', 'N/record', 'N/util', '../modules/payment-batch-dao', '../modules/payment-dao', '../modules/tecnospeed/index'],
  function (runtime, search, record, util, paymentBatchDAO, paymentDAO, Tecnospeed) {
    /**
     * Marks the beginning of the Map/Reduce process and generates input data.
     *
     * @typedef {Object} ObjectRef
     * @property {number} id - Internal ID of the record instance
     * @property {string} type - Record type id
     *
     * @return {Array|Object|Search|RecordRef} inputSummary
     * @since 2015.1
     */
    function getInputData() {
      const paymentBatchId = _getPaymentBatchId()
      log.debug('paymentBatchId', paymentBatchId)
      const paymentBatchColumns = [
        'custrecord_ps_pab_installments'
      ]

      const paymentBatchValues = search.lookupFields({
        type: 'customrecord_ps_payment_batch',
        id: paymentBatchId,
        columns: paymentBatchColumns
      })

      const installments = JSON.parse(paymentBatchValues[paymentBatchColumns[0]])

      return installments.map(function (installment) {
        return {
          installment: installment,
          paymentBatchId: paymentBatchId
        }
      })
    }

    /**
     * Executes when the map entry point is triggered and applies to each key/value pair.
     *
     * @param {MapSummary} context - Data collection containing the key/value pairs to process through the map stage
     * @since 2015.1
     */
    function map(context) {
      const data = JSON.parse(context.value)
      const installment = data.installment
      const transactionId = installment[0]
      const installmentNumber = installment[1]
      const paymentAmount = installment[2]
      const paymentDiscount = installment[3]
      const paymentInterest = installment[4]

      const payment = search.create({
        type: search.Type.TRANSACTION,
        filters: [{
          name: 'internalid',
          operator: search.Operator.ANYOF,
          values: transactionId
        }, {
          name: 'custrecord_sit_parcela_i_numero', //'installmentnumber',
          join: 'custrecord_sit_parcela_l_transacao', //'installment',  ???
          operator: search.Operator.EQUALTO,
          values: installmentNumber
        }, {
          name: 'mainline',
          operator: search.Operator.IS,
          values: true
        }],
        columns: [
          { name: 'formulatext', formula: "TO_CHAR({custrecord_sit_parcela_l_transacao.custrecord_sit_parcela_d_dt_vencimen}, 'YYYY-MM-DD')" }, //0 installment.duedate
          { name: 'formulatext', formula: "TO_CHAR({custrecord_sit_parcela_l_transacao.custrecord_sit_parcela_d_dt_vencimen}, 'YYYY-MM-DD')" }, //1 installment.duedate
          { name: 'formulanumeric', formula: '{custrecord_sit_parcela_l_transacao.custrecord_sit_parcela_n_valor} - NVL({custrecord_sit_parcela_l_transacao.custrecord_sit_parcela_n_vl_pago}, 0)' },
          { name: 'entity' }, //3 entity
          { name: 'legalname', join: 'vendor' }, //4 custentity_enl_legalname, join: 'vendor' 
          { name: 'custentity_psg_br_cnpj', join: 'vendor' }, //5 custentity_enl_cnpjcpf, join: 'vendor' 

          { name: 'address1', join: 'billingaddress' }, //6 address3, join: 'billingaddress'
          { name: 'custrecord_sit_address_i_numero', join: 'billingaddress' }, //7  custrecord_enl_numero, join: 'billingaddress' 
          { name: 'custrecord_sit_address_complemento', join: 'billingaddress' }, //8  address2, join: 'billingaddress' 
          { name: 'custrecord_o2g_address_l_mun', join: 'billingaddress' }, //9  custrecord_enl_city, join: 'billingaddress'
          { name: 'state', join: 'billingaddress' }, //10  custrecord_enl_uf, join: 'billingaddress'
          { name: 'zip', join: 'billingaddress' }, //11  zip, join: 'billingaddress'

          { name: 'custrecord_psg_br_cnpj', join: 'subsidiary' }, //12 custrecord_ps_subsidiary_cnpj, join: 'subsidiary' 
          { name: 'custrecord_o2s_parcela_t_lin_dig_boleto', join: 'custrecord_sit_parcela_l_transacao' }, //13  custrecord_ps_cnab_barcode, join: 'installment'

          { name: 'custrecord_sit_parcela_l_conta_prev', join: 'custrecord_sit_parcela_l_transacao' }, //14  custrecord_ps_bac_id_payment , join: 'custbody_ps_cnab_forecast_bank_account'
          { name: 'custbody_o2s_transaction_l_meio_pgto' }, //15 custrecord_ps_paf_code, join: 'custbody_ps_cnab_payment_form'
          { name: 'custbody_o2s_parcela_l_tp_servico' }, //16 custrecord_ps_pat_code join: 'custbody_ps_cnab_payment_type'
          { name: 'custbody_o2s_parcela_l_camara_central' }, //17 custrecord_ps_com_code join: 'custbody_ps_cnab_compensation' 

          { name: 'custentity_o2s_t_conta_corrente_favor', join: 'vendor' }, //18  custbody_ps_cnab_vendor_bank_account
          { name: 'custentity_sit_l_opt_simples', join: 'vendor' }, //19  custentity_enl_mei, join: 'vendor' 

          { name: 'custentity_psg_br_cpf', join: 'vendor' }, //20  novo 

        ]
      })
        .run()
        .getRange({
          start: 0,
          end: 1
        })
        .reduce(function (acc, result) {
          const columns = result.columns
          
          //campo 14  - converter para campos do cnab ==> custrecord_ps_bac_id_payment , join: 'custbody_ps_cnab_forecast_bank_account'
          var tempHash = search.create({
            type: 'customrecord_ps_bank_account',
            filters: [{
              name: 'custrecord_ps_bac_account',
              operator: search.Operator.IS,
              values: result.getValue(columns[14])
            },
            {
              name: 'isinactive',
              operator: search.Operator.IS,
              values: "F"
            }],
            columns: [{
              name: 'custrecord_ps_bac_id_payment'
            }]
          })
            .run()
            .getRange({
              start: 0,
              end: 1
            })
            .reduce(function (acc, result) {
              return result.getValue(result.columns[0]) // ??? acc + result.id
            }, '')

          acc.accountHash = tempHash  //result.getValue(columns[14])
          // campo 14

          //campo 15 - converter para campos do cnab ==> custrecord_ps_paf_code, join: 'custbody_ps_cnab_payment_form'
          var tempPaymentForm = search.create({
            type: 'customrecord_ps_payment_form',
            filters: [{
              name: 'custrecord_ps_paf_code_br', // criado
              operator: search.Operator.IS,
              values: result.getValue(columns[15])
            }],
            columns: [{
              name: 'custrecord_ps_paf_code'
            }]
          })
            .run()
            .getRange({
              start: 0,
              end: 1
            })
            .reduce(function (acc, result) {
              return result.getValue(result.columns[0]) // ??? acc + result.id
            }, '')

          acc.paymentForm = tempPaymentForm //result.getValue(columns[15])
          // campo 15

          // campo 17 converter Câmara Centralizadora para Compensação
          var tempCompensat = search.create({
            type: 'customrecord_ps_compensation_br',
            filters: [{
              name: 'custrecord_ps_camara_central',
              operator: search.Operator.IS,
              values: result.getValue(columns[17])
            }],
            columns: [{
              name: 'custrecord_ps_compensation'
            }]
          })
            .run()
            .getRange({
              start: 0,
              end: 1
            })
            .reduce(function (acc, result) {
              return result.getValue(result.columns[0]) // ??? acc + result.id
            }, '')


          acc.paymentDate = result.getValue(columns[0])
          acc.dueDate = result.getValue(columns[1])
          acc.amount = paymentAmount
          acc.nominalAmount = paymentAmount
          acc.discountAmount = paymentDiscount || undefined
          acc.interestAmount = paymentInterest || undefined
          acc.compensation = tempCompensat || undefined
          acc.barcode = result.getValue(columns[13]) || undefined

          const entityId = result.getValue(columns[3])
          const vendorBankAccountId = result.getValue(columns[18])
          const entityMei = result.getValue(columns[19])

          const vendorBankAccount = _fetchVendorBankAccount(entityId, vendorBankAccountId)
          if (entityMei === 7 && vendorBankAccount.meiHolder && vendorBankAccount.meiCpf) {   // id interna 7 = MEI ???
            acc.beneficiary = {
              name: vendorBankAccount.meiHolder,  // Como fica o nome do MEI ??? 
              cpfCnpj: vendorBankAccount.meiCpf,
              neighborhood: result.getValue(columns[6]),
              addressNumber: result.getValue(columns[7]),
              addressComplement: result.getValue(columns[8]),
              city: result.getText(columns[9]),
              state: result.getText(columns[10]),
              zipcode: result.getValue(columns[11]),
              bankCode: vendorBankAccount.bankCode,
              agency: vendorBankAccount.agency,
              agencyDigit: vendorBankAccount.agencyDigit,
              accountNumber: vendorBankAccount.accountNumber,
              accountNumberDigit: vendorBankAccount.accountNumberDigit,
              accountDac: vendorBankAccount.accountDac
            }
          } else {
            acc.beneficiary = {
              name: result.getValue(columns[4]),
              cpfCnpj: result.getValue(columns[5]) || result.getValue(columns[20]),
              neighborhood: result.getValue(columns[6]),
              addressNumber: result.getValue(columns[7]),
              addressComplement: result.getValue(columns[8]),
              city: result.getText(columns[9]),
              state: result.getText(columns[10]),
              zipcode: result.getValue(columns[11]),
              bankCode: vendorBankAccount.bankCode,
              agency: vendorBankAccount.agency,
              agencyDigit: vendorBankAccount.agencyDigit,
              accountNumber: vendorBankAccount.accountNumber,
              accountNumberDigit: vendorBankAccount.accountNumberDigit,
              accountDac: vendorBankAccount.accountDac
            }
          }

          //converter para campos do cnab ==> custrecord_ps_pat_code join: 'custbody_ps_cnab_payment_type'
          var tempPaymentType = search.create({
            type: 'customrecord_ps_payment_type',
            filters: [{
              name: 'custrecord_ps_pat_code_br', // criado
              operator: search.Operator.IS,
              values: result.getValue(columns[15])
            }],
            columns: [{
              name: 'custrecord_ps_pat_code'
            }]
          })
            .run()
            .getRange({
              start: 0,
              end: 1
            })
            .reduce(function (acc, result) {
              return result.getValue(result.columns[0]) // ??? acc + result.id
            }, '')

          // campo 16

          acc.extra = {
            entityId: entityId,
            subsidiaryCpfCnpj: result.getValue(columns[12]),
            paymentType: tempPaymentType // result.getValue(columns[16])
          }

          util.extend(acc.beneficiary, vendorBankAccount)

          acc.tags = [
            'Parcela #' + result.id + '/' + installmentNumber
          ]
          return acc
        }, {})

      const extra = payment.extra
      const entityId = extra.entityId
      const subsidiaryCpfCnpj = extra.subsidiaryCpfCnpj
      const paymentType = extra.paymentType
      delete payment.extra

      const paymentRecordType = 'customrecord_ps_payment'
      const paymentRecord = record.create({ type: paymentRecordType })
      paymentRecord.setValue({ fieldId: 'custrecord_ps_pay_entity', value: entityId })
      paymentRecord.setValue({ fieldId: 'custrecord_ps_pay_transaction', value: transactionId })
      paymentRecord.setValue({ fieldId: 'custrecord_ps_pay_installment', value: installmentNumber })
      paymentRecord.setValue({ fieldId: 'custrecord_ps_pay_amount', value: paymentAmount })
      paymentRecord.setValue({ fieldId: 'custrecord_ps_pay_discount', value: paymentDiscount })
      paymentRecord.setValue({ fieldId: 'custrecord_ps_pay_interest', value: paymentInterest })
      paymentRecord.setValue({ fieldId: 'custrecord_ps_pay_batch', value: data.paymentBatchId })
      const paymentRecordId = paymentRecord.save({ enableSourcing: true })

      delete payment.beneficiary.id

      const tecnospeedApi = new Tecnospeed()
      const paymentApi = tecnospeedApi.Payment({ cpfCnpj: subsidiaryCpfCnpj })

      try {
        const paymentApiResponse = paymentApi.createPayment(paymentType, payment)
        const returnPayment = paymentApi.fetchPaymentReturn(paymentApiResponse.uniqueId)

        record.submitFields({
          type: paymentRecordType,
          id: paymentRecordId,
          values: {
            custrecord_ps_pay_id: paymentApiResponse.uniqueId,
            custrecord_ps_pay_status: paymentDAO.fetchStatusByCode(returnPayment.status)
          }
        })

        const vendorBill = record.load({ type: record.Type.VENDOR_BILL, id: transactionId, isDynamic: true })

        var temp = vendorBill.getValue({
          fieldId: 'custbody_o2s_transaction_a_parcelas'
        })
        const init = temp.search(' /')
        const idParcel = temp.substring(init + 2)

        if (returnPayment.status == 'PAGO') {

          const parcelRecordType = record.load({
            type: 'customrecord_sit_parcela',
            id: idParcel,
            isDynamic: true
          })

          parcelRecordType.setValue({ fieldId: 'custrecord_sit_parcela_n_vl_pago', value: parseFloat(paymentAmount) })

          parcelRecordType.save()
      }
      } catch (e) {
        log.error({ title: 'PROMPT_CREATE_PAYMENT', details: e })
        record.submitFields({
          type: paymentRecordType,
          id: paymentRecordId,
          values: {
            custrecord_ps_pay_errors: JSON.stringify(e)
          }
        })
      }


    }

    /**
     * Executes when the summarize entry point is triggered and applies to the result set.
     *
     * @param {Summary} context - Holds statistics regarding the execution of a map/reduce script
     * @since 2015.1
     */
    function summarize(context) {
      const inputSummaryError = context.inputSummary.error

      if (inputSummaryError) {
        log.error({ title: 'Input Error', details: inputSummaryError })
      }

      context.mapSummary.errors.iterator().each(function (key, error) {
        log.error({ title: 'Map Error for key: ' + key, details: error })
        return true
      })

      const paymentBatchId = _getPaymentBatchId()

      paymentBatchDAO.updateTaskFinished(paymentBatchId, true)
    }

    /**
     * Fetch vendor bank account.
     *
     * @param vendorId
     * @param vendorBankAccountId
     * @returns object
     * @private
     */
    function _fetchVendorBankAccount(vendorId, vendorBankAccountId) {
      const filters = [{
        name: 'internalid',  //'custrecord_ps_bac_vendor_owner', ???
        operator: search.Operator.ANYOF,
        values: vendorId
      }]

      //      if (vendorBankAccountId) {
      //        filters.push({
      //          name: 'internalid',  // Precisa alterar esse ???
      //          operator: search.Operator.ANYOF,
      //          values: vendorBankAccountId
      //        })
      //      }

      return search.create({
        type: search.Type.VENDOR, //'customrecord_ps_bank_account', ???
        filters: filters,
        columns: [
          { name: 'custrecord_o2s_cnab_t_bancos', join: 'custentity_o2s_l_banco_favorecido' }, //'custrecord_ps_bac_bank_code'  
          { name: 'custentity_o2s_t_cod_agencia_favor' }, //'custrecord_ps_bac_agency_number'
          { name: 'custentity_o2s_t_dig_verfic_agencia_cont' }, //'custrecord_ps_bac_agency_digit'
          { name: 'custentity_o2s_t_conta_corrente_favor' }, //'custrecord_ps_bac_account_number'
          { name: 'custentity_o2s_t_digito_verfic_conta' }, //'custrecord_ps_bac_account_digit'
          { name: 'custentity_ps_bac_account_dac' }, //'custrecord_ps_bac_account_dac' --- CRIAR ESSE CAMPO NO VENDOR  
          { name: 'legalname', join: 'custentity_sit_l_vendor_benef' }, //'custrecord_ps_bac_mei_holder' ??? Codi do vendor, nome ?? lookupFields ??
          { name: 'custentity_o2s_t_cpf_mei' } //'custrecord_ps_bac_mei_cpf' 
        ]
      })
        .run()
        .getRange({
          start: 0,
          end: 1
        })
        .reduce(function (acc, result) {
          const columns = result.columns
          acc.bankCode = result.getValue(columns[0])
          acc.agency = result.getValue(columns[1])
          acc.agencyDigit = result.getValue(columns[2])
          acc.accountNumber = result.getValue(columns[3])
          acc.accountNumberDigit = result.getValue(columns[4])
          acc.accountDac = result.getValue(columns[5])
          acc.meiHolder = result.getValue(columns[6])
          acc.meiCpf = result.getValue(columns[7])
          return acc
        }, {})
    }

    /**
     * Get payment batch ID.
     *
     * @returns {string}
     * @private
     */
    function _getPaymentBatchId() {
      return runtime.getCurrentScript().getParameter({ name: 'custscript_ps_payment_batch_to_add_br' })
    }

    return {
      getInputData: getInputData,
      map: map,
      summarize: summarize
    }
  })
