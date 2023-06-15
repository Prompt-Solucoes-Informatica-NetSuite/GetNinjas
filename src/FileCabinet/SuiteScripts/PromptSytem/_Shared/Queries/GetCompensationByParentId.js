define(["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.GetCompensationByParentId = void 0;
    var GetCompensationByParentId = function (id) {
        return "\n      SELECT\n            id,\n            custrecord_compensation_id,\n            custrecord_compensation_customer,\n            custrecord_compensation_coin_summary\n      FROM\n            customrecord_compensation_list\n      WHERE\n            custrecord_compensation_id = '".concat(id, "'\n");
    };
    exports.GetCompensationByParentId = GetCompensationByParentId;
});
