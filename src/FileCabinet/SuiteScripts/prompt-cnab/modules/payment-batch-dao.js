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
    const RECORD_TYPE = 'customrecord_ps_payment_batch'

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
          custrecord_ps_pab_task_finished: isTaskFinished
        }
      })
    }

    /**
     * Check if has a batch in progress.
     *
     * @returns {string}
     */
    function fetchInProgress () {
      return search.create({
        type: RECORD_TYPE,
        filters: [{
          name: 'custrecord_ps_pab_task_finished',
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

    return {
      RECORD_TYPE: RECORD_TYPE,
      updateTaskFinished: updateTaskFinished,
      fetchInProgress: fetchInProgress
    }
  })
