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
 * @class   CacheService
 * @extends {TwyrBaseService}
 * @classdesc The Twyr Web Application Server Cache Service.
 *
 * @description
 * Allows the rest of the Twyr Modules to store / retrieve data in the cache.
 *
 */
class CacheService extends TwyrBaseService {
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
	 * @memberof CacheService
	 * @name     _setup
	 *
	 * @returns  {Promise} Promise that resolves / rejects based on whether the connection request went through.
	 *
	 * @summary  Sets up the connection to the configured Redis Server.
	 */
	async _setup() {
		const Promise = require('bluebird');

		await super._setup();
		return new Promise((resolve, reject) => {
			try {
				this.$config.options['retry_strategy'] = (options) => {
					if(options.error.code === 'ECONNREFUSED')
						return new TwyrSrvcError(`${this.name}::retry_strategy::Server refused connection`, options.error);

					if(options.total_retry_time > 1000 * 60 * 60)
						return new TwyrSrvcError('Retry time exhausted');

					if(options.times_connected > 10)
						return undefined;

					// reconnect after
					return Math.max(options.attempt * 100, 3000);
				};

				const promises = require('bluebird');
				const redis = require('redis');

				redis.RedisClient.prototype = promises.promisifyAll(redis.RedisClient.prototype);
				redis.Multi.prototype = promises.promisifyAll(redis.Multi.prototype);

				this.$cache = redis.createClient(this.$config.port, this.$config.host, this.$config.options);
				this.$cache.once('connect', async (status) => {
					this.$cache.on('error', this._handleRedisError.bind(this));

					if(twyrEnv === 'development') {
						this.$monitorClient = this.$cache.duplicate();

						this.$monitorClient.on('monitor', this._logRedisCommands.bind(this));
						await this.$monitorClient.monitorAsync();
					}

					if(resolve) resolve(status);
				});

				this.$cache.once('error', (err) => {
					if(reject) reject(new TwyrSrvcError(`${this.name}::_setup::Cache error`, err));
				});
			}
			catch(err) {
				if(reject) reject(new TwyrSrvcError(`${this.name}::_setup::Connection error`, err));
			}
		});
	}

	/**
	 * @async
	 * @function
	 * @override
	 * @instance
	 * @memberof CacheService
	 * @name     _teardown
	 *
	 * @returns  {undefined} Nothing.
	 *
	 * @summary  Quits the connection to the configured Redis Server.
	 */
	async _teardown() {
		try {
			if(twyrEnv === 'development' && this.$monitorClient) {
				await this.$monitorClient.quitAsync();
				this.$monitorClient.end(true);

				delete this.$monitorClient;
			}

			if(!this.$cache) return null;
			await this.$cache.quitAsync();

			this.$cache.end(true);
			delete this.$cache;

			await super._teardown();
			return null;
		}
		catch(err) {
			throw new TwyrSrvcError(`${this.name}::_teardown error`, err);
		}
	}
	// #endregion

	// #region Private Methods
	_logRedisCommands(time, redisArgs, /* rawReply */) { // eslint-disable-line no-inline-comments
		this.$dependencies.LoggerService.debug(`\nRedis Command: ${JSON.stringify(redisArgs)}`);
	}

	_handleRedisError(err) {
		this.$dependencies.LoggerService.error(new TwyrSrvcError(`${this.name}::_handleRedisError error`, err).toString());
	}
	// #endregion

	// #region Properties
	/**
	 * @override
	 */
	get Interface() {
		return this.$cache;
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

exports.service = CacheService;
