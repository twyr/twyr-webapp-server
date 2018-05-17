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
			const promises = require('bluebird');

			this.$config.debug = (process.env.services_DatabaseService_debug === 'true') || (this.$config.debug === true);
			if(this.$config.connection) { // eslint-disable-line curly
				this.$config.connection.port = Number(process.env.services_DatabaseService_connection_port || this.$config.connection.port);
			}

			if(this.$config.pool) {
				this.$config.pool.min = Number(process.env.services_DatabaseService_pool_min || this.$config.pool.min);
				this.$config.pool.max = Number(process.env.services_DatabaseService_pool_max || this.$config.pool.max);

				this.$config.pool['afterCreate'] = async function(rawConnection, done) {
					try {
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

						promises.promisifyAll(rawConnection);
						done();

						// let dbSchemas = await rawConnection.queryAsync(`SELECT nspname FROM pg_catalog.pg_namespace`);
						// dbSchemas = dbSchemas.rows.map((schema) => {
						// 	return schema.nspname;
						// })
						// .filter((schemaName) => {
						// 	return ((schemaName !== 'information_schema') && (!schemaName.startsWith('pg_')));
						// });

						// const pgInfo = promises.promisify(require('pg-info'));
						// const dbInfo = await pgInfo({
						// 	'client': rawConnection,
						// 	'schemas': dbSchemas
						// });

						// TODO: Create bookshelf models automatically from here...
						// self.$dependencies.LoggerService.debug(`PG Info Output: ${JSON.stringify(dbInfo, null, '\t')}`);

						// console.log(`DB Schemas: ${JSON.stringify(dbSchemas)}`);
					}
					catch(err) {
						done(err);
					}
				};
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
