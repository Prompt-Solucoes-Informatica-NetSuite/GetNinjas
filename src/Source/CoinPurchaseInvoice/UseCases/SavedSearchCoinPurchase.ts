import { Search } from 'N/search'
import { debug } from 'N/log'

import { getCoinPurchaseSearch } from './Entities/CoinCompensation'

import { days_between, date_greater_than } from '../../_Shared/Helper/Date.helper'

export let execute = (dateInitial: Date, dateEnd: Date): Search => {

      //debug('Days was came:', { dateInitial, dateEnd })

      if (!dateInitial) throw '__INITIAL_DATE_NOT_SET__'
      if (!dateEnd) throw '__END_DATE_NOT_SET__'

      if (date_greater_than(dateEnd, dateInitial)) throw '__YOU_CANNOT_SEARCH_DATE_IN_FURTHER__'
      if (days_between(dateInitial, dateEnd) > 7) throw '__TO_MUCH_DAYS_TO_SEARCH__'

      return getCoinPurchaseSearch(dateInitial, dateEnd)
}