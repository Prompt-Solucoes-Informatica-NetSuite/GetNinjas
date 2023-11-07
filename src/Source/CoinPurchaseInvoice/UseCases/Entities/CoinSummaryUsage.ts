import { debug } from 'N/log'
import * as record from 'N/record'
import * as query from 'N/query'

import { ICoinSummaryUsage } from '../../../_Shared/Interfaces/ICoinSummaryUsage';

//#region [Queries]
import { GetCoinSummaryUsageById } from '../../../_Shared/Queries/GetCoinSummaryUsageById';
import { GetCompensationByParentId } from '../../../_Shared/Queries/GetCompensationByParentId';
import { Summary } from 'src/Source/_Shared/Entity/Summary';
//#endregion

export class CoinSummaryUsage implements ICoinSummaryUsage {
      id: string | number
      customer_id: string | number
      class_id: string | number
      rate: number
      quantity: number
      amount: number
      creation_date: Date
      compensations: ICompensationSummary[]

      journal_id: string | number
      invoice_id: string | number

      errors: PropertyError[]

      get_by_id: Function
      get_compensations: Function

      save: Function
      save_compensations: Function

      constructor() {
            debug('Constructor of:', 'Coin on Summary')
            this.customer_id = 0
            this.class_id = 0
            this.quantity = 0
            this.rate = 0
            this.amount = 0
            this.journal_id = 0
            this.invoice_id = 0
            this.creation_date = new Date()
            this.compensations = []
            this.errors = []

            this.get_by_id = this.get_compensation_by_id
            this.get_compensations = this.get_compensations_by_parent_id
            this.save = this.save_data_summary
            this.save_compensations = this.save_data_compensations
      }

      build_by_summary = (value: Summary) => {

            debug('Build Coin Summary: by summary', value)
            if (!value.customer_id) this.add_error(value.customer_id)
            if (!value.class_id) this.add_error(value.class_id)
            if (!value.quantity) this.add_error(value.quantity)
            if (value.amount === 0) this.add_error('amount')
            if (value.rate === 0) this.add_error(value.rate)

            this.customer_id = value.customer_id
            this.class_id = value.class_id
            this.quantity = value.quantity
            this.amount = value.amount
            this.rate = value.rate
            this.creation_date = value.creation_date

            this.compensations = value.compensations.map(x => new Compensation().build(x, value.customer_id))
            debug('BySummary', 'Build finished')
      }

      build_by_json = (value: object) => {

            debug('Build Coin Summary: by json', value)

            let values_entries: Object[] = Object.entries(value)

            values_entries.forEach(entry => {
                  let isObj = typeof (entry[1]) === 'object'

                  this[entry[0]] = isObj
                        ? entry[1].value
                        : entry[1].toString()
            })

            debug('ByJson', 'Build finished')
      }

      add_error = (err: any) => {
            this.errors.push({
                  Value: Object.keys(err)[0].toString(),
                  Error: 'Not received'
            })
      }

      has_error = () => this.errors.length > 0

      save_data_summary = (): void => {
            debug('Save Summary Usage', {
                  customer_id: this.customer_id,
                  class_id: this.class_id,
                  rate: this.rate,
                  quantity: this.quantity
            })
            let recType = record.create({
                  type: 'customrecord_coin_summary_usage',
                  isDynamic: true
            })

            recType.setValue({
                  fieldId: 'custrecord_customer_id',
                  value: this.customer_id
            })
            recType.setValue({
                  fieldId: 'custrecord_class_id',
                  value: this.class_id
            })
            recType.setValue({
                  fieldId: 'custrecord_rate',
                  value: this.rate
            })
            recType.setValue({
                  fieldId: 'custrecord_quantity',
                  value: this.quantity
            })
            recType.setValue({
                  fieldId: 'custrecord_total_amount',
                  value: this.amount
            })

            this.id = recType.save()

            debug('Summary Usage: ID', this.id)
      }

      save_data_compensations = () => {
            debug('Save Compensations Summary Usage', '')
            this.compensations.forEach(x => {
                  debug('Compensation', x)
                  let recType = record.create({
                        type: 'customrecord_compensation_list',
                        isDynamic: true
                  })

                  recType.setValue({
                        fieldId: 'custrecord_compensation_id',
                        value: x.compensation_id
                  })
                  recType.setValue({
                        fieldId: 'custrecord_compensation_customer',
                        value: x.customer_id
                  })
                  recType.setValue({
                        fieldId: 'custrecord_compensation_coin_summary',
                        value: this.id
                  })

                  x.id = recType.save()
                  x.coin_summary_usage_id = this.id

                  debug('Compensations: id', x.id)
            })
      }

      get_compensation_by_id = (internalId: string | number): CoinSummaryUsage => {
            let queryString = GetCoinSummaryUsageById(internalId.toString())

            let resultSet = query
                  .runSuiteQL({
                        query: queryString
                  })
                  .asMappedResults()

            if (resultSet.length !== 1) throw `__SUMMARY_${internalId}__WITH_ERROR__`

            let response = new CoinSummaryUsage()

            //response.build(resultSet[0])

            return response
      }

      get_compensations_by_parent_id = (internalId: string | number): ICompensationSummary[] => {

            let response: Compensation[] = []

            let queryString = GetCompensationByParentId(internalId.toString())

            let resultSet = query
                  .runSuiteQL({
                        query: queryString
                  })
                  .asMappedResults()

            resultSet.forEach(result =>
                  response.push(new Compensation().build(result)))


            return response
      }
}

export class Compensation implements ICompensationSummary {

      id: string | number
      compensation_id: string | number
      customer_id: string | number
      coin_summary_usage_id: string | number;

      build: Function

      constructor() {
            this.id = ''
            this.compensation_id = ''
            this.customer_id = ''
            this.coin_summary_usage_id = ''

            this.build = this.make_new_one
      }


      make_new_one = (value: ICompensation, customer_id: string | number): Compensation => {
            let comp = new Compensation()

            comp.compensation_id = value.compensation_id
            comp.customer_id = customer_id

            return comp
      }
}