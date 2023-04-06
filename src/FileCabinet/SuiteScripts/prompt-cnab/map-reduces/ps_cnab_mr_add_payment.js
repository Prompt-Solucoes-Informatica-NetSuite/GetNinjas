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
    function getInputData () {
      const paymentBatchId = _getPaymentBatchId()

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
    function map (context) {
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
          name: 'installmentnumber',
          join: 'installment',
          operator: search.Operator.EQUALTO,
          values: installmentNumber
        }, {
          name: 'mainline',
          operator: search.Operator.IS,
          values: true
        }],
        columns: [
          { name: 'formulatext', formula: "TO_CHAR({installment.duedate}, 'YYYY-MM-DD')" },
          { name: 'formulatext', formula: "TO_CHAR({installment.duedate}, 'YYYY-MM-DD')" },
          { name: 'formulanumeric', formula: '{installment.amountremaining} - NVL({installment.custrecord_ps_cnab_sent_to_bank}, 0)' },
          { name: 'entity' },
          { name: 'custentity_enl_legalname', join: 'vendor' },
          { name: 'custentity_enl_cnpjcpf', join: 'vendor' },
          { name: 'address3', join: 'billingaddress' },
          { name: 'custrecord_enl_numero', join: 'billingaddress' },
          { name: 'address2', join: 'billingaddress' },
          { name: 'custrecord_enl_city', join: 'billingaddress' },
          { name: 'custrecord_enl_uf', join: 'billingaddress' },
          { name: 'zip', join: 'billingaddress' },
          { name: 'custrecord_ps_subsidiary_cnpj', join: 'subsidiary' },
          { name: 'custrecord_ps_cnab_barcode', join: 'installment' },
          { name: 'custrecord_ps_bac_id_payment', join: 'custbody_ps_cnab_forecast_bank_account' },
          { name: 'custrecord_ps_paf_code', join: 'custbody_ps_cnab_payment_form' },
          { name: 'custrecord_ps_pat_code', join: 'custbody_ps_cnab_payment_type' },
          { name: 'custrecord_ps_com_code', join: 'custbody_ps_cnab_compensation' },
          { name: 'custbody_ps_cnab_vendor_bank_account'},
          { name: 'custentity_enl_mei', join: 'vendor' }
        ]
      })
        .run()
        .getRange({
          start: 0,
          end: 1
        })
        .reduce(function (acc, result) {
          const columns = result.columns
          acc.accountHash = result.getValue(columns[14])
          acc.paymentForm = result.getValue(columns[15])
          acc.paymentDate = result.getValue(columns[0])
          acc.dueDate = result.getValue(columns[1])
          acc.amount = paymentAmount
          acc.nominalAmount = paymentAmount
          acc.discountAmount = paymentDiscount || undefined
          acc.interestAmount = paymentInterest || undefined
          acc.compensation = result.getValue(columns[17]) || undefined
          acc.barcode = result.getValue(columns[13]) || undefined

          const entityId = result.getValue(columns[3])
          const vendorBankAccountId = result.getValue(columns[18])
          const entityMei = result.getValue(columns[19])
          const vendorBankAccount = _fetchVendorBankAccount(entityId, vendorBankAccountId)

          if (entityMei && vendorBankAccount.meiHolder && vendorBankAccount.meiCpf) {
            acc.beneficiary = {
              name: vendorBankAccount.meiHolder,
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
                cpfCnpj: result.getValue(columns[5]),
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

          acc.extra = {
            entityId: entityId,
            subsidiaryCpfCnpj: result.getValue(columns[12]),
            paymentType: result.getValue(columns[16])
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

        record.submitFields({
          type: paymentRecordType,
          id: paymentRecordId,
          values: {
            custrecord_ps_pay_id: paymentApiResponse.uniqueId,
            custrecord_ps_pay_status: paymentDAO.fetchStatusByCode(paymentApiResponse.status)
          }
        })

        const vendorBill = record.load({ type: record.Type.VENDOR_BILL, id: transactionId, isDynamic: true })

        const installmentLine = vendorBill.findSublistLineWithValue({
          sublistId: 'installment',
          fieldId: 'seqnum',
          value: installmentNumber
        })

        if (installmentLine !== -1) {
          vendorBill.selectLine({ sublistId: 'installment', line: installmentLine })

          const currentAmountSentToBank = vendorBill.getCurrentSublistValue({
            sublistId: 'installment',
            fieldId: 'custrecord_ps_cnab_sent_to_bank'
          })

          const newAmountSentToBank = (parseFloat(currentAmountSentToBank) || 0) || parseFloat(paymentAmount)

          vendorBill.setCurrentSublistValue({
            sublistId: 'installment',
            fieldId: 'custrecord_ps_cnab_sent_to_bank',
            value: newAmountSentToBank
          })

          vendorBill.setCurrentSublistValue({
            sublistId: 'installment',
            fieldId: 'custrecord_ps_cnab_discount',
            value: paymentDiscount
          })

          vendorBill.setCurrentSublistValue({
            sublistId: 'installment',
            fieldId: 'custrecord_ps_cnab_interest',
            value: paymentInterest
          })

          vendorBill.commitLine({ sublistId: 'installment' })
          vendorBill.save({ ignoreMandatoryFields: true })
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
    function summarize (context) {
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
    function _fetchVendorBankAccount (vendorId, vendorBankAccountId) {
      const filters = [{
        name: 'custrecord_ps_bac_vendor_owner',
        operator: search.Operator.ANYOF,
        values: vendorId
      }]

      if (vendorBankAccountId) {
        filters.push({
          name: 'internalid',
          operator: search.Operator.ANYOF,
          values: vendorBankAccountId
        })
      }

      return search.create({
        type: 'customrecord_ps_bank_account',
        filters: filters,
        columns: [
          { name: 'custrecord_ps_bac_bank_code' },
          { name: 'custrecord_ps_bac_agency_number' },
          { name: 'custrecord_ps_bac_agency_digit' },
          { name: 'custrecord_ps_bac_account_number' },
          { name: 'custrecord_ps_bac_account_digit' },
          { name: 'custrecord_ps_bac_account_dac' },
          { name: 'custrecord_ps_bac_mei_holder' },
          { name: 'custrecord_ps_bac_mei_cpf' }
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
    function _getPaymentBatchId () {
      return runtime.getCurrentScript().getParameter({ name: 'custscript_ps_payment_batch_to_add' })
    }

    return {
      getInputData: getInputData,
      map: map,
      summarize: summarize
    }
  })
