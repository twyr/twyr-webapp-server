'use strict';

/* eslint-disable security/detect-object-injection */
/* eslint-disable security/detect-non-literal-require */

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

const ConfigurationServiceLoader = require('./loader').loader;

/**
 * @class   ConfigurationService
 * @extends {TwyrBaseService}
 * @classdesc The Twyr Web Application Server Configuration Service.
 *
 * @description
 * Serves as the "single source of truth" for configuration related operations across the rest of the codebase.
 *
 */
class ConfigurationService extends TwyrBaseService {
	// #region Constructor
	constructor(parent, loader) {
		super(parent, null);

		loader = new ConfigurationServiceLoader(this);
		this.$loader = loader;
	}
	// #endregion

	// #region Lifecycle hooks
	/**
	 * @async
	 * @function
	 * @override
	 * @instance
	 * @memberof ConfigurationService
	 * @name     load
	 *
	 * @param    {ConfigurationService} configSrvc - Instance of the {@link ConfigurationService} that supplies configuration.
	 *
	 * @returns  {Object} - The aggregated status returned by sub-modules (if any) once they complete their loading.
	 *
	 * @summary  Loads sub-modules, if any.
	 */
	async load(configSrvc) {
		try {
			const path = require('path');
			this.$config = require(path.join(path.dirname(path.dirname(require.main.filename)), `config/${twyrEnv}/server/services/configuration_service`)).config;

			this.on('new-config', this._processConfigChange.bind(this));
			this.on('update-config', this._processConfigChange.bind(this));
			this.on('delete-config', this._processConfigChange.bind(this));

			this.on('update-state', this._processStateChange.bind(this));

			const status = await super.load(configSrvc);

			if(!this.$prioritizedSubServices) {
				this.$prioritizedSubServices = [].concat(Object.keys(this.$services));

				this.$prioritizedSubServices.forEach((prioritizedService) => {
					this.$config.priorities[prioritizedService] = this.$config.priorities[prioritizedService] || 0;
				});

				this.$prioritizedSubServices.sort((left, right) => {
					return this.$config.priorities[left] - this.$config.priorities[right];
				});
			}

			return status;
		}
		catch(err) {
			throw new TwyrSrvcError(`${this.name}::load error`, err);
		}
	}
	// #endregion

