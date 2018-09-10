'use strict';

/**
 * Module dependencies, required for ALL Twyr' modules
 * @ignore
 */

/**
 * Module dependencies, required for this module
 * @ignore
 */
const TwyrBaseComponent = require('twyr-base-component').TwyrBaseComponent;
const TwyrCompError = require('twyr-component-error').TwyrComponentError;

/**
 * @class   Session
 * @extends {TwyrBaseComponent}
 * @classdesc The Twyr Web Application Server Session component - manages login/logout and related API.
 *
 *
 */
class Session extends TwyrBaseComponent {
	// #region Constructor
	constructor(parent, loader) {
		super(parent, loader);
	}
	// #endregion

	// #region Protected methods - need to be overriden by derived classes
	/**
	 * @async
	 * @function
	 * @override
	 * @instance
	 * @memberof Session
	 * @name     _addRoutes
	 *
	 * @returns  {undefined} Nothing.
	 *
	 * @summary  Adds routes to the Koa Router.
	 */
	async _addRoutes() {
		try {
			this.$router.get('/user', this._getUser.bind(this));

			this.$router.post('/login', this._login.bind(this));
			this.$router.get('/logout', this._logout.bind(this));

			this.$router.post('/reset-password', this._resetPassword.bind(this));

			await super._addRoutes();

			return null;
		}
		catch(err) {
			throw new TwyrCompError(`${this.name}::_addRoutes error`, err);
		}
	}
	// #endregion

	// #region Route Handlers
	async _getUser(ctxt) {
		// console.log(`ctxt.state.user: ${JSON.stringify(ctxt.state.user, null, '\t')}`);

		ctxt.body = {
			'name': ctxt.state.user ? `${ctxt.state.user.first_name} ${ctxt.state.user.last_name}` : 'Public',
			'loggedIn': !!ctxt.state.user,
			'permissions': (ctxt.state.user ? ctxt.state.user.permissions.map((permission) => { return permission.name; }) : ['public'])
		};

		return null;
	}

	async _login(ctxt) {
		if(ctxt.isAuthenticated()) throw new TwyrCompError(`Already logged in`);

		return this.$dependencies.AuthService.authenticate('twyr-local', async (err, user, info, status) => {
			if(err) throw new TwyrCompError(`Login Error: `, err);
			if(!user) throw new TwyrCompError(`User: ${ctxt.request.body.username} not found`);

			await ctxt.login(user);

			ctxt.status = 200;
			ctxt.body = { 'status': status || 200, 'info': info || { 'message': `Login for ${user.first_name} ${user.last_name} successful` } };
		})(ctxt);
	}

	async _logout(ctxt) {
		if(ctxt.isAuthenticated()) {
			await ctxt.logout();

			ctxt.status = 200;
			ctxt.body = { 'status': 200, 'info': { 'message': `Logout successful` } };

			return;
		}

		throw new TwyrCompError(`No active session`);
	}

	async _resetPassword(ctxt) {
		await this.$dependencies.ApiService.execute('SessionMiddleware::resetPassword', ctxt);

		ctxt.status = 200;
		ctxt.body = { 'status': 200, 'message': `Password reset successful. Please check your email for the new password` };

		return;
	}
	// #endregion

	// #region Properties
	/**
	 * @override
	 */
	get dependencies() {
		return ['AuthService'].concat(super.dependencies);
	}

	/**
	 * @override
	 */
	get basePath() {
		return __dirname;
	}
	// #endregion
}

exports.component = Session;
