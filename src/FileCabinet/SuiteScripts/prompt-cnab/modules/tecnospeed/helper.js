/**
 * @NApiVersion 2.x
 */
define([],
  function () {
    /**
     * Clear non-digits.
     *
     * @param value
     * @returns {string}
     */
    function clearNonDigits (value) {
      return typeof value === 'string' ? value.replace(/\D/g, '') : value
    }

    /**
     * Parameters to string.
     *
     * @param {object} parameters
     * @returns {*}
     */
    function parametersToString (parameters) {
      return Object.keys(parameters).reduce(function (acc, parameter) {
        acc += parameter + '=' + parameters[parameter]
        return acc
      }, '')
    }

    return {
      clearNonDigits: clearNonDigits,
      parametersToString: parametersToString
    }
  })
