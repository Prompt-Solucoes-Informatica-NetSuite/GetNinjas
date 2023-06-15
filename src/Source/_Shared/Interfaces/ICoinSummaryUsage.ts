export interface ICoinSummaryUsage {
      customer_id: string | number
      class_id: string | number
      rate: number
      quantity: number
      amount: number
      compensations: ICompensationSummary[]
}