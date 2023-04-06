/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/runtime', 'N/url'],
  function (runtime, url) {
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
      const statusId = newRecord.getValue({ fieldId: 'statusRef' })
      const status = { OPEN: 'open' }
      const approvalStatusId = newRecord.getValue({ fieldId: 'approvalstatus' })
      const approvalStatus = { APPROVED: '2' }

      if (!(statusId === status.OPEN && approvalStatusId === approvalStatus.APPROVED)) return

      const recordType = newRecord.type
      const recordId = newRecord.id
      const form = context.form

      const addPaymentSuiteletUrl = url.resolveScript({
        scriptId: 'customscript_ps_cnab_st_add_payment_br', //'customscript_ps_cnab_st_add_payment',
        deploymentId: 'customdeploy_ps_cnab_st_add_payment_br', //'customdeploy_ps_cnab_st_add_payment',
        params: {
          custparam_record_type: recordType,
          custparam_record_id: recordId
        }
      })

      form.addButton({
        id: 'custpage_add_payment',
        label: 'Enviar p/ o banco',
        functionName: "(function(){window.open('" + addPaymentSuiteletUrl + "', '_self')})"
      })
    }

    return {
      beforeLoad: beforeLoad
    }
  })
