define(["require", "exports", "N/log", "N/record", "N/query", "../../../_Shared/Queries/GetCoinSummaryUsageById", "../../../_Shared/Queries/GetCompensationByParentId"], function (require, exports, log_1, record, query, GetCoinSummaryUsageById_1, GetCompensationByParentId_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Compensation = exports.CoinSummaryUsage = void 0;
    //#endregion
    var CoinSummaryUsage = /** @class */ (function () {
        function CoinSummaryUsage() {
            var _this = this;
            this.build_by_summary = function (value) {
                (0, log_1.debug)('Build Coin Summary: by summary', value);
                if (!value.customer_id)
                    _this.add_error(value.customer_id);
                if (!value.class_id)
                    _this.add_error(value.class_id);
                if (!value.quantity)
                    _this.add_error(value.quantity);
                if (value.amount === 0)
                    _this.add_error('amount');
                if (value.rate === 0)
                    _this.add_error(value.rate);
                _this.customer_id = value.customer_id;
                _this.class_id = value.class_id;
                _this.quantity = value.quantity;
                _this.amount = value.amount;
                _this.rate = value.rate;
                _this.creation_date = value.creation_date;
                _this.compensations = value.compensations.map(function (x) { return new Compensation().build(x, value.customer_id); });
                (0, log_1.debug)('BySummary', 'Build finished');
            };
            this.build_by_json = function (value) {
                (0, log_1.debug)('Build Coin Summary: by json', value);
                var values_entries = Object.entries(value);
                values_entries.forEach(function (entry) {
                    var isObj = typeof (entry[1]) === 'object';
                    _this[entry[0]] = isObj
                        ? entry[1].value
                        : entry[1].toString();
                });
                (0, log_1.debug)('ByJson', 'Build finished');
            };
            this.add_error = function (err) {
                _this.errors.push({
                    Value: Object.keys(err)[0].toString(),
                    Error: 'Not received'
                });
            };
            this.has_error = function () { return _this.errors.length > 0; };
            this.save_data_summary = function () {
                (0, log_1.debug)('Save Summary Usage', {
                    customer_id: _this.customer_id,
                    class_id: _this.class_id,
                    rate: _this.rate,
                    quantity: _this.quantity
                });
                var recType = record.create({
                    type: 'customrecord_coin_summary_usage',
                    isDynamic: true
                });
                recType.setValue({
                    fieldId: 'custrecord_customer_id',
                    value: _this.customer_id
                });
                recType.setValue({
                    fieldId: 'custrecord_class_id',
                    value: _this.class_id
                });
                recType.setValue({
                    fieldId: 'custrecord_rate',
                    value: _this.rate
                });
                recType.setValue({
                    fieldId: 'custrecord_quantity',
                    value: _this.quantity
                });
                recType.setValue({
                    fieldId: 'custrecord_total_amount',
                    value: _this.amount
                });
                _this.id = recType.save();
                (0, log_1.debug)('Summary Usage: ID', _this.id);
            };
            this.save_data_compensations = function () {
                (0, log_1.debug)('Save Compensations Summary Usage', '');
                _this.compensations.forEach(function (x) {
                    (0, log_1.debug)('Compensation', x);
                    var recType = record.create({
                        type: 'customrecord_compensation_list',
                        isDynamic: true
                    });
                    recType.setValue({
                        fieldId: 'custrecord_compensation_id',
                        value: x.compensation_id
                    });
                    recType.setValue({
                        fieldId: 'custrecord_compensation_customer',
                        value: x.customer_id
                    });
                    recType.setValue({
                        fieldId: 'custrecord_compensation_coin_summary',
                        value: _this.id
                    });
                    x.id = recType.save();
                    x.coin_summary_usage_id = _this.id;
                    (0, log_1.debug)('Compensations: id', x.id);
                });
            };
            this.get_compensation_by_id = function (internalId) {
                var queryString = (0, GetCoinSummaryUsageById_1.GetCoinSummaryUsageById)(internalId.toString());
                var resultSet = query
                    .runSuiteQL({
                    query: queryString
                })
                    .asMappedResults();
                if (resultSet.length !== 1)
                    throw "__SUMMARY_".concat(internalId, "__WITH_ERROR__");
                var response = new CoinSummaryUsage();
                //response.build(resultSet[0])
                return response;
            };
            this.get_compensations_by_parent_id = function (internalId) {
                var response = [];
                var queryString = (0, GetCompensationByParentId_1.GetCompensationByParentId)(internalId.toString());
                var resultSet = query
                    .runSuiteQL({
                    query: queryString
                })
                    .asMappedResults();
                resultSet.forEach(function (result) {
                    return response.push(new Compensation().build(result));
                });
                return response;
            };
            (0, log_1.debug)('Constructor of:', 'Coin on Summary');
            this.customer_id = 0;
            this.class_id = 0;
            this.quantity = 0;
            this.rate = 0;
            this.amount = 0;
            this.journal_id = 0;
            this.invoice_id = 0;
            this.creation_date = new Date();
            this.compensations = [];
            this.errors = [];
            this.get_by_id = this.get_compensation_by_id;
            this.get_compensations = this.get_compensations_by_parent_id;
            this.save = this.save_data_summary;
            this.save_compensations = this.save_data_compensations;
        }
        return CoinSummaryUsage;
    }());
    exports.CoinSummaryUsage = CoinSummaryUsage;
    var Compensation = /** @class */ (function () {
        function Compensation() {
            this.make_new_one = function (value, customer_id) {
                var comp = new Compensation();
                comp.compensation_id = value.compensation_id;
                comp.customer_id = customer_id;
                return comp;
            };
            this.id = '';
            this.compensation_id = '';
            this.customer_id = '';
            this.coin_summary_usage_id = '';
            this.build = this.make_new_one;
        }
        return Compensation;
    }());
    exports.Compensation = Compensation;
});
