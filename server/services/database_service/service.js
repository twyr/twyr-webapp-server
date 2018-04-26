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

/**
 * @class   DatabaseService
 * @extends {TwyrBaseService}
 * @classdesc The Twyr Web Application Server Database Service.
 *
 * @description
 * Allows the rest of the Twyr Modules to store / retrieve data in the PostgreSQL database.
 *
 */
class DatabaseService extends TwyrBaseService {
	// #region Constructor
	constructor(parent, loader) {
		super(parent, loader);
	}
	// #endregion

	// #region startup/teardown code
	/**
	 * @async
	 * @function
	 * @override
	 * @instance
	 * @memberof DatabaseService
	 * @name     _setup
	 *
	 * @returns  {Promise} Promise that resolves / rejects based on whether the connection request went through.
	 *
	 * @summary  Sets up the connection to the configured PostgreSQL Server.
	 */
	async _setup() {
		try {
			const bookshelf = require('bookshelf');
			const jsonApiParams = require('bookshelf-jsonapi-params');
			const knex = require('knex');
			const path = require('path');

			this.$config.debug = (process.env.services_DatabaseService_debug === 'true') || (this.$config.debug === true);
			if(this.$config.connection) { // eslint-disable-line curly
				this.$config.connection.port = Number(process.env.services_DatabaseService_connection_port || this.$config.connection.port);
			}

			if(this.$config.pool) {
				this.$config.pool.min = Number(process.env.services_DatabaseService_pool_min || this.$config.pool.min);
				this.$config.pool.max = Number(process.env.services_DatabaseService_pool_max || this.$config.pool.max);
			}

			if(this.$config.migrations) thisConfig.migrations.directory = path.isAbsolute(thisConfig.migrations.directory) ? thisConfig.migrations.directory : path.join(rootPath, thisConfig.migrations.directory); // eslint-disable-line no-undef
			if(this.$config.seeds) thisConfig.seeds.directory = path.isAbsolute(thisConfig.seeds.directory) ? thisConfig.seeds.directory : path.join(rootPath, thisConfig.seeds.directory); // eslint-disable-line no-undef

			const knexInstance = knex(this.$config);
			knexInstance.on('query', this._databaseQuery.bind(this));
			knexInstance.on('query-response', this._databaseQuery.bind(this));
			knexInstance.on('query-error', this._databaseQueryError.bind(this));

			this.$database = bookshelf(knexInstance);
			this.$database.plugin(jsonApiParams, {
				'pagination': {
					'limit': 25
				}
			});

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
	 * @memberof DatabaseService
	 * @name     _teardown
	 *
	 * @returns  {null} Nothing.
	 *
	 * @summary  Logs off from the connection to the configured PostgreSQL Server.
	 */
	async _teardown() {
		try {
			if(!this.$database)
				return null;

			await this.$database.knex.destroy();
			delete this.$database;

			return null;
		}
		catch(err) {
			throw new TwyrSrvcError(`${this.name}::_teardown error`, err);
		}
	}
	// #endregion

	// #region Private Methods
	_databaseQuery(queryData) {
		this.$dependencies.LoggerService.silly(`${this.name}::_databaseQuery: ${JSON.stringify(queryData, null, '\t')}`);
	}

	_databaseNotice() {
		this.$dependencies.LoggerService.info(`${this.name}::_databaseNotification: ${JSON.stringify(arguments, null, '\t')}`);
	}

	_databaseQueryError() {
		this.$dependencies.LoggerService.error(`${this.name}::_databaseQueryError: ${JSON.stringify(arguments, null, '\t')}`);
	}
	// #endregion

	// #region Properties
	/**
	 * @override
	 */
	get Interface() {
		return this.$database;
	}

	/**
	 * @override
	 */
	get dependencies() {
		return ['ConfigurationService', 'LoggerService'].concat(super.dependencies);
	}

	/**
	 * @override
	 */
	get basePath() {
		return __dirname;
	}
	// #endregion
}

exports.service = DatabaseService;
