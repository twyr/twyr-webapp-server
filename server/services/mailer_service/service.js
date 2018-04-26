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
			const mailer = require('nodemailer');
			const promises = require('bluebird');
			const transport = require('nodemailer-smtp-transport');

			this.$smtpMailer = promises.promisifyAll(mailer.createTransport(transport(this.$config)));
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
	 * @memberof MailerService
	 * @name     _teardown
	 *
	 * @returns  {undefined} Nothing.
	 *
	 * @summary  Quits the connection to the SMTP server.
	 */
	async _teardown() {
		try {
			if(this.$smtpMailer) {
				this.$smtpMailer.close();
				delete this.$smtpMailer;
			}

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
		return this.$smtpMailer;
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
