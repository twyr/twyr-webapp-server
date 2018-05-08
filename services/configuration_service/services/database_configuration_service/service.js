'use strict';

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

/**
 * @class   DatabaseConfigurationService
 * @extends {TwyrBaseService}
 * @classdesc The Twyr Web Application Server PostgreSQL-based configuration sub-service.
 *
 * @description
 * Allows the rest of the codebase to CRUD their configurations from the PostgreSQL database.
 *
 */
class DatabaseConfigurationService extends TwyrBaseService {
	// #region Constructor
	constructor(parent) {
		super(parent);
		this.$cacheMap = {};
	}
	// #endregion

	// #region setup/teardown code
	/**
	 * @async
	 * @override
	 * @function
	 * @instance
	 * @memberof DatabaseConfigurationService
	 * @name     _setup
	 *
	 * @returns  {boolean} Boolean true/false.
	 *
	 * @summary  Sets up the listener to watch for changes on the fly.
	 */
	async _setup() {
		try {
			if(!this.$parent.$config.subservices)
				return false;

			if(!this.$parent.$config.subservices[this.name])
				return false;

			const knex = require('knex');
			const path = require('path');
			const promises = require('bluebird');

			const env = twyrEnv.toLowerCase();
			const rootPath = path.dirname(require.main.filename);

			this.$config = this.$parent.$config.subservices[this.name];
			const thisConfig = JSON.parse(JSON.stringify(this.$config));

			thisConfig.client = process.env.services_DatabaseService_client || thisConfig.client;
			thisConfig.debug = (process.env.services_DatabaseService_debug === 'true') || (thisConfig.debug === true);

			if(thisConfig.connection) {
				thisConfig.connection.host = process.env.services_DatabaseService_connection_host || thisConfig.connection.host;
				thisConfig.connection.port = Number(process.env.services_DatabaseService_connection_port || thisConfig.connection.port);
				thisConfig.connection.user = process.env.services_DatabaseService_connection_user || thisConfig.connection.user;
				thisConfig.connection.password = process.env.services_DatabaseService_connection_password || thisConfig.connection.password;
				thisConfig.connection.database = process.env.services_DatabaseService_connection_database || thisConfig.connection.database;
			}

			if(thisConfig.pool) {
				thisConfig.pool.min = Number(process.env.services_DatabaseService_pool_min || thisConfig.pool.min);
				thisConfig.pool.max = Number(process.env.services_DatabaseService_pool_max || thisConfig.pool.max);
			}

			thisConfig.migrations.directory = path.isAbsolute(thisConfig.migrations.directory) ? thisConfig.migrations.directory : path.join(rootPath, thisConfig.migrations.directory);
			thisConfig.seeds.directory = path.isAbsolute(thisConfig.seeds.directory) ? thisConfig.seeds.directory : path.join(rootPath, thisConfig.seeds.directory);

			if(env === 'development' || env === 'test') {
				const knexInstance = knex(thisConfig);

				knexInstance.on('query', this._databaseQuery.bind(this));
				knexInstance.on('query-response', this._databaseQuery.bind(this));
				knexInstance.on('query-error', this._databaseQueryError.bind(this));

				await knexInstance.migrate.latest();
				await knexInstance.seed.run();
				await knexInstance.destroy();
			}

			const pg = require('pg');

			this.$database = promises.promisifyAll(new pg.Client(thisConfig.connection));
			await this.$database.connectAsync();

			this.$database.on('notice', this._databaseNotice.bind(this));
			this.$database.on('notification', this._databaseNotification.bind(this));

			let rootModule = this.$parent;
			while(rootModule.$parent) rootModule = rootModule.$parent;

			await this.$database.queryAsync(`LISTEN "${rootModule.$application}ConfigChange"`);
			await this.$database.queryAsync(`LISTEN "${rootModule.$application}StateChange"`);

			await this._reloadAllConfig();
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
	 * @memberof DatabaseConfigurationService
	 * @name     _teardown
	 *
	 * @returns  {boolean} Boolean true/false.
	 *
	 * @summary  Shutdown the database connection.
	 */
	async _teardown() {
		try {
			if(!this.$database)
				return;

			let rootModule = this.$parent;
			while(rootModule.$parent) rootModule = rootModule.$parent;

			await this.$database.queryAsync(`UNLISTEN "${rootModule.$application}ConfigChange"`);
			await this.$database.queryAsync(`UNLISTEN "${rootModule.$application}StateChange"`);

			this.$database.end();
			delete this.$database;

			return;
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
	 * @memberof DatabaseConfigurationService
	 * @name     loadConfiguration
	 *
	 * @param    {TwyrBaseModule} twyrModule - Instance of the {@link TwyrBaseModule} that requires configuration.
	 *
	 * @returns  {Object} - The twyrModule's database-based configuration.
	 *
	 * @summary  Retrieves the configuration of the twyrModule requesting for it.
	 */
	async loadConfiguration(twyrModule) {
		try {
			if(!this.$database)
				return {};

			const cachedModule = this._getCachedModule(twyrModule);
			if(cachedModule) {
				twyrModule.displayName = cachedModule.displayName;
				return cachedModule.configuration;
			}

			return {};
		}
		catch(err) {
			throw new TwyrSrvcError(`${this.name}::loadConfiguration::${twyrModule.name} error`, err);
		}
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof DatabaseConfigurationService
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
			if(!this.$database)
				return {};

			const cachedModule = this._getCachedModule(twyrModule);
			if(!cachedModule) return {};

			const deepEqual = require('deep-equal');
			if(deepEqual(cachedModule.configuration, config))
				return config;

			cachedModule.configuration = config;

			await this.$database.queryAsync('UPDATE modules SET configuration = $1 WHERE id = $2;', [config, cachedModule.id]);
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
	 * @memberof DatabaseConfigurationService
	 * @name     getModuleState
	 *
	 * @param    {TwyrBaseModule} twyrModule - Instance of the {@link TwyrBaseModule} that requires its state.
	 *
	 * @returns  {boolean} - The twyrModule state (enabled / disabled).
	 *
	 * @summary  Retrieves and returns the module state.
	 */
	async getModuleState(twyrModule) {
		try {
			const cachedModule = this._getCachedModule(twyrModule);
			return cachedModule ? cachedModule.enabled : true;
		}
		catch(err) {
			throw new TwyrSrvcError(`${this.name}::getModuleState::${twyrModule.name} error`, err);
		}
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof DatabaseConfigurationService
	 * @name     setModuleState
	 *
	 * @param    {TwyrBaseModule} twyrModule - Instance of the {@link TwyrBaseModule} that requires its state.
	 * @param    {boolean} enabled - State of the module.
	 *
	 * @returns  {null} - The module state.
	 *
	 * @summary  Sets the module state in the database.
	 */
	async setModuleState(twyrModule, enabled) {
		try {
			const cachedModule = this._getCachedModule(twyrModule);
			if(!cachedModule) return enabled;

			if(cachedModule.enabled === enabled)
				return enabled;

			cachedModule.enabled = enabled;
			await this.$database.queryAsync('UPDATE modules SET enabled = $1 WHERE id = $2', [enabled, cachedModule.id]);

			return enabled;
		}
		catch(err) {
			throw new TwyrSrvcError(`${this.name}::setModuleState::${twyrModule.name} error`, err);
		}
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof DatabaseConfigurationService
	 * @name     getModuleId
	 *
	 * @param    {TwyrBaseModule} twyrModule - Instance of the {@link TwyrBaseModule} that requires its state.
	 *
	 * @returns  {null} - The database ID of the twyrModule.
	 *
	 * @summary  Retrieves the configuration of the twyrModule requesting for it.
	 */
	async getModuleId(twyrModule) {
		try {
			const cachedModule = this._getCachedModule(twyrModule);
			return cachedModule ? cachedModule.id : null;
		}
		catch(err) {
			throw new TwyrSrvcError(`${this.name}::getModuleId::${twyrModule.name} error`, err);
		}
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @private
	 * @memberof DatabaseConfigurationService
	 * @name     _processConfigChange
	 *
	 * @param    {string} configUpdateModule - The path of the module for which the configuration changed.
	 * @param    {Object} config - The updated configuration.
	 *
	 * @returns  {null} - Nothing.
	 *
	 * @summary  Persists the configuration to the database.
	 */
	async _processConfigChange(configUpdateModule, config) {
		try {
			let rootModule = this.$parent;
			while(rootModule.$parent) rootModule = rootModule.$parent;

			const deepEqual = require('deep-equal');
			const inflection = require('inflection');
			const path = require('path');

			const pathSegments = path.join(rootModule.$application, configUpdateModule).split(path.sep);

			// Iterate down the cached config objects
			let cachedModule = this.$cachedConfigTree[pathSegments.shift()];
			pathSegments.forEach((segment) => {
				if(!cachedModule)
					return;

				cachedModule = cachedModule[`${inflection.camelize(segment)}`] || cachedModule[segment] || cachedModule[`$${segment}`];
			});

			if(!cachedModule)
				return;

			if(deepEqual(cachedModule.configuration, config))
				return;

			cachedModule.configuration = config;
			await this.$database.queryAsync('UPDATE modules SET configuration = $1 WHERE id = $2;', [config, cachedModule.id]);

			return;
		}
		catch(err) {
			console.error(`Process changed configuration to database error: ${err.message}\n${err.stack}`);
		}
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof DatabaseConfigurationService
	 * @name     _processStateChange
	 *
	 * @param    {string} configUpdateModule - The path of the module for which the state changed.
	 * @param    {boolean} state - The updated state.
	 *
	 * @returns  {null} - Nothing.
	 *
	 * @summary  Persists the state to the database.
	 */
	async _processStateChange(configUpdateModule, state) {
		try {
			let currentModule = this.$parent;
			while(currentModule.$parent) currentModule = currentModule.$parent;

			const inflection = require('inflection');
			const path = require('path');

			const pathSegments = path.join(currentModule.$application, configUpdateModule).split(path.sep);

			// Iterate down the cached config objects
			let cachedModule = this.$cachedConfigTree[pathSegments.shift()];
			pathSegments.forEach((segment) => {
				if(!cachedModule)
					return;

				cachedModule = cachedModule[`${inflection.camelize(segment)}`] || cachedModule[segment] || cachedModule[`$${segment}`];
			});

			if(!cachedModule)
				return;

			if(cachedModule.enabled === state)
				return;

			cachedModule.enabled = state;
			await this.$database.queryAsync('UPDATE modules SET enabled = $1 WHERE id = $2;', [state, cachedModule.id]);

			return;
		}
		catch(err) {
			console.error(`Process changed state to database error: ${err.message}\n${err.stack}`);
		}
	}
	// #endregion

	// #region Private Methods
	async _reloadAllConfig() {
		try {
			let serverModule = this.$parent;
			while(serverModule.$parent) serverModule = serverModule.$parent;

			let moduleConfigs = [];
			const serverId = await this.$database.queryAsync('SELECT id FROM modules WHERE name = $1 AND parent IS NULL', [serverModule.$application]);
			if(serverId.rows.length) {
				moduleConfigs = await this.$database.queryAsync('SELECT A.*, B.display_name, B.configuration, B.enabled FROM fn_get_module_descendants($1) A INNER JOIN modules B ON (A.id = B.id)', [serverId.rows[0].id]);
				moduleConfigs = moduleConfigs.rows;
			}

			this.$cachedConfigTree = this._reorgConfigsToTree(moduleConfigs, null);
			return null;
		}
		catch(err) {
			console.error(`Reload configurations from database error: ${err.message}\n${err.stack}`);
			return null;
		}
	}

	_getCachedModule(twyrModule) {
		try {
			const pathSegments = [];
			let currentModule = twyrModule;

			do {
				pathSegments.unshift(currentModule.$application || currentModule.name);

				if(currentModule.$parent) {
					let moduleType = '';
					['services', 'middlewares', 'components', 'templates'].forEach((type) => { // eslint-disable-line no-loop-func
						if(!currentModule.$parent[`$${type}`]) return;

						if(Object.keys(currentModule.$parent[`$${type}`]).indexOf(currentModule.name) >= 0)
							moduleType = type;
					});

					pathSegments.unshift(moduleType);
				}

				currentModule = currentModule.$parent;
			} while(currentModule);

			// Iterate down the cached config objects
			let cachedModule = this.$cachedConfigTree[pathSegments.shift()];
			pathSegments.forEach((segment) => {
				if(!cachedModule) return;
				cachedModule = cachedModule[segment];
			});

			return cachedModule;
		}
		catch(err) {
			console.error(`Get cached module error: ${err.message}\n${err.stack}`);
			return null;
		}
	}

	_reorgConfigsToTree(configArray, parentId) {
		const reOrgedTree = {};

		if(!this.$cachedMap) this.$cachedMap = {};

		// eslint-disable-next-line curly
		if(parentId) {
			['services', 'middlewares', 'components', 'templates'].forEach((moduleType) => {
				reOrgedTree[moduleType] = {};
			});
		}

		configArray.forEach((config) => {
			if(config.parent !== parentId)
				return;

			const configObj = {};
			configObj.id = config.id;
			configObj.name = config.name;
			configObj.displayName = config.display_name;
			configObj.enabled = config.enabled;
			configObj.configuration = config.configuration;

			const configSubObj = this._reorgConfigsToTree(configArray, config.id);
			['services', 'middlewares', 'components', 'templates'].forEach((moduleType) => {
				configObj[moduleType] = configSubObj[moduleType];
			});

			if(parentId === null) {
				reOrgedTree[config.name] = configObj;
			}
			else {
				const inflection = require('inflection');
				reOrgedTree[inflection.pluralize(config.type)][config.name] = configObj;
			}

			this.$cachedMap[configObj.id] = configObj;
		});

		return reOrgedTree;
	}

	_getModulePath(module, callback) {
		if(callback) callback(null, '');
	}

	_databaseNotification(data) {
		console.log(`${this.name}::_databaseNotification: ${JSON.stringify(data, null, '\t')}`);

		if(!this.$cachedMap[data.payload])
			return null;

		let rootModule = this.$parent;
		while(rootModule.$parent) rootModule = rootModule.$parent;

		if(data.channel === `${rootModule.$application}ConfigChange`) {
			this._databaseConfigurationChange(data.payload);
			return null;
		}

		if(data.channel === `${rootModule.$application}StateChange`) {
			this._databaseStateChange(data.payload);
			return null;
		}

		return null;
	}

	async _databaseConfigurationChange(moduleId) {
		try {
			const deepEqual = require('deep-equal'),
				inflection = require('inflection');

			const result = await this.$database.queryAsync('SELECT configuration FROM modules WHERE id = $1', [moduleId]);
			if(!result.rows.length) return null;

			if(deepEqual(this.$cachedMap[moduleId].configuration, result.rows[0].configuration))
				return null;

			this.$cachedMap[moduleId].configuration = result.rows[0].configuration;

			let ancestors = await this.$database.queryAsync('SELECT name, type FROM fn_get_module_ancestors($1) ORDER BY level DESC', [moduleId]);
			if(!ancestors) return null;

			ancestors = ancestors.rows;
			ancestors.shift();
			if(!ancestors.length)
				return null;

			const twyrModule = [];
			ancestors.forEach((pathSegment) => {
				twyrModule.push(inflection.pluralize(pathSegment.type));
				twyrModule.push(inflection.underscore(pathSegment.name));
			});

			this.$parent.emit('update-config', this.name, twyrModule.join('/'), this.$cachedMap[moduleId].configuration);
			return null;
		}
		catch(err) {
			console.error(`Process updated config in database error: ${err.message}\n${err.stack}`);
			return null;
		}
	}

	async _databaseStateChange(moduleId) {
		try {
			const result = await this.$database.queryAsync('SELECT enabled FROM modules WHERE id = $1', [moduleId]);
			if(!result.rows.length) return null;

			if(this.$cachedMap[moduleId].enabled === result.rows[0].enabled)
				return null;

			this.$cachedMap[moduleId].enabled = result.rows[0].enabled;

			let ancestors = await this.$database.queryAsync('SELECT name, type FROM fn_get_module_ancestors($1) ORDER BY level DESC', [moduleId]);
			if(!ancestors) return null;

			ancestors = ancestors.rows;
			ancestors.shift();
			if(!ancestors.length)
				return null;

			const inflection = require('inflection');
			const twyrModule = [];

			ancestors.forEach((pathSegment) => {
				twyrModule.push(inflection.pluralize(pathSegment.type));
				twyrModule.push(inflection.underscore(pathSegment.name));
			});

			this.$parent.emit('update-state', this.name, twyrModule.join('/'), this.$cachedMap[moduleId].enabled);
			return null;
		}
		catch(err) {
			console.error(`Process updated state in database error: ${err.message}\n${err.stack}`);
			return null;
		}
	}

	_databaseQuery(queryData) {
		if((twyrEnv === 'development') && this.$config.debug) console.debug(`${this.name}::_databaseQuery: ${JSON.stringify(queryData, undefined, '\t')}`);
	}

	_databaseNotice() {
		if((twyrEnv === 'development') && this.$config.debug) console.info(`${this.name}::_databaseNotice: ${JSON.stringify(arguments, undefined, '\t')}`);
	}

	_databaseQueryError(err, queryData) {
		console.error(`${this.name}::_databaseQueryError: ${JSON.stringify({ 'query': queryData, 'error': err }, undefined, '\t')}`);
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

exports.service = DatabaseConfigurationService;
