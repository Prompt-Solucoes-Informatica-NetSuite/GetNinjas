define(["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.execute = void 0;
    var execute = function (coinSummaryUsage) {
        if (coinSummaryUsage.has_error)
            throw '__COIN_SUMMARY_HAS_ERRORS__';
        return coinSummaryUsage.save();
    };
    exports.execute = execute;
});
