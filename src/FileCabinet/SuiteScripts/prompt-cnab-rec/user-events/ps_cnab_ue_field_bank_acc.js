/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define(['N/ui/serverWidget', 'N/search'],
    function (serverWidget, search) {

        function beforeLoad(context) {
            const form = context.form
            const newRecord = context.newRecord

            if (context.type === 'edit' || context.type === 'create') {
                form.addField({
                    id: 'custpage_bank_account',
                    type: serverWidget.FieldType.SELECT,
                    label: 'CONTA BANCO PREVISÃO'
                }).isMandatory = true
            } else {
                var accountField = newRecord.getValue({ fieldId: "custrecord_ps_bac_account" });

                var accountValue = search.lookupFields({
                    type: 'account',
                    id: accountField,
                    columns: ['displayname']
                }).displayname

                form.addField({
                    id: 'custpage_bank_account',
                    type: serverWidget.FieldType.TEXT,
                    label: 'CONTA BANCO PREVISÃO'
                }).defaultValue = accountValue

            }
        }

        function beforeSubmit(context) {
            const newRecord = context.newRecord

            var accountField = newRecord.getValue({ fieldId: "custpage_bank_account" });

            newRecord.setValue({
                fieldId: 'custrecord_ps_bac_account',
                value: accountField
            })
        }

        return {
            beforeLoad: beforeLoad,
            beforeSubmit: beforeSubmit
        }
    });
