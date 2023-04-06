/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/runtime', 'N/search', 'N/record', 'N/error', 'N/ui/serverWidget', '../modules/tecnospeed/index'],
  function (runtime, search, record, error, serverWidget, Tecnospeed) {
    /**
     * Function definition to be triggered after record is submitted.
     *
     * @param {Object} context
     * @param {Record} context.newRecord - New record
     * @param {Record} context.oldRecord - Old record
     * @param {string} context.type - Trigger type
     */
    function afterSubmit(context) {
      var idCollect, subsidiaryOwnerId, subsidiaryOwner, collectApiResponse, tecnospeedApi, collectApi, idaccount, codeBank

      if (runtime.executionContext !== runtime.ContextType.USER_INTERFACE) return

      const newRecord = context.newRecord
      const type = context.type
      const UserEventType = context.UserEventType

      subsidiaryOwnerId = newRecord.getValue({ fieldId: 'custrecord_ps_bac_subsidiary_owner' })
      log.debug('subsidiaryOwnerId', subsidiaryOwnerId)
      subsidiaryOwner = _fetchSubsidiaryOwner(subsidiaryOwnerId)
      tecnospeedApi = new Tecnospeed()
      collectApi = tecnospeedApi.Collect({ cpfCnpj: subsidiaryOwner.CedenteCPFCNPJ })

      idCollect = newRecord.getValue({ fieldId: 'custrecord_ps_bac_id_collect' })
      layout400 = newRecord.getValue({ fieldId: 'custrecord_ps_bac_layout400' })

      codeBank = newRecord.getValue({fieldId: 'custrecord_ps_bac_bank'})

      record.submitFields({
        type: newRecord.type,
        id: newRecord.id,
        values: {
          custrecord_ps_bac_corresp: codeBank
        }
      })

      if (!layout400) return

      const account = {
        ContaCodigoBanco: newRecord.getValue({ fieldId: 'custrecord_ps_bac_bank_code' }),
        ContaAgencia: newRecord.getValue({ fieldId: 'custrecord_ps_bac_agency_number' }),
        ContaAgenciaDV: newRecord.getValue({ fieldId: 'custrecord_ps_bac_agency_digit' }),
        ContaNumero: newRecord.getValue({ fieldId: 'custrecord_ps_bac_account_number' }),
        ContaNumeroDV: newRecord.getValue({ fieldId: 'custrecord_ps_bac_account_digit' }),
        ContaCodigoBeneficiario: newRecord.getValue({ fieldId: 'custrecord_ps_bac_benef_code' }),
        ContaCodigoBancoCorrespondente: newRecord.getValue({ fieldId: 'custrecord_ps_bac_corresp' }),
        ContaCodigoEmpresa: newRecord.getValue({ fieldId: 'custrecord_ps_bac_companycod' }),
        ContaValidacaoAtiva: false,
        ContaImpressaoAtualizada: true,
        ContaTipo: '',
      }

      log.debug('account', account)

      const ContaTipo = newRecord.getValue({ fieldId: 'custrecord_ps_bac_acctype' })
      account.ContaTipo = (ContaTipo === '1' ? 'CORRENTE' : 'POUPANÇA')

      if (type === UserEventType.CREATE) { // Rever para incluir o cedente quando for edição com alteração do flag layout400

        if (subsidiaryOwner.hasIntegratedAccounts !== 0) {  // já existe alguma conta para essa subsidiária
          collectApiResponse = collectApi.createAccount(account)
          try {
            collectApiResponse = collectApi.createAccount(account)
          } catch (e) {
            if (e.message.indexOf('já cadastrada para este cedente.') !== -1) {
              idaccount = newRecord.getValue({ fieldId: 'custrecord_ps_bac_id_collect' })
              if (idaccount) {
                collectApiResponse = collectApi.updateAccount(idaccount, account)
              }
            } else {
              throw e
            }
          }
        } else {  // primeira conta dessa subsidiária 
          try {
            collectApiResponse = collectApi.createAssignor(subsidiaryOwner)
            collectApiResponse = collectApi.createReturnHook(subsidiaryOwner)
            collectApiResponse = collectApi.createAccount(account)
            // collectApi.createReturnHook()
          } catch (e) {
            if (e.message.indexOf('já está sendo utilizado pela software house') !== -1) { // subsidiária já cadastrada como cedente mas sem conta vinculada
              try {
                collectApiResponse = collectApi.createAccount(account)
                // collectApi.createReturnHook()
              } catch (e) {
                throw e
              }
            } else {
              throw e
            }
          }
        }

        if (collectApiResponse) { // depois de implementar o update não será mais necessário
          record.submitFields({
            type: newRecord.type,
            id: newRecord.id,
            values: {
              custrecord_ps_bac_id_collect: collectApiResponse._dados.id,
              custrecord_ps_bac_id_assignor: collectApiResponse._dados.id_cedente,
            }
          })
        }
      }
      if (type === UserEventType.EDIT) {
        idaccount = newRecord.getValue({ fieldId: 'custrecord_ps_bac_id_collect' })
        if (idaccount) {
          collectApiResponse = collectApi.updateAccount(idaccount, account)
        }
      }

      if (type === UserEventType.DELETE) {
        const oldRecord = context.oldRecord
        subsidiaryOwnerId = oldRecord.getValue({ fieldId: 'custrecord_ps_bac_subsidiary_owner' })
        idCollect = oldRecord.getValue({ fieldId: 'custrecord_ps_bac_id_collect' })

        if (!subsidiaryOwnerId || !idCollect) return

        subsidiaryOwner = _fetchSubsidiaryOwner(subsidiaryOwnerId)
        tecnospeedApi = new Tecnospeed()
        collectApi = tecnospeedApi.Collect({ cpfCnpj: subsidiaryOwner.CedenteCPFCNPJ })

        try {
          collectApiResponse = collectApi.deleteAccount(idCollect, subsidiaryOwner.CedenteCPFCNPJ)
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
    function _fetchSubsidiaryOwner(id) {
      return search.create({
        type: search.Type.SUBSIDIARY,
        filters: [{
          name: 'internalid',
          operator: search.Operator.IS,
          values: id
        }],
        columns: [
          {
            name: 'legalname' //0
          },
          {
            name: 'custrecord_psg_br_cnpj', // 1
          },
          {
            name: 'custrecord_sit_address_t_bairro', // 2
            join: 'address'
          },
          {
            name: 'custrecord_sit_address_i_numero', // 3
            join: 'address'
          },
          {
            name: 'zip',  // 4
            join: 'address'
          },
          {
            name: 'state', // 5
            join: 'address'
          },
          {
            name: 'custrecord_o2g_address_l_mun',  // 6
            join: 'address'
          },
          {
            name: 'name', // 7
          },
          {
            name: 'address1',  // 8
            join: 'address'
          },
          {
            name: 'custrecord_sit_address_complemento',  // 9
            join: 'address'
          },
          {
            name: 'fax', //10
          },
          {
            name: 'email', //11 
          },
        ]
      })
        .run()
        .getRange({
          start: 0,
          end: 1
        })
        .reduce(function (acc, result) {
          const columns = result.columns
          acc = {
            CedenteRazaoSocial: result.getValue(columns[0]),
            CedenteCPFCNPJ: result.getValue(columns[1]),
            CedenteEnderecoBairro: result.getValue(columns[2]),
            CedenteEnderecoNumero: result.getValue(columns[3]),
            CedenteEnderecoCEP: result.getValue(columns[4]),
            CedenteNomeFantasia: result.getValue(columns[7]),
            CedenteEnderecoLogradouro: result.getValue(columns[8]),
            CedenteEnderecoComplemento: result.getValue(columns[9]),
            CedenteTelefone: result.getValue(columns[10]),
            CedenteEmail: result.getValue(columns[11]),
            hasIntegratedAccounts: search.create({
              type: 'customrecord_ps_bank_account',
              filters: [{
                name: 'custrecord_ps_bac_subsidiary_owner',
                operator: search.Operator.ANYOF,
                values: id
              }, {
                name: 'custrecord_ps_bac_id_collect',
                operator: search.Operator.ISNOTEMPTY
              }]
            })
              .runPaged()
              .count
          }

          search.create({
            type: 'customrecord_sit_municipio',
            filters: [{
              name: 'internalid', // custrecord_sit_municipio_i_identif 
              operator: search.Operator.IS,
              values: result.getValue(columns[6])
            }],
            columns: [{
              name: 'custrecord_sit_municipio_t_cd_municipi'
            }]
          })
            .run()
            .each(function (result) {
              acc.CedenteEnderecoCidadeIBGE = result.getValue(result.columns[0])
            });

          return acc
        }, {})
    }

    return {
      afterSubmit: afterSubmit
    }
  })
