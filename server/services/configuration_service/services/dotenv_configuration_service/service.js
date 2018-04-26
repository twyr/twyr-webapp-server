'use strict';

/**
 * Module dependencies, required for ALL Twyr modules
 * @ignore
 */

/**
 * Module dependencies, required for this module
 * @ignore
 */
const TwyrBaseService = require('./../../../../twyr-base-service').TwyrBaseService;
const TwyrSrvcError = require('./../../../../twyr-service-error').TwyrServiceError;

/**
 * @class   DotEnvConfigurationService
 * @extends {TwyrBaseService}
 * @classdesc The Twyr Web Application Server .env file-based configuration sub-service.
 *
 * @description
 * Allows the rest of the codebase to CRUD their configurations from the .env file.
 *
 */
class DotEnvConfigurationService extends TwyrBaseService {
	// #region Constructor
	constructor(parent) {
		super(parent);
		this.$cacheMap = null;
	}
	// #endregion

	// #region setup/teardown code
	/**
	 * @async
	 * @override
	 * @function
	 * @instance
	 * @memberof DotEnvConfigurationService
	 * @name     _setup
	 *
	 * @returns  {boolean} Boolean true/false.
	 *
	 * @summary  Sets up the file watcher to watch for changes on the fly.
	 */
	async _setup() {
		try {
			const chokidar = require('chokidar'),
				path = require('path'),
				promises = require('bluebird');

			const filesystem = promises.promisifyAll(require('fs'));

			const rootPath = path.dirname(require.main.filename);
			const envFilePath = path.join(rootPath, '.env');

			const doesExist = await this._exists(envFilePath, filesystem.R_OK);
			if(!doesExist) return null;

			const envFile = promises.promisifyAll(require('envfile'));
			this.$cacheMap = await envFile.parseFileAsync(envFilePath);

			if(!this.$cacheMap) {
				await filesystem.writeFileAsync(envFilePath, '');
				this.$cacheMap = {};
			}

			this.$watcher = chokidar.watch(envFilePath, {
				'ignoreInitial': true
			});

			this.$watcher.on('change', this._onUpdateConfiguration.bind(this));
			return true;
		}
		catch(err) {
			throw new TwyrSrvcError(`${this.name}::_setup error`, err);
		}
	}

