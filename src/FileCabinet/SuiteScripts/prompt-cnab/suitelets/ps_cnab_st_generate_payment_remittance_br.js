/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */
define(['N/ui/serverWidget', 'N/search', 'N/record', 'N/redirect', 'N/runtime', 'N/task', '../modules/tecnospeed/index'],
  function (serverWidget, search, record, redirect, runtime, task, Tecnospeed) {
    /**
     * Definition of the Suitelet script trigger point.
     *
     * @param {Object} context
     * @param {ServerRequest} context.request - Encapsulation of the incoming request
     * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
     */
    function onRequest (context) {
      const request = context.request
      const response = context.response
      const parameters = request.parameters

      if (request.method === 'GET') {
        response.writePage({
          pageObject: _buildPaymentsList(parameters)
        })
      } else { // POST
        const selectedPaymentsIds = []
        const selectedPaymentsExternalIds = []
        const paymentsSublistId = 'payments'
        const installmentsCount = request.getLineCount({ group: paymentsSublistId })
        for (var line = 0; line < installmentsCount; line++) {
          var isSelected = request.getSublistValue({ group: paymentsSublistId, name: 'custpage_selected', line: line }) === 'T'
          if (isSelected) {
            var id = request.getSublistValue({ group: paymentsSublistId, name: 'custpage_id', line: line })
            selectedPaymentsIds.push(id)
            var externalId = request.getSublistValue({ group: paymentsSublistId, name: 'custpage_external_id', line: line })
            selectedPaymentsExternalIds.push(externalId)
          }
        }

        if (!selectedPaymentsIds.length) return

        const subsidiaryId = parameters.custpage_filter_subsidiary
        const subsidiaryCpfCnpjColumn =  'custrecord_psg_br_cnpj'  // 'custrecord_ps_subsidiary_cnpj'
        const subsidiaryValues = search.lookupFields({ type: search.Type.SUBSIDIARY, id: subsidiaryId, columns: subsidiaryCpfCnpjColumn })
        const subsidiaryCpfCnpj = subsidiaryValues[subsidiaryCpfCnpjColumn]

        const tecnospeedApi = new Tecnospeed()
        const paymentApi = tecnospeedApi.Payment({ cpfCnpj: subsidiaryCpfCnpj })

        const paymentApiResponse = paymentApi.createRemittance(selectedPaymentsExternalIds)

        const paymentRemittanceRecordType = 'customrecord_ps_payment_remittance'
        const paymentRemittance = record.create({ type: paymentRemittanceRecordType })
        paymentRemittance.setValue({ fieldId: 'custrecord_ps_pre_subsidiary', value: subsidiaryId })
        paymentRemittance.setValue({ fieldId: 'custrecord_ps_pre_payments', value: JSON.stringify(selectedPaymentsIds) })
        paymentRemittance.setValue({ fieldId: 'custrecord_ps_pre_id', value: paymentApiResponse[0].uniqueId })
        const paymentRemittanceId = paymentRemittance.save()

        const paymentRemittanceTask = task.create({
          taskType: task.TaskType.MAP_REDUCE,
          scriptId: 'customscript_ps_cnab_mr_gen_pay_remit',
          deploymentId: 'customdeploy_ps_cnab_mr_gen_pay_remit',
          params: {
            custscript_ps_payment_remittance_to_gen: paymentRemittanceId
          }
        })

        const paymentRemittanceTaskId = paymentRemittanceTask.submit()

        record.submitFields({
          type: paymentRemittanceRecordType,
          id: paymentRemittanceId,
          values: {
            custrecord_ps_pre_task_id: paymentRemittanceTaskId
          }
        })

        redirect.toRecord({
          type: paymentRemittanceRecordType,
          id: paymentRemittanceId
        })
      }
    }

    /**
     * Build payments list.
     *
     * @param parameters
     * @returns {void}
     * @private
     */
    function _buildPaymentsList (parameters) {
      const form = serverWidget.createForm({ title: 'Gerar remessa de pagamento' })

      const searchFilters = [{
        name: 'custrecord_ps_pay_id',
        operator: search.Operator.ISNOTEMPTY
      }]

      const filtersFieldGroupId = 'filters'
      form.addFieldGroup({ id: filtersFieldGroupId, label: 'Filtros' })

      const filterSubsidiaryFieldId = 'custpage_filter_subsidiary'

      const filterSubsidiaryField = form.addField({
        id: filterSubsidiaryFieldId,
        type: serverWidget.FieldType.SELECT,
        label: 'Subsidiária',
        container: filtersFieldGroupId
      })

      var filterSubsidiaryFieldValue = parameters[filterSubsidiaryFieldId] || runtime.getCurrentUser().subsidiary
      const subsidiaries = _fetchSubsidiaries()

      subsidiaries.forEach(function (subsidiary) {
        const isSelected = subsidiary.id === filterSubsidiaryFieldValue
        filterSubsidiaryField.addSelectOption({ value: subsidiary.id, text: subsidiary.name, isSelected: isSelected })
      })

      filterSubsidiaryFieldValue = filterSubsidiaryFieldValue || subsidiaries[0].id

      searchFilters.push({
        name: 'custrecord_ps_pay_subsidiary',
        operator: search.Operator.ANYOF,
        values: filterSubsidiaryFieldValue
      })

      const filterBatchFieldId = 'custpage_filter_batch'

      const filterBatchField = form.addField({
        id: filterBatchFieldId,
        type: serverWidget.FieldType.SELECT,
        label: 'Lote',
        source: 'customrecord_ps_payment_batch',
        container: filtersFieldGroupId
      })

      const batchId = parameters.custparam_batch_id || parameters[filterBatchFieldId]
      filterBatchField.defaultValue = batchId

      if (batchId) {
        searchFilters.push({
          name: 'custrecord_ps_pay_batch',
          operator: search.Operator.ANYOF,
          values: batchId
        })
      }

      const filtersFields = [
        filterSubsidiaryField,
        filterBatchField
      ]

      form.addField({
        id: 'custpage_filter_fields',
        type: serverWidget.FieldType.LONGTEXT,
        label: 'Filter Fields'
      })
        .updateDisplayType({
          displayType: serverWidget.FieldDisplayType.HIDDEN
        })
        .defaultValue = JSON.stringify(filtersFields)

      form.addButton({ id: 'custpage_apply_filters', label: 'Aplicar filtros', functionName: 'applyFilters' })

      const paymentsSublist = form.addSublist({ id: 'payments', type: serverWidget.SublistType.LIST, label: 'Pagamentos' })
      paymentsSublist.addMarkAllButtons()

      paymentsSublist.addField({ id: 'custpage_id', type: serverWidget.FieldType.TEXT, label: 'ID' })
        .updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN })

      paymentsSublist.addField({ id: 'custpage_external_id', type: serverWidget.FieldType.TEXT, label: 'ID Externo' })
        .updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN })

      paymentsSublist.addField({ id: 'custpage_selected', type: serverWidget.FieldType.CHECKBOX, label: 'Selecionar' })
      paymentsSublist.addField({ id: 'custpage_entity', type: serverWidget.FieldType.TEXT, label: 'Entidade' })
      paymentsSublist.addField({ id: 'custpage_transaction', type: serverWidget.FieldType.TEXT, label: 'Transação' })
      paymentsSublist.addField({ id: 'custpage_installment', type: serverWidget.FieldType.TEXT, label: 'Parcela' })
      paymentsSublist.addField({ id: 'custpage_due_date', type: serverWidget.FieldType.DATE, label: 'Vencimento' })
      paymentsSublist.addField({ id: 'custpage_amount', type: serverWidget.FieldType.CURRENCY, label: 'Valor' })
      paymentsSublist.addField({ id: 'custpage_discount', type: serverWidget.FieldType.CURRENCY, label: 'Desconto' })
      paymentsSublist.addField({ id: 'custpage_interest', type: serverWidget.FieldType.CURRENCY, label: 'Juros' })
      paymentsSublist.addField({ id: 'custpage_batch', type: serverWidget.FieldType.TEXT, label: 'Lote' })
      paymentsSublist.addField({ id: 'custpage_remittance', type: serverWidget.FieldType.TEXT, label: 'Remessa' })

      search.create({
        type: 'customrecord_ps_payment',
        filters: searchFilters,
        columns: [
          { name: 'custrecord_ps_pay_id' },
          { name: 'custrecord_ps_pay_entity' },
          { name: 'custrecord_ps_pay_transaction' },
          { name: 'custrecord_ps_pay_installment' },
          { name: 'custrecord_ps_pay_due_date' },
          { name: 'custrecord_ps_pay_amount' },
          { name: 'custrecord_ps_pay_discount' },
          { name: 'custrecord_ps_pay_interest' },
          { name: 'custrecord_ps_pay_batch' },
          { name: 'custrecord_ps_pay_remittance' }
        ]
      })
        .run()
        .getRange({
          start: 0,
          end: 1000
        })
        .forEach(function (result, line) {
          const columns = result.columns
          const fields = [
            { id: 'custpage_id', value: result.id },
            { id: 'custpage_external_id', value: result.getValue(columns[0]) },
            { id: 'custpage_entity', value: result.getText(columns[1]) },
            { id: 'custpage_transaction', value: result.getText(columns[2]) },
            { id: 'custpage_installment', value: result.getValue(columns[3]) },
            { id: 'custpage_due_date', value: result.getValue(columns[4]) },
            { id: 'custpage_amount', value: result.getValue(columns[5]) },
            { id: 'custpage_discount', value: result.getValue(columns[6]) },
            { id: 'custpage_interest', value: result.getValue(columns[7]) },
            { id: 'custpage_batch', value: result.getText(columns[8]) },
            { id: 'custpage_remittance', value: result.getText(columns[9]) }
          ]
          fields.forEach(function (field) {
            var value = field.value
            if (!value) return
            paymentsSublist.setSublistValue({ id: field.id, value: value, line: line })
          })
          return true
        })

      form.clientScriptModulePath = '../clients/ps_cnab_cl_generate_payment_remittance.js'

      form.addField({
        id: 'custpage_server_script',
        type: serverWidget.FieldType.LONGTEXT,
        label: 'Server Script'
      })
        .updateDisplayType({
          displayType: serverWidget.FieldDisplayType.HIDDEN
        })
        .defaultValue = JSON.stringify(runtime.getCurrentScript())

      form.addSubmitButton({ label: 'Gerar' })

      return form
    }

    /**
     * Fetch subsidiaries.
     *
     * @returns {{name: string, id: number}[]}
     * @private
     */
    function _fetchSubsidiaries () {
      return search.create({
        type: search.Type.SUBSIDIARY,
        columns: [
          { name: 'namenohierarchy' }
        ]
      })
        .run()
        .getRange({
          start: 0,
          end: 1000
        })
        .map(function (result) {
          const columns = result.columns
          return {
            id: result.id,
            name: result.getValue(columns[0])
          }
        })
    }

    return {
      onRequest: onRequest
    }
  })
