/**
 * @NApiVersion 2.x
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/search'],
  function (record, search) {
    /**
     * Record Type.
     *
     * @type {string}
     */
    const RECORD_TYPE = 'customrecord_ps_payment'

    /**
     * Fetch by unique ID.
     *
     * @param uniqueId
     * @returns {string}
     */
    function fetchByUniqueId (uniqueId) {
      return search.create({
        type: RECORD_TYPE,
        filters: [{
          name: 'custrecord_ps_pay_id',
          operator: search.Operator.IS,
          values: uniqueId
        }]
      })
        .run()
        .getRange({
          start: 0,
          end: 1
        })
        .reduce(function (acc, result) {
          return result.id
        }, '')
    }

    /**
     * Fetch status by code.
     *
     * @param code
     */
    function fetchStatusByCode (code) {
      return search.create({
        type: 'customrecord_ps_payment_status',
        filters: [{
          name: 'custrecord_ps_pst_code',
          operator: search.Operator.IS,
          values: code
        }]
      })
        .run()
        .getRange({
          start: 0,
          end: 1
        })
        .reduce(function (acc, result) {
          return result.id
        }, '')
    }

    /**
     * Update status.
     *
     * @param id
     * @param code
     */
    function updateStatus (id, code) {
      const statusId = fetchStatusByCode(code)
      if (!statusId) return
      record.submitFields({
        type: RECORD_TYPE,
        id: id,
        values: {
          custrecord_ps_pay_status: statusId
        }
      })
    }

    return {
      RECORD_TYPE: RECORD_TYPE,
      fetchByUniqueId: fetchByUniqueId,
      fetchStatusByCode: fetchStatusByCode,
      updateStatus: updateStatus
    }
  })
