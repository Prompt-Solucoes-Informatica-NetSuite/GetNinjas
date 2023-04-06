/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */
define(['N/ui/serverWidget', 'N/search', 'N/record', 'N/file', 'N/redirect', 'N/task', '../modules/payment-return-dao', '../modules/tecnospeed/index'],
  function (serverWidget, search, record, file, redirect, task, paymentReturnDAO, Tecnospeed) {
    /**
     * Definition of the Suitelet script trigger point.
     *
     * @param {Object} context
     * @param {ServerRequest} context.request - Encapsulation of the incoming request
     * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
     */
    function onRequest (context) {
      const serverRequest = context.request
      const serverResponse = context.response
      const parameters = serverRequest.parameters

      if (serverRequest.method === 'GET') {
        serverResponse.writePage({
          pageObject: _buildReturnForm()
        })
      } else { // POST
        const subsidiaryId = parameters.custpage_subsidiary
        const subsidiaryCpfCnpjColumn = 'custrecord_ps_subsidiary_cnpj'
        const subsidiaryValues = search.lookupFields({ type: search.Type.SUBSIDIARY, id: subsidiaryId, columns: subsidiaryCpfCnpjColumn })
        const subsidiaryCpfCnpj = subsidiaryValues[subsidiaryCpfCnpjColumn]

        const tecnospeedApi = new Tecnospeed()
        const paymentApi = tecnospeedApi.Payment({ cpfCnpj: subsidiaryCpfCnpj })

        const returnFile = serverRequest.files.custpage_return_file
        const paymentApiResponse = paymentApi.uploadReturn(returnFile)

        returnFile.folder = _getReturnFolderId()
        const returnFileId = returnFile.save()

        const paymentReturnRecordType = 'customrecord_ps_payment_return'
        const returnRecord = record.create({ type: paymentReturnRecordType })
        returnRecord.setValue({ fieldId: 'name', value: returnFile.name })
        returnRecord.setValue({ fieldId: 'custrecord_ps_prt_subsidiary', value: subsidiaryId })
        returnRecord.setValue({ fieldId: 'custrecord_ps_prt_file', value: returnFileId })
        returnRecord.setValue({ fieldId: 'custrecord_ps_prt_id', value: paymentApiResponse.uniqueId })
        returnRecord.setValue({ fieldId: 'custrecord_ps_prt_status', value: paymentReturnDAO.fetchStatusByCode(paymentApiResponse.status) })
        const paymentReturnId = returnRecord.save()

        redirect.toRecord({
          type: paymentReturnRecordType,
          id: paymentReturnId
        })
      }
    }

    /**
     * Build Retorno form.
     *
     * @returns {Form}
     * @private
     */
    function _buildReturnForm () {
      const form = serverWidget.createForm({ title: 'Adicionar retorno de pagamento' })

      form.addField({
        id: 'custpage_subsidiary',
        type: serverWidget.FieldType.SELECT,
        label: 'Subsidiária',
        source: 'subsidiary'
      })
        .isMandatory = true

      form.addField({
        id: 'custpage_return_file',
        type: serverWidget.FieldType.FILE,
        label: 'Arquivo'
      })
        .isMandatory = true

      form.addSubmitButton({
        label: 'Adicionar'
      })

      return form
    }

    /**
     * Get return folder ID.
     *
     * @returns {number}
     * @private
     */
    function _getReturnFolderId () {
      const folderName = 'PS CNAB Return'

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
      onRequest: onRequest
    }
  })
