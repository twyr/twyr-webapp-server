'use strict';

/**
 * Module dependencies, required for ALL Twyr' modules
 * @ignore
 */

/**
 * Module dependencies, required for this module
 * @ignore
 */
const TwyrSrvcLoader = require('twyr-service-loader').TwyrServiceLoader;
const TwyrSrvcError = require('twyr-service-error').TwyrServiceError;

/**
 * @class   ConfigurationServiceLoader
 * @extends {TwyrServiceLoader}
 * @classdesc The specialized loader for the Twyr Web Application Server Configuration Service.
 *
 * @description
 * Runs load / init / start in one shot so that the rest of the codebase can access module-specific configurations
 * by the time they are loaded by the framework.
 *
 */
class ConfigurationServiceLoader extends TwyrSrvcLoader {
	// #region Constructor
	constructor(twyrModule) {
		super(twyrModule);
	}
	// #endregion

	// #region Lifecycle hooks
	/**
	 * @async
	 * @override
	 * @function
	 * @instance
	 * @memberof ConfigurationServiceLoader
	 * @name     load
	 *
	 * @param    {ConfigurationService} configSrvc - Instance of the {@link ConfigurationService} that supplies configuration.
	 *
	 * @returns  {Object} - The load status of the {ConfigurationService}'s sub-modules.
	 *
	 * @summary  Loads sub-modules.
	 */
	async load(configSrvc) {
		let loadStatus = null;

		try {
			loadStatus = await super.load(configSrvc);
		}
		catch(err) {
			throw new TwyrSrvcError(`${this.$twyrModule.name}::load error`, err);
		}

		try {
			this.initStatus = await this.$twyrModule.initialize();
		}
		catch(err) {
			this.initError = new TwyrSrvcError(`${this.$twyrModule.name}::initialize error`, err);
		}

		try {
			this.startStatus = await this.$twyrModule.start();
		}
		catch(err) {
			this.startError = new TwyrSrvcError(`${this.$twyrModule.name}::start error`, err);
		}

		return loadStatus;
	}

	/**
	 * @async
	 * @override
	 * @function
	 * @instance
	 * @memberof ConfigurationServiceLoader
	 * @name     initialize
	 *
	 * @returns  {Object} - The initialization status of the {ConfigurationService}'s sub-modules.
	 *
	 * @summary  Initializes sub-modules.
	 */
	async initialize() {
		if(this.initError) throw this.initError;
		if(this.initStatus) return this.initStatus;

		try {
			const initStatus = await super.initialize();
			return initStatus;
		}
		catch(err) {
			throw new TwyrSrvcError(`${this.$twyrModule.name}::initialize error`, err);
		}
	}

	/**
	 * @async
	 * @override
	 * @function
	 * @instance
	 * @memberof ConfigurationServiceLoader
	 * @name     start
	 *
	 * @returns  {Object} - The start status of the {ConfigurationService}'s sub-modules.
	 *
	 * @summary  Starts sub-modules.
	 */
	async start() {
		if(this.startError) throw this.startError;
		if(this.startStatus) return this.startStatus;

		try {
			const startStatus = await super.start();
			return startStatus;
		}
		catch(err) {
			throw new TwyrSrvcError(`${this.$twyrModule.name}::start error`, err);
		}
	}
	// #endregion
}

exports.loader = ConfigurationServiceLoader;
