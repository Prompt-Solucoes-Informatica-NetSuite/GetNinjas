define(["require", "exports", "../UseCases/SavedSearchCoinPurchase", "../../_Shared/Helper/Date.helper"], function (require, exports, SavedSearchCoinPurchase, Date_helper_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.execute = void 0;
    var execute = function (executionDate, daysToSearch) {
        if (daysToSearch === void 0) { daysToSearch = 1; }
        //debug('SavedSearchByCoinPurchase', { executionDate, daysToSearch })
        var endDate = (0, Date_helper_1.removeDays)(executionDate, daysToSearch);
        //debug('EndDate', endDate)
        return SavedSearchCoinPurchase.execute(executionDate, endDate);
    };
    exports.execute = execute;
});
