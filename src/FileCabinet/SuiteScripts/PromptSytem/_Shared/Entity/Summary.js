define(["require", "exports", "N/log"], function (require, exports, log_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Summary = void 0;
    var Summary = /** @class */ (function () {
        function Summary() {
            var _this = this;
            this.build = function (value) {
                (0, log_1.debug)('Summary Build', value);
                var noErrorCount = 0;
                var customer_id = value.customer_id, compensation_id = value.compensation_id, amount = value.amount, class_id = value.class_id, date = value.date, quantity = value.quantity, unit_value = value.unit_value, creation_date = value.creation_date;
                noErrorCount++;
                if (!customer_id)
                    _this.add_error(customer_id);
                noErrorCount++;
                if (!compensation_id)
                    _this.add_error(compensation_id);
                noErrorCount++;
                if (!class_id)
                    _this.add_error(class_id);
                noErrorCount++;
                if (!date)
                    _this.add_error(date);
                noErrorCount++;
                if (!unit_value)
                    _this.add_error(unit_value);
                noErrorCount++;
                if (!creation_date)
                    _this.add_error(creation_date);
                noErrorCount++;
                if (!_this.customer_id)
                    _this.customer_id = customer_id;
                if (!_this.class_id)
                    _this.class_id = class_id;
                if (!_this.rate)
                    _this.rate = unit_value;
                noErrorCount++;
                _this.compensations.push({
                    compensation_id: compensation_id === null || compensation_id === void 0 ? void 0 : compensation_id.toString(),
                    quantity: parseInt(quantity ? quantity : 0),
                    amount: parseFloat(amount ? amount : 0.0),
                    date: new Date(date),
                    unit_value: parseInt(unit_value ? unit_value : 0),
                });
                noErrorCount++;
                _this.amount = _this.get_total_amount();
                noErrorCount++;
                _this.quantity = _this.get_total_quantity();
                noErrorCount++;
                (0, log_1.debug)('noErrorCount', noErrorCount);
            };
            this.add_error = function (err) {
                _this.errors.push({
                    Value: Object.keys(err)[0].toString(),
                    Error: 'Not received'
                });
            };
            this.has_error = function () { return _this.errors.length > 0; };
            this.get_total_amount = function () {
                var _a;
                return (_a = _this.compensations) === null || _a === void 0 ? void 0 : _a.reduce(function (acc, obj) {
                    return acc + obj.amount;
                }, 0);
            };
            this.get_total_quantity = function () {
                var _a;
                return (_a = _this.compensations) === null || _a === void 0 ? void 0 : _a.reduce(function (acc, obj) {
                    return acc + obj.quantity;
                }, 0);
            };
            this.get_all_compensations = function () { return _this.compensations.map(function (x) { return x.compensation_id; }); };
            this.customer_id = 0;
            this.class_id = 0;
            this.compensations = [];
            this.amount = 0;
            this.rate = 0;
            this.quantity = 0;
            this.errors = [];
        }
        return Summary;
    }());
    exports.Summary = Summary;
});
