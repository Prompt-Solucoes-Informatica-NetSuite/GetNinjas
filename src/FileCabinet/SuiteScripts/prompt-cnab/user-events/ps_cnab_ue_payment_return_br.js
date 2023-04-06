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
   function beforeLoad(context) {
     if (runtime.executionContext !== runtime.ContextType.USER_INTERFACE ||
       context.type !== context.UserEventType.VIEW) return

     const newRecord = context.newRecord
     const paymentReturnId = newRecord.id
     const currentStatusId = newRecord.getValue({ fieldId: 'custrecord_ps_prt_status' })
     const Status = paymentReturnDAO.fetchStatus()

     if (currentStatusId === Status.PROCESSED || currentStatusId === Status.SENT) return

     const subsidiaryId = newRecord.getValue({ fieldId: 'custrecord_ps_prt_subsidiary' })

     const subsidiaryCpfCnpj = search.lookupFields({
       type: 'subsidiary',
       id: subsidiaryId,
       columns: ['custrecord_psg_br_cnpj']
     }).custrecord_psg_br_cnpj

     const tecnospeedApi = new Tecnospeed()
     const paymentApi = tecnospeedApi.Payment({ cpfCnpj: subsidiaryCpfCnpj })

     var paymentApiResponse, statusId

     try {
       log.debug('entrei no try')
       paymentApiResponse = paymentApi.fetchReturn(newRecord.getValue({ fieldId: 'custrecord_ps_prt_id' }))
       statusId = paymentReturnDAO.fetchStatusByCode(paymentApiResponse.status)
       log.debug('paymentApiResponse', paymentApiResponse)
       log.debug('statusId', statusId)

       if (statusId === Status.PROCESSED || statusId === Status.SENT) {
         log.debug('Chamei o map')
         const paymentReturnTask = task.create({
           taskType: task.TaskType.MAP_REDUCE,
           scriptId: 'customscript_ps_cnab_mr_proc_pay_ret_br',
           deploymentId: 'customdeploy_ps_cnab_mr_proc_pay_ret_br',
           params: {
             custscript_ps_payment_return_to_proc_br: paymentReturnId
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
