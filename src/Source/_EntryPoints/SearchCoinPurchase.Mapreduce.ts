/**
 *@NApiVersion 2.1
 *@NScriptType MapReduceScript
 */

import { EntryPoints } from 'N/types'
import { debug, audit, error } from 'N/log'
import * as format from 'N/format'

import * as GetSavedSearchByCoinPurchase from '../CoinPurchaseInvoice/Services/GetSavedSearchByCoinPurchase'
import * as GenerateSummaryRecord from '../CoinPurchaseInvoice/Services/GenerateSummaryRecord'
import { Summary } from '../_Shared/Entity/Summary'

type getInputData = EntryPoints.MapReduce.getInputData
type getInputDataContext = EntryPoints.MapReduce.getInputDataContext
type map = EntryPoints.MapReduce.map
type mapContext = EntryPoints.MapReduce.mapContext
type reduce = EntryPoints.MapReduce.reduce
type reduceContext = EntryPoints.MapReduce.reduceContext
type summarize = EntryPoints.MapReduce.summarize
type summarizeContext = EntryPoints.MapReduce.summarizeContext

interface IValue {
      compensation_id: string | number,
      customer_id: string | number,
      class_id: string | number,
      date: Date,
      invoiced: boolean,
      quantity: number,
      amount: number,
      unit_value: number,
      transaction_id: string | number
}

const string_to_date = (context: string): Date => {
      const parsed = format.parse({ type: format.Type.DATE, value: context })
      return new Date(parsed)
}

const load_values = (context: string): IValue => {

      const parsedValue = JSON.parse(context)

      //debug('Values to load', parsedValue)

      const parsed = {
            compensation_id: parsedValue.id,
            customer_id: parsedValue.values['custrecord_cpb_cliente_compensacao']['value'].toString(),
            class_id: parseInt(parsedValue.values['custrecord_cpb_centro_custo_compensacao']['value'].toString()),
            date: string_to_date(parsedValue.values['custrecord_cpb_data_compensacao'].toString()),
            invoiced: parsedValue.values['custrecord_cpb_faturado'].toString() === 'true',
            quantity: parseFloat(parsedValue.values['custrecord_cpb_quantidade_compensacao'].toString()),
            amount: parseFloat(parsedValue.values['custrecord_cpb_valor_total_compensacao'].toString()),
            unit_value: parseFloat(parsedValue.values['custrecord_cpb_valor_uni_compensacao'].toString()),
            transaction_id: parseFloat(parsedValue.values['custrecord_cpb_id_transacao'].toString()),
            creation_date: new Date()
      }

      //debug('Parced Values', parsed)

      return parsed
}

export let getInputData: getInputData = (context: getInputDataContext) => {
      try {
            const actualDate = new Date()
            //debug('Starting the value', actualDate.toLocaleDateString())

            let savedSearch = GetSavedSearchByCoinPurchase.execute(actualDate)
            //debug('GetInputData: SavedSearch', savedSearch)

            return savedSearch
      } catch (err) {
            error('Error', err)

            return []
      }
}
export let map: map = (context: mapContext) => {
      try {
            //audit('Map: context', context)
            const loadedValues = load_values(context.value)

            context.write({
                  key: loadedValues.customer_id.toString(),
                  value: JSON.stringify(loadedValues)
            })

      } catch (err) {
            error('Map: error', err)
      }
}

export let reduce: reduce = (context: reduceContext) => {
      try {
            audit('Reduce: context', context)
            const summary = new Summary()

            context.values.forEach(x => {
                  let parsed = JSON.parse(x)

                  summary.build(parsed)
            })

            audit('Summary on Reduce', summary)

            GenerateSummaryRecord.execute(summary)

      } catch (err) {
            error('Reduce: error', err)
      }
}
export let summarize: summarize = (summary: summarizeContext) => { }