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
 * @classdesc The Main component of the Tenant Administration / Group MAnagement Feature - manages CRUD for tenant groups.
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
			this.$router.get('/tree', this.$parent._rbac('group-manager-read'), this._getTenantGroupTree.bind(this));

			this.$router.get('/tenant-groups/:tenant_group_id', this.$parent._rbac('group-manager-read'), this._getTenantGroup.bind(this));
			this.$router.patch('/tenant-groups/:tenant_group_id', this.$parent._rbac('group-manager-update'), this._updateTenantGroup.bind(this));

			await super._addRoutes();
			return null;
		}
		catch(err) {
			throw new TwyrComponentError(`${this.name}::_addRoutes error`, err);
		}
	}
	// #endregion

	// #region Route Handlers
	async _getTenantGroupTree(ctxt) {
		try {
			const apiSrvc = this.$dependencies.ApiService;
			const tenantGroupTree = await apiSrvc.execute('Main::getTenantGroupTree', ctxt);

			ctxt.status = 200;
			ctxt.body = tenantGroupTree.shift();

			return null;
		}
		catch(err) {
			throw new TwyrComponentError(`Error retrieving tenant group tree`, err);
		}
	}

	async _getTenantGroup(ctxt) {
		try {
			const apiSrvc = this.$dependencies.ApiService;
			const tenantGroup = await apiSrvc.execute('Main::getTenantGroup', ctxt);

			ctxt.status = 200;
			ctxt.body = tenantGroup.shift();

			return null;
		}
		catch(err) {
			throw new TwyrComponentError(`Error retrieving tenant group`, err);
		}
	}

	async _updateTenantGroup(ctxt) {
		try {
			const apiSrvc = this.$dependencies.ApiService;
			const tenantGroup = await apiSrvc.execute('Main::updateTenantGroup', ctxt);

			ctxt.status = 200;
			ctxt.body = tenantGroup.shift();

			return null;
		}
		catch(err) {
			throw new TwyrComponentError(`Error updating tenant group`, err);
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
