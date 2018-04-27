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
				onFinished = require('on-finished'),
				path = require('path'),
				poweredBy = require('connect-powered-by'),
				serveStatic = require('serve-static'),
				serverDestroy = require('server-destroy'),
				session = require('express-session'),
				statusCodes = require('http').STATUS_CODES,
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

			const setupRequestResponseForAudit = async (request, response, next) => {
				if(!this.$enabled) { // eslint-disable-line curly
					response.status(500).redirect('/error');
					return;
				}

				const auditService = this.$dependencies.AuditService;

				request.twyrRequestId = uuid().toString();
				const realSend = response.send.bind(response);

				response.send = async function(body) {
					if(response.finished) return null;

					if(body && (typeof body === 'string')) {
						try {
							const parsedBody = JSON.parse(body);
							const auditBody = { 'id': request.twyrRequestId, 'payload': parsedBody };

							await auditService.addResponsePayload(auditBody);
						}
						catch(parseOrAuditErr) {
							loggerSrvc.error(`${parseOrAuditErr.message}\n${parseOrAuditErr.stack}`);
						}
					}

					try {
						return realSend(body);
					}
					catch(realSendError) {
						let error = realSendError;
						if(!(error instanceof TwyrSrvcError))
							error = new TwyrSrvcError(`${this.name}::setupRequestResponseForAudit::realSendError`, realSendError);

						loggerSrvc.error(error.toString());
						throw error;
					}
				}.bind(response);

				next();
			};

			const requestResponseCycleHandler = async (request, response, next) => {
				const auditService = this.$dependencies.AuditService,
					logMsgMeta = { 'user': undefined, 'userId': undefined };

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

						loggerSrvc.error(error.toString());
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

						loggerSrvc.error(error.toString());
					}
				});

				next();
			};

			const tenantSetter = async (request, response, next) => {
				try {
					const cacheSrvc = this.$dependencies.CacheService,
						dbSrvc = this.$dependencies.DatabaseService.knex;

					if(!request.session.passport) { // eslint-disable-line curly
						request.session.passport = {};
					}

					if(!request.session.passport.user) { // eslint-disable-line curly
						request.session.passport.user = 'ffffffff-ffff-4fff-ffff-ffffffffffff';
					}

					let tenantSubDomain = request.hostname.replace(this.$config.cookieParser.domain, '');
					if(this.$config.subdomainMappings && this.$config.subdomainMappings[tenantSubDomain])
						tenantSubDomain = this.$config.subdomainMappings[tenantSubDomain];

					let tenant = await cacheSrvc.getAsync(`twyr!webapp!tenant!${tenantSubDomain}`);
					if(tenant) {
						request.tenant = JSON.parse(tenant);
						return;
					}

					tenant = await dbSrvc.raw('SELECT id, name, sub_domain FROM tenants WHERE sub_domain = ?', [tenantSubDomain]);
					if(!tenant) throw new Error(`Invalid sub-domain: ${tenantSubDomain}`);

					request.tenant = tenant.rows[0];

					const cacheMulti = promises.promisifyAll(cacheSrvc.multi());
					cacheMulti.setAsync(`twyr!webapp!tenant!${tenantSubDomain}`, JSON.stringify(request.tenant));
					cacheMulti.expireAsync(`twyr!webapp!tenant!${tenantSubDomain}`, ((twyrEnv === 'development') ? 30 : 43200));

					await cacheMulti.execAsync();
				}
				catch(err) {
					let error = err;

					// eslint-disable-next-line curly
					if(error && !(error instanceof TwyrSrvcError)) {
						error = new TwyrSrvcError(`${this.name}::tenantSetter`, error);
					}

					throw error;
				}

				next();
			};

			// Step 5: Setup Express
			const webServer = express();
			this.$express = webServer;

			webServer.set('view engine', this.$config.templateEngine);
			webServer.engine(this.$config.templateEngine, engines[this.$config.templateEngine]);

			if(this.$config.cookieParser.secure)
				webServer.set('trust proxy', 1);

			webServer
			.use(logger('combined', {
				'stream': loggerStream
			}))
			.use(setupRequestResponseForAudit)
			.use(debounce())
			.use(cors(corsOptions))
			.use(favicon(path.join(__dirname, this.$config.favicon)))
			.use(acceptOverride())
			.use(methodOverride())
			.use(compress())
			.use(poweredBy(this.$config.poweredBy))
			.use(timeout(this.$config.requestTimeout * 1000))
			.use(serveStatic(path.join(this.basePath, this.$config.static.path || 'static'), {
				'index': this.$config.static.index || 'index.html',
				'maxAge': this.$config.static.maxAge || 300
			}))
			.use(flash())
			.use(_cookieParser)
			.use(_session)
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
			.use(requestResponseCycleHandler)
			.use(tenantSetter)
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

			// Start listening...
			this.$server = promises.promisifyAll(server);
			this.$server.on('listening', async () => {
				await snooze(800);
				if(twyrEnv === 'development') loggerSrvc.debug(`${this.$config.protocol.toUpperCase()} Server listening on: ${JSON.stringify(this.$server.address(), null, '\t')}`);
			});
			this.$server.on('connection', this._serverConnection.bind(this));
			this.$server.on('error', this._serverError.bind(this));

			await this.$server.listenAsync(this.$config.port[this.$parent.name] || 9090);
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
			'LoggerService'
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
