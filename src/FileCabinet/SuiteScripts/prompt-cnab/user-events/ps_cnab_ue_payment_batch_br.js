/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/runtime', 'N/url', '../modules/payment-batch-dao'],
  function (runtime, url, paymentBatchDAO) {
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

      const form = context.form
      const newRecord = context.newRecord
      const isTaskFinished = newRecord.getValue({ fieldId: 'custrecord_ps_pab_task_finished' })

      if (!isTaskFinished) {
        form.addButton({
          id: 'custpage_check_status',
          label: 'Verificar status',
          functionName: '(function(){window.location.reload()})'
        })
      } else {
        const generatePaymentRemittanceSuiteletUrl = url.resolveScript({
          scriptId: 'customscript_ps_cnab_st_gen_pay_remit_br',
          deploymentId: 'customdeploy_ps_cnab_st_gen_pay_remit_br',
          params: {
            custpage_filter_subsidiary: newRecord.getValue({ fieldId: 'custrecord_ps_pab_subsidiary' }),
            custpage_filter_batch: newRecord.id
          }
        })

        form.addButton({
          id: 'custpage_generate_remittance',
          label: 'Gerar remessa',
          functionName: "(function(){window.open('" + generatePaymentRemittanceSuiteletUrl + "', '_self')})"
        })
      }
    }

    return {
      beforeLoad: beforeLoad
    }
  })
