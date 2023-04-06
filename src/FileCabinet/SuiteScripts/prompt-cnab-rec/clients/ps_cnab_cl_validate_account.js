/**
 *@NApiVersion 2.1
 *@NScriptType ClientScript
 */
define(["N/search"], function (search) {

    function pageInit(context) {
        const cr = context.currentRecord;
        const subsidiaryId = cr.getValue({ fieldId: "custrecord_ps_bac_subsidiary_owner" });
        const accountFieldCore = cr.getValue({ fieldId: "custrecord_ps_bac_account" });

        if (subsidiaryId) {
            var accountsList = fetchAccounts(subsidiaryId);

            if (accountsList.length > 0) {
                var bankAccountsList = accountsList.filter(function (elem) {
                    return (elem.tipo === "Bank" || elem.tipo === 'Banco')
                });

                var accountField = cr.getField({ fieldId: "custpage_bank_account" });

                for (var i = 0; i < bankAccountsList.length; i++) {
                    const isSelected = bankAccountsList[i].id === accountFieldCore? true : false
                    accountField.insertSelectOption({
                        value: bankAccountsList[i].id,
                        text: bankAccountsList[i].nome,
                        isSelected: isSelected
                    });
                }

            }
        }
    }

    function validateField(context) {
        const cr = context.currentRecord;
        const fieldId = context.fieldId;

        const account = cr.getValue({ fieldId: 'custpage_bank_account' });
        const subsidiary = cr.getValue({ fieldId: "custrecord_ps_bac_subsidiary_owner" });
        const beneficiaryCode = cr.getValue({ fieldId: "custrecord_ps_bac_benef_code" });
        const layout400 = cr.getValue({ fieldId: "custrecord_ps_bac_layout400" });

        if (account && !subsidiary) {
            alert("Subsidiária não pode estar vazia!");

            cr.setValue({ fieldId: fieldId, value: "" });
        }

        if (layout400 && !beneficiaryCode) {
            alert("Código do beneficiário não pode estar vazio!");
        }
        return true;
    }

    function fieldChanged(context) {
        const cr = context.currentRecord;
        const fieldId = context.fieldId;

        if (fieldId === "custrecord_ps_bac_subsidiary_owner") {

            const subsidiaryId = cr.getValue({ fieldId: "custrecord_ps_bac_subsidiary_owner" });
            if (subsidiaryId) {
                var accountsList = fetchAccounts(subsidiaryId);

                if (accountsList.length > 0) {
                    var bankAccountsList = accountsList.filter(function (elem) {
                        log.debug('elem', elem)
                        return (elem.tipo === "Bank" || elem.tipo === 'Banco')
                    });

                    var accountField = cr.getField({ fieldId: "custpage_bank_account" });

                    var fieldAccountListOptions = accountField.getSelectOptions();

                    for (var i = 0; i < fieldAccountListOptions.length; i++) {
                        accountField.removeSelectOption({
                            value: fieldAccountListOptions[i].value || null
                        })
                    }

                    accountField.insertSelectOption({ value: '', text: '', isSelected: true })

                    for (var i = 0; i < bankAccountsList.length; i++) {
                        accountField.insertSelectOption({
                            value: bankAccountsList[i].id,
                            text: bankAccountsList[i].nome
                        });
                    }

                } else {
                    alert("Nenhuma conta cadastrada para esssa subsidiária");

                    const subsidiaryId = cr.setValue({
                        fieldId: "custrecord_ps_bac_subsidiary_owner",
                        value: ""
                    });
                }
            }
        }
    }

    function fetchAccounts(subsidiaryId) {
        var listAccounts = [];

        var accountSearchObj = search.create({
            type: "account",
            filters:
                [
                    ["subsidiary", "anyof", subsidiaryId],
                    "AND",
                    ["type", "anyof", "Bank"]
                ],
            columns:
                [
                    search.createColumn({ name: "type", label: "Tipo da conta" }),
                    search.createColumn({
                        name: "displayname",
                        sort: search.Sort.ASC,
                        label: "Nome"
                    }),
                    search.createColumn({ name: "internalid", label: "ID interna" })
                ]
        });
        var accountSearchObjData = accountSearchObj.runPaged();

        accountSearchObjData.pageRanges.forEach(function (pageRange) {

            var myPage = accountSearchObjData.fetch({ index: pageRange.index });
            myPage.data.forEach(function (result) {
                var objAccounts = {};
                objAccounts.tipo = result.getText((result.columns[0])) || null;
                objAccounts.nome = result.getValue((result.columns[1])) || null;
                objAccounts.id = result.getValue((result.columns[2])) || null;

                listAccounts.push(objAccounts);
                return true;
            });
        });

        return listAccounts;
    }

    return {
        pageInit: pageInit,
        validateField: validateField,
        fieldChanged: fieldChanged,
    }
});
