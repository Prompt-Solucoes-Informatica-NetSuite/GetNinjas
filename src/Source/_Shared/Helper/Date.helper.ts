/**
 * Add a quantity of days for a date
 * @param date Date of ref
 * @param days Number os days to add
 * @returns New date with add days
 */
export let addDays = (date: Date, days: number = 1): Date => {
      let nuValue = new Date(date)

      nuValue.setDate(nuValue.getDate() + days)
      return nuValue
}
/**
 * Remove a quantity of days for a date
 * @param date Date of ref
 * @param days Number os days to remove
 * @returns New date with removed days
 */
export let removeDays = (date: Date, days: number = 1): Date => {
      let nuValue = new Date(date)

      nuValue.setDate(nuValue.getDate() - days)
      return nuValue
}
/**
 * Return the count of days between two dates
 * @param dateInitial Initial Date
 * @param dateEnd End date
 * @returns Number os days
 */
export let days_between = (dateInitial: Date, dateEnd: Date): number => {
      const restOfDays = dateInitial.getTime() - dateEnd.getTime()

      return Math.floor(restOfDays / (1000 * 60 * 60 * 24));
}

/**
 * Verify if minimun date is greater than maximun
 * @param dateMin Minimun date
 * @param dateMax Maximun date
 * @returns If is GREATER THAN
 */
export let date_greater_than = (dateMin: Date, dateMax: Date): boolean => dateMin.getDate() > dateMax.getDate()
/**
 * Verify if minimun date is less than maximun
 * @param dateMin Minimun date
 * @param dateMax Maximun date
 * @returns If is LESS THAN
 */
export let date_less_than = (dateMin: Date, dateMax: Date): boolean => dateMin.getDate() < dateMax.getDate()