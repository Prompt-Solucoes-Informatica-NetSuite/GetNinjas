/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
define(['N/runtime', 'N/search', 'N/record', 'N/format', '../modules/payment-return-dao', '../modules/payment-dao', '../modules/tecnospeed/index'],
  function (runtime, search, record, format, paymentReturnDAO, paymentDAO, Tecnospeed) {
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
      const subsidiaryCpfCnpjColumn = 'custrecord_ps_subsidiary_cnpj'
      const subsidiaryValues = search.lookupFields({ type: search.Type.SUBSIDIARY, id: subsidiaryId, columns: subsidiaryCpfCnpjColumn })
      const subsidiaryCpfCnpj = subsidiaryValues[subsidiaryCpfCnpjColumn]

      const tecnospeedApi = new Tecnospeed()
      const paymentApi = tecnospeedApi.Payment({ cpfCnpj: subsidiaryCpfCnpj })
      const paymentApiResponse = paymentApi.fetchReturn(paymentReturnValues[paymentReturnColumns[1]])

      return paymentApiResponse.payments
    }

    /**
     * Executes when the map entry point is triggered and applies to each key/value pair.
     *
     * @param {MapSummary} context - Data collection containing the key/value pairs to process through the map stage
     * @since 2015.1
     */
    function map (context) {
      const payment = JSON.parse(context.value)
      const status = payment.status

      if (status === 'PAID') {
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

        const vendorBillColumns = [
          'custbody_ps_cnab_forecast_account'
        ]

        const vendorBillValues = search.lookupFields({
          type: search.Type.VENDOR_BILL,
          id: vendorBillId,
          columns: vendorBillColumns
        })

        const forecastAccountId = vendorBillValues[vendorBillColumns[0]][0].value

        vendorPayment.setValue({ fieldId: 'account', value: forecastAccountId })

        const applySublistId = 'apply'
        const applyCount = vendorPayment.getLineCount({ sublistId: applySublistId })
        var installmentFound, dueDate

        installmentFound = false

        for (var i = 0; i < applyCount; i++) {
          vendorPayment.selectLine({ sublistId: applySublistId, line: i })
          var applied = vendorPayment.getCurrentSublistValue({ sublistId: applySublistId, fieldId: 'apply' })

          if (!applied) continue

          var appliedInstallmentNumber = '' + vendorPayment.getCurrentSublistValue({ sublistId: applySublistId, fieldId: 'installmentnumber' })
          if (appliedInstallmentNumber === installmentNumber) {
            installmentFound = true
            vendorPayment.setCurrentSublistValue({ sublistId: applySublistId, fieldId: 'apply', value: true })
            dueDate = vendorPayment.getCurrentSublistValue({ sublistId: applySublistId, fieldId: 'duedate' })
            dueDate = format.parse({ type: format.Type.DATE, value: dueDate })
            break
          } else {
            vendorPayment.setCurrentSublistValue({ sublistId: applySublistId, fieldId: 'apply', value: false })
          }
        }

        if (!installmentFound) return

        vendorPayment.setValue({ fieldId: 'trandate', value: dueDate })
        vendorPayment.setValue({ fieldId: 'approvalstatus', value: 2 }) // Approved

        vendorPayment.save({ ignoreMandatoryFields: true })
      }

      const paymentId = paymentDAO.fetchByUniqueId(payment.uniqueId)

      paymentDAO.updateStatus(paymentId, status)
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

      const paymentReturnId = _getPaymentReturnId()

      paymentReturnDAO.updateTaskFinished(paymentReturnId, true)
    }

    /**
     * Get payment return ID.
     *
     * @returns {string}
     * @private
     */
    function _getPaymentReturnId () {
      return runtime.getCurrentScript().getParameter({ name: 'custscript_ps_payment_return_to_proc' })
    }

    return {
      getInputData: getInputData,
      map: map,
      summarize: summarize
    }
  })
