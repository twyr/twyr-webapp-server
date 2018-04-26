'use strict';

/**
 * Module dependencies, required for ALL Twyr' modules
 * @ignore
 */

/**
 * Module dependencies, required for this module
 * @ignore
 */
const TwyrBaseService = require('./../../twyr-base-service').TwyrBaseService;
const TwyrSrvcError = require('./../../twyr-service-error').TwyrServiceError;

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
	 * @override
	 * @function
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
			this.$config = {
				'state': true,
				'configuration': {
					'priorities': {
						'FileConfigurationService': 10,
						'DatabaseConfigurationService': 20,
						'DotEnvConfigurationService': 30
					},
					'subservices': {
						'DatabaseConfigurationService': {
							'client': process.env.services_DatabaseService_client || 'pg',
							'debug': process.env.services_DatabaseService_debug === 'true',
							'connection': {
								'host': process.env.services_DatabaseService_connection_host || '127.0.0.1',
								'port': process.env.services_DatabaseService_connection_port || '5432',
								'user': process.env.services_DatabaseService_connection_user || 'twyr',
								'password': process.env.services_DatabaseService_connection_password || 'twyr',
								'database': process.env.services_DatabaseService_connection_database || 'twyr'
							},
							'pool': {
								'min': Number(process.env.services_DatabaseService_pool_min) || 2,
								'max': Number(process.env.services_DatabaseService_pool_max) || 4
							},
							'migrations': {
								'directory': process.env.services_ConfigurationService_subservices_DatabaseConfigurationService_migrations_directory || 'knex_migrations/migrations',
								'tableName': process.env.services_ConfigurationService_subservices_DatabaseConfigurationService_migrations_tableName || 'knex_migrations'
							},
							'seeds': {
								'directory': process.env.services_ConfigurationService_subservices_DatabaseConfigurationService_seeds_directory || 'knex_migrations/seeds',
								'tableName': process.env.services_ConfigurationService_subservices_DatabaseConfigurationService_seeds_tableName || 'knex_seeds'
							}
						},

						'DotEnvConfigurationService': {
							'persistExample': true
						},

						'RedisConfigurationService': {
							'port': Number(process.env.services_CacheService_port) || 6379,
							'host': process.env.services_CacheService_host || '127.0.0.1',
							'options': {
								'detect_buffers': process.env.services_CacheService_options_detect_buffers === 'true'
							}
						}
					}
				}
			};

			this.on('new-config', this._processConfigChange.bind(this));
			this.on('update-config', this._processConfigChange.bind(this));
			this.on('delete-config', this._processConfigChange.bind(this));

			this.on('update-state', this._processStateChange.bind(this));

			const status = await super.load(configSrvc);

			if(!this.$prioritizedSubServices) {
				this.$prioritizedSubServices = [].concat(Object.keys(this.$services));

				this.$prioritizedSubServices.forEach((prioritizedService) => {
					this.$config.priorities[prioritizedService] = Number(process.env[`services_ConfigurationService_priorities_${prioritizedService}`]) || this.$config.priorities[prioritizedService] || 0;
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

		try {
			const loadedConfigs = [];
			for(const subService of this.$prioritizedSubServices) {
				const twyrModuleConfig = await this.$services[subService].loadConfiguration(twyrModule);
				loadedConfigs.push(twyrModuleConfig);
			}

			let mergedConfig = {};
			loadedConfigs.forEach((loadedConfig) => {
				if(!loadedConfig) return;
				mergedConfig = deepmerge(mergedConfig, loadedConfig);
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
				moduleState = moduleState && state;
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
				moduleState = moduleState && state;
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
				moduleIds.push(twyrModuleId);
			}

			let moduleId = null;
			moduleIds.forEach((twyrModuleId) => {
				if(!twyrModuleId) return;
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
			if(twyrEnv === 'development') console.error(`${this.name}::_getModuleFromPath error: ${err.message}\n${err.stack}`);
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
			if(twyrEnv === 'development') console.error(`${this.name}::_getModuleFromPath error: ${err.message}\n${err.stack}`);
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

			let currentModule = this.$parent,
				pathSegments = null;

			while(currentModule.$parent) currentModule = currentModule.$parent;

			pathSegments = pathFromRoot.split('/');
			pathSegments.forEach((pathSegment) => {
				if(!currentModule) return;
				currentModule = currentModule[`${inflection.camelize(pathSegment)}`] || currentModule[`${pathSegment}`] || currentModule[`$${pathSegment}`];
			});

			return currentModule;
		}
		catch(err) {
			if(twyrEnv === 'development') console.error(`${this.name}::_getModuleFromPath error: ${err.message}\n${err.stack}`);
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
