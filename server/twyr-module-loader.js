'use strict';

/**
 * Module dependencies, required for ALL Twyr' modules
 * @ignore
 */

/**
 * Module dependencies, required for this module
 * @ignore
 */
const TwyrBaseClass = require('./twyr-base-class').TwyrBaseClass,
	TwyrBaseError = require('./twyr-base-error').TwyrBaseError;

/**
 * @class   TwyrModuleLoader
 * @extends {TwyrBaseClass}
 * @classdesc The Twyr Server Base Class for all Module Loaders.
 *
 * @param   {TwyrBaseModule} [twyrModule] - The parent module, if any.
 *
 * @description
 * Serves as the "base class" for all other loaders in the Twyr Web Application Server, including {@link TwyrComponentLoader},
 * {@link TwyrMiddlewareLoader}, {@link TwyrServiceLoader}, and {@link TwyrTemplateLoader}.
 *
 * Responsible for invoking the standard "lifecycle" hooks on sub-modules of this module, if any - see {@link TwyrBaseModule#load},
 * {@link TwyrBaseModule#initialize}, {@link TwyrBaseModule#start}, {@link TwyrBaseModule#stop}, {@link TwyrBaseModule#uninitialize},
 * and {@link TwyrBaseModule#unload}.
 *
 */
class TwyrModuleLoader extends TwyrBaseClass {
	// #region Constructor
	constructor(twyrModule) {
		super();

		Object.defineProperties(this, {
			'$twyrModule': {
				'get': () => { return twyrModule; }
			}
		});
	}
	// #endregion

	// #region Lifecycle hooks
	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof TwyrModuleLoader
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

			lifecycleStatuses = await this._loadServices(configSrvc);
			if(lifecycleStatuses && lifecycleStatuses.status && (lifecycleStatuses.status instanceof Error))
				throw lifecycleStatuses.status;

			allStatuses.push(lifecycleStatuses);

			lifecycleStatuses = await this._loadMiddlewares(configSrvc);
			if(lifecycleStatuses && lifecycleStatuses.status && (lifecycleStatuses.status instanceof Error))
				throw lifecycleStatuses.status;

			allStatuses.push(lifecycleStatuses);

			lifecycleStatuses = await this._loadComponents(configSrvc);
			if(lifecycleStatuses && lifecycleStatuses.status && (lifecycleStatuses.status instanceof Error))
				throw lifecycleStatuses.status;

			allStatuses.push(lifecycleStatuses);

			lifecycleStatuses = await this._loadTemplates(configSrvc);
			if(lifecycleStatuses && lifecycleStatuses.status && (lifecycleStatuses.status instanceof Error))
				throw lifecycleStatuses.status;

