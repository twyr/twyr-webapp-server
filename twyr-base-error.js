'use strict';

/**
 * Module dependencies, required for ALL Twyr' modules
 * @ignore
 */
// const promises = require('bluebird');

/**
 * Module dependencies, required for this module
 * @ignore
 */
const cleanStack = require('clean-stack');

/**
 * @class TwyrBaseError
 * @extends {Error}
 *
 * @param {string} message - The Error Message.
 * @param {Error} [inner] - Inner Error, if any.
 *
 * @summary   The Twyr Server Base Class for all errors
 *
 * @description
 * Extends the JS native "Error" object to make it easier for typing / stack tracing / etc. Based on
 * {@link https://stackoverflow.com/a/32749533|Lee Benson's answer to Extending Error in Javascript with ES6 syntax}
 */
class TwyrBaseError extends Error {
	constructor(message, inner) {
		super(message);

		this.name = this.constructor.name;
		this.$innerError = inner;

		Error.captureStackTrace(this, this.constructor);
	}

	toString() {
		const errstr = cleanStack(this.stack, { 'pretty': true });
		if(!this.$innerError) return `\n\n========>>\n\n${errstr.replace(this.name, 'Root Cause')}`;

		if(!(this.$innerError instanceof TwyrBaseError))
			return `${errstr}\n\n========>>\n\n${cleanStack(this.$innerError.stack, { 'pretty': true }).replace('Error', 'Root Cause')}`;

		return `${errstr}\n${this.$innerError.toString()}`;
	}

	get inner() { return this.$innerError; }
}

exports.TwyrBaseError = TwyrBaseError;
