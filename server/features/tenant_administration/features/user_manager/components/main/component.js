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
const TwyrComponentError = require('twyr-component-error').TwyrComponentError;

/**
 * @class   Main
 * @extends {TwyrBaseComponent}
 * @classdesc The Main component of the Profile Feature - manages CRUD for the User's profile.
 *
 *
 */
class Main extends TwyrBaseComponent {
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
	 * @memberof Main
	 * @name     _addRoutes
	 *
	 * @returns  {undefined} Nothing.
	 *
	 * @summary  Adds routes to the Koa Router.
	 */
	async _addRoutes() {
		try {
			this.$router.get('/tenant-users', this.$parent._rbac('user-manager-read'), this._getTenantUsers.bind(this));

			await super._addRoutes();
			return null;
		}
		catch(err) {
			throw new TwyrComponentError(`${this.name}::_addRoutes error`, err);
		}
	}
	// #endregion

	// #region Route Handlers
	async _getTenantUsers(ctxt) {
		try {
			const apiSrvc = this.$dependencies.ApiService;
			const tenantUsers = await apiSrvc.execute('Main::getAllTenantUsers', ctxt);

			ctxt.status = 200;
			ctxt.body = tenantUsers.shift();

			return null;
		}
		catch(err) {
			throw new TwyrComponentError(`Error retrieving tenant users`, err);
		}
	}
	// #endregion

	// #region Properties
	/**
	 * @override
	 */
	get dependencies() {
		return ['ApiService'].concat(super.dependencies);
	}

	/**
	 * @override
	 */
	get basePath() {
		return __dirname;
	}
	// #endregion
}

exports.component = Main;
