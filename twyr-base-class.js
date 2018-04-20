'use strict';

/**
 * Module dependencies, required for ALL Twyr' modules
 * @ignore
 */

/**
 * Module dependencies, required for this module
 * @ignore
 */
const EventEmitter = require('events');

/**
 * @class   TwyrBaseClass
 * @extends {EventEmitter}
 * @classdesc The Twyr Server Base Class.
 *
 * @description
 * Serves as the "base class" for all other classes in the Twyr Web Application Server,
 * including {@link TwyrBaseModule} and {@link TwyrModuleLoader}.
 *
 */
class TwyrBaseClass extends EventEmitter {
	constructor() {
		super();

		this.on('error', this._handleUncaughtException.bind(this));
	}

	/**
	 * @function
	 * @instance
	 * @memberof TwyrBaseClass
	 * @name     _handleUncaughtException
	 *
	 * @param    {Error} err - The unhandled exception.
	 *
	 * @returns  {undefined} Nothing.
	 *
	 * @summary  Logs Unhandled Exceptions to prevent the process from crashing.
	 */
	_handleUncaughtException(err) {
		console.error(`${this.name}::_handleUncaughtException: ${err.message}\n${err.stack}`);
	}

	/**
	 * @member   {string} name
	 * @instance
	 * @memberof TwyrBaseClass
	 *
	 * @readonly
	 */
	get name() {
		return this.constructor.name;
	}

	/**
	 * @member   {string} basePath
	 * @instance
	 * @memberof TwyrBaseClass
	 *
	 * @readonly
	 */
	get basePath() {
		return __dirname;
	}
}

exports.TwyrBaseClass = TwyrBaseClass;
