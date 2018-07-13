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

const TwyrBaseError = require('twyr-base-error').TwyrBaseError;
const TwyrSrvcError = require('twyr-service-error').TwyrServiceError;

/**
 * @class   WebserverService
 * @extends {TwyrBaseService}
 * @classdesc The Twyr Web Application Server Webserver Service - based on Koa.
 *
 * @description
 * Allows the rest of the Twyr Modules to expose REST API.
 *
 */
class WebserverService extends TwyrBaseService {
	// #region Constructor
	constructor(parent, loader) {
		super(parent, loader);
		this.$proxies = {};
	}
	// #endregion

	// #region startup/teardown code
	/**
	 * @async
	 * @function
	 * @override
	 * @instance
	 * @memberof WebserverService
	 * @name     _setup
	 *
	 * @returns  {null} Nothing.
	 *
	 * @summary  Sets up the Web Server using ExpressJS.
	 */
	async _setup() {
		try {
			if(this.$server) return null;
			await super._setup();

			// Step 1.1: Instantiate Koa & do basic setup
			const Koa = require('koa');
			const promises = require('bluebird');

			this.$koa = new Koa();
			this.$koa.proxy = ((twyrEnv !== 'development') && (twyrEnv !== 'test'));
			this.$koa.keys = this.$config.session.keys;

			const requestId = require('koa-requestid');
			this.$koa.use(requestId({
				'expose': 'X-Request-Id',
				'header': 'X-Request-Id',
				'query': 'requestId'
			}));

			this.$koa.use(async (ctxt, next) => {
				ctxt.request.headers['x-request-id'] = ctxt.state.id;
				ctxt.set('x-powered-by', this.$config.poweredBy);

				await next();
			});

			// Step 1.2: Twyr Auditing & Logger for auditing...
			this.$koa.use(this._auditLog.bind(this));

			const koaLogger = require('koa2-winston').logger;
			this.$koa.use(koaLogger({
				'level': this.$config.logLevel,
				'reqSelect': ['body'],
				'resSelect': ['body'],
				'logger': this.$dependencies.LoggerService
			}));

			// Step 1.3: Handle the bloody errors...
			this.$koa.use(async (ctxt, next) => {
				try {
					await next();
				}
				catch(err) {
					let error = err;
					if(error && !(error instanceof TwyrBaseError)) { // eslint-disable-line curly
						error = new TwyrBaseError(`Web Request Error: `, err);
					}

					ctxt.type = 'application/json; charset=utf-8';
					ctxt.status = error.code || error.number || 500;
					ctxt.body = error.toString().split('\n');

					ctxt.app.emit('error', error, ctxt);
				}
				finally {
					if(this.$config.protocol === 'http2')
						delete ctxt.status;
				}
			});

			// Step 1.4: Before proceeding further, check if this node will process this...
			this.$koa.use(this._setTenant.bind(this));
			this.$koa.use(this._handleOrProxytoCluster.bind(this));

			// Step 1.5: Security middlewares, Rate Limiters, etc. - first

			// Blacklisted IP? No chance...
			if(twyrEnv === 'production') {
				const honeypot = promises.promisifyAll(require('project-honeypot')(this.$config.honeyPot.apiKey));
				this.$koa.use(async (ctxt, next) => {
					const honeyPayload = await honeypot.queryAsync(ctxt.ip);
					if(!honeyPayload.found) {
						await next();
						return;
					}

					throw new URIError(`Blacklisted Request IP Address!`);
				});
			}

			// Not blacklisted but not whitelisted here? Forget it
			const koaCors = require('@koa/cors');
			this.$koa.use(koaCors({
				'credentials': true,
				'keepHeadersOnError': true,

				'origin': (ctx) => {
					return (ctx.hostname.indexOf('twyr.com') >= 0);
				}
			}));

			// Ok... whitelisted, but exceeding request quotas? Stop right now!
			const ratelimiter = require('koa-ratelimit');
			this.$koa.use(ratelimiter({
				'db': this.$dependencies.CacheService,
				'duration': 60000,
				'max': 12
			}));

			// All fine, but the server is overloaded? You gotta wait, dude!
			const overloadProtection = require('overload-protection')('koa');
			this.$koa.use(overloadProtection);

			// TODO: Enable proper Content-Security-Policy once we're done with figuring out where we get stuff from
			// And add a CSP report uri, as well
			const koaHelmet = require('koa-helmet');
			this.$koa.use(koaHelmet({
				'hidePoweredBy': false,
				'hpkp': (twyrEnv !== 'development' && twyrEnv !== 'test'),
				'hsts': (twyrEnv !== 'development' && twyrEnv !== 'test')
			}));

			// Step 1.6: Add in the request modifying middlewares
			const acceptOverride = require('koa-accept-override');
			this.$koa.use(acceptOverride());

			const methodOverride = require('koa-methodoverride');
			this.$koa.use(methodOverride());

			const device = require('device');
			this.$koa.use(async (ctxt, next) => {
				ctxt.state.device = device(ctxt.req.headers['user-agent'] || '');
				await next();
			});

			// Step 1.7: Session
			const koaSession = require('koa-session');
			const KoaSessionStore = require('koa-redis');

			this.$config.session.config.store = new KoaSessionStore({
				'client': this.$dependencies.CacheService
			});

			this.$config.session.config.genid = function() {
				const uuid = require('uuid/v4');
				return `twyr!webapp!server!${uuid()}`;
			};

			this.$koa.use(koaSession(this.$config.session.config, this.$koa));

			// Step 1.8: The body parser...
			const koaBodyParser = require('koa-bodyparser');
			this.$koa.use(koaBodyParser({
				'extendTypes': {
					'json': ['application/x-javascript', 'application/json', 'application/vnd.api+json']
				}
			}));

			// Step 1.9: Passport based authentication
			this.$koa.use(this.$dependencies.AuthService.initialize());
			this.$koa.use(this.$dependencies.AuthService.session());

			// Step 1.10: Compressor for large response payloads
			const compressor = require('koa-compress');
			this.$koa.use(compressor({
				'threshold': 4096
			}));

			// Step 1.11: Static Assets / Favicon / etc.
			// .use(this._serveTenantStaticAssets.bind(this))
			// .use(serveStatic(path.join(path.dirname(path.dirname(require.main.filename)), 'static_assets'), {
			// 	'index': this.$config.static.index || 'index.html',
			// 	'maxAge': this.$config.static.maxAge || 300
			// }))

			// Step 1.12: Add in the router
			const Router = require('koa-router');
			this.$router = new Router();

			this.$koa.use(this.$router.routes());
			this.$koa.use(this.$router.allowedMethods());

			// Step 2.1: Create the Server
			this.$config.protocol = this.$config.protocol || 'http';
			const protocol = require(this.$config.protocol || 'http');

			const path = require('path');
			const filesystem = promises.promisifyAll(require('fs'));

			if(this.$config.protocol === 'http') { // eslint-disable-line curly
				this.$server = protocol.createServer(this.$koa.callback());
			}

			if((this.$config.protocol === 'https') || this.$config.protocol === 'spdy') {
				const secureKey = await filesystem.readFileAsync(path.isAbsolute(this.$config.secureProtocols[this.$config.protocol].key) ? this.$config.secureProtocols[this.$config.protocol].key : path.join(__dirname, this.$config.secureProtocols[this.$config.protocol].key));
				const secureCert = await filesystem.readFileAsync(path.isAbsolute(this.$config.secureProtocols[this.$config.protocol].cert) ? this.$config.secureProtocols[this.$config.protocol].cert : path.join(__dirname, this.$config.secureProtocols[this.$config.protocol].cert));

				this.$config.secureProtocols[this.$config.protocol].key = secureKey;
				this.$config.secureProtocols[this.$config.protocol].cert = secureCert;

				this.$server = protocol.createServer(this.$config.secureProtocols[this.$config.protocol], this.$koa.callback());
			}

			if(this.$config.protocol === 'http2') {
				const secureKey = await filesystem.readFileAsync(path.isAbsolute(this.$config.secureProtocols[this.$config.protocol].key) ? this.$config.secureProtocols[this.$config.protocol].key : path.join(__dirname, this.$config.secureProtocols[this.$config.protocol].key));
				const secureCert = await filesystem.readFileAsync(path.isAbsolute(this.$config.secureProtocols[this.$config.protocol].cert) ? this.$config.secureProtocols[this.$config.protocol].cert : path.join(__dirname, this.$config.secureProtocols[this.$config.protocol].cert));

				this.$config.secureProtocols[this.$config.protocol].key = secureKey;
				this.$config.secureProtocols[this.$config.protocol].cert = secureCert;

				this.$server = protocol.createSecureServer(this.$config.secureProtocols[this.$config.protocol], this.$koa.callback());
			}

			// For whenever we do decide to use Let's encrypt
			// if((this.$config.protocol === 'https') || this.$config.protocol === 'spdy') {
			// 	const acmeConfig = JSON.parse(JSON.stringify(this.$config.acme));
			// 	delete acmeConfig.challengeDir;

			// 	acmeConfig.debug = ((twyrEnv === 'development') || (twyrEnv === 'test'));
			// 	acmeConfig.configDir = path.isAbsolute(acmeConfig.configDir) ? acmeConfig.configDir : path.join(path.dirname(path.dirname(require.main.filename)), acmeConfig.configDir);

			// 	acmeConfig.server = acmeConfig.server[twyrEnv] || acmeConfig.server['default'];
			// 	acmeConfig.approveDomains = this._approveDomains.bind(this);

			// 	acmeConfig.challenges = {
			// 		'dns-01': require('le-challenge-ddns').create({
			// 			'email': acmeConfig.email,
			// 			'ttl': 600,
			// 			'debug': acmeConfig.debug
			// 		})
			// 	};

			// 	acmeConfig.challengeType = 'dns-01';
			// 	acmeConfig.challenge = acmeConfig.challenges[acmeConfig.challengeType];

			// 	const greenlock = require('greenlock-koa').create(acmeConfig);
			// 	this.$server = protocol.createServer(greenlock.tlsOptions, greenlock.middleware(this.$koa.callback()));
			// }

			// if(this.$config.protocol === 'http2') {
			// 	const acmeConfig = JSON.parse(JSON.stringify(this.$config.acme));
			// 	delete acmeConfig.challengeDir;

			// 	acmeConfig.debug = ((twyrEnv === 'development') || (twyrEnv === 'test'));
			// 	acmeConfig.configDir = path.isAbsolute(acmeConfig.configDir) ? acmeConfig.configDir : path.join(path.dirname(path.dirname(require.main.filename)), acmeConfig.configDir);

			// 	acmeConfig.server = acmeConfig.server[twyrEnv] || acmeConfig.server['default'];
			// 	acmeConfig.approveDomains = this._approveDomains.bind(this);

			// 	acmeConfig.challenges = {
			// 		'dns-01': require('le-challenge-ddns').create({
			// 			'email': acmeConfig.email,
			// 			'ttl': 600,
			// 			'debug': acmeConfig.debug
			// 		})
			// 	};

			// 	acmeConfig.challengeType = 'dns-01';
			// 	acmeConfig.challenge = acmeConfig.challenges[acmeConfig.challengeType];

			// 	const greenlock = require('greenlock-koa').create(acmeConfig);
			// 	this.$server = protocol.createSecureServer(greenlock.tlsOptions, greenlock.middleware(this.$koa.callback()));
			// }

			// Step 2.2: Add utility to force-stop server
			const serverDestroy = require('server-destroy');
			serverDestroy(this.$server);

			// Step 2.3: Start listening to events
			this.$server.on('connection', this._serverConnection.bind(this));

			this.$koa.on('error', this._handleKoaError.bind(this));
			this.$server.on('error', this._serverError.bind(this));

			// Step 2.4: Setup the server to listen to requests forwarded via Ringpop, just in case
			this.$dependencies.RingpopService.on('request', this._processRequestFromAnotherNode.bind(this));

			// Finally, Start listening...
			this.$server = promises.promisifyAll(this.$server);
			this.$parent.once('server-online', this._listenAndPrintNetworkInterfaces.bind(this));

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
	 * @memberof WebserverService
	 * @name     _teardown
	 *
	 * @returns  {undefined} Nothing.
	 *
	 * @summary  Destroys the ExpressJS Web Server.
	 */
	async _teardown() {
		try {
			this.$dependencies.RingpopService.off('request', this._processRequestFromAnotherNode.bind(this));

			if(!this.$server) return null;
			if(this.$server.listening) { // eslint-disable-line curly
				await this.$server.destroyAsync();
			}

			this.$server.off('connection', this._serverConnection.bind(this));

			this.$server.off('error', this._serverError.bind(this));
			this.$koa.off('error', this._handleKoaError.bind(this));

			this.$router.stack.length = 0;

			delete this.$router;
			delete this.$koa;
			delete this.$server;

			await super._teardown();
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
	 * @memberof WebserverService
	 * @name     _setTenant
	 *
	 * @param    {Object} ctxt - Koa context.
	 * @param    {callback} next - Callback to pass the request on to the next route in the chain.
	 *
	 * @returns  {undefined} Nothing.
	 *
	 * @summary  Sets up the tenant context on each request so Ringpop knows which node in the cluster to route it to.
	 */
	async _setTenant(ctxt, next) {
		try {
			const cacheSrvc = this.$dependencies.CacheService,
				dbSrvc = this.$dependencies.DatabaseService.knex;

			let tenantSubDomain = ctxt.hostname.replace(this.$config.session.domain, '');
			if(this.$config.subdomainMappings && this.$config.subdomainMappings[tenantSubDomain])
				tenantSubDomain = this.$config.subdomainMappings[tenantSubDomain];

			let tenant = null;
			if(ctxt.get['tenant']) { // eslint-disable-line curly
				tenant = JSON.parse(ctxt.get['tenant']);
			}

			if(!tenant) {
				tenant = await cacheSrvc.getAsync(`twyr!webapp!tenant!${tenantSubDomain}`);
				if(tenant) tenant = JSON.parse(tenant);
			}

			if(!tenant) {
				tenant = await dbSrvc.raw('SELECT id, name, sub_domain FROM tenants WHERE sub_domain = ?', [tenantSubDomain]);
				if(!tenant.rows.length) throw new Error(`Invalid sub-domain: ${tenantSubDomain}`);

				tenant = tenant.rows.shift();

				const cacheMulti = cacheSrvc.multi();
				cacheMulti.setAsync(`twyr!webapp!tenant!${tenantSubDomain}`, JSON.stringify(tenant));
				cacheMulti.expireAsync(`twyr!webapp!tenant!${tenantSubDomain}`, ((twyrEnv === 'development') ? 30 : 43200));

				await cacheMulti.execAsync();
			}

			ctxt.state.tenant = tenant;
			ctxt.request.headers['tenant'] = JSON.stringify(tenant);

			await next();
		}
		catch(err) {
			let error = err;

			// eslint-disable-next-line curly
			if(error && !(error instanceof TwyrSrvcError)) {
				error = new TwyrSrvcError(`${this.name}::_setTenant`, error);
			}

			throw error;
		}
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof WebserverService
	 * @name     _auditLog
	 *
	 * @param    {Object} ctxt - Koa context.
	 * @param    {callback} next - Callback to pass the request on to the next route in the chain.
	 *
	 * @returns  {undefined} Nothing.
	 *
	 * @summary  Pushes the data from the request/response cycle to the Audit Service for publication.
	 */
	async _auditLog(ctxt, next) {
		try {
			const statusCodes = require('http').STATUS_CODES;

			const auditService = this.$dependencies.AuditService;
			const logMsgMeta = {};

			await next();

			logMsgMeta.twyrRequestId = ctxt.state.id;

			logMsgMeta.method = ctxt.method;
			logMsgMeta.url = ctxt.originalUrl;
			logMsgMeta.userAgent = ctxt.req.headers['user-agent'] || '';

			logMsgMeta.userId = ctxt.state.user ? ctxt.state.user.id : 'ffffffff-ffff-4fff-ffff-ffffffffffff';
			logMsgMeta.userName = ctxt.state.user ? `${ctxt.state.user.first_name} ${ctxt.state.user.last_name}` : 'Public';

			logMsgMeta.tenantId = ctxt.state.tenant ? ctxt.state.tenant.id : '00000000-0000-4000-0000-000000000000';
			logMsgMeta.tenantName = ctxt.state.tenant ? ctxt.state.tenant.name : 'Unknown';

			logMsgMeta.query = JSON.parse(JSON.stringify(ctxt.query || {}));
			logMsgMeta.params = JSON.parse(JSON.stringify(ctxt.params || {}));
			logMsgMeta.body = JSON.parse(JSON.stringify(ctxt.request.body || {}));

			logMsgMeta.payload = JSON.parse(JSON.stringify(ctxt.body || {}));
			logMsgMeta.statusCode = ctxt.status.toString();
			logMsgMeta.statusMessage = statusCodes[ctxt.status];

			logMsgMeta.error = (ctxt.status >= 400);

			await auditService.publish(logMsgMeta);
		}
		catch(err) {
			let error = err;

			// eslint-disable-next-line curly
			if(error && !(error instanceof TwyrSrvcError)) {
				error = new TwyrSrvcError(`${this.name}::_auditLog`, error);
			}

			throw error;
		}
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof WebserverService
	 * @name     _handleOrProxytoCluster
	 *
	 * @param    {Object} ctxt - Koa context.
	 * @param    {callback} next - Callback to pass the request on to the next route in the chain.
	 *
	 * @returns  {undefined} Nothing.
	 *
	 * @summary  Call Ringpop to decide whether to handle the request, or to forward it someplace else.
	 */
	async _handleOrProxytoCluster(ctxt, next) {
		try {
			const ringpop = this.$dependencies.RingpopService;
			if(ringpop.lookup(ctxt.state.tenant.id) === ringpop.whoami()) {
				await next();
				return;
			}

			const hostPort = [];
			hostPort.push(ringpop.lookup(ctxt.state.tenant.id).split(':').shift());
			hostPort.push(this.$config.port || 9100);

			const dest = `${this.$config.protocol}://${hostPort.filter((val) => { return !!val; }).join(':')}${ctxt.path}`;

			if(!this.$proxies[dest]) {
				const proxy = require('koa-better-http-proxy');
				this.$proxies[dest] = proxy(dest, {
					'preserveReqSession': true,
					'preserveHostHdr': true
				});
			}

			await this.$proxies[dest](ctxt, next);
		}
		catch(err) {
			let error = err;

			// eslint-disable-next-line curly
			if(error && !(error instanceof TwyrSrvcError)) {
				error = new TwyrSrvcError(`${this.name}::_handleOrProxytoCluster`, error);
			}

			throw error;
		}
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof WebserverService
	 * @name     _serveStaticAssets
	 *
	 * @param    {Object} request - Request coming in from the outside world.
	 * @param    {Object} response - Response going out to the outside world.
	 * @param    {callback} next - Callback to pass the request on to the next route in the chain.
	 *
	 * @returns  {undefined} Nothing.
	 *
	 * @summary  Serve up the favicon and other static assets from the current tenants folder.
	 */
	async _serveTenantStaticAssets(request, response, next) {
		const path = require('path');
		const serveStatic = require('serve-static');

		try {
			const tenantStaticAssetPath = path.join(path.dirname(path.dirname(require.main.filename)), 'static_assets', request.tenant['sub_domain']);
			serveStatic(tenantStaticAssetPath, {
				'index': this.$config.static.index || 'index.html',
				'maxAge': this.$config.static.maxAge || 300
			})(request, response, next);

			return;
		}
		catch(err) {
			next(err);
		}
	}

	// #endregion

	// #region Miscellaneous
	/**
	 * @function
	 * @instance
	 * @memberof WebserverService
	 * @name     _processRequestFromAnotherNode
	 *
	 * @param    {Object} request - Request coming in from the outside world.
	 * @param    {Object} response - Response going out to the outside world.
	 *
	 * @returns  {undefined} Nothing.
	 *
	 * @summary  Returns a function that can handle the request coming in from another Ringpop node.
	 */
	_processRequestFromAnotherNode(request, response) {
		response.end();
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

	_handleKoaError(err, ctxt) {
		let error = err;

		// eslint-disable-next-line curly
		if(error && !(error instanceof TwyrSrvcError)) {
			error = new TwyrSrvcError(`${this.name}::_handleKoaError`, error);
		}

		// TODO: Stop Logging! Send it to the Audit Service for centralized logging!!
		this.$dependencies.LoggerService.error(`${this.name}::_handleKoaError\n\n${error.toString()}`);
	}

	async _listenAndPrintNetworkInterfaces() {
		await snooze(1000);
		await this.$server.listenAsync(this.$config.port || 9090);

		if(twyrEnv !== 'development' && twyrEnv !== 'test')
			return;

		const forPrint = [],
			networkInterfaces = require('os').networkInterfaces();

		Object.keys(networkInterfaces).forEach((networkInterfaceName) => {
			const networkInterfaceAddresses = networkInterfaces[networkInterfaceName];

			for(const address of networkInterfaceAddresses)
				forPrint.push({
					'Interface': networkInterfaceName,
					'Protocol': address.family,
					'Address': address.address,
					'Port': this.$config.port || 9090
				});
		});

		console.table(forPrint);
	}
	// #endregion

	// #region Properties
	/**
	 * @override
	 */
	get Interface() {
		return {
			'Router': this.$router,
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

exports.service = WebserverService;
