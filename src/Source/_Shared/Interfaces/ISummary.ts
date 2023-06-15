export interface ISummary {
      customer_id: string | number
      class_id: string | number
      quantity: number
      amount: number
      rate: number
      compensations: ICompensation[]
}