const fs = require('fs')

let rawdata = fs.readFileSync('formated.json')
let rawCustomers = JSON.parse(rawdata)
let customers = []

rawCustomers.forEach(cust => {

      if (customers.length === 0) {
            customers.push({
                  id: cust.customer_id,
                  value: [cust]
            })

            return
      }

      let found = customers.find(x => x.id === cust.customer_id)

      if (found) found.value.push(cust)
      else
            customers.push({
                  id: cust.customer_id,
                  value: [cust]
            })
})

let purchCounter = 0
customers.forEach(x => {
      let custId = x.id
      let custTotal = x.value.length
      purchCounter += custTotal

      console.log(`Customer ${custId}: ${custTotal} purchases`)
})
console.log(`We have ${purchCounter} purchases to generate Journal Entry.`)
console.log(`We have ${customers.length} customers on december month.`)
console.log(`In total, it will be: ${purchCounter + customers.length} transactions per month.`)


/**
 
customers: [
      customer: {
            id: <INTERNAL_ID>,
            value: <RAW_VALUE>
      }
]

 */