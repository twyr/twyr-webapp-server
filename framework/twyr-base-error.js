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
const PgError = require('pg-error');

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
		const errstr = this.$innerError ? cleanStack(this.stack, { 'pretty': true }) : this.stack;
		if(!this.$innerError) return `\n\n========>>\n\nRoot Cause::${errstr}`;

		if(this.$innerError instanceof PgError)
			return `${errstr}\n\n========>>\n\nRoot Cause::${this.$innerError.message}\n${this.$innerError.D}\n\n`;

		if(!(this.$innerError instanceof TwyrBaseError))
			return `${errstr}\n\n========>>\n\nRoot Cause::${this.$innerError.stack}\n\n`;

		return `${errstr}\n${this.$innerError.toString()}`;
	}

	get inner() { return this.$innerError; }
}

exports.TwyrBaseError = TwyrBaseError;
