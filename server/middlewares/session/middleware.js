'use strict';

/**
 * Module dependencies, required for ALL Twyr' modules
 * @ignore
 */

/**
 * Module dependencies, required for this module
 * @ignore
 */
const TwyrBaseMiddleware = require('twyr-base-middleware').TwyrBaseMiddleware;
const TwyrMiddlewareError = require('twyr-middleware-error').TwyrMiddlewareError;

/**
 * @class   Session
 * @extends {TwyrBaseMiddleware}
 * @classdesc The Twyr Web Application Server Session middleware - manages reset password and related operations.
 *
 *
 */
class Session extends TwyrBaseMiddleware {
	// #region Constructor
	constructor(parent, loader) {
		super(parent, loader);
	}
	// #endregion

	// #region Protected methods
	async _registerApis() {
		try {
			const ApiService = this.$dependencies.ApiService;

			await super._registerApis();
			await ApiService.add(`${this.name}::resetPassword`, this._resetPassword.bind(this));

			return null;
		}
		catch(err) {
			throw new TwyrMiddlewareError(`${this.name}::_registerApis`, err);
		}
	}

	async _deregisterApis() {
		try {
			const ApiService = this.$dependencies.ApiService;

			await ApiService.remove(`${this.name}::resetPassword`, this._resetPassword.bind(this));
			await super._deregisterApis();

			return null;
		}
		catch(err) {
			throw new TwyrMiddlewareError(`${this.name}::_registerApis`, err);
		}
	}
	// #endregion

	// #region API
	async _resetPassword(ctxt) {
		const upash = require('upash');
		// Not required here - apparently, once installed anywhere, we're good to go
		// upash.install('pbkdf2', require('@phc/pbkdf2'));

		const username = ctxt.request.body.username;
		const dbSrvc = this.$dependencies.DatabaseService;

		const userId = await dbSrvc.knex.raw(`SELECT user_id FROM users WHERE email = ?`, [username]);
		if(!userId.rows.length) throw new TwyrMiddlewareError(`Invalid Email: ${username}`);

		const RandomOrg = require('random-org');
		const random = new RandomOrg(this.$config.randomServer);

		const randomPasswordResponse = await random.generateStrings(this.$config.passwordFormat);
		const rawPassword = randomPasswordResponse.random.data.pop();
		const hashedPassword = await upash.hash(rawPassword);

		await dbSrvc.knex.raw(`UPDATE users SET password = ? WHERE email = ?`, [hashedPassword, username]);

		const messageOptions = JSON.parse(JSON.stringify(this.$config.resetPasswordMail));
		messageOptions['to'] = username;
		messageOptions['text'] = `Your auto-generated password on Twyr is ${rawPassword}`;

		const mailerSrvc = this.$dependencies.MailerService;
		const sendMailResult = await mailerSrvc.sendMail(messageOptions);

		const auditSrvc = this.$dependencies.AuditService;
		await auditSrvc.publish({
			'id': ctxt.state.id,
			'messageId': sendMailResult.messageId
		});

		return true;
	}
	// #endregion

	// #region Properties
	/**
	 * @override
	 */
	get dependencies() {
		return ['MailerService'].concat(super.dependencies);
	}
	/**
	 * @override
	 */
	get basePath() {
		return __dirname;
	}
	// #endregion
}

exports.middleware = Session;
