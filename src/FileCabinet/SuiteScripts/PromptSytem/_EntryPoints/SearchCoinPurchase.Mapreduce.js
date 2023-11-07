/**
 *@NApiVersion 2.1
 *@NScriptType MapReduceScript
 */
define(["require", "exports", "N/log", "N/format", "../CoinPurchaseInvoice/Services/GetSavedSearchByCoinPurchase", "../CoinPurchaseInvoice/Services/GenerateSummaryRecord", "../_Shared/Entity/Summary"], function (require, exports, log_1, format, GetSavedSearchByCoinPurchase, GenerateSummaryRecord, Summary_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.summarize = exports.reduce = exports.map = exports.getInputData = void 0;
    var string_to_date = function (context) {
        var parsed = format.parse({ type: format.Type.DATE, value: context });
        return new Date(parsed);
    };
    var load_values = function (context) {
        var parsedValue = JSON.parse(context);
        //debug('Values to load', parsedValue)
        var parsed = {
            compensation_id: parsedValue.id,
            customer_id: parsedValue.values['custrecord_cpb_cliente_compensacao']['value'].toString(),
            class_id: parseInt(parsedValue.values['custrecord_cpb_centro_custo_compensacao']['value'].toString()),
            date: string_to_date(parsedValue.values['custrecord_cpb_data_compensacao'].toString()),
            invoiced: parsedValue.values['custrecord_cpb_faturado'].toString() === 'true',
            quantity: parseFloat(parsedValue.values['custrecord_cpb_quantidade_compensacao'].toString()),
            amount: parseFloat(parsedValue.values['custrecord_cpb_valor_total_compensacao'].toString()),
            unit_value: parseFloat(parsedValue.values['custrecord_cpb_valor_uni_compensacao'].toString()),
            transaction_id: parseFloat(parsedValue.values['custrecord_cpb_id_transacao'].toString()),
            creation_date: new Date()
        };
        //debug('Parced Values', parsed)
        return parsed;
    };
    var getInputData = function (context) {
        try {
            var actualDate = new Date();
            //debug('Starting the value', actualDate.toLocaleDateString())
            var savedSearch = GetSavedSearchByCoinPurchase.execute(actualDate);
            //debug('GetInputData: SavedSearch', savedSearch)
            return savedSearch;
        }
        catch (err) {
            (0, log_1.error)('Error', err);
            return [];
        }
    };
    exports.getInputData = getInputData;
    var map = function (context) {
        try {
            //audit('Map: context', context)
            var loadedValues = load_values(context.value);
            context.write({
                key: loadedValues.customer_id.toString(),
                value: JSON.stringify(loadedValues)
            });
        }
        catch (err) {
            (0, log_1.error)('Map: error', err);
        }
    };
    exports.map = map;
    var reduce = function (context) {
        try {
            (0, log_1.audit)('Reduce: context', context);
            var summary_1 = new Summary_1.Summary();
            context.values.forEach(function (x) {
                var parsed = JSON.parse(x);
                summary_1.build(parsed);
            });
            (0, log_1.audit)('Summary on Reduce', summary_1);
            GenerateSummaryRecord.execute(summary_1);
        }
        catch (err) {
            (0, log_1.error)('Reduce: error', err);
        }
    };
    exports.reduce = reduce;
    var summarize = function (summary) { };
    exports.summarize = summarize;
});
