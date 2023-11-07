/**
 *@NApiVersion 2.1
 *@NScriptType MapReduceScript
 */

import { EntryPoints } from 'N/types'
import { debug, audit, error } from 'N/log'

type getInputData = EntryPoints.MapReduce.getInputData
type getInputDataContext = EntryPoints.MapReduce.getInputDataContext
type map = EntryPoints.MapReduce.map
type mapContext = EntryPoints.MapReduce.mapContext
type reduce = EntryPoints.MapReduce.reduce
type reduceContext = EntryPoints.MapReduce.reduceContext
type summarize = EntryPoints.MapReduce.summarize
type summarizeContext = EntryPoints.MapReduce.summarizeContext

export let getInputData: getInputData = (context: getInputDataContext) => { }
export let map: map = (context: mapContext) => { }
export let reduce: reduce = (context: reduceContext) => { }
export let summarize: summarize = (summary: summarizeContext) => { }