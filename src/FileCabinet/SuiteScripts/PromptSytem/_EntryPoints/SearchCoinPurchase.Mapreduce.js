/**
 *@NApiVersion 2.1
 *@NScriptType MapReduceScript
 */
define(["require", "exports", "N/log", "N/format", "N/record", "../CoinPurchaseInvoice/Services/GetSavedSearchByCoinPurchase", "../CoinPurchaseInvoice/Services/GenerateSummaryRecord", "../_Shared/Entity/Summary"], function (require, exports, log_1, format, record, GetSavedSearchByCoinPurchase, GenerateSummaryRecord, Summary_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.summarize = exports.reduce = exports.map = exports.getInputData = void 0;
    record.submitFields;
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
            transaction_id: parseFloat(parsedValue.values['custrecord_cpb_id_transacao'].toString())
        };
        //debug('Parced Values', parsed)
        return parsed;
    };
    var getInputData = function (context) {
        try {
            var actualDate = new Date('2022-12-29');
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
            //audit('Reduce: context', context)
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
/*

REDUCE CONTEXT gerado

{"type":"mapreduce.ReduceContext","isRestarted":false,"executionNo":1,"key":"999635","values":["{\"compensation_id\":\"2149829\",\"customer_id\":\"999635\",\"class\":115,\"date\":\"2022-12-01T08:00:00.000Z\",\"invoiced\":false,\"quantity\":106,\"amount\":15.81,\"unit_value\":0.15,\"transaction_id\":null}","{\"compensation_id\":\"2196691\",\"customer_id\":\"999635\",\"class\":115,\"date\":\"2022-12-06T08:00:00.000Z\",\"invoiced\":false,\"quantity\":77,\"amount\":11.49,\"unit_value\":0.15,\"transaction_id\":null}","{\"compensation_id\":\"2200541\",\"customer_id\":\"999635\",\"class\":115,\"date\":\"2022-12-07T08:00:00.000Z\",\"invoiced\":false,\"quantity\":62,\"amount\":9.25,\"unit_value\":0.15,\"transaction_id\":null}","{\"compensation_id\":\"2217318\",\"customer_id\":\"999635\",\"class\":115,\"date\":\"2022-12-08T08:00:00.000Z\",\"invoiced\":false,\"quantity\":31,\"amount\":4.62,\"unit_value\":0.15,\"transaction_id\":null}","{\"compensation_id\":\"2248648\",\"customer_id\":\"999635\",\"class\":115,\"date\":\"2022-12-10T08:00:00.000Z\",\"invoiced\":false,\"quantity\":98,\"amount\":14.62,\"unit_value\":0.15,\"transaction_id\":null}","{\"compensation_id\":\"2252627\",\"customer_id\":\"999635\",\"class\":115,\"date\":\"2022-12-10T08:00:00.000Z\",\"invoiced\":false,\"quantity\":38,\"amount\":5.67,\"unit_value\":0.15,\"transaction_id\":null}","{\"compensation_id\":\"2253987\",\"customer_id\":\"999635\",\"class\":115,\"date\":\"2022-12-10T08:00:00.000Z\",\"invoiced\":false,\"quantity\":98,\"amount\":14.62,\"unit_value\":0.15,\"transaction_id\":null}","{\"compensation_id\":\"2255290\",\"customer_id\":\"999635\",\"class\":115,\"date\":\"2022-12-10T08:00:00.000Z\",\"invoiced\":false,\"quantity\":38,\"amount\":5.67,\"unit_value\":0.15,\"transaction_id\":null}"]}
{"type":"mapreduce.ReduceContext","isRestarted":false,"executionNo":1,"key":"999181","values":["{\"compensation_id\":\"2182116\",\"customer_id\":\"999181\",\"class\":115,\"date\":\"2022-12-05T08:00:00.000Z\",\"invoiced\":false,\"quantity\":20,\"amount\":3.05,\"unit_value\":0.15,\"transaction_id\":null}","{\"compensation_id\":\"2193704\",\"customer_id\":\"999181\",\"class\":115,\"date\":\"2022-12-06T08:00:00.000Z\",\"invoiced\":false,\"quantity\":52,\"amount\":7.92,\"unit_value\":0.15,\"transaction_id\":null}","{\"compensation_id\":\"2202443\",\"customer_id\":\"999181\",\"class\":115,\"date\":\"2022-12-07T08:00:00.000Z\",\"invoiced\":false,\"quantity\":57,\"amount\":8.68,\"unit_value\":0.15,\"transaction_id\":null}"]}
{"type":"mapreduce.ReduceContext","isRestarted":false,"executionNo":1,"key":"998780","values":["{\"compensation_id\":\"2169859\",\"customer_id\":\"998780\",\"class\":115,\"date\":\"2022-12-03T08:00:00.000Z\",\"invoiced\":false,\"quantity\":4,\"amount\":0.6,\"unit_value\":0.15,\"transaction_id\":null}","{\"compensation_id\":\"2169927\",\"customer_id\":\"998780\",\"class\":115,\"date\":\"2022-12-03T08:00:00.000Z\",\"invoiced\":false,\"quantity\":74,\"amount\":11.04,\"unit_value\":0.15,\"transaction_id\":null}","{\"compensation_id\":\"2193493\",\"customer_id\":\"998780\",\"class\":115,\"date\":\"2022-12-06T08:00:00.000Z\",\"invoiced\":false,\"quantity\":122,\"amount\":18.2,\"unit_value\":0.15,\"transaction_id\":null}","{\"compensation_id\":\"2205641\",\"customer_id\":\"998780\",\"class\":115,\"date\":\"2022-12-07T08:00:00.000Z\",\"invoiced\":false,\"quantity\":82,\"amount\":12.23,\"unit_value\":0.15,\"transaction_id\":null}","{\"compensation_id\":\"2205912\",\"customer_id\":\"998780\",\"class\":115,\"date\":\"2022-12-07T08:00:00.000Z\",\"invoiced\":false,\"quantity\":140,\"amount\":20.88,\"unit_value\":0.15,\"transaction_id\":null}"]}
{"type":"mapreduce.ReduceContext","isRestarted":false,"executionNo":1,"key":"997854","values":["{\"compensation_id\":\"2159905\",\"customer_id\":\"997854\",\"class\":115,\"date\":\"2022-12-02T08:00:00.000Z\",\"invoiced\":false,\"quantity\":36,\"amount\":3.76,\"unit_value\":0.1,\"transaction_id\":null}","{\"compensation_id\":\"2183811\",\"customer_id\":\"997854\",\"class\":115,\"date\":\"2022-12-05T08:00:00.000Z\",\"invoiced\":false,\"quantity\":56,\"amount\":5.85,\"unit_value\":0.1,\"transaction_id\":null}","{\"compensation_id\":\"2191584\",\"customer_id\":\"997854\",\"class\":115,\"date\":\"2022-12-06T08:00:00.000Z\",\"invoiced\":false,\"quantity\":89,\"amount\":9.29,\"unit_value\":0.1,\"transaction_id\":null}","{\"compensation_id\":\"2194207\",\"customer_id\":\"997854\",\"class\":115,\"date\":\"2022-12-06T08:00:00.000Z\",\"invoiced\":false,\"quantity\":116,\"amount\":12.11,\"unit_value\":0.1,\"transaction_id\":null}","{\"compensation_id\":\"2196178\",\"customer_id\":\"997854\",\"class\":115,\"date\":\"2022-12-06T08:00:00.000Z\",\"invoiced\":false,\"quantity\":72,\"amount\":7.52,\"unit_value\":0.1,\"transaction_id\":null}"]}
{"type":"mapreduce.ReduceContext","isRestarted":false,"executionNo":1,"key":"998209","values":["{\"compensation_id\":\"2190667\",\"customer_id\":\"998209\",\"class\":115,\"date\":\"2022-12-06T08:00:00.000Z\",\"invoiced\":false,\"quantity\":32,\"amount\":4.77,\"unit_value\":0.15,\"transaction_id\":null}","{\"compensation_id\":\"2190711\",\"customer_id\":\"998209\",\"class\":115,\"date\":\"2022-12-06T08:00:00.000Z\",\"invoiced\":false,\"quantity\":47,\"amount\":7.01,\"unit_value\":0.15,\"transaction_id\":null}"]}

Sumnário gerado

{"customer_id":"997854","class_id":115,"compensations":[{"compensation_id":"2159905","quantity":36,"amount":3.76,"date":"2022-12-02T08:00:00.000Z","unit_value":0},{"compensation_id":"2183811","quantity":56,"amount":5.85,"date":"2022-12-05T08:00:00.000Z","unit_value":0},{"compensation_id":"2191584","quantity":89,"amount":9.29,"date":"2022-12-06T08:00:00.000Z","unit_value":0},{"compensation_id":"2194207","quantity":116,"amount":12.11,"date":"2022-12-06T08:00:00.000Z","unit_value":0},{"compensation_id":"2196178","quantity":72,"amount":7.52,"date":"2022-12-06T08:00:00.000Z","unit_value":0}],"errors":[]}
{"customer_id":"998209","class_id":115,"compensations":[{"compensation_id":"2190667","quantity":32,"amount":4.77,"date":"2022-12-06T08:00:00.000Z","unit_value":0},{"compensation_id":"2190711","quantity":47,"amount":7.01,"date":"2022-12-06T08:00:00.000Z","unit_value":0}],"errors":[]}
{"customer_id":"998780","class_id":115,"compensations":[{"compensation_id":"2169859","quantity":4,"amount":0.6,"date":"2022-12-03T08:00:00.000Z","unit_value":0},{"compensation_id":"2169927","quantity":74,"amount":11.04,"date":"2022-12-03T08:00:00.000Z","unit_value":0},{"compensation_id":"2193493","quantity":122,"amount":18.2,"date":"2022-12-06T08:00:00.000Z","unit_value":0},{"compensation_id":"2205641","quantity":82,"amount":12.23,"date":"2022-12-07T08:00:00.000Z","unit_value":0},{"compensation_id":"2205912","quantity":140,"amount":20.88,"date":"2022-12-07T08:00:00.000Z","unit_value":0}],"errors":[]}
{"customer_id":"999635","class_id":115,"compensations":[{"compensation_id":"2149829","quantity":106,"amount":15.81,"date":"2022-12-01T08:00:00.000Z","unit_value":0},{"compensation_id":"2196691","quantity":77,"amount":11.49,"date":"2022-12-06T08:00:00.000Z","unit_value":0},{"compensation_id":"2200541","quantity":62,"amount":9.25,"date":"2022-12-07T08:00:00.000Z","unit_value":0},{"compensation_id":"2217318","quantity":31,"amount":4.62,"date":"2022-12-08T08:00:00.000Z","unit_value":0},{"compensation_id":"2248648","quantity":98,"amount":14.62,"date":"2022-12-10T08:00:00.000Z","unit_value":0},{"compensation_id":"2252627","quantity":38,"amount":5.67,"date":"2022-12-10T08:00:00.000Z","unit_value":0},{"compensation_id":"2253987","quantity":98,"amount":14.62,"date":"2022-12-10T08:00:00.000Z","unit_value":0},{"compensation_id":"2255290","quantity":38,"amount":5.67,"date":"2022-12-10T08:00:00.000Z","unit_value":0}],"errors":[]}
*/ 
