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
/**
 * @class TwyrBaseError
 * @extends {Error}
 * @classdesc   The Twyr Server Base Class for all errors
 *
 * @param {string} message - The Error Message.
 * @param {Error} [inner] - Inner Error, if any.
 *
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

	/**
	 * @override
	 */
	toString() {
		const cleanStack = require('clean-stack');
		const PgError = require('pg-error');

		const errstr = this.$innerError ? cleanStack(this.stack, { 'pretty': true }) : this.stack;
		if(!this.$innerError) return `\n\n========>>\n\nRoot Cause::${errstr}`;

		if(this.$innerError instanceof PgError)
			return `${errstr}\n\n========>>\n\nRoot Cause::${this.$innerError.message}\n${this.$innerError.D}\n\n`;

		if(!(this.$innerError instanceof TwyrBaseError))
			return `${errstr}\n\n========>>\n\nRoot Cause::${this.$innerError.stack}\n\n`;

		return `${errstr}\n${this.$innerError.toString()}`;
	}

	/**
	 * @override
	 */
	toJSON() {
		const cleanStack = require('clean-stack');
		const PgError = require('pg-error');

		const errorData = {
			'detail': '',
			'source': {
				'pointer': 'data'
			}
		};

		const errstr = this.$innerError ? cleanStack(this.stack, { 'pretty': true }) : this.stack;

		if(!this.$innerError) {
			errorData['detail'] = errstr;
			return { 'errors': [errorData] };
		}

		if(this.$innerError instanceof PgError) {
			errorData['detail'] = `${errstr}\n${this.$innerError.message}\n${this.$innerError.D}`;
			return { 'errors': [errorData] };
		}

		if(!(this.$innerError instanceof TwyrBaseError)) {
			errorData['detail'] = `${errstr}\n${this.$innerError.stack}`;
			return { 'errors': [errorData] };
		}

		const errors = [{
			'detail': errstr,
			'source': {
				'pointer': 'data'
			}
		}];

		let innermostError = this.$innerError;
		while(innermostError) {
			errors.push({
				'detail': innermostError.$innerError ? cleanStack(innermostError.stack, { 'pretty': true }) : innermostError.stack,
				'source': {
					'pointer': 'data'
				}
			});

			innermostError = innermostError.$innerError;
		}

		return { 'errors': errors };
	}

	get inner() { return this.$innerError; }
}

exports.TwyrBaseError = TwyrBaseError;
