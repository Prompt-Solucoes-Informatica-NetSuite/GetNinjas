define(["require", "exports", "./Entities/CoinCompensation", "../../_Shared/Helper/Date.helper"], function (require, exports, CoinCompensation_1, Date_helper_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.execute = void 0;
    var execute = function (dateInitial, dateEnd) {
        //debug('Days was came:', { dateInitial, dateEnd })
        if (!dateInitial)
            throw '__INITIAL_DATE_NOT_SET__';
        if (!dateEnd)
            throw '__END_DATE_NOT_SET__';
        if ((0, Date_helper_1.date_greater_than)(dateEnd, dateInitial))
            throw '__YOU_CANNOT_SEARCH_DATE_IN_FURTHER__';
        if ((0, Date_helper_1.days_between)(dateInitial, dateEnd) > 7)
            throw '__TO_MUCH_DAYS_TO_SEARCH__';
        return (0, CoinCompensation_1.getCoinPurchaseSearch)(dateInitial, dateEnd);
    };
    exports.execute = execute;
});
