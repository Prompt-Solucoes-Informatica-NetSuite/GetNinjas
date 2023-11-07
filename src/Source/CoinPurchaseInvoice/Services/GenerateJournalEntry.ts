import * as CreateJournalEntryBySummary from '../UseCases/CreateJournalEntryBySummary'
import { CoinSummaryUsage } from '../UseCases/Entities/CoinSummaryUsage'

export let execute = (value: object): void => {
      const coinSummaryUsage = new CoinSummaryUsage()
      coinSummaryUsage.build_by_json(value)

      CreateJournalEntryBySummary.execute(coinSummaryUsage)
}