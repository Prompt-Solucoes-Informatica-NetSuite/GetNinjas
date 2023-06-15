export let GetCoinSummaryUsageById = (id: string): string => {
      return `
            SELECT TOP 1
                  id,
                  custrecord_customer_id,
                  custrecord_class_id,
                  custrecord_rate,
                  custrecord_quantity,
                  custrecord_total_amount,
            FROM
                  customrecord_coin_summary_usage
            WHERE
                  id = '${id}'  
            `
}