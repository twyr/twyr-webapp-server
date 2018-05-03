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
 * @class   ExpressService
 * @extends {TwyrBaseService}
 * @classdesc The Twyr Web Application Server Express Service.
 *
 * @description
 * Allows the rest of the Twyr Modules to expose REST API.
 *
 */
class ExpressService extends TwyrBaseService {
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
	 * @memberof ExpressService
	 * @name     _setup
	 *
	 * @returns  {null} Nothing.
	 *
	 * @summary  Sets up the Web Server using ExpressJS.
	 */
	async _setup() {
		try {
			if(this.$server)
				return null;

			// Step 1: Require the Web Server
			const express = require('express');
			require('express-async-errors');

			const promises = require('bluebird');

			const acceptOverride = require('connect-acceptoverride'),
				bodyParser = require('body-parser'),
				compress = require('compression'),
				cookieParser = require('cookie-parser'),
				cors = require('cors'),
				debounce = require('connect-debounce'),
				device = require('express-device'),
				engines = require('consolidate'),
				favicon = require('serve-favicon'),
				flash = require('connect-flash'),
				fs = require('fs-extra'),
				logger = require('morgan'),
				methodOverride = require('method-override'),
				moment = require('moment'),
				path = require('path'),
				poweredBy = require('connect-powered-by'),
				serveStatic = require('serve-static'),
				serverDestroy = require('server-destroy'),
				session = require('express-session'),
				timeout = require('connect-timeout'),
				uuid = require('uuid/v4');

			const filesystem = promises.promisifyAll(fs);
			const SessionStore = require(`connect-${this.$config.session.store.media}`)(session);
			const loggerSrvc = this.$dependencies.LoggerService;

			// Step 2: Setup Winston for Express Logging
			const loggerStream = {
				'write': (message) => {
					loggerSrvc.silly(message);
				}
			};

			// Step 3: Setup CORS configuration
			const corsOptions = {
				'origin': (origin, corsCallback) => {
					if(!this.$config.corsAllowedDomains) {
						if(corsCallback) corsCallback(null, true);
						return;
					}

					const isAllowedOrigin = (this.$config.corsAllowedDomains.indexOf(origin) !== -1);
					if(corsCallback) corsCallback(null, isAllowedOrigin);
				},

				'credentials': true
			};

			// Step 4: Setup Session Store, etc.
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

			// Step 5: Setup Express
			const webServer = express();
			this.$express = webServer;
			this.$express.on('error', this._serverError.bind(this));

			webServer.set('view engine', this.$config.templateEngine);
			webServer.engine(this.$config.templateEngine, engines[this.$config.templateEngine]);

			if(this.$config.cookieParser.secure)
				webServer.set('trust proxy', 1);

			webServer
			.use(logger('combined', {
				'stream': loggerStream
			}))
			.use(this._tenantSetter.bind(this))
			.use(this._handleOrProxytoCluster.bind(this))
			.use(compress())
			.use(debounce())
			.use(cors(corsOptions))
			.use(_cookieParser)
			.use(_session)
			.use(acceptOverride())
			.use(methodOverride())
			.use(favicon(path.join(__dirname, this.$config.favicon)))
			.use(poweredBy(this.$config.poweredBy))
			.use(timeout(this.$config.requestTimeout * 1000))
			.use(serveStatic(path.join(this.basePath, this.$config.static.path || 'static'), {
				'index': this.$config.static.index || 'index.html',
				'maxAge': this.$config.static.maxAge || 300
			}))
			.use(flash())
			.use(bodyParser.raw({
				'limit': this.$config.maxRequestSize
			}))
			.use(bodyParser.urlencoded({
				'extended': true,
				'limit': this.$config.maxRequestSize
			}))
			.use(bodyParser.json({
				'limit': this.$config.maxRequestSize
			}))
			.use(bodyParser.json({
				'type': 'application/vnd.api+json',
				'limit': this.$config.maxRequestSize
			}))
			.use(bodyParser.text({
				'limit': this.$config.maxRequestSize
			}))
			.use(device.capture())
			.use(this.$dependencies.LocalizationService.init)
			.use((request, response, next) => {
				response.cookie('twyr-webapp-locale', request.getLocale(), this.$config.cookieParser);
				next();
			})
			.use(this._setupRequestResponseForAudit.bind(this))
			.use(this._requestResponseCycleHandler.bind(this))
			.use(this.$dependencies.AuthService.initialize())
			.use(this.$dependencies.AuthService.session());

			// Convenience....
			device.enableDeviceHelpers(webServer);

			// Step 6: Create the Server
			const protocol = require(this.$config.protocol || 'http');

			let server = undefined;
			if((this.$config.protocol || 'http') === 'http') {
				server = protocol.createServer(webServer);
			}
			else {
				const secureKey = await filesystem.readFileAsync(path.isAbsolute(this.$config.secureProtocols.key) ? this.$config.secureProtocols.key : path.join(__dirname, this.$config.secureProtocols.key));
				const secureCert = await filesystem.readFileAsync(path.isAbsolute(this.$config.secureProtocols.cert) ? this.$config.secureProtocols.cert : path.join(__dirname, this.$config.secureProtocols.cert));

				this.$config.secureProtocols.key = secureKey;
				this.$config.secureProtocols.cert = secureCert;

				server = protocol.createServer(this.$config.secureProtocols, webServer);
			}

			// Add utility to force-stop server
			serverDestroy(server);

			// Step 7: Setup the server to listen to requests forwarded via Ringpop
			this.$dependencies.RingpopService.on('request', (() => {
				return (request, response) => {
					return this.$express.handle(request, response, () => {
						console.info(JSON.stringify(arguments, null, '\t'));
						if(!response.finished) response.end();
					});
				};
			})());

			// Finally, Start listening...
			this.$server = promises.promisifyAll(server);
			this.$server.on('connection', this._serverConnection.bind(this));
			this.$server.on('error', this._serverError.bind(this));

			this.$parent.on('server-online', this._printNetworkInterfaces.bind(this, this.$config.port[this.$parent.name] || 9090));
			await this.$server.listenAsync(this.$config.port[this.$parent.name] || 9090);

			console.info(`Server Addresses: ${JSON.stringify(this.$express.address)}`)
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
	 * @memberof ExpressService
	 * @name     _teardown
	 *
	 * @returns  {undefined} Nothing.
	 *
	 * @summary  Destroys the ExpressJS Web Server.
	 */
	async _teardown() {
		try {
			this.$dependencies.RingpopService.removeAllListeners('request');

			if(!this.$server)
				return null;

			if(this.$server.listening) { // eslint-disable-line curly
				await this.$server.destroyAsync();
			}

			this.$server.removeAllListeners('connection');
			this.$server.removeAllListeners('error');

			this.$express._router.stack.length = 0;

			delete this.$express;
			delete this.$server;

			return null;
		}
		catch(err) {
			throw new TwyrSrvcError(`${this.name}::_teardown error`, err);
		}
	}
	// #endregion

	// #region Express Middlewares
	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof ExpressService
	 * @name     _tenantSetter
	 *
	 * @param    {Object} request - Request coming in from the outside world.
	 * @param    {Object} response - Response going out to the outside world.
	 * @param    {callback} next - Callback to pass the request on to the next route in the chain.
	 *
	 * @returns  {undefined} Nothing.
	 *
	 * @summary  Sets up the tenant context on each request so Ringpop knows which node in the cluster to route it to.
	 */
	async _tenantSetter(request, response, next) {
		try {
			const promises = require('bluebird');

			const cacheSrvc = this.$dependencies.CacheService,
				dbSrvc = this.$dependencies.DatabaseService.knex;

			let tenantSubDomain = request.hostname.replace(this.$config.cookieParser.domain, '');
			if(this.$config.subdomainMappings && this.$config.subdomainMappings[tenantSubDomain])
				tenantSubDomain = this.$config.subdomainMappings[tenantSubDomain];

			let tenant = await cacheSrvc.getAsync(`twyr!webapp!tenant!${tenantSubDomain}`);
			if(tenant) {
				request.tenant = JSON.parse(tenant);
				next();
				return;
			}

			tenant = await dbSrvc.raw('SELECT id, name, sub_domain FROM tenants WHERE sub_domain = ?', [tenantSubDomain]);
			if(!tenant) throw new Error(`Invalid sub-domain: ${tenantSubDomain}`);

			request.tenant = tenant.rows[0];

			const cacheMulti = cacheSrvc.multi();
			cacheMulti.setAsync(`twyr!webapp!tenant!${tenantSubDomain}`, JSON.stringify(request.tenant));
			cacheMulti.expireAsync(`twyr!webapp!tenant!${tenantSubDomain}`, ((twyrEnv === 'development') ? 30 : 43200));

			await cacheMulti.execAsync();
			next();
		}
		catch(err) {
			let error = err;

			// eslint-disable-next-line curly
			if(error && !(error instanceof TwyrSrvcError)) {
				error = new TwyrSrvcError(`${this.name}::tenantSetter`, error);
				console.error(error.toString());
			}

			throw error;
		}
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof ExpressService
	 * @name     _handleOrProxytoCluster
	 *
	 * @param    {Object} request - Request coming in from the outside world.
	 * @param    {Object} response - Response going out to the outside world.
	 * @param    {callback} next - Callback to pass the request on to the next route in the chain.
	 *
	 * @returns  {undefined} Nothing.
	 *
	 * @summary  Call Ringpop to decide whether to handle the request, or to forward it someplace else.
	 */
	async _handleOrProxytoCluster(request, response, next) {
		const key = request.tenant.id;
		const ringpop = this.$dependencies.RingpopService;

		if(ringpop.handleOrProxy(key, request, response, {
			'skipLookupOnRetry': false
		})) {
			next();
			return;
		}
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof ExpressService
	 * @name     _setupRequestResponseForAudit
	 *
	 * @param    {Object} request - Request coming in from the outside world.
	 * @param    {Object} response - Response going out to the outside world.
	 * @param    {callback} next - Callback to pass the request on to the next route in the chain.
	 *
	 * @returns  {undefined} Nothing.
	 *
	 * @summary  Wraps the response.send function so that the entire request / response cycle leaves an audit trail.
	 */
	async _setupRequestResponseForAudit(request, response, next) {
		if(!this.$enabled) { // eslint-disable-line curly
			response.status(500).redirect('/error');
			return;
		}

		try {
			const uuid = require('uuid/v4');

			const auditService = this.$dependencies.AuditService;
			const loggerService = this.$dependencies.LoggerService;

			request.twyrRequestId = uuid().toString();
			if(!request.session.passport) { // eslint-disable-line curly
				request.session.passport = {};
			}

			if(!request.session.passport.user) { // eslint-disable-line curly
				request.session.passport.user = 'ffffffff-ffff-4fff-ffff-ffffffffffff';
			}

			const realSend = response.send.bind(response);

			response.send = async function(body) {
				if(response.finished) return null;

				if(body && (typeof body === 'string')) { // eslint-disable-line curly
					try {
						const parsedBody = JSON.parse(body);
						const auditBody = { 'id': request.twyrRequestId, 'payload': parsedBody };

						await auditService.addResponsePayload(auditBody);
					}
					catch(parseOrAuditErr) {
						loggerService.silly(`${parseOrAuditErr.message}\n${parseOrAuditErr.stack}`);
					}
				}

				try {
					return realSend(body);
				}
				catch(realSendError) {
					let error = realSendError;
					if(!(error instanceof TwyrSrvcError))
						error = new TwyrSrvcError(`${this.name}::setupRequestResponseForAudit::realSendError`, realSendError);

					loggerService.error(error.toString());
					throw error;
				}
			}.bind(response);

			next();
			return;
		}
		catch(err) {
			let error = err;

			// eslint-disable-next-line curly
			if(error && !(error instanceof TwyrSrvcError)) {
				error = new TwyrSrvcError(`${this.name}::setupRequestResponseForAudit`, error);
			}

			throw error;
		}
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof ExpressService
	 * @name     _requestResponseCycleHandler
	 *
	 * @param    {Object} request - Request coming in from the outside world.
	 * @param    {Object} response - Response going out to the outside world.
	 * @param    {callback} next - Callback to pass the request on to the next route in the chain.
	 *
	 * @returns  {undefined} Nothing.
	 *
	 * @summary  Pushes the data from the request/response cycle to the Audit Service for publication.
	 */
	async _requestResponseCycleHandler(request, response, next) {
		try {
			const onFinished = require('on-finished');
			const statusCodes = require('http').STATUS_CODES;

			const auditService = this.$dependencies.AuditService;
			const loggerService = this.$dependencies.LoggerService;
			const logMsgMeta = { 'user': undefined, 'userId': undefined };

			onFinished(request, async (err) => {
				try {
					logMsgMeta.twyrRequestId = request.twyrRequestId;
					logMsgMeta.url = `${request.method} ${request.baseUrl ? request.baseUrl : ''}${request.path}`;
					logMsgMeta.userId = request.user ? `${request.user.id}` : logMsgMeta.userId || 'ffffffff-ffff-4fff-ffff-ffffffffffff';
					logMsgMeta.user = request.user ? `${request.user.first_name} ${request.user.last_name}` : logMsgMeta.user;
					logMsgMeta.query = JSON.parse(JSON.stringify(request.query || {}));
					logMsgMeta.params = JSON.parse(JSON.stringify(request.params || {}));
					logMsgMeta.body = JSON.parse(JSON.stringify(request.body || {}));

					if(err) {
						let error = err;
						if(!(error instanceof TwyrSrvcError)) { // eslint-disable-line curly
							error = new TwyrSrvcError(`${this.name}::requestResponseCycleHandler::onFinished::request`, error);
						}

						logMsgMeta.error = error.toString();
					}

					await auditService.addRequest(logMsgMeta);
				}
				catch(auditErr) {
					let error = auditErr;
					if(!(error instanceof TwyrSrvcError)) { // eslint-disable-line curly
						error = new TwyrSrvcError(`${this.name}::requestResponseCycleHandler::onFinished::request::auditErr`, auditErr);
					}

					loggerService.error(error.toString());
				}
			});

			onFinished(response, async (err) => {
				try {
					logMsgMeta.twyrRequestId = request.twyrRequestId;
					logMsgMeta.url = `${request.method} ${request.baseUrl ? request.baseUrl : ''}${request.path}`;
					logMsgMeta.userId = request.user ? `${request.user.id}` : logMsgMeta.userId || 'ffffffff-ffff-4fff-ffff-ffffffffffff';
					logMsgMeta.user = request.user ? `${request.user.first_name} ${request.user.last_name}` : logMsgMeta.user;
					logMsgMeta.query = JSON.parse(JSON.stringify(request.query || {}));
					logMsgMeta.params = JSON.parse(JSON.stringify(request.params || {}));
					logMsgMeta.body = JSON.parse(JSON.stringify(request.body || {}));

					logMsgMeta.statusCode = response.statusCode.toString();
					logMsgMeta.statusMessage = response.statusMessage ? response.statusMessage : statusCodes[response.statusCode];

					if(response.statusCode >= 400) logMsgMeta.error = `${logMsgMeta.statusCode}: ${logMsgMeta.statusMessage}`;

					if(err) {
						let error = err;
						if(!(error instanceof TwyrSrvcError)) { // eslint-disable-line curly
							error = new TwyrSrvcError(`${this.name}::requestResponseCycleHandler::onFinished::response`, error);
						}

						logMsgMeta.error = error.toString();
					}

					await auditService.addResponse(logMsgMeta);
				}
				catch(auditErr) {
					let error = auditErr;
					if(!(error instanceof TwyrSrvcError)) { // eslint-disable-line curly
						error = new TwyrSrvcError(`${this.name}::requestResponseCycleHandler::onFinished::response::auditErr`, auditErr);
					}

					loggerService.error(error.toString());
				}
			});

			next();
		}
		catch(err) {
			let error = err;

			// eslint-disable-next-line curly
			if(error && !(error instanceof TwyrSrvcError)) {
				error = new TwyrSrvcError(`${this.name}::requestResponseCycleHandler`, error);
			}

			throw error;
		}
	}
	// #endregion

	// #region Private Methods
	_serverConnection(socket) {
		socket.setTimeout(this.$config.connectionTimeout * 1000);
	}

	_serverError(err) {
		let error = err;

		// eslint-disable-next-line curly
		if(error && !(error instanceof TwyrSrvcError)) {
			error = new TwyrSrvcError(`${this.name}::_serverError`, error);
		}

		this.$dependencies.LoggerService.error(`${this.name}::_serverError\n\n${error.toString()}`);
	}

	async _printNetworkInterfaces(serverPort) {
		if(twyrEnv !== 'development') return;
		await snooze(500);

		const forPrint = [],
			networkInterfaces = require('os').networkInterfaces();

		Object.keys(networkInterfaces).forEach((networkInterfaceName) => {
			const networkInterfaceAddresses = networkInterfaces[networkInterfaceName];

			for(const address of networkInterfaceAddresses)
				forPrint.push({
					'Interface': networkInterfaceName,
					'Protocol': address.family,
					'Address': address.address,
					'Port': serverPort
				});
		});

		if(forPrint.length) {
			const printf = require('node-print');

			console.log(`\n\n${process.title} Listening On:`);
			printf.printTable(forPrint);
		}
	}
	// #endregion

	// #region Properties
	/**
	 * @override
	 */
	get Interface() {
		return {
			'Router': this.$express,
			'Server': this.$server
		};
	}

	/**
	 * @override
	 */
	get dependencies() {
		return [
			'AuditService',
			'AuthService',
			'CacheService',
			'ConfigurationService',
			'DatabaseService',
			'LocalizationService',
			'LoggerService',
			'RingpopService'
		].concat(super.dependencies);
	}

	/**
	 * @override
	 */
	get basePath() {
		return __dirname;
	}
	// #endregion
}

exports.service = ExpressService;
