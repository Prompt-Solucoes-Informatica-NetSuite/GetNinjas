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
    const RECORD_TYPE = 'customrecord_ps_payment_remittance'

    /**
     * Check if has a remittance in progress.
     *
     * @returns {string}
     */
    function fetchInProgress () {
      return search.create({
        type: RECORD_TYPE,
        filters: [{
          name: 'custrecord_ps_pre_task_finished',
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
        type: 'customrecord_ps_payment_remittance_statu',
        columns: [{
          name: 'custrecord_ps_prs_code'
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
        type: 'customrecord_ps_payment_remittance_statu',
        filters: [{
          name: 'custrecord_ps_prs_code',
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
      record.submitFields({
        type: RECORD_TYPE,
        id: id,
        values: {
          custrecord_ps_pre_status: statusId
        }
      })
    }

    /**
     * Update task finished.
     *
     * @param id
     * @param isTaskFinished
     */
    function updateTaskFinished (id, isTaskFinished) {
      record.submitFields({
        type: RECORD_TYPE,
        id: id,
        values: {
          custrecord_ps_pre_task_finished: isTaskFinished
        }
      })
    }

    return {
      RECORD_TYPE: RECORD_TYPE,
      fetchInProgress: fetchInProgress,
      fetchStatus: fetchStatus,
      fetchStatusByCode: fetchStatusByCode,
      updateStatus: updateStatus,
      updateTaskFinished: updateTaskFinished
    }
  })
