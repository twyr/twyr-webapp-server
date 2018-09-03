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
 * @class   TwyrTemplateError
 * @extends {TwyrBaseError}
 * @classdesc   The Twyr Server Base Class for all errors emitted by Templates
 *
 * @param {string} message - The Error Message.
 * @param {Error} [inner] - Inner Error, if any.
 *
 * @description
 * Serves as the "base class" for all other template errors in the Twyr Web Application Server.
 *
 */
class TwyrComponentError extends TwyrBaseError {
	constructor(message, inner) {
		super(message, inner);
	}
}

exports.TwyrComponentError = TwyrComponentError;
