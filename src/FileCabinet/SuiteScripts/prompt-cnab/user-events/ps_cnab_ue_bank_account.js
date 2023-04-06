/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/runtime', 'N/search', 'N/record', 'N/error', 'N/ui/serverWidget', '../modules/tecnospeed/index'],
  function (runtime, search, record, error, serverWidget, Tecnospeed) {
    /**
     * Function definition to be triggered before record is loaded.
     *
     * @param {Object} context
     * @param {Record} context.newRecord - New record
     * @param {string} context.type - Trigger type
     * @param {Form} context.form - Current form
     */
    function beforeLoad (context) {
      if (runtime.executionContext !== runtime.ContextType.USER_INTERFACE) return

      const form = context.form
      const newRecord = context.newRecord
      const vendorOwnerFieldId = newRecord.getValue({ fieldId: 'custrecord_ps_bac_vendor_owner' })
      const fieldsToHide = []

      if (vendorOwnerFieldId) {
        fieldsToHide.push('custrecord_ps_bac_subsidiary_owner')
        fieldsToHide.push('custrecord_ps_bac_id_payment')
      } else {
        fieldsToHide.push('custrecord_ps_bac_vendor_owner')
      }

      fieldsToHide.forEach(function (fieldId) {
        form.getField({ id: fieldId })
          .updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN })
      })
    }

    /**
     * Function definition to be triggered after record is submitted.
     *
     * @param {Object} context
     * @param {Record} context.newRecord - New record
     * @param {Record} context.oldRecord - Old record
     * @param {string} context.type - Trigger type
     */
    function afterSubmit (context) {
      var idPayment, subsidiaryOwnerId, subsidiaryOwner, paymentApiResponse, tecnospeedApi, paymentApi, layout240


      if (runtime.executionContext !== runtime.ContextType.USER_INTERFACE) return

      const newRecord = context.newRecord
      const type = context.type
      const UserEventType = context.UserEventType

      if (type === UserEventType.CREATE || type === UserEventType.EDIT) {
        subsidiaryOwnerId = newRecord.getValue({ fieldId: 'custrecord_ps_bac_subsidiary_owner' })
        idPayment = newRecord.getValue({ fieldId: 'custrecord_ps_bac_id_payment' })
        layout240 = newRecord.getValue({ fieldId: 'custrecord_ps_bac_layout240' })


        if (!subsidiaryOwnerId || idPayment || !layout240) return

        const account = {
          bankCode: newRecord.getValue({ fieldId: 'custrecord_ps_bac_bank_code' }),
          agency: newRecord.getValue({ fieldId: 'custrecord_ps_bac_agency_number' }),
          agencyDigit: newRecord.getValue({ fieldId: 'custrecord_ps_bac_agency_digit' }),
          accountNumber: newRecord.getValue({ fieldId: 'custrecord_ps_bac_account_number' }),
          accountNumberDigit: newRecord.getValue({ fieldId: 'custrecord_ps_bac_account_digit' }),
          accountDac: newRecord.getValue({ fieldId: 'custrecord_ps_bac_account_dac' }),
          convenioNumber: newRecord.getValue({ fieldId: 'custrecord_ps_bac_covenant_number' }),
          remessaSequential: newRecord.getValue({ fieldId: 'custrecord_ps_bac_remittance_sequence' }) || undefined
        }

        subsidiaryOwner = _fetchSubsidiaryOwner(subsidiaryOwnerId)
        tecnospeedApi = new Tecnospeed()
        paymentApi = tecnospeedApi.Payment({ cpfCnpj: subsidiaryOwner.cpfCnpj })

        if (subsidiaryOwner.hasIntegratedAccounts) {
          paymentApiResponse = paymentApi.createAccount([account])
        } else {
          subsidiaryOwner.accounts.push(account)
          try {
            paymentApiResponse = paymentApi.createPayer(subsidiaryOwner)
          } catch (e) {
            if (e.message.indexOf('Já existe um pagador com esse CPF/CNPJ') !== -1) {
              paymentApiResponse = paymentApi.createAccount([account])
            } else {
              throw e
            }
          }
        }

        record.submitFields({
          type: newRecord.type,
          id: newRecord.id,
          values: {
            custrecord_ps_bac_id_payment: paymentApiResponse.accounts[0].accountHash
          }
        })
      } if (type === UserEventType.DELETE) {
        const oldRecord = context.oldRecord
        subsidiaryOwnerId = oldRecord.getValue({ fieldId: 'custrecord_ps_bac_subsidiary_owner' })
        idPayment = oldRecord.getValue({ fieldId: 'custrecord_ps_bac_id_payment' })

        if (!subsidiaryOwnerId || !idPayment) return

        subsidiaryOwner = _fetchSubsidiaryOwner(subsidiaryOwnerId)
        tecnospeedApi = new Tecnospeed()
        paymentApi = tecnospeedApi.Payment(subsidiaryOwner.cpfCnpj)

        try {
          paymentApi.deleteAccount([{ accountHash: [idPayment] }])
        } catch (e) {
          log.error({ title: 'PROMPT_DELETE_ACCOUNT', details: e })
        }
      }
    }

    /**
     * Fetch subsidiary owner.
     *
     * @param id
     * @returns {Result|{}}
     * @private
     */
    function _fetchSubsidiaryOwner (id) {
      return search.create({
        type: search.Type.SUBSIDIARY,
        filters: [{
          name: 'internalid',
          operator: search.Operator.IS,
          values: id
        }],
        columns: [{
          name: 'legalname'
        }, {
          name: 'custrecord_ps_subsidiary_cnpj'
        }, {
          name: 'address3',
          join: 'address'
        }, {
          name: 'custrecord_enl_numero',
          join: 'address'
        }, {
          name: 'zip',
          join: 'address'
        }, {
          name: 'custrecord_enl_uf',
          join: 'address'
        }, {
          name: 'custrecord_enl_city',
          join: 'address'
        }]
      })
        .run()
        .getRange({
          start: 0,
          end: 1
        })
        .reduce(function (acc, result) {
          const columns = result.columns
          acc = {
            name: result.getValue(columns[0]),
            cpfCnpj: result.getValue(columns[1]),
            neighborhood: result.getValue(columns[2]),
            addressNumber: result.getValue(columns[3]),
            zipcode: result.getValue(columns[4]),
            state: result.getText(columns[5]),
            city: result.getText(columns[6]),
            accounts: [],
            hasIntegratedAccounts: search.create({
              type: 'customrecord_ps_bank_account',
              filters: [{
                name: 'custrecord_ps_bac_subsidiary_owner',
                operator: search.Operator.ANYOF,
                values: id
              }, {
                name: 'custrecord_ps_bac_id_payment',
                operator: search.Operator.ISNOTEMPTY
              }]
            })
              .runPaged()
              .count
          }
          return acc
        }, {})
    }

    return {
      beforeLoad: beforeLoad,
      afterSubmit: afterSubmit
    }
  })
