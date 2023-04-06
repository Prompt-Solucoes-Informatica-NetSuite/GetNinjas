/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
define(['N/runtime', 'N/search', 'N/record', 'N/util', '../modules/payment-remittance-dao', '../modules/tecnospeed/index'],
  function (runtime, search, record, util, paymentRemittanceDAO, Tecnospeed) {
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
      const paymentRemittanceId = _getPaymentRemittanceId()

      const paymentRemittanceColumns = [
        'custrecord_ps_pre_payments'
      ]

      const paymentRemittanceValues = search.lookupFields({
        type: 'customrecord_ps_payment_remittance',
        id: paymentRemittanceId,
        columns: paymentRemittanceColumns
      })

      const payments = JSON.parse(paymentRemittanceValues[paymentRemittanceColumns[0]])

      return payments.map(function (id) {
        return {
          id: id,
          paymentRemittanceId: paymentRemittanceId
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
      const payment = JSON.parse(context.value)

      record.submitFields({
        type: 'customrecord_ps_payment',
        id: payment.id,
        values: {
          custrecord_ps_pay_remittance: payment.paymentRemittanceId
        }
      })
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

      const paymentRemittanceId = _getPaymentRemittanceId()

      paymentRemittanceDAO.updateTaskFinished(paymentRemittanceId, true)
    }

    /**
     * Get payment remittance ID.
     *
     * @returns {string}
     * @private
     */
    function _getPaymentRemittanceId () {
      return runtime.getCurrentScript().getParameter({ name: 'custscript_ps_payment_remittance_to_gen' })
    }

    return {
      getInputData: getInputData,
      map: map,
      summarize: summarize
    }
  })
