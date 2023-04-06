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
    const RECORD_TYPE = 'customrecord_ps_payment_return'

    /**
     * Check if has a remittance in progress.
     *
     * @returns {string}
     */
    function fetchInProgress () {
      return search.create({
        type: RECORD_TYPE,
        filters: [{
          name: 'custrecord_ps_prt_task_finished',
          operator: search.Operator.IS,
          values: false
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
     * Fetch status.
     */
    function fetchStatus () {
      return search.create({
        type: 'customrecord_ps_payment_return_status',
        columns: [{
          name: 'custrecord_ps_rts_code'
        }]
      })
        .run()
        .getRange({
          start: 0,
          end: 1000
        })
        .reduce(function (acc, result) {
          acc[result.getValue(result.columns[0])] = result.id
          return acc
        }, {})
    }

    /**
     * Fetch status by code.
     *
     * @param code
     */
    function fetchStatusByCode (code) {
      return search.create({
        type: 'customrecord_ps_payment_return_status',
        filters: [{
          name: 'custrecord_ps_rts_code',
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
     * Update fields.
     *
     * @param id
     * @param values
     */
    function updateFields (id, values) {
      record.submitFields({
        type: RECORD_TYPE,
        id: id,
        values: values
      })
    }

    /**
     * Update status.
     *
     * @param id
     * @param code
     */
    function updateStatus (id, code) {
      const statusId = fetchStatusByCode(code)
      updateFields(id, {
        custrecord_ps_prt_status: statusId
      })
    }

    /**
     * Update task finished.
     *
     * @param id
     * @param isTaskFinished
     */
    function updateTaskFinished (id, isTaskFinished) {
      updateFields(id, {
        custrecord_ps_prt_task_finished: isTaskFinished
      })
    }

    return {
      RECORD_TYPE: RECORD_TYPE,
      fetchInProgress: fetchInProgress,
      fetchStatus: fetchStatus,
      fetchStatusByCode: fetchStatusByCode,
      updateFields: updateFields,
      updateStatus: updateStatus,
      updateTaskFinished: updateTaskFinished
    }
  })
