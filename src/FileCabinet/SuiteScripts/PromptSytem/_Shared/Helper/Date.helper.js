define(["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.date_less_than = exports.date_greater_than = exports.days_between = exports.removeDays = exports.addDays = void 0;
    /**
     * Add a quantity of days for a date
     * @param date Date of ref
     * @param days Number os days to add
     * @returns New date with add days
     */
    var addDays = function (date, days) {
        if (days === void 0) { days = 1; }
        var nuValue = new Date(date);
        nuValue.setDate(nuValue.getDate() + days);
        return nuValue;
    };
    exports.addDays = addDays;
    /**
     * Remove a quantity of days for a date
     * @param date Date of ref
     * @param days Number os days to remove
     * @returns New date with removed days
     */
    var removeDays = function (date, days) {
        if (days === void 0) { days = 1; }
        var nuValue = new Date(date);
        nuValue.setDate(nuValue.getDate() - days);
        return nuValue;
    };
    exports.removeDays = removeDays;
    /**
     * Return the count of days between two dates
     * @param dateInitial Initial Date
     * @param dateEnd End date
     * @returns Number os days
     */
    var days_between = function (dateInitial, dateEnd) {
        var restOfDays = dateInitial.getTime() - dateEnd.getTime();
        return Math.floor(restOfDays / (1000 * 60 * 60 * 24));
    };
    exports.days_between = days_between;
    /**
     * Verify if minimun date is greater than maximun
     * @param dateMin Minimun date
     * @param dateMax Maximun date
     * @returns If is GREATER THAN
     */
    var date_greater_than = function (dateMin, dateMax) { return dateMin.getDate() > dateMax.getDate(); };
    exports.date_greater_than = date_greater_than;
    /**
     * Verify if minimun date is less than maximun
     * @param dateMin Minimun date
     * @param dateMax Maximun date
     * @returns If is LESS THAN
     */
    var date_less_than = function (dateMin, dateMax) { return dateMin.getDate() < dateMax.getDate(); };
    exports.date_less_than = date_less_than;
});
