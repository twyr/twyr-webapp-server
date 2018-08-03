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
			await super._setup();

			this.$config.debug = (this.$config.debug === true);
			if(this.$config.connection) { // eslint-disable-line curly
				this.$config.connection.port = Number(this.$config.connection.port);
			}

			if(this.$config.pool) {
				this.$config.pool.min = Number(this.$config.pool.min);
				this.$config.pool.max = Number(this.$config.pool.max);

				this.$config.pool['afterCreate'] = async function(rawConnection, done) {
					try {
						const pgError = require('pg-error');

						rawConnection.connection.parseE = pgError.parse;
						rawConnection.connection.parseN = pgError.parse;

						rawConnection.connection.on('PgError', function(err) {
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

						const promises = require('bluebird');
						promises.promisifyAll(rawConnection.connection);
						done();
					}
					catch(err) {
						done(err);
					}
				};
			}

			const knex = require('knex');
			const knexInstance = knex(this.$config);
			knexInstance.on('query', this._databaseQuery.bind(this));
			knexInstance.on('query-response', this._databaseQuery.bind(this));
			knexInstance.on('query-error', this._databaseQueryError.bind(this));

			const bookshelf = require('bookshelf');
			this.$database = bookshelf(knexInstance);

			const jsonApiParams = require('bookshelf-jsonapi-params');
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

			await super._teardown();
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

	_databaseQueryError(error, query) {
		const queryLog = { 'sql': query.sql, 'bindings': query.bindings, 'options': query.options };
		this.$dependencies.LoggerService.error(`${this.name}::_databaseQueryError:\nQuery: ${JSON.stringify(queryLog, null, '\t')}\nError: ${JSON.stringify(error, null, '\t')}`);
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
