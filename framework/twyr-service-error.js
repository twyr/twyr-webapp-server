'use strict';

/**
 * Module dependencies, required for ALL Twyr modules
 * @ignore
 */

/**
 * Module dependencies, required for this module
 * @ignore
 */
const TwyrBaseError = require('./twyr-base-error').TwyrBaseError;

/**
 * @class   TwyrServiceError
 * @extends {TwyrBaseError}
 * @classdesc   The Twyr Server Base Class for all errors emitted by Services
 *
 * @param {string} message - The Error Message.
 * @param {Error} [inner] - Inner Error, if any.
 *
 * @description
 * Serves as the "base class" for all other service errors in the Twyr Web Application Server.
 *
 */
class TwyrServiceError extends TwyrBaseError {
	constructor(message, inner) {
		super(message, inner);
	}
}

exports.TwyrServiceError = TwyrServiceError;
