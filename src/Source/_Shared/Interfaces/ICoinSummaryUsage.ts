export interface ICoinSummaryUsage {
      customer_id: string | number
      class_id: string | number
      rate: number
      creation_date: Date
      quantity: number
      amount: number
      compensations: ICompensationSummary[]

      journal_id: string | number
      invoice_id: string | number
}