	// #region API
	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof ConfigurationService
	 * @name     loadConfiguration
	 *
	 * @param    {TwyrBaseModule} twyrModule - Instance of the {@link TwyrBaseModule} that requires configuration.
	 *
	 * @returns  {Object} - The merged configurations returned by sub-modules.
	 *
	 * @summary  Retrieves the configuration of the twyrModule requesting for it.
	 */
	async loadConfiguration(twyrModule) {
		const deepmerge = require('deepmerge');
		const emptyTarget = value => Array.isArray(value) ? [] : {};
		const clone = (value, options) => deepmerge(emptyTarget(value), value, options);

		const oldArrayMerge = (target, source, options) => {
			const destination = target.slice();

			source.forEach(function(e, i) {
				if(typeof destination[i] === 'undefined') {
					const cloneRequested = options.clone !== false;
					const shouldClone = cloneRequested && options.isMergeableObject(e);

					destination[i] = shouldClone ? clone(e, options) : e;
				}
				else if(options.isMergeableObject(e)) {
					destination[i] = deepmerge(target[i], e, options);
				}
				else if(target.indexOf(e) === -1) {
					destination.push(e);
				}
			});

			return destination;
		};

		try {
			const loadedConfigs = [];
			for(const subService of this.$prioritizedSubServices) {
				const twyrModuleConfig = await this.$services[subService].loadConfiguration(twyrModule);
				loadedConfigs.push(twyrModuleConfig);
			}

			let mergedConfig = {};
			loadedConfigs.forEach((loadedConfig) => {
				if(!loadedConfig) return;
				mergedConfig = deepmerge(mergedConfig, loadedConfig, {
					'arrayMerge': oldArrayMerge
				});
			});

			await this.saveConfiguration(twyrModule, mergedConfig);
			const enabled = await this.getModuleState(twyrModule);

			return { 'configuration': mergedConfig, 'state': enabled };
		}
		catch(err) {
			throw new TwyrSrvcError(`${this.name}::loadConfiguration::${twyrModule.name} error`, err);
		}
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof ConfigurationService
	 * @name     saveConfiguration
	 *
	 * @param    {TwyrBaseModule} twyrModule - Instance of the {@link TwyrBaseModule} that requires configuration.
	 * @param    {Object} config - The {@link TwyrBaseModule}'s' configuration that should be persisted.
	 *
	 * @returns  {Object} - The twyrModule configuration.
	 *
	 * @summary  Saves the configuration of the twyrModule requesting for it.
	 */
	async saveConfiguration(twyrModule, config) {
		try {
			const subServiceNames = Object.keys(this.$services);

			// eslint-disable-next-line curly
			for(const subServiceName of subServiceNames) {
				await this.$services[subServiceName].saveConfiguration(twyrModule, config);
			}

			return config;
		}
		catch(err) {
			throw new TwyrSrvcError(`${this.name}::saveConfiguration::${twyrModule.name} error`, err);
		}
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof ConfigurationService
	 * @name     getModuleState
	 *
	 * @param    {TwyrBaseModule} twyrModule - Instance of the {@link TwyrBaseModule} that requires its state.
	 *
	 * @returns  {Object} - The merged states returned by sub-modules.
	 *
	 * @summary  Retrieves the state of the twyrModule requesting for it.
	 */
	async getModuleState(twyrModule) {
		try {
			const subServiceNames = Object.keys(this.$services);

			const moduleStates = [];
			for(const subServiceName of subServiceNames) {
				const twyrModuleState = await this.$services[subServiceName].getModuleState(twyrModule);
				moduleStates.push(twyrModuleState);
			}

			let moduleState = true;
			moduleStates.forEach((state) => {
				moduleState = moduleState && !!state;
			});

			return moduleState;
		}
		catch(err) {
			throw new TwyrSrvcError(`${this.name}::getModuleState::${twyrModule.name} error`, err);
		}
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof ConfigurationService
	 * @name     setModuleState
	 *
	 * @param    {TwyrBaseModule} twyrModule - Instance of the {@link TwyrBaseModule} that requires its state.
	 * @param    {boolean} enabled - State of the module.
	 *
	 * @returns  {Object} - The state of the twyrModule.
	 *
	 * @summary  Saves the state of the twyrModule requesting for it.
	 */
	async setModuleState(twyrModule, enabled) {
		try {
			const subServiceNames = Object.keys(this.$services);

			const moduleStates = [];
			for(const subServiceName of subServiceNames) {
				const twyrModuleState = await this.$services[subServiceName].setModuleState(twyrModule, enabled);
				moduleStates.push(twyrModuleState);
			}

			let moduleState = true;
			moduleStates.forEach((state) => {
				moduleState = moduleState && !!state;
			});

			return moduleState;
		}
		catch(err) {
			throw new TwyrSrvcError(`${this.name}::setModuleState::${twyrModule.name} error`, err);
		}
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof ConfigurationService
	 * @name     getModuleId
	 *
	 * @param    {TwyrBaseModule} twyrModule - Instance of the {@link TwyrBaseModule} that requires its id.
	 *
	 * @returns  {Object} - The id of the twyrModule.
	 *
	 * @summary  Retrieves the id of the twyrModule requesting for it.
	 */
	async getModuleId(twyrModule) {
		try {
			const subServiceNames = Object.keys(this.$services);

			const moduleIds = [];
			for(const subServiceName of subServiceNames) {
				const twyrModuleId = await this.$services[subServiceName].getModuleId(twyrModule);
				if(twyrModuleId) moduleIds.push(twyrModuleId);
			}

			let moduleId = null;
			moduleIds.forEach((twyrModuleId) => {
				moduleId = twyrModuleId;
			});

			return moduleId;
		}
		catch(err) {
			throw new TwyrSrvcError(`${this.name}::getModuleId::${twyrModule.name} error`, err);
		}
	}
	// #endregion

	// #region Private Methods
	/**
	 * @async
	 * @function
	 * @instance
	 * @private
	 * @memberof ConfigurationService
	 * @name     _processConfigChange
	 *
	 * @param    {TwyrBaseService} eventFirerModule - The sub-configuration service that detected the config change.
	 * @param    {TwyrBaseModule} configUpdateModule - The twyrModule for which the configuration changed.
	 * @param    {Object} config - The updated configuration.
	 *
	 * @returns  {null} - Nothing.
	 *
	 * @summary  Syncs the configuration across all the configuration sources, and then tells the twyrModule to reconfigure itself.
	 */
	_processConfigChange(eventFirerModule, configUpdateModule, config) {
		try {
			Object.keys(this.$services).forEach((subService) => {
				if(subService === eventFirerModule)
					return;

				this.$services[subService]._processConfigChange(configUpdateModule, config);
			});

			const currentModule = this._getModuleFromPath(configUpdateModule);
			if(currentModule) currentModule._reconfigure(config);
		}
		catch(err) {
			console.error(`${this.name}::_processConfigChange error: ${err.message}\n${err.stack}`);
		}
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @private
	 * @memberof ConfigurationService
	 * @name     _processStateChange
	 *
	 * @param    {TwyrBaseService} eventFirerModule - The sub-configuration service that detected the state change.
	 * @param    {TwyrBaseModule} stateUpdateModule - The twyrModule for which the state changed.
	 * @param    {boolean} state - The updated state of the twyrModule.
	 *
	 * @returns  {null} - Nothing.
	 *
	 * @summary  Syncs the state across all the configuration sources, and then tells the twyrModule to change its own state.
	 */
	_processStateChange(eventFirerModule, stateUpdateModule, state) {
		try {
			Object.keys(this.$services).forEach((subService) => {
				if(subService === eventFirerModule)
					return;

				this.$services[subService]._processStateChange(stateUpdateModule, state);
			});

			const currentModule = this._getModuleFromPath(stateUpdateModule);
			if(currentModule) currentModule._changeState(state);
		}
		catch(err) {
			console.error(`${this.name}::_processStateChange error: ${err.message}\n${err.stack}`);
		}
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @private
	 * @memberof ConfigurationService
	 * @name     _getModuleFromPath
	 *
	 * @param    {string} pathFromRoot - The loaded path (from the application class) of the module.
	 *
	 * @returns  {TwyrBaseModule} - The module at the given path.
	 *
	 * @summary  Given a path relative to the Application Class instance, retrieves the loaded twyrModule object.
	 */
	_getModuleFromPath(pathFromRoot) {
		try {
			const inflection = require('inflection');
			const path = require('path');

			let currentModule = this.$parent,
				pathSegments = null;

			while(currentModule.$parent) currentModule = currentModule.$parent;

			pathSegments = pathFromRoot.split(path.sep);
			while(pathSegments.length) {
				let pathSegment = pathSegments.shift();
				if((pathSegment === 'server') || !currentModule)
					continue;

				let nextModule = currentModule[`${inflection.camelize(pathSegment)}`] || currentModule[`$${pathSegment}`] || currentModule[`${pathSegment}`];
				if(nextModule) {
					currentModule = nextModule;
					continue;
				}

				while(pathSegments.length) {
					pathSegment = `${pathSegment}_${pathSegments.shift()}`;
					nextModule = currentModule[`${inflection.camelize(pathSegment)}`] || currentModule[`$${pathSegment}`] || currentModule[`${pathSegment}`];

					if(nextModule) {
						currentModule = nextModule;
						break;
					}
				}
			}

			return currentModule;
		}
		catch(err) {
			console.error(`${this.name}::_getModuleFromPath error: ${err.message}\n${err.stack}`);
			return null;
		}
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @private
	 * @memberof ConfigurationService
	 * @name     _getPathForModule
	 *
	 * @param    {TwyrBaseModule} twyrModule - The module for which to generate the path.
	 *
	 * @returns  {string} - The path of the module, relative to the Application Class.
	 *
	 * @summary  Given a loaded twyrModule object, return the path relative to the Application Class instance.
	 */
	_getPathForModule(twyrModule) {
		try {
			if(!twyrModule.$parent) return 'server';

			const inflection = require('inflection');
			const path = require('path');

			let currentModule = twyrModule;

			const pathSegments = [];
			pathSegments.push(inflection.underscore(currentModule.name));

			while(currentModule.$parent) {
				const modulePrototype = Object.getPrototypeOf(Object.getPrototypeOf(currentModule)).name;
				const parentModule = currentModule.$parent;

				const twyrModuleType = `${modulePrototype.replace('TwyrBase', '').toLowerCase()}s`;
				pathSegments.unshift(twyrModuleType);

				currentModule = parentModule;
				if(currentModule && currentModule.$parent) pathSegments.unshift(inflection.underscore(currentModule.name));
			}

			pathSegments.unshift('server');
			return pathSegments.join(path.sep);
		}
		catch(err) {
			console.error(`${this.name}::_getPathForModule error: ${err.message}\n${err.stack}`);
			return null;
		}
	}
	// #endregion

	// #region Properties
	/**
	 * @override
	 */
	get Interface() {
		return {
			'loadConfiguration': this.loadConfiguration.bind(this),
			'saveConfiguration': this.loadConfiguration.bind(this),
			'getModuleState': this.getModuleState.bind(this),
			'setModuleState': this.setModuleState.bind(this),
			'getModuleID': this.getModuleId.bind(this)
		};
	}

	/**
	 * @override
	 */
	get basePath() {
		return __dirname;
	}
	// #endregion
}

exports.service = ConfigurationService;
