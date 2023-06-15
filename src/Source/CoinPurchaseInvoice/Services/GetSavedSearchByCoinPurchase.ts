import { Search } from 'N/search'
import { debug } from 'N/log'

import * as SavedSearchCoinPurchase from '../UseCases/SavedSearchCoinPurchase'
import { removeDays } from '../../_Shared/Helper/Date.helper'

export let execute = (executionDate: Date, daysToSearch: number = 1): Search => {

      //debug('SavedSearchByCoinPurchase', { executionDate, daysToSearch })
      let endDate = removeDays(executionDate, daysToSearch)
      //debug('EndDate', endDate)

      return SavedSearchCoinPurchase.execute(executionDate, endDate)
}