import * as record from 'N/record'
import { debug } from 'N/log'

import { CoinSummaryUsage } from "./Entities/CoinSummaryUsage"

function generateLine(journalEntry: record.Record, coinSummaryUsage: CoinSummaryUsage, type: string) {
      journalEntry.selectNewLine({ sublistId: 'line' })

      journalEntry.setCurrentSublistValue({
            sublistId: 'line',
            fieldId: 'account',
            value: 6
      })

      journalEntry.setCurrentSublistValue({
            sublistId: 'line',
            fieldId: type,
            value: coinSummaryUsage.amount
      })

      journalEntry.setCurrentSublistValue({
            sublistId: 'line',
            fieldId: 'memo',
            value: 'MEMO TESTE'
      })

      journalEntry.setCurrentSublistValue({
            sublistId: 'line',
            fieldId: 'name',
            value: 'NOME TESTE'
      })

      journalEntry.setCurrentSublistValue({
            sublistId: 'line',
            fieldId: 'class',
            value: 19
      })

      journalEntry.setCurrentSublistValue({
            sublistId: 'line',
            fieldId: 'custcol_cp_dtcomp',
            value: coinSummaryUsage.creation_date
      })

      journalEntry.commitLine({
            sublistId: 'line'
      })
}

export let execute = (coinSummaryUsage: CoinSummaryUsage): void => {

      if (coinSummaryUsage.has_error) throw '__COIN_SUMMARY_HAS_ERRORS__'

      debug('Criação do lançamento contábil', 'Start')
      const journalEntry = record.create({ type: record.Type.JOURNAL_ENTRY, isDynamic: true })

      journalEntry.setValue({
            fieldId: 'subsidiary',
            value: '2'
      })

      journalEntry.setValue({
            fieldId: 'currency',
            value: 'REAL'
      })

      journalEntry.setValue({
            fieldId: 'exchangerate',
            value: '1'
      })

      journalEntry.setValue({
            fieldId: 'trandate',
            value: coinSummaryUsage.creation_date
      })

      journalEntry.setValue({
            fieldId: 'memo',
            value: 'Compra de MOeda por Cliente'
      })

      generateLine(journalEntry, coinSummaryUsage, 'credit')
      generateLine(journalEntry, coinSummaryUsage, 'debit')

      debug('Criação do lançamento contábil', 'End')
      const journalEntryId = journalEntry.save()

      debug('ID', journalEntryId)
}
