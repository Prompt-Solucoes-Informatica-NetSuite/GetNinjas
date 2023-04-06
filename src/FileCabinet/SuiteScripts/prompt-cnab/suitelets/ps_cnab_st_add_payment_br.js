/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */
define(['N/ui/serverWidget', 'N/search', 'N/record', 'N/redirect', 'N/runtime', 'N/task', 'N/format', '../modules/payment-batch-dao'],
  function (serverWidget, search, record, redirect, runtime, task, format, paymentBatchDAO) {
    /**
     * Definition of the Suitelet script trigger point.
     *
     * @param {Object} context
     * @param {ServerRequest} context.request - Encapsulation of the incoming request
     * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
     */
    function onRequest(context) {
      const request = context.request
      const response = context.response
      const parameters = request.parameters
      const paymentBatchInProgress = paymentBatchDAO.fetchInProgress()

      if (paymentBatchInProgress) {
        response.writePage({
          pageObject: _buildBatchInProgressMessage()
        })
        return
      }

      if (request.method === 'GET') {
        response.writePage({
          pageObject: _buildInstallmentsList(parameters)
        })
      } else { // POST
        const selectedInstallments = []
        const installmentsSublistId = 'installments'
        const installmentSublistFields = [
          'custpage_transaction_id',
          'custpage_installment_number',
          'custpage_installment_payment_amount',
          'custpage_installment_discount',
          'custpage_installment_interest'
        ]
        const installmentsCount = request.getLineCount({ group: installmentsSublistId })
        for (var line = 0; line < installmentsCount; line++) {
          var isSelected = request.getSublistValue({ group: installmentsSublistId, name: 'custpage_selected', line: line }) === 'T'
          if (isSelected) {
            var installmentValues = installmentSublistFields.map(function (fieldId) {
              return request.getSublistValue({ group: installmentsSublistId, name: fieldId, line: line })
            })
            selectedInstallments.push(installmentValues)
          }
        }

        if (!selectedInstallments.length) return

        const paymentBatchRecordType = 'customrecord_ps_payment_batch'
        const paymentBatch = record.create({ type: paymentBatchRecordType })
        paymentBatch.setValue({
          fieldId: 'custrecord_ps_pab_installments',
          value: JSON.stringify(selectedInstallments)
        })
        const paymentBatchId = paymentBatch.save()

        const paymentTask = task.create({
          taskType: task.TaskType.MAP_REDUCE,
          scriptId: 'customscript_ps_cnab_mr_add_payment_br', //'customscript_ps_cnab_mr_add_payment',
          deploymentId: 'customdeploy_ps_cnab_mr_add_payment_br', //'customdeploy_ps_cnab_mr_add_payment',
          params: {
            custscript_ps_payment_batch_to_add_br: paymentBatchId // custscript_ps_payment_batch_to_add_br
          }
        })

        const paymentTaskId = paymentTask.submit()

        record.submitFields({
          type: paymentBatchRecordType,
          id: paymentBatchId,
          values: {
            custrecord_ps_pab_task_id: paymentTaskId
          }
        })

        redirect.toRecord({
          type: paymentBatchRecordType,
          id: paymentBatchId
        })
      }
    }

    const formTitle = 'Enviar pagamentos ao banco'

    /**
     * Build batch in progress message.
     *
     * @returns {*}
     * @private
     */
    function _buildBatchInProgressMessage() {
      const form = serverWidget.createForm({ title: formTitle })

      form.addField({
        id: 'custpage_batch_in_progress_msg',
        type: serverWidget.FieldType.INLINEHTML,
        label: 'Batch in progress message'
      })
        .defaultValue = 'Existe um lote de pagamentos em processamento no momento. Tente novamente mais tarde.'

      return form
    }

    /**
     * Build installments list.
     *
     * @returns {void}
     * @private
     */
    function _buildInstallmentsList(parameters) {
      const form = serverWidget.createForm({ title: formTitle })

      const amountRemainingFormula = '{custrecord_sit_parcela_l_transacao.custrecord_sit_parcela_n_valor} - NVL({custrecord_sit_parcela_l_transacao.custrecord_sit_parcela_n_vl_pago}, 0)'
      // const amountRemainingFormula = '{installment.amountremaining} - NVL({installment.custrecord_ps_cnab_sent_to_bank}, 0)'

      const searchFilters = [{
        name: 'mainline',
        operator: search.Operator.IS,
        values: true
      }, {
        name: 'status',
        operator: search.Operator.ANYOF,
        values: 'VendBill:A'
      }, {
        name: 'approvalstatus',
        operator: search.Operator.ANYOF,
        values: '2' // Approved
      }, {
        name: 'custrecord_sit_parcela_n_valor', // custrecord_sit_parcela_n_valor
        join: 'custrecord_sit_parcela_l_transacao',
        operator: search.Operator.GREATERTHAN,
        values: 0
      }, {
        name: 'formulanumeric',
        formula: amountRemainingFormula,
        operator: search.Operator.GREATERTHAN,
        values: 0
      }, {
        name: 'custrecord_sit_parcela_l_conta_prev',  // 'custbody_ps_cnab_forecast_bank_account', 
        join: 'custrecord_sit_parcela_l_transacao',
        operator: search.Operator.NONEOF,
        values: '@NONE@'
      }, {
        name: 'custbody_o2s_parcela_l_tp_servico', //'custbody_ps_cnab_payment_type',
        operator: search.Operator.NONEOF,
        values: '@NONE@'
      }, {
        name: 'custbody_o2s_transaction_l_meio_pgto', // ps_cnab_payment_form', 
        operator: search.Operator.NONEOF,
        values: '@NONE@'
      }]

      const recordId = parameters.custparam_record_id

      if (recordId) {
        searchFilters.push({
          name: 'internalid',
          operator: search.Operator.ANYOF,
          values: recordId
        })
      } else {
        const filtersFieldGroupId = 'filters'
        form.addFieldGroup({ id: filtersFieldGroupId, label: 'Filtros' })
        //----------------------------subsidiary---------------------------
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
          name: 'subsidiary',
          operator: search.Operator.ANYOF,
          values: filterSubsidiaryFieldValue
        })
        //----------------------Dates------------------------------------------
        const filterDueDateFromFieldId = 'custpage_filter_due_date_from'

        const filterDueDateFromField = form.addField({
          id: filterDueDateFromFieldId,
          type: serverWidget.FieldType.DATE,
          label: 'Data de vencimento - DE',
          container: filtersFieldGroupId
        })

        var today = new Date()
        var filterDueDateFromFieldValue = parameters[filterDueDateFromFieldId]
        if (!filterDueDateFromFieldValue) {
          filterDueDateFromFieldValue = format.format({ type: format.Type.DATE, value: today })
        }

        filterDueDateFromField.defaultValue = filterDueDateFromFieldValue

        const filterDueDateToFieldId = 'custpage_filter_due_date_to'

        const filterDueDateToField = form.addField({
          id: filterDueDateToFieldId,
          type: serverWidget.FieldType.DATE,
          label: 'Data de vencimento - ATÉ',
          container: filtersFieldGroupId
        })

        var lastDayOfThisMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
        var filterDueDateToFieldValue = parameters[filterDueDateToFieldId]
        if (!filterDueDateToFieldValue) {
          filterDueDateToFieldValue = format.format({ type: format.Type.DATE, value: lastDayOfThisMonth })
        }

        filterDueDateToField.defaultValue = filterDueDateToFieldValue

        searchFilters.push({
          name: 'custrecord_sit_parcela_d_dt_vencimen',  // 'duedate',
          join: 'custrecord_sit_parcela_l_transacao',
          operator: search.Operator.WITHIN,
          values: [filterDueDateFromFieldValue, filterDueDateToFieldValue]
        })
        //---------------------------Bank----------------------------------------
        const filterForecastBankAccountFieldId = 'custpage_filter_forecast_bank_acc'

        const filterForecastBankAccountField = form.addField({
          id: filterForecastBankAccountFieldId,
          type: serverWidget.FieldType.SELECT,
          label: 'Conta Banco Previsão',
          container: filtersFieldGroupId
        })

        var filterForecastBankAccountFieldValue = parameters[filterForecastBankAccountFieldId]

        if (filterSubsidiaryFieldValue) {
          filterForecastBankAccountField.addSelectOption({ value: '', text: '', isSelected: true })

          const bankAccounts = _fetchBankAccountsBySubsidiary(filterSubsidiaryFieldValue)

          bankAccounts.forEach(function (bankAccount) {
            const isSelected = bankAccount.id === filterForecastBankAccountFieldValue
            filterForecastBankAccountField.addSelectOption({ value: bankAccount.id, text: bankAccount.name, isSelected: isSelected })
          })


          if (filterForecastBankAccountFieldValue) {
            const bankAccount = search.lookupFields({
              type: 'customrecord_ps_bank_account',
              id: parseInt(filterForecastBankAccountFieldValue),
              columns: ['custrecord_ps_bac_account']
            }).custrecord_ps_bac_account

            searchFilters.push({
              name: 'custrecord_sit_parcela_l_conta_prev',
              join: 'custrecord_sit_parcela_l_transacao',
              operator: search.Operator.ANYOF,
              values: bankAccount
            })
          }
        }

        const filtersFields = [
          filterSubsidiaryField,
          filterDueDateFromField,
          filterDueDateToField,
          filterForecastBankAccountField
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
      }

      const installmentsSublist = form.addSublist({ id: 'installments', type: serverWidget.SublistType.LIST, label: 'Parcelas' })
      installmentsSublist.addMarkAllButtons()

      installmentsSublist.addField({ id: 'custpage_transaction_id', type: serverWidget.FieldType.TEXT, label: 'Transação ID' })
        .updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN })

      installmentsSublist.addField({ id: 'custpage_selected', type: serverWidget.FieldType.CHECKBOX, label: 'Selecionar' })
      installmentsSublist.addField({ id: 'custpage_transaction_entity', type: serverWidget.FieldType.TEXT, label: 'Entidade' })
      installmentsSublist.addField({ id: 'custpage_transaction_number', type: serverWidget.FieldType.TEXT, label: 'Transação' })
      installmentsSublist.addField({ id: 'custpage_installment_number', type: serverWidget.FieldType.TEXT, label: 'Parcela' })
      installmentsSublist.addField({ id: 'custpage_installment_due_date', type: serverWidget.FieldType.DATE, label: 'Vencimento' })
      installmentsSublist.addField({ id: 'custpage_installment_amount', type: serverWidget.FieldType.CURRENCY, label: 'Valor' })
      installmentsSublist.addField({ id: 'custpage_installment_due_amount', type: serverWidget.FieldType.CURRENCY, label: 'Valor (Em aberto)' })
      installmentsSublist.addField({ id: 'custpage_installment_payment_amount', type: serverWidget.FieldType.CURRENCY, label: 'Valor (Pagamento)' })
      installmentsSublist.addField({ id: 'custpage_discount', type: serverWidget.FieldType.CURRENCY, label: 'Desconto' })
        .updateDisplayType({ displayType: serverWidget.FieldDisplayType.ENTRY })
      installmentsSublist.addField({ id: 'custpage_interest', type: serverWidget.FieldType.CURRENCY, label: 'Juros' })
        .updateDisplayType({ displayType: serverWidget.FieldDisplayType.ENTRY })

      search.create({
        type: search.Type.TRANSACTION,
        filters: searchFilters,
        columns: [
          { name: 'entity' },
          { name: 'transactionname' },
          { name: 'custrecord_sit_parcela_i_numero', join: 'custrecord_sit_parcela_l_transacao' }, //'installmentnumber', join: 'installment' ???
          { name: 'custrecord_sit_parcela_d_dt_vencimen', join: 'custrecord_sit_parcela_l_transacao' }, //'duedate', join: 'installment'
          { name: 'custrecord_sit_parcela_n_vl_pago', join: 'custrecord_sit_parcela_l_transacao' },  //'amount', join: 'installment' ???
          { name: 'formulanumeric', formula: amountRemainingFormula },
          { name: 'subsidiary' },
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
            { id: 'custpage_transaction_id', value: result.id },
            { id: 'custpage_transaction_entity', value: result.getText(columns[0]) },
            { id: 'custpage_transaction_number', value: result.getValue(columns[1]) },
            { id: 'custpage_installment_number', value: result.getValue(columns[2]) },
            { id: 'custpage_installment_due_date', value: result.getValue(columns[3]) },
            { id: 'custpage_installment_amount', value: result.getValue(columns[4]) },
            { id: 'custpage_installment_due_amount', value: result.getValue(columns[5]) },
            { id: 'custpage_installment_payment_amount', value: result.getValue(columns[5]) }
          ]
          fields.forEach(function (field) {
            var value = field.value
            if (!value) return
            installmentsSublist.setSublistValue({ id: field.id, value: value, line: line })
          })
          return true
        })

      form.clientScriptModulePath = '../clients/ps_cnab_cl_add_payment_br.js' //'../clients/ps_cnab_cl_add_payment.js'

      form.addField({
        id: 'custpage_server_script',
        type: serverWidget.FieldType.LONGTEXT,
        label: 'Server Script'
      })
        .updateDisplayType({
          displayType: serverWidget.FieldDisplayType.HIDDEN
        })
        .defaultValue = JSON.stringify(runtime.getCurrentScript())

      form.addSubmitButton({ label: 'Enviar' })

      return form
    }

    /**
     * Fetch subsidiaries.
     *
     * @returns {{name: string, id: number}[]}
     * @private
     */
    function _fetchSubsidiaries() {
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

    /**
     * Fetch bank accounts by subsidiary.
     *
     * @param subsidiaryId
     * @returns {{name: string, id: number}[]}
     * @private
     */
    function _fetchBankAccountsBySubsidiary(subsidiaryId) {
      return search.create({
        type: 'customrecord_ps_bank_account',
        filters: [{
          name: 'custrecord_ps_bac_subsidiary_owner',
          operator: search.Operator.ANYOF,
          values: subsidiaryId
        }, {
          name: 'custrecord_ps_bac_id_payment',
          operator: search.Operator.ISNOTEMPTY
        }, {
          name: 'isinactive',
          operator: search.Operator.IS,
          values: false
        }],
        columns: [{
          name: 'name'
        }]
      })
        .run()
        .getRange({
          start: 0,
          end: 1000
        })
        .map(function (result) {
          return {
            id: result.id,
            name: result.getValue(result.columns[0])
          }
        })
    }

    return {
      onRequest: onRequest
    }
  })
