/**
 * @NApiVersion 2.x
 */
define(['N/https', 'N/error', 'N/encode', '../helper', './helper', 'N/url'],
  function (https, error, encode, generalHelper, paymentHelper, urlN) {
    /**
     * Pagamento API.
     */
    return function (config, options) {
      const url = config.isProduction 
        ? 'https://api.pagamentobancario.com.br/api/v1'
        : 'https://staging.pagamentobancario.com.br/api/v1'

      const headers = {
        cnpjSh: config.cnpjSh,
        tokenSh: config.tokenSh,
        payercpfcnpj: generalHelper.clearNonDigits(options.cpfCnpj),
        'Content-Type': 'application/json'
      }

      /**
       * Create payer.
       *
       * @param {object} payer
       * @returns {*}
       */
      this.createPayer = function (payer) {
        paymentHelper.validatePayer(payer)

        const res = https.post({
          url: url + '/payer',
          headers: headers,
          body: JSON.stringify(payer)
        })

        if (res.code === 201) {
          return JSON.parse(res.body)
        } else {
          throw error.create({
            name: 'TNS_PAY_CREATE_PAYER',
            message: res.body,
            notifyOff: true
          })
        }
      }

      /**
       * Create webhook for returning.
       *
       * @param {object}
       * @returns {*}
       */
      this.createReturnHook = function () {
        //paymentHelper.validatePayer(payer)

        const hookUrl = urlN.resolveScript({
          scriptId: 'customscriptps_cnab_st_hook_payment',
          deploymentId: 'customdeployps_cnab_st_hook_payment',
          returnExternalUrl: true
        })

        const tempBody = {
          type: "webhook",
          happen: ["CREATED", "PAID", "CANCELLED", "REJECTED", "SCHEDULED"],
          url: hookUrl,
          headers: {
            "User-Agent": "Mozilla/5.0"
          }
        }

        const res = https.post({
          url: url + '/notification',
          headers: headers,
          body: JSON.stringify(tempBody)
        })

        if (res.code === 201) {
          return JSON.parse(res.body)
        } else {
          throw error.create({
            name: 'TNS_PAY_CREATE_RETURN_HOOK',
            message: res.body,
            notifyOff: true
          })
        }
      }

      /**
       * Create account.
       *
       * @param {object} accounts
       * @returns {*}
       */
      this.createAccount = function (accounts) {
        const res = https.post({
          url: url + '/account',
          headers: headers,
          body: JSON.stringify(accounts)
        })

        if (res.code === 200 || res.code === 201) {
          return JSON.parse(res.body)
        } else {
          throw error.create({
            name: 'TNS_PAY_CREATE_ACCOUNT',
            message: res.body,
            notifyOff: true
          })
        }
      }

      /**
       * Delete contas.
       *
       * @param {string} cpfCnpj
       * @param {object} contas
       * @returns {*}
       */
      this.deleteAccount = function (cpfCnpj, contas) {
        const res = https.delete({
          url: url + '/account',
          headers: headers,
          body: JSON.stringify(contas)
        })

        if (res.code === 200 || res.code === 201) {
          return JSON.parse(res.body)
        } else {
          throw error.create({
            name: 'TNS_PAY_DELETE_ACCOUNT',
            message: res.body,
            notifyOff: true
          })
        }
      }

      /**
       * Create Payment.
       *
       * @param {string} type
       * @param {object} payment
       * @returns {*}
       */
      this.createPayment = function (type, payment) {
        paymentHelper.validatePayment(payment)
		log.debug('payment', payment)
        const res = https.post({
          url: url + '/payment/' + type,
          headers: headers,
          body: JSON.stringify(payment)
        })

        if (res.code === 200 || res.code === 201) {
          return JSON.parse(res.body)
        } else {
          throw error.create({
            name: 'TNS_PAY_CREATE_PAYMENT',
            message: res.body,
            notifyOff: true
          })
        }
      }

      /**
       * Fetch Payment.
       *
       * @param {string} parameters
       * @return {object}
       */
      this.fetchPayment = function (parameters) {
        const res = https.get({
          url: url + '/payment/' + generalHelper.parametersToString(parameters),
          headers: headers
        })

        if (res.code === 200 || res.code === 201) {
          return JSON.parse(res.body)
        } else {
          throw error.create({
            name: 'TNS_PAY_FETCH_PAYMENT',
            message: res.body,
            notifyOff: true
          })
        }
      }

      /**
       * Fetch Payment Return.
       *
       * @param {string} parameters
       * @return {object}
       */
      this.fetchPaymentReturn = function (uniqueId) {
        const res = https.get({
          url: url + '/payment?uniqueId=' + uniqueId,
          headers: headers
        })

        if (res.code === 200 || res.code === 201) {
          return JSON.parse(res.body)
        } else {
          throw error.create({
            name: 'TNS_PAY_FETCH_PAYMENT',
            message: res.body,
            notifyOff: true
          })
        }
      }

      /**
       * Create Remittance.
       *
       * @param {object[]} payments
       * @return {object}
       */
      this.createRemittance = function (payments) {
        const res = https.post({
          url: url + '/remittance',
          headers: headers,
          body: JSON.stringify({ payments: payments })
        })

        if (res.code === 201) {
          return JSON.parse(res.body)
        } else {
          throw error.create({
            name: 'TNS_PAY_CREATE_REMITTANCE',
            message: res.body,
            notifyOff: true
          })
        }
      }


      /**
       * Fetch Remittance.
       *
       * @param {string} id
       * @return {object}
       */
      this.fetchRemittance = function (id) {
        const res = https.get({
          url: url + '/remittance/' + id,
          headers: headers
        })

        if (res.code === 200 || res.code === 201) {
          return JSON.parse(res.body)
        } else {
          throw error.create({
            name: 'TNS_PAY_FETCH_REMITTANCE',
            message: res.body,
            notifyOff: true
          })
        }
      }

      /**
       * Request proof of payment.
       *
       * @param {object[]} payments
       * @return {object}
       */
      this.requestProof = function (payments) {
        const res = https.post({
          url: url + '/voucher',
          headers: headers,
          body: JSON.stringify({ payments: [payments] })
        })

        log.debug('body',JSON.stringify({ payments: [payments] }))

        if (res.code === 201) {
          return JSON.parse(res.body)
        } else {
          throw error.create({
            name: 'TNS_PAY_REQUEST_PROOF',
            message: res.body,
            notifyOff: true
          })
        }
      }

      /**
       * Fetch proof of payment.
       *
       * @param {object[]} uniqueId
       * @return {object}
       */
      this.fetchProof = function (uniqueId) {
        const res = https.get({
          url: url + '/voucher/' + uniqueId,
          headers: headers
        })

        if (res.code === 201) {
          return JSON.parse(res.body)
        } else {
          throw error.create({
            name: 'TNS_PAY_FETCH_PROOF',
            message: res.body,
            notifyOff: true
          })
        }
      }

      /**
       * Upload Return.
       *
       * @param {object} returnFile
       * @return {object}
       */
      this.uploadReturn = function (returnFile) {
        const boundary = Math.random().toString(36).replace(/[^a-z]+/g, '')

        headers['Content-Type'] = 'multipart/form-data; boundary=' + boundary

        const body = []

        body.push('--' + boundary)
        body.push('Content-Disposition: form-data; name="file"; filename="' + returnFile.name + '"')
        body.push('Content-Type: text/plain')
        body.push('')
        if (returnFile.name.indexOf('.txt') !== -1) {
          body.push(returnFile.getContents())
        } else {
          body.push(encode.convert({
            string: returnFile.getContents(),
            inputEncoding: encode.Encoding.BASE_64,
            outputEncoding: encode.Encoding.UTF_8
          }))
        }
        body.push('--' + boundary + '--')
        body.push('')

        const res = https.post({
          url: url + '/reconciliation',
          headers: headers,
          body: body.join('\r\n')
        })

        if (res.code === 200) {
          return JSON.parse(res.body)
        } else {
          throw error.create({
            name: 'TNS_PAY_UPLOAD_RETURN',
            message: res.body,
            notifyOff: true
          })
        }
      }

      /**
       * Fetch Return.
       *
       * @param {string} id
       * @return {object}
       */
      this.fetchReturn = function (id) {
        const res = https.get({
          url: url + '/reconciliation/' + id,
          headers: headers
        })

        if (res.code === 200) {
          return JSON.parse(res.body)
        } else {
          throw error.create({
            name: 'TNS_PAY_FETCH_RETURN',
            message: res.body,
            notifyOff: true
          })
        }
      }
    }
  })
