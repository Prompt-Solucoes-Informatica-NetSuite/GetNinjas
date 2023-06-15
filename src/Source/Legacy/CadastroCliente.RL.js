/**
 *@NApiVersion 2.1
 *@NScriptType Restlet
 */
define(['N/record', 'N/search'], function (record, search) {

      const _municipio = (municipio) => {
            idMunicipio = ''
            search.create({
                  type: 'customrecord_sit_municipio',
                  filters: [
                        ['custrecord_sit_municipio_t_cd_municipi', "is", municipio]
                  ],
                  columns: [
                        search.createColumn({ name: 'internalid' }),
                  ]
            }).run().getRange({ start: 0, end: 1 })
                  .forEach(function (result) {
                        idMunicipio = result.getValue('internalid')
                  })
            if (idMunicipio) {
                  return idMunicipio
            }

      }
      const mascaraCnpj = (valor) => valor.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/g, "\$1.\$2.\$3\/\$4\-\$5");

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

            log.debug('RequestBody', requestBody)

            try {
                  if (requestBody) {
                        const logRecordObj = record.create({ type: 'customrecord364', isDynamic: true })
                        logRecordObj.setValue({ fieldId: 'custrecord_cpb_dicionario_end', value: JSON.stringify(requestBody) })

                        var clientePJ = requestBody.clientePJ || null
                        var razaoSocial = clientePJ.razaoSocial || null
                        var cnpj = clientePJ.cnpj || null
                        var inscricaoMunicipal = clientePJ.inscricaoMunicipal || null

                        var clientePF = requestBody.clientePF || null
                        var nome = clientePF.nome || null
                        var nomeDoMeio = clientePF.nomeDoMeio || null
                        var sobrenome = clientePF.sobrenome || null
                        var cpf = clientePF.cpf || null

                        var email = requestBody.email || null
                        var telefone = requestBody.telefone || null
                        var idGetNinja = requestBody.idGetNinjas || null

                        var endereco = requestBody.endereco || null
                        var pais = endereco.pais || null
                        var tipoLogradouro = endereco.tipoLogradouro || null
                        var logradouro = endereco.logradouro || null
                        var numero = endereco.numero || null
                        var municipio = endereco.municipio || null
                        var uf = endereco.uf || null
                        var zipCode = endereco.zipCode || null
                        var complemento = endereco.complemento || null
                        var bairro = endereco.bairro || null

                        var cnpjAtivo = requestBody.cnpj_ativo || null
                        var simei = requestBody.simei || null

                        log.debug('cnpjAtivo', cnpjAtivo)
                        log.debug('simei', simei)

                        var idMunicipio = municipio ? _municipio(municipio) : ''
                        numero = numero ? numero.substring(0, 10) : null
                        sobrenome = sobrenome ? sobrenome.substring(0, 32) : null

                        if (cnpj) {
                              valor = mascaraCnpj(cnpj)
                              // campo = 'custentity_psg_br_cnpj'
                              tipo = 'F'
                              log.debug('cnpj', valor)
                        } else {
                              valor = mCPF(cpf)
                              // campo = 'custentity_psg_br_cpf'
                              tipo = 'T'
                              log.debug('cpf', valor)
                        }

                        //451131
                        var busca = search.create({
                              type: 'customer',
                              filters: [
                                    ['custentity_cpb_id_getninjas', "is", idGetNinja]
                              ],
                              columns: [
                                    search.createColumn({ name: 'internalid' }),
                              ]
                        })

                        var resultados = busca.run().getRange({ start: 0, end: 1 })

                        if (resultados.length > 0) {
                              resultados.forEach(function (result) { idCliente = result.getValue('internalid') })

                              var cliente = record.load({ type: 'customer', id: idCliente, isDynamic: true })

                              cliente.setValue('email', email)
                              cliente.setValue('phone', telefone)
                              cliente.setValue('custentity_cpb_id_getninjas', idGetNinja)

                              if (cnpjAtivo) {
                                    cliente.setValue('custentity_cpb_cnpj_ativo', cnpjAtivo)
                              }

                              if (simei) {
                                    cliente.setValue('custentity_cpb_ativo_simei', simei)
                              }

                              cliente.selectLine({ sublistId: 'addressbook', line: 0 });
                              var addressSubrecord = cliente.getCurrentSublistSubrecord({ sublistId: 'addressbook', fieldId: 'addressbookaddress' });
                              addressSubrecord.setValue('country', pais)
                              addressSubrecord.setValue('custrecord_sit_address_l_tp_logr', tipoLogradouro)
                              addressSubrecord.setValue('addr1', logradouro)
                              addressSubrecord.setValue('custrecord_sit_address_i_numero', numero)
                              addressSubrecord.setValue('custrecord_sit_address_t_bairro', bairro)
                              addressSubrecord.setValue('custrecord_o2g_address_l_mun', idMunicipio)
                              addressSubrecord.setValue('state', uf)
                              addressSubrecord.setValue('zip', zipCode)
                              addressSubrecord.setValue('custrecord_sit_address_complemento', complemento)
                              cliente.commitLine({ sublistId: 'addressbook' });

                              var idCliente = cliente.save()

                              logRecordObj.setValue('custrecord_cpb_tipo_end', 'atualizou')
                              logRecordObj.setValue('custrecord_cpb_end_cliente', idCliente)
                              logRecordObj.save()

                              var corpoDaResposta = {
                                    "success": true,
                                    "code": 201,
                                    "message": "O cliente foi atualizado",
                                    "data": { 'Documento': valor, 'idCliente': idCliente }
                              }

                              serverResponse.write({ output: JSON.stringify(corpoDaResposta) });
                              return
                        } else {
                              var cliente = record.create({ type: 'customer', isDynamic: true })
                              cliente.setValue('isperson', tipo)

                              if (tipo == 'F') {
                                    cliente.setValue('companyname', razaoSocial)
                                    cliente.setValue('custentity_psg_br_cnpj', valor)
                                    cliente.setValue('custentity_psg_br_municipal_subscr', inscricaoMunicipal)
                              } else {
                                    cliente.setValue('firstname', nome)
                                    cliente.setValue('middlename', nomeDoMeio)
                                    cliente.setValue('lastname', sobrenome)
                                    cliente.setValue('custentity_psg_br_cpf', valor)
                              }

                              cliente.setValue('subsidiary', 2)
                              cliente.setValue('email', email)
                              cliente.setValue('phone', telefone)
                              cliente.setValue('custentity_cpb_id_getninjas', idGetNinja)

                              if (cnpjAtivo) {
                                    cliente.setValue('custentity_cpb_cnpj_ativo', cnpjAtivo)
                              }

                              if (simei) {
                                    cliente.setValue('custentity_cpb_ativo_simei', simei)
                              }

                              cliente.selectNewLine({ sublistId: 'addressbook' });
                              var addressSubrecord = cliente.getCurrentSublistSubrecord({ sublistId: 'addressbook', fieldId: 'addressbookaddress' });
                              addressSubrecord.setValue('country', pais)
                              addressSubrecord.setValue('custrecord_sit_address_l_tp_logr', tipoLogradouro)
                              addressSubrecord.setValue('addr1', logradouro)
                              addressSubrecord.setValue('custrecord_sit_address_i_numero', numero)
                              addressSubrecord.setValue('custrecord_sit_address_t_bairro', bairro)
                              addressSubrecord.setValue('custrecord_o2g_address_l_mun', idMunicipio)
                              addressSubrecord.setValue('state', uf)
                              addressSubrecord.setValue('zip', zipCode)
                              addressSubrecord.setValue('custrecord_sit_address_complemento', complemento)
                              cliente.commitLine({ sublistId: 'addressbook' });
                              var idCliente = cliente.save()

                              logRecordObj.setValue('custrecord_cpb_tipo_end', 'criou')
                              logRecordObj.setValue('custrecord_cpb_end_cliente', idCliente)
                              logRecordObj.save()

                              var corpoDaResposta = {
                                    "success": true,
                                    "code": 202,
                                    "message": "O cliente foi criado",
                                    "data": { 'Documento': valor, 'idCliente': idCliente }
                              }

                              //serverResponse.write({
                              //      output: JSON.stringify(corpoDaResposta)
                              //});
                              return JSON.stringify(corpoDaResposta)
                        }

                  }
            } catch (e) {
                  log.debug('Erro', e.message)

                  const logRecordObj = record.create({ type: 'customrecord364', isDynamic: true })
                  logRecordObj.setValue({ fieldId: 'custrecord_cpb_dicionario_end', value: JSON.stringify(requestBody) })
                  logRecordObj.setValue({ fieldId: 'custrecord_cpb_orientacao_end', value: e.message })
                  logRecordObj.setValue('custrecord_cpb_tipo_end', 'ERRO')
                  logRecordObj.save()

                  var corpoDaResposta = {
                        "success": false,
                        "code": 500,
                        "message": "Erro " + e.message,
                        "data": {}
                  }

                  //serverResponse.write({ output: JSON.stringify(corpoDaResposta) });
                  return JSON.stringify(corpoDaResposta)
            }
      }

      return {
            post: _post,
      }
})