			allStatuses.push(lifecycleStatuses);
			return this._filterStatus(allStatuses);
		}
		catch(err) {
			throw new TwyrBaseError(`${this.$twyrModule.name}::loader::load error`, err);
		}
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof TwyrModuleLoader
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

			lifecycleStatuses = await this._initializeServices();
			if(lifecycleStatuses && lifecycleStatuses.status && (lifecycleStatuses.status instanceof Error))
				throw lifecycleStatuses.status;

			allStatuses.push(lifecycleStatuses);

			lifecycleStatuses = await this._initializeMiddlewares();
			if(lifecycleStatuses && lifecycleStatuses.status && (lifecycleStatuses.status instanceof Error))
				throw lifecycleStatuses.status;

			allStatuses.push(lifecycleStatuses);

			lifecycleStatuses = await this._initializeComponents();
			if(lifecycleStatuses && lifecycleStatuses.status && (lifecycleStatuses.status instanceof Error))
				throw lifecycleStatuses.status;

			allStatuses.push(lifecycleStatuses);

			lifecycleStatuses = await this._initializeTemplates();
			if(lifecycleStatuses && lifecycleStatuses.status && (lifecycleStatuses.status instanceof Error))
				throw lifecycleStatuses.status;

			allStatuses.push(lifecycleStatuses);
			return this._filterStatus(allStatuses);
		}
		catch(err) {
			throw new TwyrBaseError(`${this.$twyrModule.name}::loader::initialize error`, err);
		}
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof TwyrModuleLoader
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

			lifecycleStatuses = await this._startServices();
			if(lifecycleStatuses && lifecycleStatuses.status && (lifecycleStatuses.status instanceof Error))
				throw lifecycleStatuses.status;

			allStatuses.push(lifecycleStatuses);

			lifecycleStatuses = await this._startMiddlewares();
			if(lifecycleStatuses && lifecycleStatuses.status && (lifecycleStatuses.status instanceof Error))
				throw lifecycleStatuses.status;

			allStatuses.push(lifecycleStatuses);

			lifecycleStatuses = await this._startComponents();
			if(lifecycleStatuses && lifecycleStatuses.status && (lifecycleStatuses.status instanceof Error))
				throw lifecycleStatuses.status;

			allStatuses.push(lifecycleStatuses);

			lifecycleStatuses = await this._startTemplates();
			if(lifecycleStatuses && lifecycleStatuses.status && (lifecycleStatuses.status instanceof Error))
				throw lifecycleStatuses.status;

			allStatuses.push(lifecycleStatuses);
			return this._filterStatus(allStatuses);
		}
		catch(err) {
			throw new TwyrBaseError(`${this.$twyrModule.name}::loader::start error`, err);
		}
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof TwyrModuleLoader
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

			lifecycleStatuses = await this._stopTemplates();
			if(lifecycleStatuses && lifecycleStatuses.status && (lifecycleStatuses.status instanceof Error))
				throw lifecycleStatuses.status;

			allStatuses.push(lifecycleStatuses);

			lifecycleStatuses = await this._stopComponents();
			if(lifecycleStatuses && lifecycleStatuses.status && (lifecycleStatuses.status instanceof Error))
				throw lifecycleStatuses.status;

			allStatuses.push(lifecycleStatuses);

			lifecycleStatuses = await this._stopMiddlewares();
			if(lifecycleStatuses && lifecycleStatuses.status && (lifecycleStatuses.status instanceof Error))
				throw lifecycleStatuses.status;

			allStatuses.push(lifecycleStatuses);

			lifecycleStatuses = await this._stopServices();
			if(lifecycleStatuses && lifecycleStatuses.status && (lifecycleStatuses.status instanceof Error))
				throw lifecycleStatuses.status;

			allStatuses.push(lifecycleStatuses);
			return this._filterStatus(allStatuses);
		}
		catch(err) {
			throw new TwyrBaseError(`${this.$twyrModule.name}::loader::stop error`, err);
		}
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof TwyrModuleLoader
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

			lifecycleStatuses = await this._uninitializeTemplates();
			if(lifecycleStatuses && lifecycleStatuses.status && (lifecycleStatuses.status instanceof Error))
				throw lifecycleStatuses.status;

			allStatuses.push(lifecycleStatuses);

			lifecycleStatuses = await this._uninitializeComponents();
			if(lifecycleStatuses && lifecycleStatuses.status && (lifecycleStatuses.status instanceof Error))
				throw lifecycleStatuses.status;

			allStatuses.push(lifecycleStatuses);

			lifecycleStatuses = await this._uninitializeMiddlewares();
			if(lifecycleStatuses && lifecycleStatuses.status && (lifecycleStatuses.status instanceof Error))
				throw lifecycleStatuses.status;

			allStatuses.push(lifecycleStatuses);

			lifecycleStatuses = await this._uninitializeServices();
			if(lifecycleStatuses && lifecycleStatuses.status && (lifecycleStatuses.status instanceof Error))
				throw lifecycleStatuses.status;

			allStatuses.push(lifecycleStatuses);
			return this._filterStatus(allStatuses);
		}
		catch(err) {
			throw new TwyrBaseError(`${this.$twyrModule.name}::loader::uninitialize error`, err);
		}
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof TwyrModuleLoader
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

			lifecycleStatuses = await this._unloadTemplates();
			if(lifecycleStatuses && lifecycleStatuses.status && (lifecycleStatuses.status instanceof Error))
				throw lifecycleStatuses.status;

			allStatuses.push(lifecycleStatuses);

			lifecycleStatuses = await this._unloadComponents();
			if(lifecycleStatuses && lifecycleStatuses.status && (lifecycleStatuses.status instanceof Error))
				throw lifecycleStatuses.status;

			allStatuses.push(lifecycleStatuses);

			lifecycleStatuses = await this._unloadMiddlewares();
			if(lifecycleStatuses && lifecycleStatuses.status && (lifecycleStatuses.status instanceof Error))
				throw lifecycleStatuses.status;

			allStatuses.push(lifecycleStatuses);

			lifecycleStatuses = await this._unloadServices();
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
			throw new TwyrBaseError(`${this.$twyrModule.name}::loader::unload error`, err);
		}
	}
	// #endregion

	// #region Utilities Lifecycle hooks
	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof TwyrModuleLoader
	 * @name     _loadUtilities
	 *
	 * @param    {ConfigurationService} configSrvc - Instance of the {@link ConfigurationService} that supplies configuration.
	 *
	 * @returns  {Object} Object containing the load status of each of the $twyrModule utilities.
	 *
	 * @summary  Load utilities defined as part of this {@link TwyrBaseModule}.
	 */
	async _loadUtilities(configSrvc) { // eslint-disable-line no-unused-vars
		const path = require('path');

		try {
			if(!this.$twyrModule.$utilities) this.$twyrModule.$utilities = {};

			const definedUtilities = await this._findFiles(path.join(this.$twyrModule.basePath, 'utilities'), 'utility.js');
			for(const definedUtility of definedUtilities) {
				const utility = require(definedUtility).utility;
				if(!utility) continue;

				if(!utility.name || !utility.method)
					continue;

				this.$twyrModule.$utilities[utility.name] = utility.method.bind(this.$twyrModule);
			}

			return {
				'type': 'utilities',
				'status': Object.keys(this.$twyrModule.$utilities).length ? Object.keys(this.$twyrModule.$utilities) : null
			};
		}
		catch(err) {
			return {
				'type': 'utilities',
				'status': new TwyrBaseError(`${this.$twyrModule.name}::loader::_loadUtilities error`, err)
			};
		}
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof TwyrModuleLoader
	 * @name     _unloadUtilities
	 *
	 * @returns  {Object} Object containing the unload status of each of the $twyrModule utilities.
	 *
	 * @summary  Unload utilities defined as part of this {@link TwyrBaseModule}.
	 */
	async _unloadUtilities() {
		try {
			const utilityNames = Object.keys(this.$twyrModule.$utilities || {});
			utilityNames.forEach((utilityName) => {
				delete this.$twyrModule.$utilities[utilityName];
			});

			delete this.$twyrModule.$utilities;
			return {
				'type': 'utilities',
				'status': utilityNames.length ? utilityNames : null
			};
		}
		catch(err) {
			return {
				'type': 'utilities',
				'status': new TwyrBaseError(`${this.$twyrModule.name}::loader::_unloadServices error`, err)
			};
		}
	}
	// #endregion

	// #region Services Lifecycle hooks
	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof TwyrModuleLoader
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
		const path = require('path');

		try {
			if(!this.$twyrModule.$services) this.$twyrModule.$services = {};

			const definedServices = await this._findFiles(path.join(this.$twyrModule.basePath, 'services'), 'service.js');

			let configSrvcLoadStatus = null,
				instConfigSrvc = null;

			if(!configSrvc) { // eslint-disable-line curly
				for(const definedService of definedServices) {
					const Service = require(definedService).service;
					if(!Service) continue;

					// Construct the Service...
					instConfigSrvc = new Service(this.$twyrModule);
					instConfigSrvc.$dependants = [];

					if(instConfigSrvc.name !== 'ConfigurationService') {
						instConfigSrvc = undefined;
						continue;
					}

					// Check to see valid typeof
					// if(!(instConfigSrvc instanceof TwyrBaseService))
					// 	throw new TwyrBaseError(`${definedService} does not contain a valid TwyrBaseService definition`);

					configSrvcLoadStatus = await instConfigSrvc.load(null);
					break;
				}
			}

			for(const definedService of definedServices) {
				// Check validity of the definition...
				const Service = require(definedService).service;
				if(!Service) continue;

				// Construct the service
				const serviceInstance = new Service(this.$twyrModule);
				serviceInstance.$dependants = [];

				if(serviceInstance.name === 'ConfigurationService')
					continue;

				// Check to see valid typeof
				// if(!(serviceInstance instanceof TwyrBaseService))
				// 	throw new TwyrBaseError(`${definedService} does not contain a valid TwyrBaseService definition`);

				this.$twyrModule.$services[serviceInstance.name] = serviceInstance;
			}

			const nameStatusPairs = await this._doLifecycleAction('services', 'load', [configSrvc || instConfigSrvc]);

			if(instConfigSrvc) {
				this.$twyrModule.$services['ConfigurationService'] = instConfigSrvc;
				nameStatusPairs['ConfigurationService'] = configSrvcLoadStatus;
			}

			return {
				'type': 'services',
				'status': nameStatusPairs
			};
		}
		catch(err) {
			return {
				'type': 'services',
				'status': new TwyrBaseError(`${this.$twyrModule.name}::loader::_loadServices error`, err)

			};
		}
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof TwyrModuleLoader
	 * @name     _initializeServices
	 *
	 * @returns  {Object} Object containing the initialization status of each of the $twyrModule services.
	 *
	 * @summary  Initialize Services defined as part of this {@link TwyrBaseModule}.
	 */
	async _initializeServices() {
		try {
			const nameStatusPairs = await this._doLifecycleAction('services', 'initialize');
			return { 'type': 'services', 'status': nameStatusPairs };
		}
		catch(err) {
			return {
				'type': 'services',
				'status': new TwyrBaseError(`${this.$twyrModule.name}::loader::_initializeServices error`, err)
			};
		}
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof TwyrModuleLoader
	 * @name     _startServices
	 *
	 * @returns  {Object} Object containing the start status of each of the $twyrModule services.
	 *
	 * @summary  Start Services defined as part of this {@link TwyrBaseModule}.
	 */
	async _startServices() {
		try {
			const DepGraph = require('dependency-graph').DepGraph;
			const initOrder = new DepGraph();

			const serviceNames = Object.keys(this.$twyrModule.$services || {});
			serviceNames.forEach((serviceName) => {
				initOrder.addNode(serviceName);
			});

			serviceNames.forEach((serviceName) => {
				const thisService = this.$twyrModule.$services[serviceName];
				if(!thisService.dependencies.length) return;

				thisService.dependencies.forEach((thisServiceDependency) => {
					if(serviceNames.indexOf(thisServiceDependency) < 0) return;
					initOrder.addDependency(thisService.name, thisServiceDependency);
				});
			});

			const initOrderList = initOrder.overallOrder();

			const nameStatusPairs = {};
			for(const serviceName of initOrderList) {
				let lifecycleStatus = null;
				try {
					const moduleInstance = this.$twyrModule.$services[serviceName];
					const dependencies = this._getDependencies(moduleInstance);

					lifecycleStatus = await moduleInstance.start(dependencies);
				}
				catch(err) {
					lifecycleStatus = new TwyrBaseError(`${this.$twyrModule.name}::loader::_startServices::${serviceName} error`, err);
				}
				finally {
					nameStatusPairs[serviceName] = lifecycleStatus;
				}
			}

			return { 'type': 'services', 'status': nameStatusPairs };
		}
		catch(err) {
			return {
				'type': 'services',
				'status': new TwyrBaseError(`${this.$twyrModule.name}::loader::_startServices error`, err)
			};
		}
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof TwyrModuleLoader
	 * @name     _stopServices
	 *
	 * @returns  {Object} Object containing the stop status of each of the $twyrModule services.
	 *
	 * @summary  Stop Services defined as part of this {@link TwyrBaseModule}.
	 */
	async _stopServices() {
		try {
			const DepGraph = require('dependency-graph').DepGraph;
			const uninitOrder = new DepGraph();

			const serviceNames = Object.keys(this.$twyrModule.$services || {});
			serviceNames.forEach((serviceName) => {
				uninitOrder.addNode(serviceName);
			});

			serviceNames.forEach((serviceName) => {
				const thisService = this.$twyrModule.$services[serviceName];
				if(!thisService.dependencies.length) return;

				thisService.dependencies.forEach((thisServiceDependency) => {
					if(serviceNames.indexOf(thisServiceDependency) < 0) return;
					uninitOrder.addDependency(thisService.name, thisServiceDependency);
				});
			});

			const uninitOrderList = uninitOrder.overallOrder().reverse();

			const nameStatusPairs = {};
			for(const serviceName of uninitOrderList) {
				let lifecycleStatus = null;
				try {
					lifecycleStatus = await this.$twyrModule.$services[serviceName].stop();
				}
				catch(err) {
					lifecycleStatus = new TwyrBaseError(`${this.$twyrModule.name}::loader::_stopServices error`, err);
				}
				finally {
					nameStatusPairs[serviceName] = lifecycleStatus;
				}
			}

			return {
				'type': 'services',
				'status': nameStatusPairs
			};
		}
		catch(err) {
			return {
				'type': 'services',
				'status': new TwyrBaseError(`${this.$twyrModule.name}::loader::_stopServices error`, err)
			};
		}
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof TwyrModuleLoader
	 * @name     _uninitializeServices
	 *
	 * @returns  {Object} Object containing the uninit status of each of the $twyrModule services.
	 *
	 * @summary  Uninitialize Services defined as part of this {@link TwyrBaseModule}.
	 */
	async _uninitializeServices() {
		try {
			const nameStatusPairs = await this._doLifecycleAction('services', 'uninitialize');
			return { 'type': 'services', 'status': nameStatusPairs };
		}
		catch(err) {
			return {
				'type': 'services',
				'status': new TwyrBaseError(`${this.$twyrModule.name}::loader::_uninitializeServices error`, err)
			};
		}
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof TwyrModuleLoader
	 * @name     _unloadServices
	 *
	 * @returns  {Object} Object containing the unload status of each of the $twyrModule services.
	 *
	 * @summary  Unload Services defined as part of this {@link TwyrBaseModule}.
	 */
	async _unloadServices() {
		try {
			const nameStatusPairs = await this._doLifecycleAction('services', 'unload');
			return { 'type': 'services', 'status': nameStatusPairs };
		}
		catch(err) {
			return {
				'type': 'services',
				'status': new TwyrBaseError(`${this.$twyrModule.name}::loader::_uninitializeServices error`, err)
			};
		}
	}
	// #endregion

	// #region Middlewares Lifecycle hooks
	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof TwyrModuleLoader
	 * @name     _loadMiddlewares
	 *
	 * @param    {ConfigurationService} configSrvc - Instance of the {@link ConfigurationService} that supplies configuration.
	 *
	 * @returns  {Object} Object containing the load status of each of the $twyrModule middlewares.
	 *
	 * @summary  Load middlewares defined as part of this {@link TwyrBaseModule}.
	 */
	async _loadMiddlewares(configSrvc) {
		const path = require('path');

		try {
			if(!this.$twyrModule.$middlewares) this.$twyrModule.$middlewares = {};

			const definedMiddlewares = await this._findFiles(path.join(this.$twyrModule.basePath, 'middlewares'), 'middleware.js');
			for(const definedMiddleware of definedMiddlewares) {
				// Check validity of the definition...
				const Middleware = require(definedMiddleware).middleware;
				if(!Middleware) continue;

				// Construct the service
				const middlewareInstance = new Middleware(this.$twyrModule);

				// Check to see valid typeof
				// if(!(serviceInstance instanceof TwyrBaseService))
				// 	throw new TwyrBaseError(`${definedService} does not contain a valid TwyrBaseService definition`);

				this.$twyrModule.$middlewares[middlewareInstance.name] = middlewareInstance;
			}

			const nameStatusPairs = await this._doLifecycleAction('middlewares', 'load', [configSrvc]);
			return { 'type': 'middlewares', 'status': nameStatusPairs };
		}
		catch(err) {
			return {
				'type': 'middlewares',
				'status': new TwyrBaseError(`${this.$twyrModule.name}::loader::_loadMiddlewares error`, err)
			};
		}
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof TwyrModuleLoader
	 * @name     _initializeMiddlewares
	 *
	 * @returns  {Object} Object containing the initialization status of each of the $twyrModule middlewares.
	 *
	 * @summary  Initialize Middlewares defined as part of this {@link TwyrBaseModule}.
	 */
	async _initializeMiddlewares() {
		try {
			const nameStatusPairs = await this._doLifecycleAction('middlewares', 'initialize');
			return { 'type': 'middlewares', 'status': nameStatusPairs };
		}
		catch(err) {
			return {
				'type': 'middlwares',
				'status': new TwyrBaseError(`${this.$twyrModule.name}::loader::_initializeMiddlewares error`, err)
			};
		}
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof TwyrModuleLoader
	 * @name     _startMiddlewares
	 *
	 * @returns  {Object} Object containing the start status of each of the $twyrModule middlewares.
	 *
	 * @summary  Start Middlewares defined as part of this {@link TwyrBaseModule}.
	 */
	async _startMiddlewares() {
		try {
			const middlewareNames = Object.keys(this.$twyrModule.$middlewares || {}),
				nameStatusPairs = {};

			for(const middlewareName of middlewareNames) {
				let lifecycleStatus = null;
				try {
					const moduleInstance = this.$twyrModule.$middlewares[middlewareName];
					const dependencies = this._getDependencies(moduleInstance);

					lifecycleStatus = await moduleInstance.start(dependencies);
				}
				catch(err) {
					lifecycleStatus = new TwyrBaseError(`${this.$twyrModule.name}::loader::_doLifecycleAction (${middlewareName} / start) error`, err);
				}
				finally {
					nameStatusPairs[middlewareName] = lifecycleStatus;
				}
			}

			return {
				'type': 'middlewares',
				'status': nameStatusPairs
			};
		}
		catch(err) {
			return {
				'type': 'middlwares',
				'status': new TwyrBaseError(`${this.$twyrModule.name}::loader::_startMiddlewares error`, err)
			};
		}
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof TwyrModuleLoader
	 * @name     _stopMiddlewares
	 *
	 * @returns  {Object} Object containing the stop status of each of the $twyrModule middlewares.
	 *
	 * @summary  Stop Middlewares defined as part of this {@link TwyrBaseModule}.
	 */
	async _stopMiddlewares() {
		try {
			const nameStatusPairs = await this._doLifecycleAction('middlewares', 'stop');
			return { 'type': 'middlewares', 'status': nameStatusPairs };
		}
		catch(err) {
			return {
				'type': 'middlewares',
				'status': new TwyrBaseError(`${this.$twyrModule.name}::loader::_stopMiddlewares error`, err)
			};
		}
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof TwyrModuleLoader
	 * @name     _uninitializeMiddlewares
	 *
	 * @returns  {Object} Object containing the uninit status of each of the $twyrModule middlewares.
	 *
	 * @summary  Uninitialize Middlewares defined as part of this {@link TwyrBaseModule}.
	 */
	async _uninitializeMiddlewares() {
		try {
			const nameStatusPairs = await this._doLifecycleAction('middlewares', 'uninitialize');
			return { 'type': 'middlewares', 'status': nameStatusPairs };
		}
		catch(err) {
			return {
				'type': 'middlewares',
				'status': new TwyrBaseError(`${this.$twyrModule.name}::loader::_uninitializeMiddlewares error`, err)
			};
		}
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof TwyrModuleLoader
	 * @name     _unloadMiddlewares
	 *
	 * @returns  {Object} Object containing the unload status of each of the $twyrModule middlewares.
	 *
	 * @summary  Unload Middlewares defined as part of this {@link TwyrBaseModule}.
	 */
	async _unloadMiddlewares() {
		try {
			const nameStatusPairs = await this._doLifecycleAction('middlewares', 'unload');
			return { 'type': 'middlewares', 'status': nameStatusPairs };
		}
		catch(err) {
			return {
				'type': 'middlewares',
				'status': new TwyrBaseError(`${this.$twyrModule.name}::loader::_unloadMiddlewares error`, err)
			};
		}
	}
	// #endregion

	// #region Components Lifecycle hooks
	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof TwyrModuleLoader
	 * @name     _loadComponents
	 *
	 * @param    {ConfigurationService} configSrvc - Instance of the {@link ConfigurationService} that supplies configuration.
	 *
	 * @returns  {Object} Object containing the load status of each of the $twyrModule components.
	 *
	 * @summary  Load components defined as part of this {@link TwyrBaseModule}.
	 */
	async _loadComponents(configSrvc) {
		const path = require('path');

		try {
			if(!this.$twyrModule.$components) this.$twyrModule.$components = {};

			const definedComponents = await this._findFiles(path.join(this.$twyrModule.basePath, 'components'), 'component.js');
			for(const definedComponent of definedComponents) {
				// Check validity of the definition...
				const Component = require(definedComponent).component;
				if(!Component) continue;

				// Construct the service
				const componentInstance = new Component(this.$twyrModule);

				// Check to see valid typeof
				// if(!(serviceInstance instanceof TwyrBaseService))
				// 	throw new TwyrBaseError(`${definedService} does not contain a valid TwyrBaseService definition`);

				this.$twyrModule.$components[componentInstance.name] = componentInstance;
			}

			const nameStatusPairs = await this._doLifecycleAction('components', 'load', [configSrvc]);
			return { 'type': 'components', 'status': nameStatusPairs };
		}
		catch(err) {
			return {
				'type': 'components',
				'status': new TwyrBaseError(`${this.$twyrModule.name}::loader::_loadComponents error`, err)
			};
		}
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof TwyrModuleLoader
	 * @name     _initializeComponents
	 *
	 * @returns  {Object} Object containing the initialization status of each of the $twyrModule components.
	 *
	 * @summary  Initialize Components defined as part of this {@link TwyrBaseModule}.
	 */
	async _initializeComponents() {
		try {
			const nameStatusPairs = await this._doLifecycleAction('components', 'initialize');
			return { 'type': 'components', 'status': nameStatusPairs };
		}
		catch(err) {
			return {
				'type': 'components',
				'status': new TwyrBaseError(`${this.$twyrModule.name}::loader::_initializeComponents error`, err)
			};
		}
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof TwyrModuleLoader
	 * @name     _startComponents
	 *
	 * @returns  {Object} Object containing the start status of each of the $twyrModule components.
	 *
	 * @summary  Start Components defined as part of this {@link TwyrBaseModule}.
	 */
	async _startComponents() {
		try {
			const componentNames = Object.keys(this.$twyrModule.$components || {}),
				nameStatusPairs = {};

			for(const componentName of componentNames) {
				let lifecycleStatus = null;
				try {
					const moduleInstance = this.$twyrModule.$components[componentName];
					const dependencies = this._getDependencies(moduleInstance);

					lifecycleStatus = await moduleInstance.start(dependencies);
				}
				catch(err) {
					lifecycleStatus = new TwyrBaseError(`${this.$twyrModule.name}::loader::_doLifecycleAction (${componentName} / start) error`, err);
				}
				finally {
					nameStatusPairs[componentName] = lifecycleStatus;
				}
			}

			return {
				'type': 'components',
				'status': nameStatusPairs
			};
		}
		catch(err) {
			return {
				'type': 'components',
				'status': new TwyrBaseError(`${this.$twyrModule.name}::loader::_startComponents error`, err)
			};
		}
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof TwyrModuleLoader
	 * @name     _stopComponents
	 *
	 * @returns  {Object} Object containing the stop status of each of the $twyrModule components.
	 *
	 * @summary  Stop Components defined as part of this {@link TwyrBaseModule}.
	 */
	async _stopComponents() {
		try {
			const nameStatusPairs = await this._doLifecycleAction('components', 'stop');
			return { 'type': 'components', 'status': nameStatusPairs };
		}
		catch(err) {
			return {
				'type': 'components',
				'status': new TwyrBaseError(`${this.$twyrModule.name}::loader::_stopComponents error`, err)
			};
		}
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof TwyrModuleLoader
	 * @name     _uninitializeComponents
	 *
	 * @returns  {Object} Object containing the uninit status of each of the $twyrModule components.
	 *
	 * @summary  Uninitialize Components defined as part of this {@link TwyrBaseModule}.
	 */
	async _uninitializeComponents() {
		try {
			const nameStatusPairs = await this._doLifecycleAction('components', 'uninitialize');
			return { 'type': 'components', 'status': nameStatusPairs };
		}
		catch(err) {
			return {
				'type': 'components',
				'status': new TwyrBaseError(`${this.$twyrModule.name}::loader::_uninitializeComponents error`, err)
			};
		}
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof TwyrModuleLoader
	 * @name     _unloadComponents
	 *
	 * @returns  {Object} Object containing the unload status of each of the $twyrModule components.
	 *
	 * @summary  Unload Components defined as part of this {@link TwyrBaseModule}.
	 */
	async _unloadComponents() {
		try {
			const nameStatusPairs = await this._doLifecycleAction('components', 'unload');
			return { 'type': 'components', 'status': nameStatusPairs };
		}
		catch(err) {
			return {
				'type': 'components',
				'status': new TwyrBaseError(`${this.$twyrModule.name}::loader::_unloadComponents error`, err)
			};
		}
	}
	// #endregion

	// #region Templates Lifecycle hooks
	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof TwyrModuleLoader
	 * @name     _loadTemplates
	 *
	 * @param    {ConfigurationService} configSrvc - Instance of the {@link ConfigurationService} that supplies configuration.
	 *
	 * @returns  {Object} Object containing the load status of each of the $twyrModule templates.
	 *
	 * @summary  Load templates defined as part of this {@link TwyrBaseModule}.
	 */
	async _loadTemplates(configSrvc) {
		const path = require('path');

		try {
			if(!this.$twyrModule.$templates) this.$twyrModule.$templates = {};

			const definedTemplates = await this._findFiles(path.join(this.$twyrModule.basePath, 'templates'), 'template.js');

			for(const definedTemplate of definedTemplates) {
				// Check validity of the definition...
				const Template = require(definedTemplate).template;
				if(!Template) continue;

				// Construct the template
				const templateInstance = new Template(this.$twyrModule);

				// Check to see valid typeof
				// if(!(serviceInstance instanceof TwyrBaseService))
				// 	throw new TwyrBaseError(`${definedService} does not contain a valid TwyrBaseService definition`);

				this.$twyrModule.$templates[templateInstance.name] = templateInstance;
			}

			const nameStatusPairs = await this._doLifecycleAction('templates', 'load', [configSrvc]);
			return { 'type': 'templates', 'status': nameStatusPairs };
		}
		catch(err) {
			return {
				'type': 'templates',
				'status': new TwyrBaseError(`${this.$twyrModule.name}::loader::_loadTemplates error`, err)
			};
		}
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof TwyrModuleLoader
	 * @name     _initializeTemplates
	 *
	 * @returns  {Object} Object containing the initialization status of each of the $twyrModule templates.
	 *
	 * @summary  Initialize Templates defined as part of this {@link TwyrBaseModule}.
	 */
	async _initializeTemplates() {
		try {
			const nameStatusPairs = await this._doLifecycleAction('templates', 'initialize');
			return { 'type': 'templates', 'status': nameStatusPairs };
		}
		catch(err) {
			return {
				'type': 'templates',
				'status': new TwyrBaseError(`${this.$twyrModule.name}::loader::_initializeTemplates error`, err)
			};
		}
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof TwyrModuleLoader
	 * @name     _startTemplates
	 *
	 * @returns  {Object} Object containing the start status of each of the $twyrModule templates.
	 *
	 * @summary  Start Templates defined as part of this {@link TwyrBaseModule}.
	 */
	async _startTemplates() {
		try {
			const nameStatusPairs = {},
				templateNames = Object.keys(this.$twyrModule.$templates || {});

			for(const templateName of templateNames) {
				let lifecycleStatus = null;
				try {
					const moduleInstance = this.$twyrModule.$templates[templateName];
					const dependencies = this._getDependencies(moduleInstance);

					lifecycleStatus = await moduleInstance.start(dependencies);
				}
				catch(err) {
					lifecycleStatus = new TwyrBaseError(`${this.$twyrModule.name}::loader::_doLifecycleAction (${templateName} / start) error`, err);
				}
				finally {
					nameStatusPairs[templateName] = lifecycleStatus;
				}
			}

			return {
				'type': 'templates',
				'status': nameStatusPairs
			};
		}
		catch(err) {
			return {
				'type': 'templates',
				'status': new TwyrBaseError(`${this.$twyrModule.name}::loader::_startTemplates error`, err)
			};
		}
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof TwyrModuleLoader
	 * @name     _stopTemplates
	 *
	 * @returns  {Object} Object containing the stop status of each of the $twyrModule templates.
	 *
	 * @summary  Stop Templates defined as part of this {@link TwyrBaseModule}.
	 */
	async _stopTemplates() {
		try {
			const nameStatusPairs = await this._doLifecycleAction('templates', 'stop');
			return { 'type': 'templates', 'status': nameStatusPairs };
		}
		catch(err) {
			return {
				'type': 'templates',
				'status': new TwyrBaseError(`${this.$twyrModule.name}::loader::_stopTemplates error`, err)
			};
		}
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof TwyrModuleLoader
	 * @name     _uninitializeTemplates
	 *
	 * @returns  {Object} Object containing the uninit status of each of the $twyrModule templates.
	 *
	 * @summary  Uninitialize Templates defined as part of this {@link TwyrBaseModule}.
	 */
	async _uninitializeTemplates() {
		try {
			const nameStatusPairs = await this._doLifecycleAction('templates', 'uninitialize');
			return { 'type': 'templates', 'status': nameStatusPairs };
		}
		catch(err) {
			return {
				'type': 'templates',
				'status': new TwyrBaseError(`${this.$twyrModule.name}::loader::_uninitializeTemplates error`, err)
			};
		}
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof TwyrModuleLoader
	 * @name     _unloadTemplates
	 *
	 * @returns  {Object} Object containing the unload status of each of the $twyrModule templates.
	 *
	 * @summary  Unload Templates defined as part of this {@link TwyrBaseModule}.
	 */
	async _unloadTemplates() {
		try {
			const nameStatusPairs = await this._doLifecycleAction('templates', 'unload');
			return { 'type': 'templates', 'status': nameStatusPairs };
		}
		catch(err) {
			return {
				'type': 'templates',
				'status': new TwyrBaseError(`${this.$twyrModule.name}::loader::_unloadTemplates error`, err)
			};
		}
	}
	// #endregion

	// #region Utilities
	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof TwyrModuleLoader
	 * @name     _findFiles
	 *
	 * @param    {string} rootDir - Path of the folder to recursively search for.
	 * @param    {string} filename - Name of the file to search for.
	 *
	 * @returns  {Array} List of files in the folder matching the name passed in.
	 *
	 * @summary  Finds files in folders, and recursively, sub-folders, as well.
	 */
	async _findFiles(rootDir, filename) {
		try {
			const fs = require('fs'),
				path = require('path'),
				promises = require('bluebird');

			const filesystem = promises.promisifyAll(fs);
			let fileList = [];

			const exists = await this._exists(path.join(rootDir, filename));
			if(exists) {
				fileList.push(path.join(rootDir, filename));
				return fileList;
			}

			const rootDirObjects = await filesystem.readdirAsync(rootDir);
			if(!rootDirObjects) return null;

			const rootDirFolders = [];
			for(const rootDirObject of rootDirObjects) {
				const rootDirFolder = path.join(rootDir, rootDirObject);

				const stat = await filesystem.statAsync(rootDirFolder);
				if(!stat.isDirectory()) continue;

				rootDirFolders.push(rootDirFolder);
			}

			for(const rootDirFolder of rootDirFolders) {
				const subFolderFiles = await this._findFiles(rootDirFolder, filename);
				if(subFolderFiles) fileList = fileList.concat(subFolderFiles);
			}

			return fileList;
		}
		catch(err) {
			// console.error(new TwyrBaseError(`${this.$twyrModule.name}::loader::_findFiles error`, err).toString());
			return [];
		}
	}

	/**
	 * @function
	 * @instance
	 * @memberof TwyrModuleLoader
	 * @name     _getDependencies
	 *
	 * @param    {TwyrBaseModule} moduleInstance - The module to find dependencies for.
	 *
	 * @returns  {Object} The dependencies.
	 *
	 * @summary  Walks up the $twyrModule.$parent chain, and at each level searches for a $service.
	 */
	_getDependencies(moduleInstance) {
		try {
			const moduleDependencies = {};

			moduleInstance.dependencies.forEach((thisDependency) => {
				let currentDependency = null,
					currentModule = this.$twyrModule;

				while(!!currentModule && !currentDependency) {
					if(!currentModule.$services) {
						currentModule = currentModule.$parent;
						continue;
					}

					currentDependency = currentModule.$services[thisDependency];
					if(!currentDependency)
						currentModule = currentModule.$parent;
					else
						break;
				}

				if(!currentDependency) throw new Error(`${moduleInstance.name}::dependency::${thisDependency} not found!`);

				const interfaceMethod = function() {
					if(!this.$enabled) return null;
					return this.Interface ? this.Interface : this;
				}.bind(currentDependency);

				Object.defineProperty(moduleDependencies, thisDependency, {
					'__proto__': null,
					'configurable': true,
					'enumerable': true,
					'get': interfaceMethod
				});

				currentDependency.$dependants.push(moduleInstance);
			});

			return moduleDependencies;
		}
		catch(err) {
			throw new TwyrBaseError(`${this.$twyrModule.name}::loader::_getDependencies error`, err);
		}
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof TwyrModuleLoader
	 * @name     _doLifecycleAction
	 *
	 * @param    {string} moduleType - The type of the module to iterate over (services, components, etc.).
	 * @param    {string} action - The lifecycle action to execute (initialize, start, etc.).
	 * @param    {Array} args - The arguments to pass to the lifecycle method.
	 *
	 * @returns  {Object} Hash map of the lifecycle status for each of the modules found.
	 *
	 * @summary  Executes a lifecycle action on the given hashmap.
	 */
	async _doLifecycleAction(moduleType, action, args) {
		try {
			args = args || [];

			const modules = this.$twyrModule['$' + moduleType]; // eslint-disable-line prefer-template
			const moduleNames = Object.keys(modules || {});

			const nameStatusPairs = {};
			for(const moduleName of moduleNames) {
				let lifecycleStatus = null;
				try {
					const moduleInstance = modules[moduleName];
					lifecycleStatus = await moduleInstance[action](...args);
				}
				catch(err) {
					lifecycleStatus = new TwyrBaseError(`${this.$twyrModule.name}::loader::_doLifecycleAction (${moduleName} / ${action}) error`, err);
				}
				finally {
					nameStatusPairs[moduleName] = lifecycleStatus;
				}
			}

			return nameStatusPairs;
		}
		catch(err) {
			throw new TwyrBaseError(`${this.$twyrModule.name}::loader::_doLifecycleAction (${moduleType} / ${action}) error`, err);
		}
	}

	 /**
	 * @async
	 * @function
	 * @instance
	 * @memberof TwyrModuleLoader
	 * @name     _exists
	 *
	 * @param    {string} filepath - Path of the filesystem entity.
	 * @param    {number} mode - Permission to be checked for.
	 *
	 * @returns  {boolean} True / False.
	 *
	 * @summary  Checks to see if the path can be accessed by this process using the mode specified.
	 */
	async _exists(filepath, mode) {
		const Promise = require('bluebird'),
			filesystem = require('fs');

		return new Promise((resolve, reject) => {
			try {
				filesystem.access(filepath, (mode || filesystem.constants.F_OK), (exists) => {
					resolve(!exists);
				});
			}
			catch(err) {
				const error = new TwyrBaseError(`${this.$twyrModule.name}::loader::_findFiles error`, err);
				reject(error);
			}
		});
	}

	/**
	 * @function
	 * @instance
	 * @memberof TwyrModuleLoader
	 * @name     _filterStatus
	 *
	 * @param    {Array} status - The statuses to process and filter.
	 *
	 * @returns  {Array} The stringified statuses.
	 *
	 * @summary  Converts statuses to strings, depending on their type.
	 */
	_filterStatus(status) {
		try {
			const filteredStatus = status.map((thisStatus) => {
				if(thisStatus.status === null)
					return true;

				if(thisStatus.status instanceof Error)
					return thisStatus;

				// eslint-disable-next-line curly
				if(typeof thisStatus.status === 'object') {
					Object.keys(thisStatus.status).forEach((key) => {
						if(thisStatus.status[key] instanceof Error) {
							thisStatus.status[key] = (thisStatus.status[key] instanceof TwyrBaseError) ? thisStatus.status[key].toString() : thisStatus.status[key]['stack'];
							return;
						}

						if(Array.isArray(thisStatus.status[key])) {
							thisStatus.status[key] = this._filterStatus(thisStatus.status[key]);
							if(!thisStatus.status[key].length) thisStatus.status[key] = true;
						}
					});
				}

				return thisStatus;
			})
			.filter((thisStatus) => {
				if(!thisStatus) return false;
				if(!thisStatus.status) return false;

				if(!Object.keys(thisStatus.status).length)
					return false;

				return true;
			});

			return filteredStatus.length ? filteredStatus : true;
		}
		catch(err) {
			return [];
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

exports.TwyrModuleLoader = TwyrModuleLoader;
