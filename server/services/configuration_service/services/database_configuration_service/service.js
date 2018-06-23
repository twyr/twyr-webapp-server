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
			await super._setup();

			if(!this.$parent.$config.subservices)
				return null;

			if(!this.$parent.$config.subservices[this.name])
				return null;

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

				thisConfig.pool['afterCreate'] = function(rawConnection, done) {
					const pgError = require('pg-error');

					rawConnection.parseE = pgError.parse;
					rawConnection.parseN = pgError.parse;

					rawConnection.on('PgError', function(err) {
						switch (err.severity) {
							case 'ERROR':
							case 'FATAL':
							case 'PANIC':
								this.emit('error', err);
								break;

							default:
								this.emit('notice', err);
								break;
						}
					});

					done();
				};
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
			return null;
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
				return null;

			let rootModule = this.$parent;
			while(rootModule.$parent) rootModule = rootModule.$parent;

			await this.$database.queryAsync(`UNLISTEN "${rootModule.$application}ConfigChange"`);
			await this.$database.queryAsync(`UNLISTEN "${rootModule.$application}StateChange"`);

			this.$database.end();
			delete this.$database;

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

			const twyrModulePath = this.$parent._getPathForModule(twyrModule);
			const cachedModule = this._getCachedModule(twyrModulePath);
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

			const twyrModulePath = this.$parent._getPathForModule(twyrModule);
			const cachedModule = this._getCachedModule(twyrModulePath);
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
			const twyrModulePath = this.$parent._getPathForModule(twyrModule);
			const cachedModule = this._getCachedModule(twyrModulePath);
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
			const twyrModulePath = this.$parent._getPathForModule(twyrModule);
			const cachedModule = this._getCachedModule(twyrModulePath);
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
			const twyrModulePath = this.$parent._getPathForModule(twyrModule);
			const cachedModule = this._getCachedModule(twyrModulePath);

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
			const cachedModule = this._getCachedModule(configUpdateModule);
			if(!cachedModule) return;

			const deepEqual = require('deep-equal');
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
			const cachedModule = this._getCachedModule(configUpdateModule);
			if(!cachedModule) return;

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

			const serverId = await this.$database.queryAsync('SELECT id FROM modules WHERE name = $1 AND parent IS NULL', [serverModule.$application]);
			let moduleConfigs = null;

			if(serverId.rows.length) {
				moduleConfigs = await this.$database.queryAsync('SELECT A.*, B.display_name, B.configuration, B.enabled FROM fn_get_module_descendants($1) A INNER JOIN modules B ON (A.id = B.id)', [serverId.rows[0].id]);
				moduleConfigs = moduleConfigs.rows;
			}

			this.$cachedMap = {};

			const configTree = this._reorderConfigsToTree(moduleConfigs, null);
			this._convertTreeToPaths(this.$cachedMap, '', configTree);

			return null;
		}
		catch(err) {
			console.error(`Reload configurations from database error: ${err.message}\n${err.stack}`);
			return null;
		}
	}

	_reorderConfigsToTree(moduleConfigs, parent) {
		const inflection = require('inflection');

		const filteredConfigs = moduleConfigs.filter((moduleConfig) => {
			return (moduleConfig.parent === parent);
		});

		const tree = {};
		filteredConfigs.forEach((filteredConfig) => {
			const relevantConfig = {
				'id': filteredConfig.id,
				'name': filteredConfig.name,
				'displayName': filteredConfig.display_name,
				'configuration': filteredConfig.configuration,
				'enabled': filteredConfig.enabled
			};

			const subModuleConfigs = this._reorderConfigsToTree(moduleConfigs, relevantConfig.id);
			Object.keys(subModuleConfigs).forEach((moduleType) => {
				relevantConfig[moduleType] = subModuleConfigs[moduleType];
			});

			if(filteredConfig.type === 'server') {
				tree.server = relevantConfig;
			}
			else {
				if(!tree[`${filteredConfig.type}s`]) tree[`${filteredConfig.type}s`] = {};
				tree[`${filteredConfig.type}s`][inflection.underscore(filteredConfig.name)] = relevantConfig;
			}

		});

		return tree;
	}

	_convertTreeToPaths(cachedMap, prefix, configTree) {
		const path = require('path');
		const twyrModuleTypes = ['services', 'middlewares', 'components', 'templates'];

		Object.keys(configTree).forEach((key) => {
			const currentPrefix = path.join(prefix, key);
			if(currentPrefix.startsWith('/')) currentPrefix.substring(1);

			if(cachedMap[currentPrefix])
				return;

			if((twyrModuleTypes.indexOf(key) < 0) && !configTree[key]['configuration'])
				return;

			if(configTree[key]['configuration'])
				cachedMap[currentPrefix] = {
					'id': configTree[key]['id'],
					'name': configTree[key]['name'],
					'displayName': configTree[key]['display_name'],
					'configuration': configTree[key]['configuration'],
					'enabled': configTree[key]['enabled']
				};

			this._convertTreeToPaths(cachedMap, currentPrefix, configTree[key]);
		});
	}

	_getCachedModule(twyrModulePath) {
		try {
			return this.$cachedMap[twyrModulePath];
		}
		catch(err) {
			console.error(`Get cached module error: ${err.message}\n${err.stack}`);
			return null;
		}
	}

	_databaseNotification(data) {
		if(twyrEnv === 'development' || twyrEnv === 'test') console.log(`${this.name}::_databaseNotification: ${JSON.stringify(data, null, '\t')}`);

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
			const deepEqual = require('deep-equal');

			let twyrModulePath = null;
			Object.keys(this.$cachedMap).forEach((cachedKey) => {
				if(this.$cachedMap[cachedKey].id === moduleId)
					twyrModulePath = cachedKey;
			});

			if(!twyrModulePath) return null;

			const result = await this.$database.queryAsync('SELECT configuration FROM modules WHERE id = $1', [moduleId]);
			if(!result.rows.length) return null;

			if(deepEqual(this.$cachedMap[twyrModulePath].configuration, result.rows[0].configuration))
				return null;

			this.$cachedMap[twyrModulePath].configuration = result.rows[0].configuration;
			this.$parent.emit('update-config', this.name, twyrModulePath, this.$cachedMap[twyrModulePath].configuration);

			return null;
		}
		catch(err) {
			console.error(`Process updated config in database error: ${err.message}\n${err.stack}`);
			return null;
		}
	}

	async _databaseStateChange(moduleId) {
		try {
			let twyrModulePath = null;
			Object.keys(this.$cachedMap).forEach((cachedKey) => {
				if(this.$cachedMap[cachedKey].id === moduleId)
					twyrModulePath = cachedKey;
			});

			if(!twyrModulePath) return null;

			const result = await this.$database.queryAsync('SELECT enabled FROM modules WHERE id = $1', [moduleId]);
			if(!result.rows.length) return null;

			if(this.$cachedMap[twyrModulePath].enabled === result.rows[0].enabled)
				return null;

			this.$cachedMap[twyrModulePath].enabled = result.rows[0].enabled;

			this.$parent.emit('update-state', this.name, twyrModulePath, this.$cachedMap[twyrModulePath].enabled);
			return null;
		}
		catch(err) {
			console.error(`Process updated state in database error: ${err.message}\n${err.stack}`);
			return null;
		}
	}

	_databaseQuery(queryData) {
		if((twyrEnv === 'development' || twyrEnv === 'test') && this.$config.debug) console.debug(`${this.name}::_databaseQuery: ${JSON.stringify(queryData, undefined, '\t')}`);
	}

	_databaseNotice() {
		if((twyrEnv === 'development' || twyrEnv === 'test') && this.$config.debug) console.info(`${this.name}::_databaseNotice: ${JSON.stringify(arguments, undefined, '\t')}`);
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
