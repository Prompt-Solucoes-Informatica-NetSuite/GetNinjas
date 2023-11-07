import { Search } from 'N/search'
import { debug } from 'N/log'

import * as SavedSearchSummaryJournalEntry from '../UseCases/SavedSearchSummaryJournalEntry'

export let execute = (): Search =>  SavedSearchSummaryJournalEntry.execute()