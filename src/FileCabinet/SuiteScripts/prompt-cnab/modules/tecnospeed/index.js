/**
 * @NApiVersion 2.x
 */
define(['N/runtime', './payment/index'],
  function (runtime, Payment) {
    /**
     * Tecnospeed API.
     */
    return function () {
      const config = {
        isProduction: runtime.envType === runtime.EnvType.PRODUCTION,
        cnpjSh: '72190085000129',
        tokenSh: '5b9e820ab0bee0c4bfc288f079e8d0c7'
      }

      /**
       * Pagamento API.
       *
       * @returns {*|exports}
       * @constructor
       */
      this.Payment = function (options) {
        return new Payment(config, options)
      }
    }
  })