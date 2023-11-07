/**
 *@NApiVersion 2.1
 *@NScriptType MapReduceScript
 */

import { EntryPoints } from 'N/types'
import { debug, audit, error } from 'N/log'

import * as GetSummaryByDateToJournalEntry from '../CoinPurchaseInvoice/Services/GetSummaryByDateToJournalEntry'
import * as GenerateJournalEntry from '../CoinPurchaseInvoice/Services/GenerateJournalEntry'

type getInputData = EntryPoints.MapReduce.getInputData
type getInputDataContext = EntryPoints.MapReduce.getInputDataContext
type reduce = EntryPoints.MapReduce.reduce
type reduceContext = EntryPoints.MapReduce.reduceContext
type summarize = EntryPoints.MapReduce.summarize
type summarizeContext = EntryPoints.MapReduce.summarizeContext

export let getInputData: getInputData = (context: getInputDataContext) => {
      try {
            let savedSearch = GetSummaryByDateToJournalEntry.execute()

            return savedSearch
      } catch (err) {
            error('Error', err)

            return []
      }
}
export let reduce: reduce = (context: reduceContext) => {
      try {
            debug('reduce context', context)

            if (context.values.length === 0) return

            const { values }: object[] = JSON.parse(context.values[0])

            debug('Values in Reduce', values)
            GenerateJournalEntry.execute(values)
      } catch (err) {
            error('Error', err)
      }
}
export let summarize: summarize = (summary: summarizeContext) => { }



/**
 
{"type":"mapreduce.ReduceContext","isRestarted":false,"executionNo":1,"key":"14507","values":["{\"recordType\":\"customrecord_coin_summary_usage\",\"id\":\"14507\",\"values\":{\"created\":\"23/06/2023 11:17\",\"custrecord_class_id\":{\"value\":\"115\",\"text\":\"Receita Operacional\"},\"custrecord_coin_summary_inv\":\"\",\"custrecord_coin_summary_je\":\"\",\"custrecord_customer_id\":{\"value\":\"3302536\",\"text\":\"2412249 Evilly Silva\"},\"custrecord_quantity\":\"292\",\"custrecord_rate\":\".15\",\"custrecord_total_amount\":\"43.76\",\"id\":\"14507\"}}"]}
{"type":"mapreduce.ReduceContext","isRestarted":false,"executionNo":1,"key":"14508","values":["{\"recordType\":\"customrecord_coin_summary_usage\",\"id\":\"14508\",\"values\":{\"created\":\"23/06/2023 11:17\",\"custrecord_class_id\":{\"value\":\"115\",\"text\":\"Receita Operacional\"},\"custrecord_coin_summary_inv\":\"\",\"custrecord_coin_summary_je\":\"\",\"custrecord_customer_id\":{\"value\":\"3304358\",\"text\":\"2414071 Tiago Brandão\"},\"custrecord_quantity\":\"22\",\"custrecord_rate\":\".15\",\"custrecord_total_amount\":\"3.28\",\"id\":\"14508\"}}"]}
{"type":"mapreduce.ReduceContext","isRestarted":false,"executionNo":1,"key":"14504","values":["{\"recordType\":\"customrecord_coin_summary_usage\",\"id\":\"14504\",\"values\":{\"created\":\"23/06/2023 11:17\",\"custrecord_class_id\":{\"value\":\"115\",\"text\":\"Receita Operacional\"},\"custrecord_coin_summary_inv\":\"\",\"custrecord_coin_summary_je\":\"\",\"custrecord_customer_id\":{\"value\":\"3301586\",\"text\":\"2411299 Efrain Santos\"},\"custrecord_quantity\":\"828\",\"custrecord_rate\":\".15\",\"custrecord_total_amount\":\"123.49999999999999\",\"id\":\"14504\"}}"]}
{"type":"mapreduce.ReduceContext","isRestarted":false,"executionNo":1,"key":"14492","values":["{\"recordType\":\"customrecord_coin_summary_usage\",\"id\":\"14492\",\"values\":{\"created\":\"23/06/2023 11:17\",\"custrecord_class_id\":{\"value\":\"115\",\"text\":\"Receita Operacional\"},\"custrecord_coin_summary_inv\":\"\",\"custrecord_coin_summary_je\":\"\",\"custrecord_customer_id\":{\"value\":\"3297001\",\"text\":\"2406714 Reformas e Construções\"},\"custrecord_quantity\":\"154\",\"custrecord_rate\":\".15\",\"custrecord_total_amount\":\"23.08\",\"id\":\"14492\"}}"]}

 */