/**
 *@NApiVersion 2.1
 *@NScriptType ScheduledScript
 */
define(['N/runtime', 'N/search', 'N/record', '../modules/tecnospeed/index'],
    function (search, record, Tecnospeed) {

        function execute(context) {

            const valuesReturn = _getValuesReturn()

            log.debug('valuesReturn', valuesReturn)

            const subsidiaryCpfCnpj = search.lookupFields({
                type: search.Type.SUBSIDIARY,
                id: valuesReturn.subsidiary[0].value,
                columns: ['custrecord_psg_br_cnpj', 'legalname']
            })

            const tecnospeedApi = new Tecnospeed()
            const paymentApi = tecnospeedApi.Payment({ cpfCnpj: subsidiaryCpfCnpj.custrecord_psg_br_cnpj })
            const paymentApiResponse = paymentApi.fetchPaymentReturn(payment.uniqueId)
            const cDate = new Date(paymentApiResponse.paymentDate)
            const cDate2 = new Date(cDate.getFullYear(), cDate.getMonth(), cDate.getDate() + 1)

            const vendorFields = search.lookupFields({
                type: 'vendorbill',
                id: valuesReturn.vendorBillId,
                columns: ['custbody_o2s_parcela_l_tp_servico',
                  'externalid',
                  'custbody_jive_sn_number_fin',
                  'custbody_o2s_transaction_a_parcelas',
                  'custbody_o2s_transaction_l_meio_pgto']
              })

              const bankAccountFields = _fetchBankAccountByAccountHash(paymentApiResponse.accountHash)
              const cnpjWithoutMask = subsidiaryCpfCnpj.custrecord_psg_br_cnpj.replace(/[^\d]+/g, '')
      
              var cpfCnpjBeneficiaryWithMask
              if (paymentApiResponse.beneficiary.cpfCnpj.length === 14) {
                cpfCnpjBeneficiaryWithMask = paymentApiResponse.beneficiary.cpfCnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5")
              } else {
                cpfCnpjBeneficiaryWithMask = paymentApiResponse.beneficiary.cpfCnpj.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
      
              }
              const serviceType = vendorFields.custbody_o2s_parcela_l_tp_servico[0].text
              const externalId = vendorFields.externalid[0].value
              const bankText = bankAccountFields[0].bank.substr(0, 3)
              const paymentMethod = vendorFields.custbody_o2s_transaction_l_meio_pgto[0].value

              const ticketList = {
                pgtContCodBarra: '49',
                pgtConcess: '73',
                liquidTituPropBanc: '62',
                pgtTituOtrBanc: '63',
            }
            const trasnferList = {
                credContCor: '1',
                docTed: '3',
                tedOtrTlr: '65',
                tedMesTlr: '66',
            }

            for (let [key, value] of Object.entries(ticketList)) {
                log.debug('primeiro for')
                if (paymentMethod === value) {
                    log.debug('entrei no if boleto')
                    paymentProof = {
                        custrecord_ps_cnab_pay_payer_cnpj: cnpjWithoutMask,
                        custrecord_ps_cnab_pay_payer_legalname: subsidiaryCpfCnpj.legalname,
                        custrecord_ps_cnab_pay_payer_bank: bankText, //Campo que aparece no registro
                        custrecord_ps_cnab_pay_payer_agency: bankAccountFields[0].agency,
                        custrecord_ps_cnab_pay_payer_agencydigit: bankAccountFields[0].agencyDigit,
                        custrecord_ps_cnab_pay_payer_chec_acc: bankAccountFields[0].account,
                        custrecord_ps_cnab_payer_account_digit: bankAccountFields[0].accountDigit,
                        custrecord_ps_cnab_pay_payment_type: bankAccountFields[0].accountType,
                        custrecord_ps_cnab_beneficiary_cpfcnpj: paymentApiResponse.beneficiary.cpfCnpj,
                        custrecord_ps_cnab_pay_beneficiary_name: paymentApiResponse.beneficiary.name,
                        custrecord_ps_cnab_pay_payment_form: 'BOLETO', //paymentFormAPI[0].name,
                        custrecord_ps_cnab_pay_ticket_type: serviceType, //ajustar
                        custrecord_ps_cnab_pay_digitable_line: paymentApiResponse.barcode || null,
                        custrecord_ps_cnab_pay_paydate: paymentApiResponse.paymentDate || null,
                        custrecord_ps_cnab_pay_discount: paymentApiResponse.discountAmount || null,
                        custrecord_ps_cnab_pay_amount_paid: paymentApiResponse.amount || null,
                        custrecord_ps_cnab_pay_interest_fine: paymentApiResponse.interestAmount || null,
                        custrecord_ps_cnab_pay_aut_register: paymentApiResponse.authenticationRegister || null,
                        custrecord_ps_cnab_pay_external_id: externalId,
                        custrecord_ps_cnab_pay_transaction: vendorBillId,
                        custrecord_jive_sn_number_fin: vendorFields.custbody_jive_sn_number_fin,
                        custrecord_ps_cnab_pay_payer_cnpj_mask: subsidiaryCpfCnpj.custrecord_psg_br_cnpj,
                        custrecord_ps_cnab_bene_cpfcnpj_mask: cpfCnpjBeneficiaryWithMask,
                        custrecord_ps_cnab_pay_payer_bank_hidden: bankAccountFields[0].bank //Campo para popular o pdf
                      }
                } else {
                    for (let [key, value] of Object.entries(trasnferList)) {
                        log.debug('segundo for')
                        if (paymentMethod === value) {
                            const bank = _fetchNameBankByCode(paymentApiResponse.beneficiary.bankCode)
                            paymentProof = {
                              custrecord_ps_cnab_pay_payer_cnpj: cnpjWithoutMask,
                              custrecord_ps_cnab_pay_payer_legalname: subsidiaryCpfCnpj.legalname,
                              custrecord_ps_cnab_pay_payer_bank: bankText, //Campo que aparece no registro
                              custrecord_ps_cnab_pay_payer_agency: bankAccountFields[0].agency,
                              custrecord_ps_cnab_pay_payer_agencydigit: bankAccountFields[0].agencyDigit,
                              custrecord_ps_cnab_pay_payer_chec_acc: bankAccountFields[0].account,
                              custrecord_ps_cnab_payer_account_digit: bankAccountFields[0].accountDigit,
                              custrecord_ps_cnab_beneficiary_cpfcnpj: paymentApiResponse.beneficiary.cpfCnpj,
                              custrecord_ps_cnab_pay_beneficiary_name: paymentApiResponse.beneficiary.name,
                              custrecord_ps_cnab_pay_payment_form: 'TRANSFERÊNCIA',
                              custrecord_ps_cnab_pay_ticket_type: serviceType, //ajustar
                              custrecord_ps_cnab_pay_payment_type: bankAccountFields[0].accountType,
                              custrecord_ps_cnab_pay_paydate: paymentApiResponse.paymentDate || null,
                              custrecord_ps_cnab_pay_discount: paymentApiResponse.discountAmount || null,
                              custrecord_ps_cnab_pay_amount_paid: paymentApiResponse.amount || null,
                              custrecord_ps_cnab_pay_interest_fine: paymentApiResponse.interestAmount || null,
                              custrecord_ps_cnab_pay_bank: paymentApiResponse.beneficiary.bankCode || '', // Campo que aparece no registro	
                              custrecord_ps_cnab_pay_bene_agency: paymentApiResponse.beneficiary.agency || null,
                              custrecord_ps_cnab_pay_agency_digit: paymentApiResponse.beneficiary.agencyDigit || null,
                              custrecord_ps_cnab_pay_account: paymentApiResponse.beneficiary.accountNumber || null,
                              custrecord_ps_cnab_pay_account_digit: paymentApiResponse.beneficiary.accountNumberDigit || null,
                              custrecord_ps_cnab_pay_aut_register: paymentApiResponse.authenticationRegister || null,
                              custrecord_ps_cnab_pay_external_id: externalId,
                              custrecord_ps_cnab_pay_transaction: vendorBillId,
                              custrecord_jive_sn_number_fin: vendorFields.custbody_jive_sn_number_fin,
                              custrecord_ps_cnab_pay_payer_cnpj_mask: subsidiaryCpfCnpj.custrecord_psg_br_cnpj,
                              custrecord_ps_cnab_bene_cpfcnpj_mask: cpfCnpjBeneficiaryWithMask,
                              custrecord_ps_cnab_pay_payer_bank_hidden: bankAccountFields[0].bank, //Campo para popular o pdf
                              custrecord_ps_cnab_pay_bank_hidden: bank[0].bank || '', // Campo para popular o pdf
                            }
                        }
                    }
                }
            }

            const recordPaymentProof = record.create({ type: 'customrecord_ps_cnab_pay_proof' })
            recordPaymentProof.setValue({ fieldId: 'custrecord_ps_cnab_pay_payer_cnpj', value: paymentProof.custrecord_ps_cnab_pay_payer_cnpj })
            recordPaymentProof.setValue({ fieldId: 'custrecord_ps_cnab_pay_payer_legalname', value: paymentProof.custrecord_ps_cnab_pay_payer_legalname })
            recordPaymentProof.setValue({ fieldId: 'custrecord_ps_cnab_pay_payer_bank', value: paymentProof.custrecord_ps_cnab_pay_payer_bank })
            recordPaymentProof.setValue({ fieldId: 'custrecord_ps_cnab_pay_payer_agency', value: paymentProof.custrecord_ps_cnab_pay_payer_agency })
            recordPaymentProof.setValue({ fieldId: 'custrecord_ps_cnab_pay_payer_agencydigit', value: paymentProof.custrecord_ps_cnab_pay_payer_agencydigit })
            recordPaymentProof.setValue({ fieldId: 'custrecord_ps_cnab_pay_payer_chec_acc', value: paymentProof.custrecord_ps_cnab_pay_payer_chec_acc })
            recordPaymentProof.setValue({ fieldId: 'custrecord_ps_cnab_payer_account_digit', value: paymentProof.custrecord_ps_cnab_payer_account_digit })
            recordPaymentProof.setValue({ fieldId: 'custrecord_ps_cnab_beneficiary_cpfcnpj', value: paymentProof.custrecord_ps_cnab_beneficiary_cpfcnpj })
            recordPaymentProof.setValue({ fieldId: 'custrecord_ps_cnab_pay_beneficiary_name', value: paymentProof.custrecord_ps_cnab_pay_beneficiary_name })
            recordPaymentProof.setValue({ fieldId: 'custrecord_ps_cnab_pay_payment_form', value: paymentProof.custrecord_ps_cnab_pay_payment_form })
            // recordPaymentProof.setValue({ fieldId: 'custrecord_ps_cnab_pay_ticket_type', value: paymentProof.custrecord_ps_cnab_pay_ticket_type })
            recordPaymentProof.setValue({ fieldId: 'custrecord_ps_cnab_pay_payment_type', value: paymentProof.custrecord_ps_cnab_pay_payment_type })
            recordPaymentProof.setValue({ fieldId: 'custrecord_ps_cnab_pay_digitable_line', value: paymentProof.custrecord_ps_cnab_pay_digitable_line })
            recordPaymentProof.setValue({ fieldId: 'custrecord_ps_cnab_pay_paydate', value: cDate2 })
            recordPaymentProof.setValue({ fieldId: 'custrecord_ps_cnab_pay_discount', value: 0 })
            recordPaymentProof.setValue({ fieldId: 'custrecord_ps_cnab_pay_amount_paid', value: paymentProof.custrecord_ps_cnab_pay_amount_paid })
            recordPaymentProof.setValue({ fieldId: 'custrecord_ps_cnab_pay_interest_fine', value: paymentProof.custrecord_ps_cnab_pay_interest_fine })
            recordPaymentProof.setValue({ fieldId: 'custrecord_ps_cnab_pay_bank', value: paymentProof.custrecord_ps_cnab_pay_bank })
            recordPaymentProof.setValue({ fieldId: 'custrecord_ps_cnab_pay_bene_agency', value: paymentProof.custrecord_ps_cnab_pay_bene_agency })
            recordPaymentProof.setValue({ fieldId: 'custrecord_ps_cnab_pay_agency_digit', value: paymentProof.custrecord_ps_cnab_pay_agency_digit })
            recordPaymentProof.setValue({ fieldId: 'custrecord_ps_cnab_pay_account', value: paymentProof.custrecord_ps_cnab_pay_account })
            recordPaymentProof.setValue({ fieldId: 'custrecord_ps_cnab_pay_account_digit', value: paymentProof.custrecord_ps_cnab_pay_account_digit })
            recordPaymentProof.setValue({ fieldId: 'custrecord_ps_cnab_pay_aut_register', value: paymentProof.custrecord_ps_cnab_pay_aut_register })
            recordPaymentProof.setValue({ fieldId: 'custrecord_ps_cnab_pay_external_id', value: paymentProof.custrecord_ps_cnab_pay_external_id })
            recordPaymentProof.setValue({ fieldId: 'custrecord_ps_cnab_pay_transaction', value: paymentProof.custrecord_ps_cnab_pay_transaction })
            recordPaymentProof.setValue({ fieldId: 'custrecord_jive_sn_number_fin', value: paymentProof.custrecord_jive_sn_number_fin })
            recordPaymentProof.setValue({ fieldId: 'custrecord_ps_cnab_pay_payer_cnpj_mask', value: paymentProof.custrecord_ps_cnab_pay_payer_cnpj_mask })
            recordPaymentProof.setValue({ fieldId: 'custrecord_ps_cnab_bene_cpfcnpj_mask', value: paymentProof.custrecord_ps_cnab_bene_cpfcnpj_mask })
            recordPaymentProof.setValue({ fieldId: 'custrecord_ps_cnab_pay_payer_bank_hidden', value: paymentProof.custrecord_ps_cnab_pay_payer_bank_hidden })
            recordPaymentProof.setValue({ fieldId: 'custrecord_ps_cnab_pay_bank_hidden', value: paymentProof.custrecord_ps_cnab_pay_bank_hidden })
            recordPaymentProof.save()
    
            log.debug('recordPaymentProof', recordPaymentProof)
        }

        /**
         * Get payment return ID.
         *
         * @returns {string}
         * @private
         */
        function _getValuesReturn() {
            return {
                subsidiary: runtime.getCurrentScript().getParameter({ name: 'custscript_ps_sc_subsidiary' }),
                vendorBillId: runtime.getCurrentScript().getParameter({ name: 'custscript_ps_sc_vendorBillId' })
            }
        }

        /**
         * Fetch bank accounts by subsidiary.
         *
         * @param accountHash
         * @returns {{name: string, id: number || value: text}[]}
         * @private
         */
        function _fetchBankAccountByAccountHash(accountHash) {
            return search.create({
                type: 'customrecord_ps_bank_account',
                filters: [{
                    name: 'custrecord_ps_bac_id_payment',
                    operator: search.Operator.IS,
                    values: accountHash
                }, {
                    name: 'isinactive',
                    operator: search.Operator.IS,
                    values: false
                }],
                columns: [
                    { name: 'custrecord_ps_bac_bank' },
                    { name: 'custrecord_ps_bac_agency_number' },
                    { name: 'custrecord_ps_bac_account_number' },
                    { name: 'custrecord_ps_bac_acctype' },
                    { name: 'custrecord_ps_bac_agency_digit' },
                    { name: 'custrecord_ps_bac_account_digit' },
                ]
            })
                .run()
                .getRange({
                    start: 0,
                    end: 1
                })
                .map(function (result) {
                    return {
                        id: result.id,
                        bank: result.getText(result.columns[0]),
                        agency: result.getValue(result.columns[1]),
                        account: result.getValue(result.columns[2]),
                        accountType: result.getText(result.columns[3]),
                        agencyDigit: result.getValue(result.columns[4]),
                        accountDigit: result.getValue(result.columns[5])
                    }
                })
        }

        /**
         * Fetch name bank by code.
         *
         * @param codeBank
         * @returns {{name: string}}
         * @private
         */
        function _fetchNameBankByCode(codeBank) {
            return search.create({
                type: 'customrecord_ps_bank',
                filters: [{
                    name: 'custrecord_ps_ban_code',
                    operator: search.Operator.IS,
                    values: codeBank
                }],
                columns: [
                    { name: 'name' },
                ]
            })
                .run()
                .getRange({
                    start: 0,
                    end: 1
                })
                .map(function (result) {
                    return {
                        bank: result.getValue(result.columns[0]),
                    }
                })
        }

        return {
            execute: execute
        }
    });
