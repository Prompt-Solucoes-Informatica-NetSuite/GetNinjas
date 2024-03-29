import { debug } from "N/log"

import { ISummary } from "../Interfaces/ISummary"

export class Summary implements ISummary {

      customer_id: string | number
      class_id: string | number
      quantity: number
      amount: number
      rate: number
      creation_date: Date
      compensations: ICompensation[]

      buildSuccess: boolean
      errors: PropertyError[]

      constructor() {
            this.customer_id = 0
            this.class_id = 0
            this.compensations = []
            this.amount = 0
            this.rate = 0
            this.quantity = 0

            this.errors = []
      }

      build = (value: any) => {

            debug('Summary Build', value)
            let noErrorCount = 0

            let {
                  customer_id,
                  compensation_id,
                  amount,
                  class_id,
                  date,
                  quantity,
                  unit_value,
                  creation_date
            } = value

            noErrorCount++
            if (!customer_id) this.add_error(customer_id)
            noErrorCount++
            if (!compensation_id) this.add_error(compensation_id)
            noErrorCount++
            if (!class_id) this.add_error(class_id)
            noErrorCount++
            if (!date) this.add_error(date)
            noErrorCount++
            if (!unit_value) this.add_error(unit_value)
            noErrorCount++
            if (!creation_date) this.add_error(creation_date)
            noErrorCount++

            if (!this.customer_id)
                  this.customer_id = customer_id
            if (!this.class_id)
                  this.class_id = class_id
            if (!this.rate)
                  this.rate = unit_value

            noErrorCount++

            this.compensations.push({
                  compensation_id: compensation_id?.toString(),
                  quantity: parseInt(quantity ? quantity : 0),
                  amount: parseFloat(amount ? amount : 0.0),
                  date: new Date(date),
                  unit_value: parseInt(unit_value ? unit_value : 0),
            })

            noErrorCount++
            this.amount = this.get_total_amount()
            noErrorCount++
            this.quantity = this.get_total_quantity()
            noErrorCount++

            debug('noErrorCount', noErrorCount)
      }

      add_error = (err: any) => {
            this.errors.push({
                  Value: Object.keys(err)[0].toString(),
                  Error: 'Not received'
            })
      }

      has_error = () => this.errors.length > 0

      get_total_amount = (): number => this.compensations?.reduce((acc, obj) => {
            return acc + obj.amount
      }, 0)

      get_total_quantity = (): number => this.compensations?.reduce((acc, obj) => {
            return acc + obj.quantity
      }, 0)

      get_all_compensations = () => this.compensations.map(x => x.compensation_id)
}