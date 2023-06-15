import { CoinSummaryUsage } from "./Entities/CoinSummaryUsage"

export let execute = (coinSummaryUsage: CoinSummaryUsage): string | number => {

      if (coinSummaryUsage.has_error) throw '__COIN_SUMMARY_HAS_ERRORS__'

      return coinSummaryUsage.save()
}