	/**
	 * @async
	 * @override
	 * @function
	 * @instance
	 * @memberof DotEnvConfigurationService
	 * @name     _teardown
	 *
	 * @returns  {boolean} Boolean true/false.
	 *
	 * @summary  Shutdown the file watcher that watches for changes on the fly.
	 */
	async _teardown() {
		try {
			this.$watcher.close();

			if(!this.$parent.$config.subservices.DotEnvConfigurationService.persistExample)
				return true;

			const promises = require('bluebird');
			const envFile = promises.promisifyAll(require('envfile'));

			const stringifiedConfig = await envFile.stringifyAsync(this.$cacheMap);
			if(!stringifiedConfig) return true;

			const filesystem = promises.promisifyAll(require('fs'));
			const path = require('path');

			const rootPath = path.dirname(require.main.filename);
			await filesystem.writeFileAsync(path.join(rootPath, 'example.env'), stringifiedConfig);

			return true;
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
	 * @memberof DotEnvConfigurationService
	 * @name     loadConfiguration
	 *
	 * @param    {TwyrBaseModule} twyrModule - Instance of the {@link TwyrBaseModule} that requires configuration.
	 *
	 * @returns  {Object} - The twyrModule's file-based configuration.
	 *
	 * @summary  Retrieves the configuration of the twyrModule requesting for it.
	 */
	async loadConfiguration(twyrModule) {
		try {
			const path = require('path');

			const rootPath = path.dirname(require.main.filename);
			const configPath = path.relative(rootPath, twyrModule.basePath).replace('server', '').replace(new RegExp(path.sep, 'g'), '_').replace('_', '');

			const moduleConfig = this._deserializeConfig(configPath, true);
			return moduleConfig ? moduleConfig.config : null;
		}
		catch(err) {
			throw new TwyrSrvcError(`${this.name}::loadConfiguration error`, err);
		}
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof DotEnvConfigurationService
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
			const path = require('path'),
				promises = require('bluebird');

			const rootPath = path.dirname(require.main.filename);
			const configPath = path.relative(rootPath, twyrModule.basePath).replace('server', '').replace(new RegExp(path.sep, 'g'), '_').replace('_', '');

			const moduleConfigKeys = Object.keys(this.$cacheMap).filter((key) => {
				return key.indexOf(configPath) === 0;
			})
			.filter((key) => {
				return !(
					key.replace(configPath, '').indexOf('services') >= 0 ||
					key.replace(configPath, '').indexOf('middlewares') >= 0 ||
					key.replace(configPath, '').indexOf('components') >= 0 ||
					key.replace(configPath, '').indexOf('templates') >= 0
				);
			});

			moduleConfigKeys.forEach((moduleConfigKey) => {
				delete this.$cacheMap[moduleConfigKey];
			});

			const configString = this._serializeConfig(configPath, config);
			if(!configString) return null;

			const envFile = promises.promisifyAll(require('envfile'));
			const parsedConfigString = await envFile.parseAsync(configString);

			if(parsedConfigString) { // eslint-disable-line curly
				Object.keys(parsedConfigString).forEach((parsedConfigStringKey) => {
					this.$cacheMap[parsedConfigStringKey] = parsedConfigString[parsedConfigStringKey];
				});
			}

			const filesystem = promises.promisifyAll(require('fs'));
			const stringifiedConfig = await envFile.stringifyAsync(this.$cacheMap);

			await filesystem.writeFileAsync(path.join(rootPath, '.env'), stringifiedConfig);
			return config;
		}
		catch(err) {
			throw new TwyrSrvcError(`${this.name}::saveConfiguration error`, err);
		}
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof DotEnvConfigurationService
	 * @name     getModuleState
	 *
	 * @param    {TwyrBaseModule} twyrModule - Instance of the {@link TwyrBaseModule} that requires its state.
	 *
	 * @returns  {boolean} - Boolean true always, pretty much.
	 *
	 * @summary  Empty method, since the dotenv-based configuration module doesn't manage the state.
	 */
	async getModuleState(twyrModule) {
		return !!twyrModule;
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof DotEnvConfigurationService
	 * @name     setModuleState
	 *
	 * @param    {TwyrBaseModule} twyrModule - Instance of the {@link TwyrBaseModule} that requires its state.
	 * @param    {boolean} enabled - State of the module.
	 *
	 * @returns  {Object} - The state of the twyrModule.
	 *
	 * @summary  Empty method, since the dotenv-based configuration module doesn't manage the state.
	 */
	async setModuleState(twyrModule, enabled) {
		return enabled;
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof DotEnvConfigurationService
	 * @name     getModuleId
	 *
	 * @returns  {null} - Nothing.
	 *
	 * @summary  Empty method, since the dotenv-based configuration module doesn't manage module ids.
	 */
	async getModuleId() {
		return null;
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @private
	 * @memberof DotEnvConfigurationService
	 * @name     _processConfigChange
	 *
	 * @param    {TwyrBaseModule} configUpdateModule - The twyrModule for which the configuration changed.
	 * @param    {Object} config - The updated configuration.
	 *
	 * @returns  {null} - Nothing.
	 *
	 * @summary  Persists the configuration to the .env file.
	 */
	async _processConfigChange(configUpdateModule, config) {
		try {
			const path = require('path'),
				promises = require('bluebird');

			const envFile = promises.promisifyAll(require('envfile'));
			const filesystem = promises.promisifyAll(require('fs'));

			const configPath = configUpdateModule.replace(new RegExp(path.sep, 'g'), '_');
			const rootPath = path.dirname(require.main.filename);

			const moduleConfigKeys = Object.keys(this.$cacheMap).filter((key) => {
				return key.indexOf(configPath) === 0;
			})
			.filter((key) => {
				return !(
					key.replace(configPath, '').indexOf('services') >= 0 ||
					key.replace(configPath, '').indexOf('middlewares') >= 0 ||
					key.replace(configPath, '').indexOf('components') >= 0 ||
					key.replace(configPath, '').indexOf('templates') >= 0
				);
			});

			moduleConfigKeys.forEach((moduleConfigKey) => {
				delete this.$cacheMap[moduleConfigKey];
			});

			const configString = this._serializeConfig(configPath, config);
			if(!configString) return;

			const parsedConfigString = await envFile.parseAsync(configString);
			if(parsedConfigString) { // eslint-disable-line curly
				Object.keys(parsedConfigString).forEach((parsedConfigStringKey) => {
					this.$cacheMap[parsedConfigStringKey] = parsedConfigString[parsedConfigStringKey];
				});
			}

			const stringifiedConfig = await envFile.stringifyAsync(this.$cacheMap);
			await filesystem.writeFileAsync(path.join(rootPath, '.env'), stringifiedConfig);
		}
		catch(err) {
			console.error(`Process changed configuration to .env error: ${err.message}\n${err.stack}`);
		}
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof DotEnvConfigurationService
	 * @name     _processStateChange
	 *
	 * @returns  {null} - Nothing.
	 *
	 * @summary  Empty method, since the dotenv-based configuration module doesn't manage module states.
	 */
	async _processStateChange() {
		return null;
	}
	// #endregion

	// #region Private Methods
	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof DotEnvConfigurationService
	 * @name     _onUpdateConfiguration
	 *
	 * @returns  {null} - Nothing.
	 *
	 * @summary  Reads the new configuration, maps it to a loaded twyrModule, and tells the rest of the configuration services to process it.
	 */
	async _onUpdateConfiguration() {
		try {
			const path = require('path'),
				promises = require('bluebird');

			const moduleTypes = ['services', 'middlewares', 'components', 'templates'];
			const rootPath = path.dirname(require.main.filename);
			const envFilePath = path.join(rootPath, '.env');

			const envFile = promises.promisifyAll(require('envfile'));
			const envFileContents = await envFile.parseFileAsync(envFilePath);

			const configChangedModules = [];
			Object.keys(envFileContents || {}).forEach((envFileKey) => {
				if(envFileContents[envFileKey] === this.$cacheMap[envFileKey])
					return;

				const splitEnvKey = envFileKey.split('_').map((key) => {
					if(moduleTypes.indexOf(key) >= 0)
						return `${key}${path.sep}`;

					return key;
				})
				.join('_')
				.replace(new RegExp(`${path.sep}_`, 'g'), path.sep);

				if(configChangedModules.indexOf(splitEnvKey) < 0)
					configChangedModules.push(splitEnvKey);
			});

			if(configChangedModules.length) {
				this.$cacheMap = envFileContents;

				const configs = [];
				configChangedModules.forEach((configChangedModule, idx) => {
					const changedConfig = this._deserializeConfig(configChangedModule.split(path.sep).join('_'), true);
					if(!changedConfig) return;
					if(!changedConfig.configPath) return;

					configChangedModules[idx] = changedConfig.configPath.split('_').map((segment) => {
						if(moduleTypes.indexOf(segment) >= 0)
							return `${segment}${path.sep}`;

						return segment;
					})
					.join('_')
					.replace(new RegExp(`${path.sep}_`, 'g'), path.sep);

					configs.push(changedConfig.config);
				});

				const uniqueConfigChangedModules = [];
				configChangedModules
				.filter((ccModule) => {
					const alreadyPresent = (uniqueConfigChangedModules.indexOf(ccModule) >= 0);
					if(!alreadyPresent) uniqueConfigChangedModules.push(ccModule);

					return !alreadyPresent;
				})
				.forEach((configChangedModule, idx) => {
					this.$parent.emit('update-config', this.name, configChangedModule, configs[idx]);
				});
			}
		}
		catch(err) {
			console.error(`Process changed configuration from .env error: ${err.message}\n${err.stack}`);
		}
	}

	/**
	 * @function
	 * @instance
	 * @memberof DotEnvConfigurationService
	 * @name     _serializeConfig
	 *
	 * @param    {string} prepender - The path of the twyrModule for which the configuration is passed in.
	 * @param    {Object} configObject - The configuration of the twyrModule.
	 *
	 * @returns  {string} - Stringified config for all modules in the codebase - to be persisted in the .env file.
	 *
	 * @summary  Reads the existing configuration, and return a stringified version of it.
	 */
	_serializeConfig(prepender, configObject) {
		try {
			if(configObject === null)
				return null;

			if(typeof configObject === 'function')
				return null;

			if(typeof configObject === 'undefined')
				return null;

			if(typeof configObject === 'string')
				return `${prepender}=${configObject}\n`;

			if(typeof configObject === 'number')
				return `${prepender}=${configObject}\n`;

			if(typeof configObject === 'boolean')
				return `${prepender}=${configObject}\n`;

			let configEnvString = '';
			if(Array.isArray(configObject)) {
				configEnvString += `${prepender}=TWYR_CONFIG_ARRAY\n`;
				configObject.forEach((configObjectElement, idx) => {
					const serializedconfigObjectElement = this._serializeConfig(`${prepender}#${idx}`, configObjectElement);
					if(!serializedconfigObjectElement) return;

					configEnvString += `${serializedconfigObjectElement}\n`;
				});

				return configEnvString;
			}

			configEnvString += `${prepender}=TWYR_CONFIG_OBJECT\n`;
			if(!Object.keys(configObject).length)
				return configEnvString;

			Object.keys(configObject).forEach((configObjectKey) => {
				const serializedconfigObjectElement = this._serializeConfig(`${prepender}_${configObjectKey}`, configObject[configObjectKey]);
				if(!serializedconfigObjectElement) return;

				configEnvString += serializedconfigObjectElement;
			});

			return configEnvString;
		}
		catch(err) {
			console.error(`Serialize configuration error: ${err.message}\n${err.stack}`);
			return '';
		}
	}

	/**
	 * @function
	 * @instance
	 * @memberof DotEnvConfigurationService
	 * @name     _deserializeConfig
	 *
	 * @param    {string} configPath - The path of the twyrModule.
	 * @param    {boolean} discover - Discover the module.
	 *
	 * @returns  {Object} - The object containing the twyrModule configuration.
	 *
	 * @summary  Reads the existing configuration, and return a object version of it.
	 */
	_deserializeConfig(configPath, discover) {
		try {
			if(discover) {
				const inflection = require('inflection');
				const path = require('path');
				const moduleTypes = ['services', 'middlewares', 'components', 'templates'];

				let rootModule = this.$parent;
				while(rootModule.$parent) rootModule = rootModule.$parent;

				configPath = configPath.split('_');
				while(configPath.length) {
					if((this.$cacheMap[configPath.join('_')] === 'TWYR_CONFIG_OBJECT') || (this.$cacheMap[configPath.join('_')] === 'TWYR_CONFIG_ARRAY')) {
						const modulePath = configPath.map((segment) => {
							if(moduleTypes.indexOf(segment) >= 0)
								return `${segment}${path.sep}`;

							return segment;
						})
						.join('_')
						.replace(new RegExp(`${path.sep}_`, 'g'), path.sep)
						.split(path.sep);

						let currModule = rootModule;
						while(modulePath.length) {
							currModule = currModule[`${inflection.camelize(modulePath[0])}`] || currModule[`${modulePath[0]}`] || currModule[`$${modulePath[0]}`];
							if(!currModule) break;

							modulePath.shift();
						}

						if(currModule)
							break;
					}

					configPath.pop();
				}

				if(!configPath.length)
					return null;

				configPath = configPath.join('_');
			}

			const moduleConfig = this.$cacheMap[configPath] === 'TWYR_CONFIG_OBJECT' ? {} : [];

			const _guessType = (value) => {
				if(value === 'true') return true;
				if(value === 'false') return false;

				if(!isNaN(Number(value)))
					return Number(value);

				return value;
			};

			const configKeys = Object.keys(this.$cacheMap).filter((cacheMapKey) => {
				if(cacheMapKey.indexOf(configPath) < 0)
					return false;

				if(cacheMapKey.replace(`${configPath}_`, '').split('_').length > 1)
					return false;

				return true;
			});

			configKeys.forEach((configKey) => {
				if(configKey.replace(configPath, '') === '')
					return;

				if(this.$cacheMap[configKey] === 'TWYR_CONFIG_OBJECT') {
					moduleConfig[configKey.replace(`${configPath}_`, '')] = this._deserializeConfig(`${configKey}`);
					if(!moduleConfig[configKey.replace(`${configPath}_`, '')])
						delete moduleConfig[configKey.replace(`${configPath}_`, '')];

					return;
				}

				if(this.$cacheMap[configKey] === 'TWYR_CONFIG_ARRAY') {
					moduleConfig[configKey.replace(`${configPath}_`, '')] = [];
					return;
				}

				if(configKey.indexOf('#') >= 0) {
					const parentArrayKey = configKey.substring(0, configKey.indexOf('#')).replace(`${configPath}_`, '');

					if(this.$cacheMap[configKey] === 'TWYR_CONFIG_OBJECT') {
						const deserializedArrayElementConfig = this._deserializeConfig(configKey);
						if(deserializedArrayElementConfig) moduleConfig[parentArrayKey].push(deserializedArrayElementConfig);

						return;
					}

					if(this.$cacheMap[configKey] === 'TWYR_CONFIG_ARRAY') {
						const deserializedArrayElementConfig = this._deserializeConfig(configKey);
						if(deserializedArrayElementConfig) moduleConfig[parentArrayKey].push(deserializedArrayElementConfig);
						return;
					}

					if(this.$cacheMap[configKey]) moduleConfig[parentArrayKey].push(_guessType(this.$cacheMap[configKey]));
					return;
				}

				if(this.$cacheMap[configKey]) moduleConfig[configKey.replace(`${configPath}_`, '')] = _guessType(this.$cacheMap[configKey]);
			});

			return discover ? { 'configPath': configPath, 'config': moduleConfig } : moduleConfig;
		}
		catch(err) {
			console.error(`Deserialize configuration error: ${err.message}\n${err.stack}`);
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

exports.service = DotEnvConfigurationService;
