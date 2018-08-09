'use strict';

/**
 * Module dependencies, required for ALL Twyr' modules
 * @ignore
 */

/**
 * Module dependencies, required for this module
 * @ignore
 */
const TwyrBaseService = require('twyr-base-service').TwyrBaseService;
const TwyrSrvcError = require('twyr-service-error').TwyrServiceError;

/**
 * @class   ApiService
 * @extends {TwyrBaseService}
 * @classdesc The Twyr Web Application Server API Service.
 *
 * @description
 * Allows the rest of the Twyr Modules to communicate with each other by allowing registration / invocation of API.
 *
 */
class ApiService extends TwyrBaseService {
	// #region Constructor
	constructor(parent, loader) {
		super(parent, loader);
	}
	// #endregion

	// #region startup/teardown code
	/**
	 * @async
	 * @function
	 * @override
	 * @instance
	 * @memberof ApiService
	 * @name     _setup
	 *
	 * @returns  {null} Nothing.
	 *
	 * @summary  Sets up the broker to manage API exposed by other modules.
	 */
	async _setup() {
		try {
			await super._setup();

			const customMatch = function(pattern, data) {
				const items = this.find(pattern, true) || [];
				items.push(data);

				return {
					'find': function() {
						return items.length ? items : [];
					},

					'remove': function(search, api) {
						const apiIdx = items.indexOf(api);
						if(apiIdx < 0) return false;

						items.splice(apiIdx, 1);
						return true;
					}
				};
			};

			this.$patrun = require('patrun')(customMatch);
			return null;
		}
		catch(err) {
			throw new TwyrSrvcError(`${this.name}::_setup error`, err);
		}
	}

	/**
	 * @async
	 * @function
	 * @override
	 * @instance
	 * @memberof ApiService
	 * @name     _teardown
	 *
	 * @returns  {undefined} Nothing.
	 *
	 * @summary  Deletes the broker that manages API.
	 */
	async _teardown() {
		try {
			if(this.$patrun) delete this.$patrun;

			await super._teardown();
			return null;
		}
		catch(err) {
			throw new TwyrSrvcError(`${this.name}::_teardown error`, err);
		}
	}
	// #endregion

	// #region API
	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof ApiService
	 * @name     add
	 *
	 * @param    {string} pattern - The pattern to which this api will respond.
	 * @param    {Function} api - The api to be invoked against the pattern.
	 *
	 * @returns  {boolean} Boolean true/false - depending on whether the registration succeeded.
	 *
	 * @summary  Registers the api function as a handler for the pattern.
	 */
	async add(pattern, api) {
		try {
			// eslint-disable-next-line curly
			if(typeof api !== 'function') {
				throw new Error(`${this.name}::add expects a function for the pattern: ${pattern}`);
			}

			pattern = pattern.split('::').reduce((obj, value) => {
				obj[value] = value;
				return obj;
			}, {});

			this.$patrun.add(pattern, api);
			return true;
		}
		catch(err) {
			throw new TwyrSrvcError(`${this.name}::add error`, err);
		}
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof ApiService
	 * @name     execute
	 *
	 * @param    {string} pattern - The pattern to be executed.
	 * @param    {Object} data - The data to be passed in as arguments to each of the api registered against the pattern.
	 *
	 * @returns  {Array} The results of the execution.
	 *
	 * @summary  Executes all the apis registered as handlers for the pattern.
	 */
	async execute(pattern, data) {
		try {
			pattern = pattern.split('::').reduce((obj, value) => {
				obj[value] = value;
				return obj;
			}, {});

			if(!Array.isArray(data))
				data = [data];

			const results = [];
			for(const api of pattern) { // eslint-disable-line curly
				try {
					const result = await api(...data);
					results.push(result);
				}
				catch(execErr) {
					results.push(execErr);
				}
			}

			return results;
		}
		catch(err) {
			throw new TwyrSrvcError(`${this.name}::execute error`, err);
		}
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof ApiService
	 * @name     remove
	 *
	 * @param    {string} pattern - The pattern to which this api will respond.
	 * @param    {Function} api - The api to be de-registered against the pattern.
	 *
	 * @returns  {boolean} Boolean true/false - depending on whether the de-registration succeeded.
	 *
	 * @summary  De-registers the api function as a handler for the pattern.
	 */
	async remove(pattern, api) {
		try {
			// eslint-disable-next-line curly
			if(typeof api !== 'function') {
				throw new Error(`${this.name}::remove expects a function for the pattern: ${pattern}`);
			}

			pattern = pattern.split('::').reduce((obj, value) => {
				obj[value] = value;
				return obj;
			}, {});

			this.$patrun.remove(pattern, api);
			return true;
		}
		catch(err) {
			throw new TwyrSrvcError(`${this.name}::remove error`, err);
		}
	}
	// #endregion

	// #region Properties
	/**
	 * @override
	 */
	get Interface() {
		return {
			'add': this.add.bind(this),
			'execute': this.execute.bind(this),
			'remove': this.remove.bind(this)
		};
	}

	/**
	 * @override
	 */
	get dependencies() {
		return ['ConfigurationService', 'LoggerService'].concat(super.dependencies);
	}

	/**
	 * @override
	 */
	get basePath() {
		return __dirname;
	}
	// #endregion
}

exports.service = ApiService;
