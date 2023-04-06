/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
define(['N/runtime', 'N/search', 'N/record', 'N/task',
  '../modules/payment-return-dao', '../modules/payment-dao',
  '../modules/tecnospeed/index'],
  function (runtime, search, record, task, paymentReturnDAO, paymentDAO, Tecnospeed) {
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
      const paymentReturnId = _getPaymentReturnId()

      const paymentReturnColumns = [
        'custrecord_ps_prt_subsidiary',
        'custrecord_ps_prt_id'
      ]

      const paymentReturnValues = search.lookupFields({
        type: 'customrecord_ps_payment_return',
        id: paymentReturnId,
        columns: paymentReturnColumns
      })

      const subsidiaryId = paymentReturnValues[paymentReturnColumns[0]][0].value
      const subsidiaryCpfCnpjColumn = 'custrecord_psg_br_cnpj'  // 'custrecord_ps_subsidiary_cnpj'
      const subsidiaryValues = search.lookupFields({ type: search.Type.SUBSIDIARY, id: subsidiaryId, columns: subsidiaryCpfCnpjColumn })
      const subsidiaryCpfCnpj = subsidiaryValues[subsidiaryCpfCnpjColumn]

      const tecnospeedApi = new Tecnospeed()
      const paymentApi = tecnospeedApi.Payment({ cpfCnpj: subsidiaryCpfCnpj })
      const paymentApiResponse = paymentApi.fetchReturn(paymentReturnValues[paymentReturnColumns[1]])

      log.debug('paymentApiResponse', paymentApiResponse)
      log.debug('paymentApiResponse.payments', paymentApiResponse.payments)

      return paymentApiResponse.payments
    }

    /**
     * Executes when the map entry point is triggered and applies to each key/value pair.
     *
     * @param {MapSummary} context - Data collection containing the key/value pairs to process through the map stage
     * @since 2015.1
     */
    function map(context) {
      const payment = JSON.parse(context.value)
      const status = payment.status

      log.debug('payment', payment)
      log.debug('status', status)

      if (status === 'PAID') {
        log.debug('entrei no paid')
        const billReferencesText = payment.tags[0].split('#')[1]
        const billReferences = billReferencesText.split('/')
        const vendorBillId = billReferences[0]
        const installmentNumber = billReferences[1]

        const vendorPayment = record.transform({
          fromType: record.Type.VENDOR_BILL,
          fromId: vendorBillId,
          toType: record.Type.VENDOR_PAYMENT,
          isDynamic: true
        })

        log.debug('vendorPayment', vendorPayment)

        let paymentreturnId = _getPaymentReturnId()

        let subsidiaryId = search.lookupFields({
          type: 'customrecord_ps_payment_return',
          id: paymentreturnId,
          columns: ['custrecord_ps_prt_subsidiary']
        }).custrecord_ps_prt_subsidiary

        let subsidiaryCpfCnpj = search.lookupFields({
          type: search.Type.SUBSIDIARY,
          id: subsidiaryId[0].value,
          columns: ['custrecord_psg_br_cnpj', 'legalname']
        })

        let tecnospeedApi = new Tecnospeed()
        let paymentApi = tecnospeedApi.Payment({ cpfCnpj: subsidiaryCpfCnpj.custrecord_psg_br_cnpj })
        let paymentApiResponse = paymentApi.fetchPaymentReturn(payment.uniqueId)
        const cDate = new Date(paymentApiResponse.paymentDate)
        const cDate2 = new Date(cDate.getFullYear(), cDate.getMonth(), cDate.getDate() + 1)

        const parcelRecord = _fetchSitParcelFields(vendorBillId, installmentNumber)

        log.debug('parcelRecord', parcelRecord)

        // const existParcel = _fetchParcelQuiByUniqueId(payment.uniqueId)

        // log.debug('existParcel', existParcel)

        // if (existParcel === false) {
        const paidParcelBatch = record.create({ type: 'customrecord_sit_parcela_qui' })
        paidParcelBatch.setValue({ fieldId: 'custrecord_sit_parcela_qui_l_tran_pag', value: parcelRecord.vendorBillId })
        paidParcelBatch.setValue({ fieldId: 'custrecord_sit_parcela_qui_l_parcela', value: parcelRecord.parcelId })
        paidParcelBatch.setValue({ fieldId: 'custrecord_sit_parcela_qui_n_valor_pago', value: parcelRecord.payAmount })
        paidParcelBatch.setValue({ fieldId: 'custrecord_sit_parcela_qui_d_data_pag', value: cDate2 })
        paidParcelBatch.setValue({ fieldId: 'custrecord_sit_parcela_qui_t_efetivado', value: 'S' })
        paidParcelBatch.setValue({ fieldId: 'custrecord_sit_parcela_qui_t_chave_tran', value: payment.uniqueId })
        paidParcelBatch.save()
        // }

        vendorPayment.setValue({ fieldId: 'account', value: parcelRecord.forecastAccountId })

        const applySublistId = 'apply'
        const applyCount = vendorPayment.getLineCount({ sublistId: applySublistId })

        for (var i = 0; i < applyCount; i++) {
          vendorPayment.selectLine({ sublistId: applySublistId, line: i })
          var applied = vendorPayment.getCurrentSublistValue({ sublistId: applySublistId, fieldId: 'apply' })

          if (!applied) continue

          vendorPayment.setCurrentSublistValue({ sublistId: applySublistId, fieldId: 'apply', value: true })
          vendorPayment.setCurrentSublistValue({ sublistId: applySublistId, fieldId: 'amount', value: parcelRecord.payAmount })

        }

        vendorPayment.setValue({ fieldId: 'trandate', value: cDate2 })
        vendorPayment.setValue({ fieldId: 'approvalstatus', value: 2 }) // Approved

        try {
          vendorPayment.save({ ignoreMandatoryFields: true })

        } catch (e) {
          log.error({ title: ' ERROR: SAVE VENDOR PAYMENT', details: e })
        }

        //------------------------------------------ps Comprovante pagamento--------------------------------------------
        const vendorFields = search.lookupFields({
          type: 'vendorbill',
          id: vendorBillId,
          columns: ['custbody_o2s_parcela_l_tp_servico',
            'externalid',
            'custbody_jive_sn_number_fin',
            'custbody_o2s_transaction_a_parcelas']
        })

        log.debug('vendorFields', vendorFields)

        const bankAccountFields = _fetchBankAccountByAccountHash(paymentApiResponse.accountHash)
        const cnpjWithoutMask = subsidiaryCpfCnpj.custrecord_psg_br_cnpj.replace(/[^\d]+/g, '')

        var cpfCnpjBeneficiaryWithMask
        if (paymentApiResponse.beneficiary.cpfCnpj.length === 14) {
          cpfCnpjBeneficiaryWithMask = paymentApiResponse.beneficiary.cpfCnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5")
        } else {
          cpfCnpjBeneficiaryWithMask = paymentApiResponse.beneficiary.cpfCnpj.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")

        }
        const serviceType = vendorFields.custbody_o2s_parcela_l_tp_servico[0].text
        const externalId = vendorFields.externalid[0].value
        const bankText = bankAccountFields[0].bank.substr(0, 3)
        var paymentProof
        if (paymentApiResponse.paymentType === 0) {
          paymentProof = {
            custrecord_ps_cnab_pay_payer_cnpj: cnpjWithoutMask,
            custrecord_ps_cnab_pay_payer_legalname: subsidiaryCpfCnpj.legalname,
            custrecord_ps_cnab_pay_payer_bank: bankText, //Campo que aparece no registro
            custrecord_ps_cnab_pay_payer_agency: bankAccountFields[0].agency,
            custrecord_ps_cnab_pay_payer_agencydigit: bankAccountFields[0].agencyDigit,
            custrecord_ps_cnab_pay_payer_chec_acc: bankAccountFields[0].account,
            custrecord_ps_cnab_payer_account_digit: bankAccountFields[0].accountDigit,
            custrecord_ps_cnab_pay_payment_type: bankAccountFields[0].accountType,
            custrecord_ps_cnab_beneficiary_cpfcnpj: paymentApiResponse.beneficiary.cpfCnpj,
            custrecord_ps_cnab_pay_beneficiary_name: paymentApiResponse.beneficiary.name,
            custrecord_ps_cnab_pay_payment_form: 'BOLETO', //paymentFormAPI[0].name,
            custrecord_ps_cnab_pay_ticket_type: serviceType, //ajustar
            custrecord_ps_cnab_pay_digitable_line: paymentApiResponse.barcode || null,
            custrecord_ps_cnab_pay_paydate: paymentApiResponse.paymentDate || null,
            custrecord_ps_cnab_pay_discount: paymentApiResponse.discountAmount || null,
            custrecord_ps_cnab_pay_amount_paid: paymentApiResponse.amount || null,
            custrecord_ps_cnab_pay_interest_fine: paymentApiResponse.interestAmount || null,
            custrecord_ps_cnab_pay_aut_register: paymentApiResponse.authenticationRegister || null,
            custrecord_ps_cnab_pay_external_id: externalId,
            custrecord_ps_cnab_pay_transaction: vendorBillId,
            custrecord_jive_sn_number_fin: vendorFields.custbody_jive_sn_number_fin,
            custrecord_ps_cnab_pay_payer_cnpj_mask: subsidiaryCpfCnpj.custrecord_psg_br_cnpj,
            custrecord_ps_cnab_bene_cpfcnpj_mask: cpfCnpjBeneficiaryWithMask,
            custrecord_ps_cnab_pay_payer_bank_hidden: bankAccountFields[0].bank //Campo para popular o pdf
          }
        } else {
          const bank = _fetchNameBankByCode(paymentApiResponse.beneficiary.bankCode)
          paymentProof = {
            custrecord_ps_cnab_pay_payer_cnpj: cnpjWithoutMask,
            custrecord_ps_cnab_pay_payer_legalname: subsidiaryCpfCnpj.legalname,
            custrecord_ps_cnab_pay_payer_bank: bankText, //Campo que aparece no registro
            custrecord_ps_cnab_pay_payer_agency: bankAccountFields[0].agency,
            custrecord_ps_cnab_pay_payer_agencydigit: bankAccountFields[0].agencyDigit,
            custrecord_ps_cnab_pay_payer_chec_acc: bankAccountFields[0].account,
            custrecord_ps_cnab_payer_account_digit: bankAccountFields[0].accountDigit,
            custrecord_ps_cnab_beneficiary_cpfcnpj: paymentApiResponse.beneficiary.cpfCnpj,
            custrecord_ps_cnab_pay_beneficiary_name: paymentApiResponse.beneficiary.name,
            custrecord_ps_cnab_pay_payment_form: 'TRANSFERÊNCIA',
            custrecord_ps_cnab_pay_ticket_type: serviceType, //ajustar
            custrecord_ps_cnab_pay_payment_type: bankAccountFields[0].accountType,
            custrecord_ps_cnab_pay_paydate: paymentApiResponse.paymentDate || null,
            custrecord_ps_cnab_pay_discount: paymentApiResponse.discountAmount || null,
            custrecord_ps_cnab_pay_amount_paid: paymentApiResponse.amount || null,
            custrecord_ps_cnab_pay_interest_fine: paymentApiResponse.interestAmount || null,
            custrecord_ps_cnab_pay_bank: paymentApiResponse.beneficiary.bankCode || '', // Campo que aparece no registro	
            custrecord_ps_cnab_pay_bene_agency: paymentApiResponse.beneficiary.agency || null,
            custrecord_ps_cnab_pay_agency_digit: paymentApiResponse.beneficiary.agencyDigit || null,
            custrecord_ps_cnab_pay_account: paymentApiResponse.beneficiary.accountNumber || null,
            custrecord_ps_cnab_pay_account_digit: paymentApiResponse.beneficiary.accountNumberDigit || null,
            custrecord_ps_cnab_pay_aut_register: paymentApiResponse.authenticationRegister || null,
            custrecord_ps_cnab_pay_external_id: externalId,
            custrecord_ps_cnab_pay_transaction: vendorBillId,
            custrecord_jive_sn_number_fin: vendorFields.custbody_jive_sn_number_fin,
            custrecord_ps_cnab_pay_payer_cnpj_mask: subsidiaryCpfCnpj.custrecord_psg_br_cnpj,
            custrecord_ps_cnab_bene_cpfcnpj_mask: cpfCnpjBeneficiaryWithMask,
            custrecord_ps_cnab_pay_payer_bank_hidden: bankAccountFields[0].bank, //Campo para popular o pdf
            custrecord_ps_cnab_pay_bank_hidden: bank[0].bank || '', // Campo para popular o pdf
          }
        }

        log.debug('log depois do paymentProof')
        log.debug('payment.custrecord_ps_cnab_pay_payment_form', payment.custrecord_ps_cnab_pay_payment_form)


        const recordPaymentProof = record.create({ type: 'customrecord_ps_cnab_pay_proof' })
        recordPaymentProof.setValue({ fieldId: 'custrecord_ps_cnab_pay_payer_cnpj', value: paymentProof.custrecord_ps_cnab_pay_payer_cnpj })
        recordPaymentProof.setValue({ fieldId: 'custrecord_ps_cnab_pay_payer_legalname', value: paymentProof.custrecord_ps_cnab_pay_payer_legalname })
        recordPaymentProof.setValue({ fieldId: 'custrecord_ps_cnab_pay_payer_bank', value: paymentProof.custrecord_ps_cnab_pay_payer_bank })
        recordPaymentProof.setValue({ fieldId: 'custrecord_ps_cnab_pay_payer_agency', value: paymentProof.custrecord_ps_cnab_pay_payer_agency })
        recordPaymentProof.setValue({ fieldId: 'custrecord_ps_cnab_pay_payer_agencydigit', value: paymentProof.custrecord_ps_cnab_pay_payer_agencydigit })
        recordPaymentProof.setValue({ fieldId: 'custrecord_ps_cnab_pay_payer_chec_acc', value: paymentProof.custrecord_ps_cnab_pay_payer_chec_acc })
        recordPaymentProof.setValue({ fieldId: 'custrecord_ps_cnab_payer_account_digit', value: paymentProof.custrecord_ps_cnab_payer_account_digit })
        recordPaymentProof.setValue({ fieldId: 'custrecord_ps_cnab_beneficiary_cpfcnpj', value: paymentProof.custrecord_ps_cnab_beneficiary_cpfcnpj })
        recordPaymentProof.setValue({ fieldId: 'custrecord_ps_cnab_pay_beneficiary_name', value: paymentProof.custrecord_ps_cnab_pay_beneficiary_name })
        recordPaymentProof.setValue({ fieldId: 'custrecord_ps_cnab_pay_payment_form', value: paymentProof.custrecord_ps_cnab_pay_payment_form })
        // recordPaymentProof.setValue({ fieldId: 'custrecord_ps_cnab_pay_ticket_type', value: paymentProof.custrecord_ps_cnab_pay_ticket_type })
        recordPaymentProof.setValue({ fieldId: 'custrecord_ps_cnab_pay_payment_type', value: paymentProof.custrecord_ps_cnab_pay_payment_type })
        recordPaymentProof.setValue({ fieldId: 'custrecord_ps_cnab_pay_digitable_line', value: paymentProof.custrecord_ps_cnab_pay_digitable_line })
        recordPaymentProof.setValue({ fieldId: 'custrecord_ps_cnab_pay_paydate', value: cDate2 })
        recordPaymentProof.setValue({ fieldId: 'custrecord_ps_cnab_pay_discount', value: 0 })
        recordPaymentProof.setValue({ fieldId: 'custrecord_ps_cnab_pay_amount_paid', value: paymentProof.custrecord_ps_cnab_pay_amount_paid })
        recordPaymentProof.setValue({ fieldId: 'custrecord_ps_cnab_pay_interest_fine', value: paymentProof.custrecord_ps_cnab_pay_interest_fine })
        recordPaymentProof.setValue({ fieldId: 'custrecord_ps_cnab_pay_bank', value: paymentProof.custrecord_ps_cnab_pay_bank })
        recordPaymentProof.setValue({ fieldId: 'custrecord_ps_cnab_pay_bene_agency', value: paymentProof.custrecord_ps_cnab_pay_bene_agency })
        recordPaymentProof.setValue({ fieldId: 'custrecord_ps_cnab_pay_agency_digit', value: paymentProof.custrecord_ps_cnab_pay_agency_digit })
        recordPaymentProof.setValue({ fieldId: 'custrecord_ps_cnab_pay_account', value: paymentProof.custrecord_ps_cnab_pay_account })
        recordPaymentProof.setValue({ fieldId: 'custrecord_ps_cnab_pay_account_digit', value: paymentProof.custrecord_ps_cnab_pay_account_digit })
        recordPaymentProof.setValue({ fieldId: 'custrecord_ps_cnab_pay_aut_register', value: paymentProof.custrecord_ps_cnab_pay_aut_register })
        recordPaymentProof.setValue({ fieldId: 'custrecord_ps_cnab_pay_external_id', value: paymentProof.custrecord_ps_cnab_pay_external_id })
        recordPaymentProof.setValue({ fieldId: 'custrecord_ps_cnab_pay_transaction', value: paymentProof.custrecord_ps_cnab_pay_transaction })
        recordPaymentProof.setValue({ fieldId: 'custrecord_jive_sn_number_fin', value: paymentProof.custrecord_jive_sn_number_fin })
        recordPaymentProof.setValue({ fieldId: 'custrecord_ps_cnab_pay_payer_cnpj_mask', value: paymentProof.custrecord_ps_cnab_pay_payer_cnpj_mask })
        recordPaymentProof.setValue({ fieldId: 'custrecord_ps_cnab_bene_cpfcnpj_mask', value: paymentProof.custrecord_ps_cnab_bene_cpfcnpj_mask })
        recordPaymentProof.setValue({ fieldId: 'custrecord_ps_cnab_pay_payer_bank_hidden', value: paymentProof.custrecord_ps_cnab_pay_payer_bank_hidden })
        recordPaymentProof.setValue({ fieldId: 'custrecord_ps_cnab_pay_bank_hidden', value: paymentProof.custrecord_ps_cnab_pay_bank_hidden })
        recordPaymentProof.save()

        log.debug('recordPaymentProof', recordPaymentProof)

        let temp = vendorFields.custbody_o2s_transaction_a_parcelas
        let init = temp.search(' /')
        let idParcel = temp.substring(init + 2)

        let parcelRecordType = record.load({
          type: 'customrecord_sit_parcela',
          id: idParcel,
          isDynamic: true
        })

        parcelRecordType.setValue({ fieldId: 'custrecord_sit_parcela_i_status', value: 3 })

        parcelRecordType.save()

      }

      if (status === 'REJECTED') {
        let billReferencesText = payment.tags[0].split('#')[1]
        let billReferences = billReferencesText.split('/')
        let vendorBillId = billReferences[0]

        const vendorBill = record.load({
          type: record.Type.VENDOR_BILL,
          id: vendorBillId,
          isDynamic: true
        })

        var temp = vendorBill.getValue({
          fieldId: 'custbody_o2s_transaction_a_parcelas'
        })
        const init = temp.search(' /')
        const idParcel = temp.substring(init + 2)

        const parcelRecordType = record.load({
          type: 'customrecord_sit_parcela',
          id: idParcel,
          isDynamic: true
        })

        parcelRecordType.setValue({ fieldId: 'custrecord_sit_parcela_n_vl_pago', value: 0 })

        parcelRecordType.save()
      }

      log.debug('depois do if')

      const paymentId = paymentDAO.fetchByUniqueId(payment.uniqueId)

      paymentDAO.updateStatus(paymentId, status)

      log.debug('depois do paymentDao')
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

      const paymentReturnId = _getPaymentReturnId()

      paymentReturnDAO.updateTaskFinished(paymentReturnId, true)
    }

    /**
     * Fetch parcel fields by vendorBillId and installmentNumber
     *
     * @param vendorBillId, installmentNumber
     * @returns {{name: string, id: number}[]}
     * @private
     */
    function _fetchSitParcelFields(vendorBillId, installmentNumber) {
      return search.create({
        type: 'customrecord_sit_parcela',
        filters: [
          {
            name: 'custrecord_sit_parcela_l_transacao',
            operator: search.Operator.IS,
            values: vendorBillId
          },
          {
            name: 'custrecord_sit_parcela_i_numero',
            operator: search.Operator.IS,
            values: installmentNumber
          },
        ],
        columns: [
          {
            name: 'internalid'
          },
          {
            name: 'custrecord_sit_parcela_l_conta_prev'
          },
          {
            name: 'custrecord_sit_parcela_n_vl_pago'
          },
          {
            name: 'custrecord_sit_parcela_l_transacao'
          }
        ]
      })
        .run()
        .getRange({
          start: 0,
          end: 1
        })
        .reduce(function (acc, result) {
          return {
            parcelId: result.getValue(result.columns[0]),
            forecastAccountId: result.getValue(result.columns[1]),
            payAmount: result.getValue(result.columns[2]),
            vendorBillId: result.getValue(result.columns[3])
          }
        }, '')
    }

    /**
     * Get payment return ID.
     *
     * @returns {string}
     * @private
     */
    function _getPaymentReturnId() {
      return runtime.getCurrentScript().getParameter({ name: 'custscript_ps_payment_return_to_proc_br' }) // Precisa mudar ???
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
            agencyDigit: result.getValue(result.columns[4]),
            accountDigit: result.getValue(result.columns[5])
          }
        })
    }

    /**
     * Fetch name bank by code.
     *
     * @param codeBank
     * @returns {{name: string}}
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

    // /**
    //  * Fetch parcel qui.
    //  *
    //  * @param uniqueId
    //  * @returns {boolean}
    //  * @private
    //  */
    // function _fetchParcelQuiByUniqueId(uniqueId) {
    //   var parcelQuit = search.create({
    //     type: 'customrecord_sit_parcela_qui',
    //     filters: [{
    //       name: 'custrecord_sit_parcela_qui_t_chave_tran',
    //       operator: search.Operator.IS,
    //       values: uniqueId
    //     }],
    //     columns: [
    //       { name: 'internalid' },
    //     ]
    //   }).run().getRange({ start: 0, end: 1 })

    //   if (parcelQuit.length > 0) {
    //     return true
    //   } else {
    //     return false
    //   }

    // }

    return {
      getInputData: getInputData,
      map: map,
      summarize: summarize
    }
  })
