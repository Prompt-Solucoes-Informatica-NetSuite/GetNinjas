/**
 *@NApiVersion 2.1
 *@NScriptType UserEventScript
 */
define(['N/record', 'N/search', 'N/render', 'N/file', 'N/encode', 'N/ui/message', '../modules/tecnospeed/index'],

    function (record, search, render, file, encode, message, Tecnospeed) {

        function beforeLoad(context) {
            log.debug('context', context)
            const newRecord = context.newRecord
            const status = newRecord.getValue({ fieldId: 'custrecord_ps_pay_status' })
            if (status === '2') {

                log.debug('status', status)

                log.debug('entrei')

                const subsidiaryId = newRecord.getValue({ fieldId: 'custrecord_ps_pay_subsidiary' })
                const uniqueIdPayment = newRecord.getValue({ fieldId: 'custrecord_ps_pay_id' })
                const subsidiaryCpfCnpj = search.lookupFields({
                    type: search.Type.SUBSIDIARY,
                    id: subsidiaryId,
                    columns: ['custrecord_psg_br_cnpj']
                }).custrecord_psg_br_cnpj

                log.debug('subsidiaryCpfCnpj', subsidiaryCpfCnpj)
                const tecnospeedApi = new Tecnospeed()
                const paymentApi = tecnospeedApi.Payment({ cpfCnpj: subsidiaryCpfCnpj })
                // const requestProof = paymentApi.requestProof(uniqueIdPayment)

                // var arquivo = paymentApi.fetchProof('6AMlGPmmzgILhsE5Q3k2g')

                // const paymentProofId = newRecord.id

                // const pdfFile = file.create({
                //     name: 'comprovante_de_pagamento_' + paymentProofId + '.pdf',
                //     fileType: file.Type.PDF,
                //     contents: encode.convert({
                //         string: arquivo,
                //         inputEncoding: encode.Encoding.UTF_8,
                //         outputEncoding: encode.Encoding.BASE_64
                //     }),
                //     encoding: file.Encoding.BASE_64,
                //     folder: _getPaymentProofFolderId()
                // })

                // pdfFile.save()


                // log.debug('arquivo', arquivo)
                // log.debug('pdfFile', pdfFile)
            }
        }

        /**
         * Get Payment Proof folder ID.
         *
         * @returns {number}
         * @private
         */
        function _getPaymentProofFolderId() {
            const folderName = 'PS CNAB COMPROVANTE PAGAMENTO'

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
    });
