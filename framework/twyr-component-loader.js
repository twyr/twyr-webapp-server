'use strict';

/**
 * Module dependencies, required for ALL Twyr modules
 * @ignore
 */

/**
 * Module dependencies, required for this module
 * @ignore
 */
const TwyrModuleLoader = require('./twyr-module-loader').TwyrModuleLoader;
const TwyrComponentError = require('./twyr-component-error').TwyrComponentError;

/**
 * @class   TwyrComponentLoader
 * @extends {TwyrModuleLoader}
 * @classdesc The Twyr Server Base Class for all Component Loaders.
 *
 * @param   {TwyrBaseModule} [twyrModule] - The parent module, if any.
 *
 * @description
 * Serves as the "base class" for all other component loaders in the Twyr Web Application Server.
 *
 * Responsible for invoking the standard "lifecycle" hooks on sub-modules of this module, if any - see {@link TwyrBaseModule#load},
 * {@link TwyrBaseModule#initialize}, {@link TwyrBaseModule#start}, {@link TwyrBaseModule#stop}, {@link TwyrBaseModule#uninitialize},
 * and {@link TwyrBaseModule#unload}.
 *
 */
class TwyrComponentLoader extends TwyrModuleLoader {
	// #region Constructor
	constructor(twyrModule) {
		super(twyrModule);
	}
	// #endregion

	// #region Lifecycle hooks
	/**
	 * @async
	 * @function
	 * @override
	 * @instance
	 * @memberof TwyrComponentLoader
	 * @name     load
	 *
	 * @param    {ConfigurationService} configSrvc - Instance of the {@link ConfigurationService} that supplies configuration.
	 *
	 * @returns  {Object} - The load status of $twyrModule's sub-modules.
	 *
	 * @summary  Loads sub-modules.
	 */
	async load(configSrvc) {
		try {
			const allStatuses = [];
			let lifecycleStatuses = null;

			lifecycleStatuses = await this._loadUtilities(configSrvc);
			if(lifecycleStatuses && lifecycleStatuses.status && (lifecycleStatuses.status instanceof Error))
				throw lifecycleStatuses.status;

			allStatuses.push(lifecycleStatuses);

			lifecycleStatuses = await this._loadComponents(configSrvc);
			if(lifecycleStatuses && lifecycleStatuses.status && (lifecycleStatuses.status instanceof Error))
				throw lifecycleStatuses.status;

			allStatuses.push(lifecycleStatuses);
			return this._filterStatus(allStatuses);
		}
		catch(err) {
			throw new TwyrComponentError(`${this.$twyrModule.name}::loader::load error`, err);
		}
	}

	/**
	 * @async
	 * @function
	 * @override
	 * @instance
	 * @memberof TwyrComponentLoader
	 * @name     initialize
	 *
	 * @returns  {Object} - The initialization status of $twyrModule's sub-modules.
	 *
	 * @summary  Initializes sub-modules.
	 */
	async initialize() {
		try {
			const allStatuses = [];
			let lifecycleStatuses = null;

			lifecycleStatuses = await this._initializeComponents();
			if(lifecycleStatuses && lifecycleStatuses.status && (lifecycleStatuses.status instanceof Error))
				throw lifecycleStatuses.status;

			allStatuses.push(lifecycleStatuses);
			return this._filterStatus(allStatuses);
		}
		catch(err) {
			throw new TwyrComponentError(`${this.$twyrModule.name}::loader::initialize error`, err);
		}
	}

	/**
	 * @async
	 * @function
	 * @override
	 * @instance
	 * @memberof TwyrComponentLoader
	 * @name     start
	 *
	 * @returns  {Object} - The start status of $twyrModule's sub-modules.
	 *
	 * @summary  Starts sub-modules.
	 */
	async start() {
		try {
			const allStatuses = [];
			let lifecycleStatuses = null;

			lifecycleStatuses = await this._startComponents();
			if(lifecycleStatuses && lifecycleStatuses.status && (lifecycleStatuses.status instanceof Error))
				throw lifecycleStatuses.status;

			allStatuses.push(lifecycleStatuses);
			return this._filterStatus(allStatuses);
		}
		catch(err) {
			throw new TwyrComponentError(`${this.$twyrModule.name}::loader::start error`, err);
		}
	}

	/**
	 * @async
	 * @function
	 * @override
	 * @instance
	 * @memberof TwyrComponentLoader
	 * @name     stop
	 *
	 * @returns  {Object} - The stop status of $twyrModule's sub-modules.
	 *
	 * @summary  Stops sub-modules.
	 */
	async stop() {
		try {
			const allStatuses = [];
			let lifecycleStatuses = null;

			lifecycleStatuses = await this._stopComponents();
			if(lifecycleStatuses && lifecycleStatuses.status && (lifecycleStatuses.status instanceof Error))
				throw lifecycleStatuses.status;

			allStatuses.push(lifecycleStatuses);
			return this._filterStatus(allStatuses);
		}
		catch(err) {
			throw new TwyrComponentError(`${this.$twyrModule.name}::loader::stop error`, err);
		}
	}

	/**
	 * @async
	 * @function
	 * @override
	 * @instance
	 * @memberof TwyrComponentLoader
	 * @name     uninitialize
	 *
	 * @returns  {Object} - The uninitialization status of $twyrModule's sub-modules.
	 *
	 * @summary  Un-initializes sub-modules.
	 */
	async uninitialize() {
		try {
			const allStatuses = [];
			let lifecycleStatuses = null;

			lifecycleStatuses = await this._uninitializeComponents();
			if(lifecycleStatuses && lifecycleStatuses.status && (lifecycleStatuses.status instanceof Error))
				throw lifecycleStatuses.status;

			allStatuses.push(lifecycleStatuses);
			return this._filterStatus(allStatuses);
		}
		catch(err) {
			throw new TwyrComponentError(`${this.$twyrModule.name}::loader::uninitialize error`, err);
		}
	}

	/**
	 * @async
	 * @function
	 * @override
	 * @instance
	 * @memberof TwyrComponentLoader
	 * @name     unload
	 *
	 * @returns  {Object} - The unloading status of $twyrModule's sub-modules.
	 *
	 * @summary  Unloads sub-modules.
	 */
	async unload() {
		try {
			const allStatuses = [];
			let lifecycleStatuses = null;

			lifecycleStatuses = await this._unloadComponents();
			if(lifecycleStatuses && lifecycleStatuses.status && (lifecycleStatuses.status instanceof Error))
				throw lifecycleStatuses.status;

			allStatuses.push(lifecycleStatuses);

			lifecycleStatuses = await this._unloadUtilities();
			if(lifecycleStatuses && lifecycleStatuses.status && (lifecycleStatuses.status instanceof Error))
				throw lifecycleStatuses.status;

			allStatuses.push(lifecycleStatuses);
			return this._filterStatus(allStatuses);
		}
		catch(err) {
			throw new TwyrComponentError(`${this.$twyrModule.name}::loader::unload error`, err);
		}
	}
	// #endregion
}

exports.TwyrComponentLoader = TwyrComponentLoader;
