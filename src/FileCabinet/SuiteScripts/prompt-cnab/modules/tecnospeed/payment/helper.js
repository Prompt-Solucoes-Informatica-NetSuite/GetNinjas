/**
 * @NApiVersion 2.x
 */
define(['../helper'],
  function (generalHelper) {
    /**
     * Validate payer.
     *
     * @param {object[]} data
     */
    function validatePayer (data) {
      data.cpfCnpj = generalHelper.clearNonDigits(data.cpfCnpj)
      data.zipcode = generalHelper.clearNonDigits(data.zipcode)
    }

    /**
     * Validate payment.
     *
     * @param {object} data
     */
    function validatePayment (data) {
      data.beneficiary.cpfCnpj = generalHelper.clearNonDigits(data.beneficiary.cpfCnpj)
    }

    return {
      validatePayer: validatePayer,
      validatePayment: validatePayment
    }
  })
