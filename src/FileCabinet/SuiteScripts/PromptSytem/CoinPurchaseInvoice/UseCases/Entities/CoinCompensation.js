define(["require", "exports", "N/search", "N/log"], function (require, exports, search, log_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.getCoinPurchaseSearch = void 0;
    var getCoinPurchaseSearch = function (dateInitial, dateEnd) {
        (0, log_1.debug)('GetCoinPurchaseSearch', { dateInitial: dateInitial, dateEnd: dateEnd });
        var savedSearch = search.create({
            type: "customrecord_cpb_compensacao_moedas",
            filters: [
                ["custrecord_cpb_cancelado", "is", "F"],
                "AND",
                [
                    "custrecord_cpb_data_compensacao",
                    "within",
                    //dateEnd.toLocaleDateString(),
                    //dateInitial.toLocaleDateString(),
                    '01/12/2022',
                    '03/12/2022'
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
        return savedSearch;
    };
    exports.getCoinPurchaseSearch = getCoinPurchaseSearch;
});
