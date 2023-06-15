/**
 *@NApiVersion 2.1
 *@NScriptType Restlet
 */
define(['N/record', 'N/search'], function (record, search) {

      const mascaraCnpj = (valor) => valor.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/g, "\$1.\$2.\$3\/\$4\-\$5")

      const mCPF = (cpf) => {
            cpf = cpf.replace(/\D/g, "")
            cpf = cpf.replace(/(\d{3})(\d)/, "$1.$2")
            cpf = cpf.replace(/(\d{3})(\d)/, "$1.$2")
            cpf = cpf.replace(/(\d{3})(\d{1,2})$/, "$1-$2")

            return cpf
      }

      const _post = (context) => {
            var idCliente = ''
            const serverResponse = context.response;
            const requestBody = context

            log.debug('Requestbody', requestBody)

            try {
                  if (requestBody) {
                        const logRecordObj = record.create({ type: 'customrecord_cpb_registro_end_comp_moeda', isDynamic: true })
                        logRecordObj.setValue({ fieldId: 'custrecord_cpb_dicionario_', value: JSON.stringify(requestBody) })

                        var idTransacaoCompensacao = requestBody.idTransacaoCompensacao || null
                        var idCompra = requestBody.idTransacao || null

                        var cancelar = requestBody.cancelar || null


                        if (cancelar == 'true' || cancelar == true) {

                              var id = ''

                              search.create({
                                    type: "customrecord_cpb_compensacao_moedas",
                                    filters:
                                          [
                                                ["custrecord_cpb_id_transacao", "is", idTransacaoCompensacao]
                                          ],
                                    columns:
                                          [
                                                search.createColumn({ name: "internalid" })
                                          ]
                              }).run().getRange({ start: 0, end: 1 }).forEach(function (result) {
                                    id = result.getValue('internalid')

                                    var registro = record.load({ type: 'customrecord_cpb_compensacao_moedas', id: id, isDynamic: true })
                                    registro.setValue({ fieldId: 'custrecord_cpb_cancelado', value: true })
                                    registro.setValue({ fieldId: 'custrecord_cpb_quantidade_compensacao', value: 0 })
                                    registro.setValue({ fieldId: 'custrecord_cpb_valor_uni_compensacao', value: 0 })
                                    registro.setValue({ fieldId: 'custrecord_cpb_valor_total_compensacao', value: 0 })
                                    registro.save()
                              })

                              if (id) {
                                    var corpoDaResposta = { "success": true, "code": 200, "message": "A compensação de Moedas com o id: " + idTransacaoCompensacao + " foi cancelado.", "data": {} }
                                    //serverResponse.write({ output: JSON.stringify(corpoDaResposta) });
                                    return corpoDaResposta
                              } else {
                                    var corpoDaResposta = { "success": false, "code": 500, "message": "Não foi encontrada a transação com este id. Id: " + idTransacaoCompensacao + ".", "data": {} }
                                    //serverResponse.write({ output: JSON.stringify(corpoDaResposta) });
                                    return corpoDaResposta
                              }

                        } else {
                              var idCliente = requestBody.idCliente || null
                              var idBundle = requestBody.idBundle || null
                              var centroDeCusto = requestBody.centroDeCusto || null
                              var condicaoDePagamento = requestBody.condicaoDePagamento || null
                              var produto = requestBody.produto || null
                              var idProduto = produto.idProduto || null
                              var descricao = produto.descricao || null
                              var quantidade = produto.quantidade || null
                              var valorUnitario = parseFloat(produto.valorUnitario) || null

                              var busca = search.create({
                                    type: 'customer',
                                    filters: [
                                          ["custentity_cpb_id_getninjas", "is", idCliente]
                                    ],
                                    columns: [
                                          search.createColumn({ name: 'internalid' }),
                                    ]
                              })
                              var resultado = busca.run().getRange({ start: 0, end: 1 })

                              if (resultado.length > 0) {
                                    resultado.forEach(function (result) {
                                          idCustomer = result.getValue('internalid')
                                          log.debug('idCustomer', idCustomer)
                                    })

                                    var compensacaoMoedas = record.create({ type: 'customrecord_cpb_compensacao_moedas', isDynamic: true })
                                    compensacaoMoedas.setValue('custrecord_cpb_cliente_compensacao', idCustomer)
                                    compensacaoMoedas.setValue('custrecord_cpb_id_bundle', idBundle)
                                    compensacaoMoedas.setValue('custrecord_cpb_id_transacao', idTransacaoCompensacao)
                                    compensacaoMoedas.setValue('custrecord_cpb_id_compra_moedas', idCompra)
                                    compensacaoMoedas.setValue('custrecord_cpb_data_compensacao', new Date())
                                    compensacaoMoedas.setValue('custrecord_cpb_centro_custo_compensacao', centroDeCusto)
                                    compensacaoMoedas.setValue('custrecord_cpb_condicao_compensacao', condicaoDePagamento)
                                    compensacaoMoedas.setValue('custrecord_cpb_subsidiaria_compensacao', 2)
                                    compensacaoMoedas.setValue('custrecord_cpb_localidade_compensacao', 1)
                                    compensacaoMoedas.setValue('custrecord_cpb_tipo_doc_compensacao', 2)
                                    compensacaoMoedas.setValue('custrecord_cpb_tipo_emitente_compensacao', 1)
                                    compensacaoMoedas.setValue('custrecord_cpb_produto_compensacao', idProduto)
                                    compensacaoMoedas.setValue('custrecord_cpb_quantidade_compensacao', quantidade)
                                    compensacaoMoedas.setValue('custrecord_cpb_valor_uni_compensacao', valorUnitario)
                                    compensacaoMoedas.setValue('custrecord_cpb_valor_total_compensacao', quantidade * valorUnitario)
                                    var idSaveRegistro = compensacaoMoedas.save()

                                    logRecordObj.setValue('custrecord_cpb_registro_criado_', idSaveRegistro)
                                    logRecordObj.setValue('custrecord_cpb_cliente_registro_', idCustomer)
                                    logRecordObj.setValue('custrecord_cpb_tipo_', 'Criado')
                                    logRecordObj.save()

                                    var corpoDaResposta = {
                                          "success": true,
                                          "code": 201,
                                          "message": "Registro de compensação de moedas criado.",
                                          "data": { "idRegistroNetsuite": idSaveRegistro, "idCliente": idCustomer, "idGetNinjas": idCliente }
                                    }

                                    //serverResponse.write({
                                    //      output: JSON.stringify(corpoDaResposta)
                                    //});
                                    return corpoDaResposta
                              } else {
                                    var corpoDaResposta = {
                                          "success": false,
                                          "code": 404,
                                          "message": "Não foi possível encontrar o cliente com este idGetNinjas.",
                                          "data": { idCliente }
                                    }

                                    logRecordObj.setValue('custrecord_cpb_tipo_', 'Não Encontrado')
                                    logRecordObj.save()
                                    //serverResponse.write({
                                    //      output: JSON.stringify(corpoDaResposta)
                                    //});

                                    return corpoDaResposta
                              }
                        }
                  }

            } catch (e) {
                  log.debug('Erro', e.message)

                  const logRecordObj = record.create({
                        type: 'customrecord_cpb_registro_end_comp_moeda',
                        isDynamic: true
                  })
                  logRecordObj.setValue({ fieldId: 'custrecord_cpb_dicionario_', value: JSON.stringify(requestBody) })
                  logRecordObj.setValue({ fieldId: 'custrecord_cpb_orientacao_', value: e.message })
                  logRecordObj.setValue('custrecord_cpb_tipo_', 'ERRO')
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
