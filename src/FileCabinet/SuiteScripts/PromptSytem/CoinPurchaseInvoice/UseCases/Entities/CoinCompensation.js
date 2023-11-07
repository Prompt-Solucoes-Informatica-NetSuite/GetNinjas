define(["require", "exports", "N/search", "N/log"], function (require, exports, search, log_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.getSummaryOnJournalEntry = exports.getCoinPurchaseSearch = void 0;
    var getCoinPurchaseSearch = function (dateInitial, dateEnd) {
        //debug('GetCoinPurchaseSearch', { dateInitial, dateEnd })
        var savedSearch = search.create({
            type: "customrecord_cpb_compensacao_moedas",
            filters: [
                ["custrecord_cpb_cancelado", "is", "F"],
                "AND",
                ["custrecord_cpb_id_compra_moedas", search.Operator.ISNOTEMPTY, "notnull"],
                "AND",
                [
                    "custrecord_cpb_data_compensacao",
                    "within",
                    //dateEnd.toLocaleDateString(),
                    //dateInitial.toLocaleDateString(),
                    '01/10/2023',
                    '05/10/2023'
                ]
            ],
            columns: [
                search.createColumn({ name: "custrecord_cpb_centro_custo_compensacao", label: "Centro de Custo" }),
                search.createColumn({
                    name: "custrecord_cpb_cliente_compensacao",
                    sort: search.Sort.ASC,
                    label: "Cliente"
                }),
                search.createColumn({ name: "custrecord_cpb_data_compensacao", label: "Data" }),
                search.createColumn({ name: "custrecord_cpb_faturado", label: "Faturado" }),
                search.createColumn({ name: "custrecord_cpb_quantidade_compensacao", label: "Quantidade" }),
                search.createColumn({ name: "custrecord_cpb_valor_total_compensacao", label: "Valor Total" }),
                search.createColumn({ name: "custrecord_cpb_valor_uni_compensacao", label: "Valor Unitário" }),
                search.createColumn({ name: "custrecord_cpb_id_transacao", label: "id Transacao" })
            ]
        });
        (0, log_1.debug)('Busca salva', savedSearch);
        return savedSearch;
    };
    exports.getCoinPurchaseSearch = getCoinPurchaseSearch;
    var getSummaryOnJournalEntry = function () {
        var savedSearch = search.create({
            type: "customrecord_coin_summary_usage",
            filters: [
                ["custrecord_coin_summary_je", "is", "empty"]
            ],
            columns: [
                search.createColumn({ name: "created" }),
                search.createColumn({ name: "custrecord_class_id" }),
                search.createColumn({ name: "custrecord_coin_summary_inv" }),
                search.createColumn({ name: "custrecord_coin_summary_je" }),
                search.createColumn({ name: "custrecord_customer_id" }),
                search.createColumn({ name: "custrecord_quantity" }),
                search.createColumn({ name: "custrecord_rate" }),
                search.createColumn({ name: "custrecord_total_amount" }),
                search.createColumn({ name: "custrecord_creation_date" }),
                search.createColumn({ name: "id" })
            ]
        });
        return savedSearch;
    };
    exports.getSummaryOnJournalEntry = getSummaryOnJournalEntry;
});
