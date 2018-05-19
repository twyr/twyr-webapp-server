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
 * @class   WebsocketService
 * @extends {TwyrBaseService}
 * @classdesc The Twyr Web Application Server Websocket Service.
 *
 * @description
 * Allows the rest of the Twyr Modules to use Websockets for realtime communication with the front-end.
 *
 */
class WebsocketService extends TwyrBaseService {
	// #region Constructor
	constructor(parent, loader) {
		super(parent, loader);
	}
	// #endregion

	// #region reconfiguration code
	/**
	 * @async
	 * @function
	 * @override
	 * @instance
	 * @memberof WebsocketService
	 * @name     _dependencyReconfigure
	 *
	 * @param    {TwyrBaseModule} dependency - Instance of the dependency that was reconfigured.
	 *
	 * @returns  {null} Nothing.
	 *
	 * @summary  If ExpressService was reconfigured, reset. Otherwise, ignore
	 */
	async _dependencyReconfigure(dependency) {
		try {
			const superStatus = await super._dependencyReconfigure(dependency);
			if(dependency.name !== 'ExpressService')
				return superStatus;

			await this._teardown();
			await this._setup();

			return superStatus;
		}
		catch(err) {
			console.error(`${this.name}::_dependencyReconfigure error: ${err.message}\n${err.stack}`);
			return null;
		}
	}
	// #endregion

	// #region startup/teardown code
	/**
	 * @async
	 * @function
	 * @override
	 * @instance
	 * @memberof WebsocketService
	 * @name     _setup
	 *
	 * @returns  {null} Nothing.
	 *
	 * @summary  Sets up the Websocket Server.
	 */
	async _setup() {
		try {
			if(this.$websocketServer)
				return null;

			await super._setup();

			const PrimusRooms = require('primus-rooms'),
				PrimusServer = require('primus');

			const cookieParser = require('cookie-parser'),
				device = require('express-device'),
				moment = require('moment'),
				session = require('express-session'),
				uuid = require('uuid/v4');

			const SessionStore = require(`connect-${this.$config.session.store.media}`)(session);
			const _sessionStore = new SessionStore({
				'client': this.$dependencies.CacheService,
				'prefix': this.$config.session.store.prefix,
				'ttl': this.$config.session.ttl
			});

			this.$config.cookieParser.maxAge = moment().add(10, 'year').valueOf();
			const _cookieParser = cookieParser(this.$config.session.secret, this.$config.cookieParser);
			const _session = session({
				'cookie': this.$config.cookieParser,
				'key': this.$config.session.key,
				'secret': this.$config.session.secret,
				'store': _sessionStore,
				'saveUninitialized': false,
				'resave': false,

				'genid': () => {
					return uuid().toString().replace(/-/g, '');
				}
			});

			// Step 1: Setup the realtime streaming server
			const thisConfig = JSON.parse(JSON.stringify(this.$config.primus));
			this.$websocketServer = new PrimusServer(this.$dependencies.ExpressService.Server, thisConfig);

			// Step 2: Put in the middlewares we need
			this.$websocketServer.use('cookieParser', _cookieParser, undefined, 0);
			this.$websocketServer.use('session', _session, undefined, 1);
			this.$websocketServer.use('device', device.capture(), undefined, 2);
			this.$websocketServer.use('passportInit', this.$dependencies.AuthService.initialize(), undefined, 3);
			this.$websocketServer.use('passportSession', this.$dependencies.AuthService.session(), undefined, 4);

			// Step 3: Authorization hook
			this.$websocketServer.authorize(this._authorizeWebsocketConnection.bind(this));

			// Step 4: Primus extensions...
			this.$websocketServer.plugin('rooms', PrimusRooms);

			// Step 5: Attach the event handlers...
			this.$websocketServer.on('initialised', this._websocketServerInitialised.bind(this));
			this.$websocketServer.on('log', this._websocketServerLog.bind(this));
			this.$websocketServer.on('error', this._websocketServerError.bind(this));

			// Step 6: Log connection / disconnection events
			this.$websocketServer.on('connection', this._websocketServerConnection.bind(this));
			this.$websocketServer.on('disconnection', this._websocketServerDisconnection.bind(this));

			// And we're done...
			return null;
		}
		catch(err) {
			throw new TwyrSrvcError(`${this.name}::_startup error`, err);
		}
	}

	/**
	 * @async
	 * @function
	 * @override
	 * @instance
	 * @memberof WebsocketService
	 * @name     _teardown
	 *
	 * @returns  {undefined} Nothing.
	 *
	 * @summary  Destroys the Websocket Server.
	 */
	async _teardown() {
		try {
			if(!this.$websocketServer)
				return null;

			this.$websocketServer.end({
				'close': true,
				'reconnect': false,
				'timeout': 10
			});

			delete this.$websocketServer;

			await super._teardown();
			return null;
		}
		catch(err) {
			throw new TwyrSrvcError(`${this.name}::_teardown error`, err);
		}
	}
	// #endregion

	// #region Private Methods
	_authorizeWebsocketConnection(request, callback) {
		if(callback) callback(!request.user);
	}

	async _websocketServerInitialised(transformer, parser, options) { // eslint-disable-line
		if(twyrEnv !== 'development')
			return;

		await snooze(1000);
		this.$dependencies.LoggerService.debug(`Websocket Server has been initialised with options: ${JSON.stringify(options, null, '\t')}`);
	}

	_websocketServerLog() {
		const loggerSrvc = this.$dependencies.LoggerService;
		if(twyrEnv === 'development') loggerSrvc.debug(`Websocket Server Log`, JSON.stringify(arguments, undefined, '\t'));
	}

	_websocketServerError() {
		const loggerSrvc = this.$dependencies.LoggerService;
		loggerSrvc.error(`Websocket Server Error`, JSON.stringify(arguments, undefined, '\t'));

		this.emit('websocket-error', arguments);
	}

	_websocketServerConnection(spark) {
		const username = spark.request.user ? `${spark.request.user.first_name} ${spark.request.user.last_name}` : 'Anonymous';

		if(twyrEnv === 'development') {
			const loggerSrvc = this.$dependencies.LoggerService;
			loggerSrvc.debug(`Websocket Connection for user`, username);
		}

		this.emit('websocket-connect', spark);
		spark.write({ 'channel': 'display-status-message', 'data': `Realtime Data connection established for User: ${username}` });
	}

	_websocketServerDisconnection(spark) {
		if(twyrEnv === 'development') {
			const loggerSrvc = this.$dependencies.LoggerService;
			const username = spark.request.user ? `${spark.request.user.first_name} ${spark.request.user.last_name}` : 'Anonymous';

			loggerSrvc.debug(`Websocket Disconnected for user`, username);
		}

		this.emit('websocket-disconnect', spark);
		spark.leaveAll();
		spark.removeAllListeners();
	}
	// #endregion

	// #region Properties
	/**
	 * @override
	 */
	get Interface() {
		return this.$websocketServer;
	}

	/**
	 * @override
	 */
	get dependencies() {
		return ['AuditService', 'AuthService', 'ConfigurationService', 'CacheService', 'DatabaseService', 'ExpressService', 'LocalizationService', 'LoggerService'].concat(super.dependencies);
	}

	/**
	 * @override
	 */
	get basePath() {
		return __dirname;
	}
	// #endregion
}

exports.service = WebsocketService;
