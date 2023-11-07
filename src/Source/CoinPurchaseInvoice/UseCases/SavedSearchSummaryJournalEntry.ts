import { Search } from 'N/search'
import { debug } from 'N/log'

import { getSummaryOnJournalEntry } from './Entities/CoinCompensation'

export let execute = (): Search => getSummaryOnJournalEntry()