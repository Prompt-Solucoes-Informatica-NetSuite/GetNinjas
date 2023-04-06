/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/runtime', 'N/search', 'N/file', 'N/encode', 'N/record', 'N/redirect', '../modules/payment-remittance-dao', '../modules/tecnospeed/index'],
  function (runtime, search, file, encode, record, redirect, paymentRemittanceDAO, Tecnospeed) {
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
      const currentStatusId = newRecord.getValue({ fieldId: 'custrecord_ps_pre_status' })
      const Status = paymentRemittanceDAO.fetchStatus()

      if (currentStatusId === Status.PROCESSED || currentStatusId === Status.SENT) return

      const subsidiaryId = newRecord.getValue({ fieldId: 'custrecord_ps_pre_subsidiary' })
      const subsidiaryCpfCnpjColumn = 'custrecord_ps_subsidiary_cnpj'
      const subsidiaryValues = search.lookupFields({ type: search.Type.SUBSIDIARY, id: subsidiaryId, columns: subsidiaryCpfCnpjColumn })
      const subsidiaryCpfCnpj = subsidiaryValues[subsidiaryCpfCnpjColumn]

      const tecnospeedApi = new Tecnospeed()
      const paymentApi = tecnospeedApi.Payment({ cpfCnpj: subsidiaryCpfCnpj })

      const paymentApiResponse = paymentApi.fetchRemittance(newRecord.getValue({ fieldId: 'custrecord_ps_pre_id' }))

      const statusId = paymentRemittanceDAO.fetchStatusByCode(paymentApiResponse.status)

      if (statusId === currentStatusId) {
        context.form.addButton({
          id: 'custpage_check_status',
          label: 'Verificar status',
          functionName: '(function(){window.location.reload()})'
        })
      } else {
        const paymentRemittanceRecordType = newRecord.type
        const paymentRemittanceId = newRecord.id

        const values = {
          custrecord_ps_pre_status: statusId
        }

        const content = paymentApiResponse.content

        if (content) {
          const remittanceFileName = 'REM' + paymentRemittanceId + '.txt'

          const remittanceFile = file.create({
            name: remittanceFileName,
            fileType: file.Type.PLAINTEXT,
            contents: encode.convert({
              string: content,
              inputEncoding: encode.Encoding.BASE_64,
              outputEncoding: encode.Encoding.UTF_8
            }),
            encoding: file.Encoding.UTF8,
            folder: _getRemittanceFolderId()
          })

          values.custrecord_ps_pre_file = remittanceFile.save()
        }

        record.submitFields({
          type: paymentRemittanceRecordType,
          id: paymentRemittanceId,
          values: values
        })

        redirect.toRecord({
          type: paymentRemittanceRecordType,
          id: paymentRemittanceId
        })
      }
    }

    /**
     * Get remittance folder ID.
     *
     * @returns {number}
     * @private
     */
    function _getRemittanceFolderId () {
      const folderName = 'PS CNAB Remittance'

      var folderId = search.create({
        type: search.Type.FOLDER,
        filters: [{
          name: 'name',
          operator: search.Operator.IS,
          values: folderName
        }]
      })
        .run()
        .getRange({
          start: 0,
          end: 1
        })
        .reduce(function (acc, result) {
          return acc + result.id
        }, '')

      if (!folderId) {
        const folder = record.create({ type: record.Type.FOLDER })
        folder.setValue({ fieldId: 'name', value: folderName })
        folderId = folder.save({ ignoreMandatoryFields: true })
      }

      return folderId
    }

    return {
      beforeLoad: beforeLoad
    }
  })
