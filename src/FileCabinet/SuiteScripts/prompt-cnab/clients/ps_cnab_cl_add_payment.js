/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope Public
 */
define(['N/currentRecord', 'N/format', 'N/url', 'N/search', 'N/ui/dialog'],
  function (currentRecord, format, url, search, dialog) {
    /**
     * Function to be executed when field is changed.
     *
     * @param {Object} context
     * @param {Record} context.currentRecord - Current form record
     * @param {string} context.sublistId - Sublist name
     * @param {string} context.fieldId - Field name
     * @param {number} context.lineNum - Line number. Will be undefined if not a sublist or matrix field
     * @param {number} context.columnNum - Line number. Will be undefined if not a matrix field
     */
    function fieldChanged (context) {
      const currentRecord = context.currentRecord
      const fieldId = context.fieldId

      if (fieldId === 'custpage_filter_subsidiary') {
        const forecastBankAccountField = currentRecord.getField({ fieldId: 'custpage_filter_forecast_bank_acc' })

        if (!forecastBankAccountField) return

        // Clean forecast bank account field.
        forecastBankAccountField.getSelectOptions().forEach(function (option) {
          if (!option.value) return
          forecastBankAccountField.removeSelectOption({ value: option.value })
        })

        // Get bank accounts.
        const subsidiaryId = currentRecord.getValue({ fieldId: fieldId })

        if (!subsidiaryId) return

        // Add new select options.
        const bankAccounts = _fetchBankAccountsBySubsidiary(subsidiaryId)

        bankAccounts.forEach(function (bankAccount) {
          forecastBankAccountField.insertSelectOption({ value: bankAccount.id, text: bankAccount.name })
        })
      }
    }

    /**
     * Validation function to be executed when record is saved.
     *
     * @param {Object} context
     * @param {Record} context.currentRecord - Current form record
     * @returns {boolean} Return true if record is valid
     */
    function saveRecord (context) {
      const form = context.currentRecord
      const installmentsCount = form.getLineCount({ sublistId: 'installments' })

      var selectedInstallmentsCount = 0

      for (var line = 0; line < installmentsCount; line++) {
        var isSelected = form.getSublistValue({ sublistId: 'installments', fieldId: 'custpage_selected', line: line })
        if (!isSelected) continue
        selectedInstallmentsCount++
      }

      if (selectedInstallmentsCount === 0) {
        dialog.alert({
          title: 'Atenção',
          message: 'Selecione ao menos uma parcela.'
        })
        return false
      }

      return true
    }

    /**
     * Apply filters.
     */
    function applyFilters () {
      const form = currentRecord.get()
      const filterFields = JSON.parse(form.getValue({ fieldId: 'custpage_filter_fields' }))
      const params = filterFields.reduce(function (acc, field) {
        const fieldId = field.id
        var fieldValue = form.getValue({ fieldId: fieldId })
        const fieldType = field.type
        if (fieldType === 'date' && fieldValue) {
          fieldValue = format.format({ type: format.Type.DATE, value: fieldValue })
        } else if (fieldType === 'multiselect') {
          fieldValue = fieldValue.join()
        }
        if (fieldValue) {
          acc[fieldId] = fieldValue
        }
        return acc
      }, {})
      const serverScript = JSON.parse(form.getValue({ fieldId: 'custpage_server_script' }))
      window.onbeforeunload = function () {}
      window.location.replace(url.resolveScript({
        scriptId: serverScript.id,
        deploymentId: serverScript.deploymentId,
        params: params
      }))
    }

    /**
     * Fetch bank accounts by subsidiary.
     *
     * @param subsidiaryId
     * @returns {{name: string, id: number}[]}
     * @private
     */
    function _fetchBankAccountsBySubsidiary (subsidiaryId) {
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
      fieldChanged: fieldChanged,
      saveRecord: saveRecord,
      applyFilters: applyFilters
    }
  })
