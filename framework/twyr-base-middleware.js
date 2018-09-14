/* eslint-disable security/detect-object-injection */

'use strict';

/**
 * Module dependencies, required for ALL Twyr modules
 * @ignore
 */

/**
 * Module dependencies, required for this module
 * @ignore
 */
const TwyrBaseModule = require('./twyr-base-module').TwyrBaseModule;
const TwyrMiddlewareError = require('./twyr-middleware-error').TwyrMiddlewareError;

/**
 * @class   TwyrBaseMiddleware
 * @extends {TwyrBaseModule}
 * @classdesc The Twyr Web Application Server Base Class for all Middlewares.
 *
 * @param   {TwyrBaseModule} [parent] - The parent module, if any.
 * @param   {TwyrModuleLoader} [loader] - The loader to be used for managing modules' lifecycle, if any.
 *
 * @description
 * Serves as the "base class" for all other middlewares in the Twyr Web Application Server.
 *
 */
class TwyrBaseMiddleware extends TwyrBaseModule {
	// #region Constructor
	constructor(parent, loader) {
		super(parent, null);

		const TwyrMiddlewareLoader = require('./twyr-middleware-loader').TwyrMiddlewareLoader;
		const actualLoader = (loader instanceof TwyrMiddlewareLoader) ? loader : new TwyrMiddlewareLoader(this);

		this.$loader = actualLoader;

		const Router = require('koa-router');
		this.$router = new Router();
	}
	// #endregion

	// #region Lifecycle hooks
	/**
	 * @async
	 * @function
	 * @override
	 * @instance
	 * @memberof TwyrBaseMiddleware
	 * @name     _setup
	 *
	 * @returns  {undefined} Nothing.
	 *
	 * @summary  Registers the API with the ApiService.
	 */
	async _setup() {
		try {
			await super._setup();

			await this._setupJSONAPIMappers();
			await this._registerApis();

			return null;
		}
		catch(err) {
			throw new TwyrMiddlewareError(`${this.name}::_setup error`, err);
		}
	}

	/**
	 * @async
	 * @function
	 * @override
	 * @instance
	 * @memberof TwyrBaseMiddleware
	 * @name     _teardown
	 *
	 * @returns  {undefined} Nothing.
	 *
	 * @summary  De-registers the API with the ApiService.
	 */
	async _teardown() {
		try {
			await this._deregisterApis();
			await this._deleteJSONAPIMappers();

			await super._teardown();
			return null;
		}
		catch(err) {
			throw new TwyrMiddlewareError(`${this.name}::_teardown error`, err);
		}
	}
	// #endregion

	// #region Protected methods - need to be overriden by derived classes
	async _registerApis() {
		if(twyrEnv === 'development' || twyrEnv === 'test') console.log(`${this.name}::_registerApis`);
		return null;
	}

	async _deregisterApis() {
		if(twyrEnv === 'development' || twyrEnv === 'test') console.log(`${this.name}::_deregisterApis`);
		return null;
	}
	// #endregion

	// #region Private methods - not to be touched by derived classes
	async _setupJSONAPIMappers() {
		const promises = require('bluebird');

		const JsonApiDeserializer = require('jsonapi-serializer').Deserializer,
			JsonApiSerializer = require('jsonapi-serializer').Serializer;

		const JsonApiMapper = require('jsonapi-mapper');
		const JsonApiQueryParser = require('jsonapi-query-parser');

		// eslint-disable-next-line curly
		if(!this.$jsonApiSerializer) {
			this.$jsonApiSerializer = promises.promisifyAll(new JsonApiSerializer({
				'keyForAttribute': 'underscore_case',
				'included': false,
				'relations': true,
				'disableLinks': true
			}));
		}

		// eslint-disable-next-line curly
		if(!this.$jsonApiDeserializer) {
			this.$jsonApiDeserializer = promises.promisifyAll(new JsonApiDeserializer({
				'keyForAttribute': 'underscore_case',
				'included': false,
				'relations': true,
				'disableLinks': true
			}));
		}

		// eslint-disable-next-line curly
		if(!this.$jsonApiMapper) {
			let serverModule = this.$parent;
			while(serverModule.$parent) serverModule = serverModule.$parent;

			const protocol = serverModule.$services['WebserverService']['$config']['protocol'];
			const domain = serverModule.$services['WebserverService']['$config']['domain'];
			const externalPort = serverModule.$services['WebserverService']['$config']['externalPort'];


			this.$jsonApiMapper = new JsonApiMapper.Bookshelf(`${protocol}://${domain}:${externalPort}`, {
				'keyForAttribute': 'underscore_case',
				'included': false,
				'relations': true,
				'disableLinks': true
			});
		}

		if(!this.$jsonApiQueryParser)
			this.$jsonApiQueryParser = new JsonApiQueryParser();

		return null;
	}

	async _deleteJSONAPIMappers() {
		delete this.$jsonApiSerializer;
		delete this.$jsonApiDeserializer;
		delete this.$jsonApiMapper;
		delete this.$jsonApiQueryParser;

		return null;
	}
	// #endregion

	// #region Properties
	/**
	 * @override
	 */
	get dependencies() {
		return ['ApiService', 'AuditService', 'CacheService', 'ConfigurationService', 'DatabaseService', 'LoggerService'].concat(super.dependencies);
	}

	/**
	 * @override
	 */
	get basePath() {
		return __dirname;
	}
	// #endregion
}

exports.TwyrBaseMiddleware = TwyrBaseMiddleware;
