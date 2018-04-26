'use strict';

/**
 * Module dependencies, required for ALL Twyr' modules
 * @ignore
 */

/**
 * Module dependencies, required for this module
 * @ignore
 */
const TwyrBaseModule = require('./twyr-base-module').TwyrBaseModule;

/**
 * @class   TwyrApplication
 * @extends {TwyrBaseModule}
 *
 * @param   {TwyrBaseModule} [parent] - The parent module, if any. In this case, it's always null
 * @param   {TwyrModuleLoader} [loader] - The loader to be used for managing modules' lifecycle, if any.
 *
 * @classdesc The Twyr Server Application Class.
 *
 * @description
 * The Application Class for this server.
 *
 * This class has two major functionalities:
 * 1. Provide an environment for the rest of the server modules to reside in
 * +  Load / Unload the server modules and control the Startup / Shutdown sequences
 */
class TwyrApplication extends TwyrBaseModule {
	// #region Constructor
	constructor(parent, loader) {
		super(parent, loader);
		this.$uuid = require('uuid/v4')();
	}
	// #endregion

	// #region Startup / Shutdown
	/**
	 * @function
	 * @instance
	 * @memberof TwyrApplication
	 * @name     bootupServer
	 *
	 * @returns  {Array} - The aggregated status returned by sub-modules (if any).
	 *
	 * @summary  Loads / Initializes / Starts-up sub-modules.
	 */
	async bootupServer() {
		if(twyrEnv === 'development') console.log(`${this.name}::bootupServer`);

		const allStatuses = [];
		let bootupError = null;

		try {
			const osLocale = require('os-locale');
			const serverLocale = await osLocale();

			Object.defineProperties(this, {
				'$locale': {
					'value': serverLocale
				}
			});

			let lifecycleStatuses = null;

			lifecycleStatuses = await this.load();
			allStatuses.push(`${process.title} load status: ${lifecycleStatuses ? JSON.stringify(lifecycleStatuses, null, 2) : true}\n`);

			lifecycleStatuses = await this.initialize();
			allStatuses.push(`${process.title} initialize status: ${lifecycleStatuses ? JSON.stringify(lifecycleStatuses, null, 2) : true}\n`);

			lifecycleStatuses = await this.start();
			allStatuses.push(`${process.title} start status: ${lifecycleStatuses ? JSON.stringify(lifecycleStatuses, null, 2) : true}\n`);
		}
		catch(err) {
			allStatuses.push(`Bootup error: ${err.toString()}`);
			bootupError = err;
		}
		finally {
			if(bootupError) {
				console.error(`\n\nBootup ${process.title} with error:\n${bootupError.toString()}\n\n`);
				throw bootupError;
			}

			console.info(`\n\n${allStatuses.join('\n')}\n\n`);
			return null;
		}
	}

	/**
	 * @function
	 * @instance
	 * @memberof TwyrApplication
	 * @name     shutdownServer
	 *
	 * @returns  {Array} - The aggregated status returned by sub-modules (if any).
	 *
	 * @summary  Shuts-down / Un-initializes / Un-loads sub-modules.
	 */
	async shutdownServer() {
		if(twyrEnv === 'development') console.log(`${this.name}::shutdownServer`);

		const allStatuses = [];
		let shutdownError = null;

		try {
			let lifecycleStatuses = null;

			lifecycleStatuses = await this.stop();
			allStatuses.push(`${process.title} stop status: ${lifecycleStatuses ? JSON.stringify(lifecycleStatuses, null, 2) : true}\n`);

			lifecycleStatuses = await this.uninitialize();
			allStatuses.push(`${process.title} uninitialize status: ${lifecycleStatuses ? JSON.stringify(lifecycleStatuses, null, 2) : true}\n`);

			lifecycleStatuses = await this.unload();
			allStatuses.push(`${process.title} unload status: ${lifecycleStatuses ? JSON.stringify(lifecycleStatuses, null, 2) : true}\n`);
		}
		catch(err) {
			allStatuses.push(`Shutdown error: ${err.toString()}`);
			shutdownError = err;
		}
		finally {
			if(shutdownError) {
				console.error(`\n\nShutdown ${process.title} with error:\n${shutdownError.toString()}\n\n`);
				throw shutdownError;
			}

			console.info(`\n\n${allStatuses.join('\n')}\n\n`);
			return null;
		}
	}
	// #endregion

	// #region Properties
	/**
	 * @override
	 */
	get basePath() {
		return __dirname;
	}
	// #endregion
}

exports.TwyrApplication = TwyrApplication;
