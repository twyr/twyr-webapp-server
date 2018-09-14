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
const TwyrFeatureError = require('./twyr-feature-error').TwyrFeatureError;

const TwyrBaseService = require('./twyr-base-service').TwyrBaseService;

/**
 * @class   TwyrFeatureLoader
 * @extends {TwyrModuleLoader}
 * @classdesc The Twyr Server Base Class for all Feature Loaders.
 *
 * @param   {TwyrBaseModule} [twyrModule] - The parent module, if any.
 *
 * @description
 * Serves as the "base class" for all other feature loaders in the Twyr Web Application Server.
 *
 * Responsible for invoking the standard "lifecycle" hooks on sub-modules of this module, if any - see {@link TwyrBaseModule#load},
 * {@link TwyrBaseModule#initialize}, {@link TwyrBaseModule#start}, {@link TwyrBaseModule#stop}, {@link TwyrBaseModule#uninitialize},
 * and {@link TwyrBaseModule#unload}.
 *
 */
class TwyrFeatureLoader extends TwyrModuleLoader {
	// #region Constructor
	constructor(twyrModule) {
		super(twyrModule);
	}
	// #endregion

	// #region Service Lifecycle Hooks
	/**
	 * @async
	 * @function
	 * @override
	 * @instance
	 * @memberof TwyrFeatureLoader
	 * @name     _loadServices
	 *
	 * @param    {ConfigurationService} configSrvc - Instance of the {@link ConfigurationService} that supplies configuration.
	 *
	 * @returns  {Object} Object containing the load status of each of the $twyrModule services.
	 *
	 * @summary  Load services defined as part of this {@link TwyrBaseModule}.
	 *
	 * @description
	 * Special processing:
	 * If the configSrvc parameter is undefined, load the {@link ConfigurationService} first, if any found.
	 *
	 * Since the {@link ConfigurationServiceLoader} calls load / initialize / start in one shot, the other sub-modules get, basically,
	 * a fully functional configuration service by the time they load, allowing them to use their configurations from the get-go.
	 */
	async _loadServices(configSrvc) {
		if(!this.$twyrModule.$services) this.$twyrModule.$services = {};

		// Check validity of the definition...
		const Service = require('./twyr-feature-api-service').service;
		if(!Service) throw new TwyrFeatureError(`Cannot find TwyrFeatureApiService`);

		// Construct the service
		const serviceInstance = new Service(this.$twyrModule);
		serviceInstance.$dependants = [];

		// eslint-disable-next-line curly
		if(!(serviceInstance instanceof TwyrBaseService)) {
			throw new TwyrFeatureError(`TwyrFeatureApiService does not contain a valid TwyrBaseService definition`);
		}

		await serviceInstance.load(configSrvc);
		this.$twyrModule.$services['ApiService'] = serviceInstance;

		const loadStatus = await super._loadServices(configSrvc);
		return loadStatus;
	}
	// #endregion
}

exports.TwyrFeatureLoader = TwyrFeatureLoader;
