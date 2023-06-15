/**
 *@NApiVersion 2.1
 *@NScriptType Restlet
 */
define(['N/record', 'N/search'], function (record, search) {

      const mascaraCnpj = (valor) => valor.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/g, "\$1.\$2.\$3\/\$4\-\$5");
      const mCPF = (cpf) => {
            cpf = cpf.replace(/\D/g, "")
            cpf = cpf.replace(/(\d{3})(\d)/, "$1.$2")
            cpf = cpf.replace(/(\d{3})(\d)/, "$1.$2")
            cpf = cpf.replace(/(\d{3})(\d{1,2})$/, "$1-$2")

            return cpf
      }

      const _post = (context) => {
            log.debug('Context', context)

            const serverResponse = context.response;
            const requestBody = context

            try {
                  if (requestBody) {
                        idCustomer = ''
                        const logRecordObj = record.create({ type: 'customrecord_cpb_registro_compra_moedas', isDynamic: true })
                        logRecordObj.setValue({ fieldId: 'custrecord_cpb_dicionario', value: JSON.stringify(requestBody) })
                        logRecordObj.setValue('custrecord_cpb_tipo_registro', 'Criado')

                        var idTransacao = requestBody.idTransacao || null
                        var idCliente = requestBody.idCliente || null
                        var centroDeCusto = requestBody.centroDeCusto || null
                        var condicaoDePagamento = requestBody.condicaoDePagamento || null
                        var produto = requestBody.produto || null
                        var idProduto = produto.idProduto || null
                        var descricao = produto.descricao || null
                        var quantidade = produto.quantidade || null
                        var valorUnitario = parseFloat(produto.valorUnitario) || null

                        search.create({
                              type: 'customer',
                              filters: [
                                    ["custentity_cpb_id_getninjas", "is", idCliente]
                              ],
                              columns: [
                                    search.createColumn({ name: 'internalid' }),
                              ]
                        }).run().getRange({ start: 0, end: 1 })
                              .forEach(function (result) {
                                    idCustomer = result.getValue('internalid')
                              })

                        if (idCustomer) {
                              var registerCompraMoeda = record.create({ type: 'customrecord_cpb_compra_moeda', isDynamic: true })

                              registerCompraMoeda.setValue('custrecord_cpb_id_transacao_compra_moeda', idTransacao)
                              registerCompraMoeda.setValue('custrecord_cpb_cliente', idCustomer)
                              registerCompraMoeda.setValue('custrecord_cpb_data', new Date())
                              registerCompraMoeda.setValue('custrecord_cpb_centro_custo', centroDeCusto)
                              registerCompraMoeda.setValue('custrecord_cpb_condicao_pagamento', condicaoDePagamento)
                              registerCompraMoeda.setValue('custrecord_cpb_item', idProduto)
                              registerCompraMoeda.setValue('custrecord_cpb_quantidade', quantidade)
                              registerCompraMoeda.setValue('custrecord_cpb_valor_unitario', valorUnitario)
                              registerCompraMoeda.setValue('custrecord_cpb_valor_total', quantidade * valorUnitario)
                              var idRegistro = registerCompraMoeda.save()

                              logRecordObj.setValue('custrecord_cpb_registro_criado', idRegistro)
                              logRecordObj.setValue('custrecord_cpb_cliente_registro', idCustomer)
                              logRecordObj.save()

                              var corpoDaResposta = {
                                    "success": true,
                                    "code": 201,
                                    "message": "Registro de compra de moedas criado.",
                                    "data": { "idRegistroNetsuite": idRegistro, "idCliente": idCustomer, "idGetNinjas": idCliente }
                              }

                              //serverResponse.write({
                              //      output: JSON.stringify(corpoDaResposta)
                              //});
                              return corpoDaResposta

                        } else {

                              var corpoDaResposta = {
                                    "success": false,
                                    "code": 404,
                                    "message": "Não foi possível encontrar o cliente.",
                                    "data": { idCliente }
                              }

                              //serverResponse.write({ output: JSON.stringify(corpoDaResposta) });
                              return JSON.stringify(corpoDaResposta)
                        }
                  }
            } catch (e) {
                  log.debug('Erro', e.message)

                  const logRecordObj = record.create({ type: 'customrecord_cpb_registro_compra_moedas', isDynamic: true })
                  logRecordObj.setValue({ fieldId: 'custrecord_cpb_dicionario', value: JSON.stringify(requestBody) })
                  logRecordObj.setValue({ fieldId: 'custrecord_cpb_orientacao', value: e.message })
                  logRecordObj.setValue('custrecord_cpb_tipo_registro', 'ERRO')
                  logRecordObj.save()

                  var corpoDaResposta = {
                        "success": false,
                        "code": 500,
                        "message": "Erro " + e.message,
                        "data": {}
                  }

                  //serverResponse.write({
                  //      output: JSON.stringify(corpoDaResposta)
                  //});

                  return JSON.stringify(corpoDaResposta)
            }
      }
      return {
            post: _post,
      }
})
