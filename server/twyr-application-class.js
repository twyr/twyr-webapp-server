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
const TwyrBaseError = require('./twyr-base-error').TwyrBaseError;

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
	constructor(application, parent, loader) {
		super(parent, loader);

		this.$application = application;
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

			this.emit('server-loading');
			lifecycleStatuses = await this.load();
			allStatuses.push(`${process.title} load status: ${lifecycleStatuses ? JSON.stringify(lifecycleStatuses, null, 2) : true}\n`);
			this.emit('server-loaded');

			this.emit('server-initializing');
			lifecycleStatuses = await this.initialize();
			allStatuses.push(`${process.title} initialize status: ${lifecycleStatuses ? JSON.stringify(lifecycleStatuses, null, 2) : true}\n`);
			this.emit('server-initialized');

			this.emit('server-starting');
			lifecycleStatuses = await this.start();
			allStatuses.push(`${process.title} start status: ${lifecycleStatuses ? JSON.stringify(lifecycleStatuses, null, 2) : true}\n`);
			this.emit('server-started');

			this.emit('server-online');
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
			this.emit('server-offline');
			let lifecycleStatuses = null;

			this.emit('server-stopping');
			lifecycleStatuses = await this.stop();
			allStatuses.push(`${process.title} stop status: ${lifecycleStatuses ? JSON.stringify(lifecycleStatuses, null, 2) : true}\n`);
			this.emit('server-stopped');

			this.emit('server-uninitializing');
			lifecycleStatuses = await this.uninitialize();
			allStatuses.push(`${process.title} uninitialize status: ${lifecycleStatuses ? JSON.stringify(lifecycleStatuses, null, 2) : true}\n`);
			this.emit('server-uninitialized');

			this.emit('server-unloading');
			lifecycleStatuses = await this.unload();
			allStatuses.push(`${process.title} unload status: ${lifecycleStatuses ? JSON.stringify(lifecycleStatuses, null, 2) : true}\n`);
			this.emit('server-unloaded');
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

	// #region Lifecycle hooks
	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof TwyrApplication
	 * @name     start
	 *
	 * @param    {Object} dependencies - Interfaces to {@link TwyrBaseService} instances that this module depends on.
	 *
	 * @returns  {Object} - The aggregated status returned by sub-modules (if any) once they complete their startup sequences.
	 *
	 * @summary  Starts sub-modules, if any.
	 *
	 * @description
	 * Call the loader (typically, {@link TwyrModuleLoader#start}) to start sub-modules, if any.
	 */
	async start(dependencies) {
		if(twyrEnv === 'development') console.log(`${this.name}::start`);

		try {
			const subModuleStatus = await super.start(dependencies);
			const expressRouter = this.$services.ExpressService.Interface.Router;

			expressRouter.use(async (request, response) => {
				const respString = `${this.name}::${request.originalUrl}`;
				console.log(`Sending response: ${respString}`);
				response.status(200).send(respString);
			});

			expressRouter.use(async (error, request, response, next) => {
				if(!(error instanceof TwyrBaseError)) {
					error = new TwyrBaseError(`${this.name}::express::error`, error);
				}

				if(response.finished)
					return;

				if(request.xhr) {
					response.status(403).send(error.toString());
					return;
				}

				next(error);
				return;
			});

			return subModuleStatus;
		}
		catch(err) {
			throw new TwyrBaseError(`${this.name}::start error`, err);
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
