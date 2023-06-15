define(["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.GetCoinSummaryUsageById = void 0;
    var GetCoinSummaryUsageById = function (id) {
        return "\n            SELECT TOP 1\n                  id,\n                  custrecord_customer_id,\n                  custrecord_class_id,\n                  custrecord_rate,\n                  custrecord_quantity,\n                  custrecord_total_amount,\n            FROM\n                  customrecord_coin_summary_usage\n            WHERE\n                  id = '".concat(id, "'  \n            ");
    };
    exports.GetCoinSummaryUsageById = GetCoinSummaryUsageById;
});
