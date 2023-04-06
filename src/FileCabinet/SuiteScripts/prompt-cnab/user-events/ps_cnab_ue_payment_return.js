/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/runtime', 'N/search', 'N/record', 'N/redirect', 'N/task', '../modules/payment-return-dao', '../modules/tecnospeed/index'],
  function (runtime, search, record, redirect, task, paymentReturnDAO, Tecnospeed) {
    /**
     * Function definition to be triggered before record is loaded.
     *
     * @param {Object} context
     * @param {Record} context.newRecord - New record
     * @param {string} context.type - Trigger type
     * @param {Form} context.form - Current form
     */
    function beforeLoad (context) {
      if (runtime.executionContext !== runtime.ContextType.USER_INTERFACE ||
        context.type !== context.UserEventType.VIEW) return

      const newRecord = context.newRecord
      const paymentReturnId = newRecord.id
      const currentStatusId = newRecord.getValue({ fieldId: 'custrecord_ps_prt_status' })
      const Status = paymentReturnDAO.fetchStatus()

      if (currentStatusId === Status.PROCESSED || currentStatusId === Status.SENT) return

      const subsidiaryId = newRecord.getValue({ fieldId: 'custrecord_ps_prt_subsidiary' })
      const subsidiaryCpfCnpjColumn = 'custrecord_ps_subsidiary_cnpj'
      const subsidiaryValues = search.lookupFields({ type: search.Type.SUBSIDIARY, id: subsidiaryId, columns: subsidiaryCpfCnpjColumn })
      const subsidiaryCpfCnpj = subsidiaryValues[subsidiaryCpfCnpjColumn]

      const tecnospeedApi = new Tecnospeed()
      const paymentApi = tecnospeedApi.Payment({ cpfCnpj: subsidiaryCpfCnpj })

      var paymentApiResponse, statusId

      try {
        paymentApiResponse = paymentApi.fetchReturn(newRecord.getValue({ fieldId: 'custrecord_ps_prt_id' }))
        statusId = paymentReturnDAO.fetchStatusByCode(paymentApiResponse.status)

        if (statusId === Status.PROCESSED || statusId === Status.SENT) {
          const paymentReturnTask = task.create({
            taskType: task.TaskType.MAP_REDUCE,
            scriptId: 'customscript_ps_cnab_mr_proc_pay_return',
            deploymentId: 'customdeploy_ps_cnab_mr_proc_pay_return',
            params: {
              custscript_ps_payment_return_to_proc: paymentReturnId
            }
          })

          const paymentReturnTaskId = paymentReturnTask.submit()

          paymentReturnDAO.updateFields(paymentReturnId, {
            custrecord_ps_prt_task_id: paymentReturnTaskId
          })
        }
      } catch (e) {
        log.error({ title: 'error on fetchReturn', details: e })
      }

      if (statusId === undefined || statusId === currentStatusId) {
        context.form.addButton({
          id: 'custpage_check_status',
          label: 'Verificar status',
          functionName: '(function(){window.location.reload()})'
        })
      } else {
        const paymentReturnRecordType = newRecord.type

        record.submitFields({
          type: paymentReturnRecordType,
          id: paymentReturnId,
          values: {
            custrecord_ps_prt_status: statusId
          }
        })

        redirect.toRecord({
          type: paymentReturnRecordType,
          id: paymentReturnId
        })
      }
    }

    return {
      beforeLoad: beforeLoad
    }
  })
