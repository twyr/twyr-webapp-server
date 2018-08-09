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
 * @class   MailerService
 * @extends {TwyrBaseService}
 * @classdesc The Twyr Web Application Server SMTP Service.
 *
 * @description
 * Allows the rest of the Twyr Modules to send emails via SMTP.
 *
 */
class MailerService extends TwyrBaseService {
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
	 * @memberof MailerService
	 * @name     _setup
	 *
	 * @returns  {null} Nothing.
	 *
	 * @summary  Sets up the connection to the SMTP server.
	 */
	async _setup() {
		try {
			await super._setup();

			const self = this; // eslint-disable-line consistent-this
			const loggerProxy = {
				'log': function() {
					self.$dependencies.LoggerService.log(...arguments);
				},
				'trace': function() {
					self.$dependencies.LoggerService.silly(...arguments);
				},
				'silly': function() {
					self.$dependencies.LoggerService.silly(...arguments);
				},

				'debug': function() {
					self.$dependencies.LoggerService.debug(...arguments);
				},

				'verbose': function() {
					self.$dependencies.LoggerService.verbose(...arguments);
				},

				'info': function() {
					self.$dependencies.LoggerService.info(...arguments);
				},

				'warn': function() {
					self.$dependencies.LoggerService.warn(...arguments);
				},

				'error': function() {
					self.$dependencies.LoggerService.error(...arguments);
				}
			};

			const promises = require('bluebird');
			const mailer = promises.promisifyAll(require('nodemailer'));

			const account = (this.$config.test) ? await mailer.createTestAccountAsync() : null;
			const transporter = promises.promisifyAll(mailer.createTransport({
				'debug': (twyrEnv === 'development'),
				'logger': loggerProxy,

				'host': this.$config.host,
				'port': this.$config.port,
				'secure': this.$config.secure,
				'auth': {
					'user': account.user,
					'pass': account.pass
				}
			}));

			this.$smtpTransporter = transporter;
			await this.$smtpTransporter.verifyAsync();

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
	 * @memberof MailerService
	 * @name     _teardown
	 *
	 * @returns  {undefined} Nothing.
	 *
	 * @summary  Quits the connection to the SMTP server.
	 */
	async _teardown() {
		try {
			if(this.$smtpTransporter) {
				this.$smtpTransporter.close();
				delete this.$smtpTransporter;
			}

			await super._teardown();
			return null;
		}
		catch(err) {
			throw new TwyrSrvcError(`${this.name}::_teardown error`, err);
		}
	}
	// #endregion

	// #region Properties
	/**
	 * @override
	 */
	get Interface() {
		return this.$smtpTransporter;
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

exports.service = MailerService;
