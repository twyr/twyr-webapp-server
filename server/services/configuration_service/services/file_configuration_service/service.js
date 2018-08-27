'use strict';

/* eslint-disable security/detect-object-injection */
/* eslint-disable security/detect-non-literal-require */
/* eslint-disable security/detect-non-literal-fs-filename */

/**
 * Module dependencies, required for ALL Twyr modules
 * @ignore
 */

/**
 * Module dependencies, required for this module
 * @ignore
 */
const TwyrBaseService = require('twyr-base-service').TwyrBaseService;
const TwyrSrvcError = require('twyr-service-error').TwyrServiceError;

/**
 * @class   FileConfigurationService
 * @extends {TwyrBaseService}
 * @classdesc The Twyr Web Application Server file-based configuration sub-service.
 *
 * @description
 * Allows the rest of the codebase to CRUD their configurations from the filesystem.
 *
 */
class FileConfigurationService extends TwyrBaseService {
	// #region Constructor
	constructor(parent) {
		super(parent);
		this.$cacheMap = {};
	}
	// #endregion

	// #region setup/teardown code
	/**
	 * @async
	 * @function
	 * @override
	 * @instance
	 * @memberof FileConfigurationService
	 * @name     _setup
	 *
	 * @returns  {boolean} Boolean true/false.
	 *
	 * @summary  Sets up the file watcher to watch for changes on the fly.
	 */
	async _setup() {
		try {
			await super._setup();

			const chokidar = require('chokidar'),
				path = require('path');

			const rootPath = path.dirname(path.dirname(require.main.filename));
			this.$watcher = chokidar.watch(path.join(rootPath, `config${path.sep}${twyrEnv}`), {
				'ignored': /[/\\]\./,
				'ignoreInitial': true
			});

			this.$watcher
				.on('add', this._onNewConfiguration.bind(this))
				.on('change', this._onUpdateConfiguration.bind(this))
				.on('unlink', this._onDeleteConfiguration.bind(this));

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
	 * @memberof FileConfigurationService
	 * @name     _teardown
	 *
	 * @returns  {boolean} Boolean true/false.
	 *
	 * @summary  Shutdown the file watcher that watches for changes on the fly.
	 */
	async _teardown() {
		try {
			this.$watcher.close();

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
	 * @memberof FileConfigurationService
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
			let config = null;

			const twyrModulePath = this.$parent._getPathForModule(twyrModule);
			if(this.$cacheMap[twyrModulePath]) return this.$cacheMap[twyrModulePath];

			const fs = require('fs-extra'),
				path = require('path'),
				promises = require('bluebird');

			const filesystem = promises.promisifyAll(fs);
			const rootPath = path.dirname(path.dirname(require.main.filename));
			const configPath = path.join(rootPath, `config${path.sep}${twyrEnv}`, `${twyrModulePath}.js`);

			await filesystem.ensureDirAsync(path.dirname(configPath));

			const doesExist = await this._exists(configPath, filesystem.R_OK);
			if(doesExist) config = require(configPath).config;

			this.$cacheMap[twyrModulePath] = config;
			return config;
		}
		catch(err) {
			throw new TwyrSrvcError(`${this.name}::loadConfig::${twyrModule.name} error`, err);
		}
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof FileConfigurationService
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
			const deepEqual = require('deep-equal'),
				fs = require('fs-extra'),
				path = require('path'),
				promises = require('bluebird');

			const twyrModulePath = this.$parent._getPathForModule(twyrModule);
			if(deepEqual(this.$cacheMap[twyrModulePath], config))
				return config;

			this.$cacheMap[twyrModulePath] = config;

			const rootPath = path.dirname(path.dirname(require.main.filename));
			const configPath = path.join(rootPath, `config${path.sep}${twyrEnv}`, `${twyrModulePath}.js`);

			const filesystem = promises.promisifyAll(fs);
			await filesystem.ensureDirAsync(path.dirname(configPath));

			const configString = `exports.config = ${JSON.stringify(config, undefined, '\t')};\n`;
			await filesystem.writeFileAsync(configPath, configString);

			return config;
		}
		catch(err) {
			throw new TwyrSrvcError(`${this.name}::saveConfig::${twyrModule.name} error`, err);
		}
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof FileConfigurationService
	 * @name     getModuleState
	 *
	 * @param    {TwyrBaseModule} twyrModule - Instance of the {@link TwyrBaseModule} that requires its state.
	 *
	 * @returns  {boolean} - Boolean true always, pretty much.
	 *
	 * @summary  Empty method, since the file-based configuration module doesn't manage the state.
	 */
	async getModuleState(twyrModule) {
		return !!twyrModule;
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof FileConfigurationService
	 * @name     setModuleState
	 *
	 * @param    {TwyrBaseModule} twyrModule - Instance of the {@link TwyrBaseModule} that requires its state.
	 * @param    {boolean} enabled - State of the module.
	 *
	 * @returns  {Object} - The state of the twyrModule.
	 *
	 * @summary  Empty method, since the file-based configuration module doesn't manage the state.
	 */
	async setModuleState(twyrModule, enabled) {
		return enabled;
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof FileConfigurationService
	 * @name     getModuleId
	 *
	 * @returns  {null} - Nothing.
	 *
	 * @summary  Empty method, since the file-based configuration module doesn't manage module ids.
	 */
	async getModuleId() {
		return null;
	}
	// #endregion

	// #region Private Methods
	/**
	 * @async
	 * @function
	 * @instance
	 * @private
	 * @memberof FileConfigurationService
	 * @name     _processConfigChange
	 *
	 * @param    {TwyrBaseModule} configUpdateModule - The twyrModule for which the configuration changed.
	 * @param    {Object} config - The updated configuration.
	 *
	 * @returns  {null} - Nothing.
	 *
	 * @summary  Persists the configuration to the filesystem.
	 */
	async _processConfigChange(configUpdateModule, config) {
		try {
			const deepEqual = require('deep-equal'),
				fs = require('fs-extra'),
				path = require('path'),
				promises = require('bluebird');

			if(deepEqual(this.$cacheMap[configUpdateModule], config))
				return;

			const rootPath = path.dirname(path.dirname(require.main.filename));
			const configPath = path.join(rootPath, `config${path.sep}${twyrEnv}`, configUpdateModule);

			this.$cacheMap[configUpdateModule] = config;

			const filesystem = promises.promisifyAll(fs);
			await filesystem.ensureDirAsync(path.dirname(configPath));

			const configString = `exports.config = ${JSON.stringify(config, undefined, '\t')};`;
			await filesystem.writeFileAsync(`${configPath}.js`, configString);
		}
		catch(err) {
			console.error(`Process changed configuration to file error: ${err.message}\n${err.stack}`);
		}
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @private
	 * @memberof FileConfigurationService
	 * @name     _processStateChange
	 *
	 * @returns  {null} - Nothing.
	 *
	 * @summary  Empty method, since the file-based configuration module doesn't manage module states.
	 */
	async _processStateChange() {
		return null;
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @private
	 * @memberof FileConfigurationService
	 * @name     _onNewConfiguration
	 *
	 * @param    {string} filePath - The absolute path of the new configuration file.
	 *
	 * @returns  {null} - Nothing.
	 *
	 * @summary  Reads the new configuration, maps it to a loaded twyrModule, and tells the rest of the configuration services to process it.
	 */
	async _onNewConfiguration(filePath) {
		try {
			const path = require('path');

			const rootPath = path.dirname(path.dirname(require.main.filename));
			const twyrModulePath = path.relative(rootPath, filePath).replace(`config${path.sep}${twyrEnv}${path.sep}`, '').replace('.js', '');

			this.$cacheMap[twyrModulePath] = require(filePath).config;
			this.$parent.emit('new-config', this.name, twyrModulePath, this.$cacheMap[twyrModulePath]);
		}
		catch(err) {
			console.error(`Process new configuration in ${filePath} error: ${err.message}\n${err.stack}`);
		}
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @private
	 * @memberof FileConfigurationService
	 * @name     _onUpdateConfiguration
	 *
	 * @param    {string} filePath - The absolute path of the updated configuration file.
	 *
	 * @returns  {null} - Nothing.
	 *
	 * @summary  Reads the new configuration, maps it to a loaded twyrModule, and tells the rest of the configuration services to process it.
	 */
	async _onUpdateConfiguration(filePath) {
		try {
			const deepEqual = require('deep-equal'),
				path = require('path');

			const rootPath = path.dirname(path.dirname(require.main.filename));
			const twyrModulePath = path.relative(rootPath, filePath).replace(`config${path.sep}${twyrEnv}${path.sep}`, '').replace('.js', '');

			delete require.cache[filePath];
			await snooze(500);

			if(deepEqual(this.$cacheMap[twyrModulePath], require(filePath).config))
				return;

			this.$cacheMap[twyrModulePath] = require(filePath).config;
			this.$parent.emit('update-config', this.name, twyrModulePath, require(filePath).config);
		}
		catch(err) {
			console.error(`Process updated configuration in ${filePath} error: ${err.message}\n${err.stack}`);
		}
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @private
	 * @memberof FileConfigurationService
	 * @name     _onDeleteConfiguration
	 *
	 * @param    {string} filePath - The absolute path of the deleted configuration file.
	 *
	 * @returns  {null} - Nothing.
	 *
	 * @summary  Removes configuration from the cache, etc., and tells the rest of the configuration services to process it.
	 */
	async _onDeleteConfiguration(filePath) {
		try {
			const path = require('path');

			const rootPath = path.dirname(path.dirname(require.main.filename));
			const twyrModulePath = path.relative(rootPath, filePath).replace(`config${path.sep}${twyrEnv}${path.sep}`, '').replace('.js', '');

			delete require.cache[filePath];
			delete this.$cacheMap[twyrModulePath];

			this.$parent.emit('delete-config', this.name, twyrModulePath);
		}
		catch(err) {
			console.error(`Process deleted configuration in ${filePath} error: ${err.message}\n${err.stack}`);
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

exports.service = FileConfigurationService;
