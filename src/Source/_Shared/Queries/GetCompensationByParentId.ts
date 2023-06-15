export let GetCompensationByParentId = (id: string): string => {
      return `
      SELECT
            id,
            custrecord_compensation_id,
            custrecord_compensation_customer,
            custrecord_compensation_coin_summary
      FROM
            customrecord_compensation_list
      WHERE
            custrecord_compensation_id = '${id}'
`
}