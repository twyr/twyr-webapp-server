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
			this.$router.get('/possibleTenantUsersList', this.$parent._rbac('group-manager-read'), this._getPossibleTenantUsersList.bind(this));

			this.$router.get('/tenant-groups/:tenant_group_id', this.$parent._rbac('group-manager-read'), this._getTenantGroup.bind(this));
			this.$router.post('/tenant-groups', this.$parent._rbac('group-manager-update'), this._addTenantGroup.bind(this));
			this.$router.patch('/tenant-groups/:tenant_group_id', this.$parent._rbac('group-manager-update'), this._updateTenantGroup.bind(this));
			this.$router.delete('/tenant-groups/:tenant_group_id', this.$parent._rbac('group-manager-update'), this._deleteTenantGroup.bind(this));

			this.$router.get('/tenant-user-groups/:tenant_user_group_id', this.$parent._rbac('group-manager-read'), this._getTenantUserGroup.bind(this));
			this.$router.post('/tenant-user-groups', this.$parent._rbac('group-manager-update'), this._addTenantUserGroup.bind(this));
			this.$router.delete('/tenant-user-groups/:tenant_user_group_id', this.$parent._rbac('group-manager-update'), this._deleteTenantUserGroup.bind(this));

			this.$router.post('/tenant-group-permissions', this.$parent._rbac('group-manager-update'), this._addTenantGroupPermission.bind(this));
			this.$router.delete('/tenant-group-permissions/:tenant_group_permission_id', this.$parent._rbac('group-manager-update'), this._deleteTenantGroupPermission.bind(this));

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

	async _getPossibleTenantUsersList(ctxt) {
		try {
			const apiSrvc = this.$dependencies.ApiService;
			const possibleTenantUsers = await apiSrvc.execute('Main::possibleTenantUsersList', ctxt);

			ctxt.status = 200;
			ctxt.body = possibleTenantUsers.shift();

			return null;
		}
		catch(err) {
			throw new TwyrComponentError(`Error retrieving possible tenant users for a group`, err);
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

	async _addTenantGroup(ctxt) {
		try {
			const apiSrvc = this.$dependencies.ApiService;
			const tenantGroup = await apiSrvc.execute('Main::addTenantGroup', ctxt);

			ctxt.status = 200;
			ctxt.body = tenantGroup.shift();

			return null;
		}
		catch(err) {
			throw new TwyrComponentError(`Error adding tenant group`, err);
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

	async _deleteTenantGroup(ctxt) {
		try {
			const apiSrvc = this.$dependencies.ApiService;
			await apiSrvc.execute('Main::deleteTenantGroup', ctxt);

			ctxt.status = 204;
			return null;
		}
		catch(err) {
			throw new TwyrComponentError(`Error deleting tenant group`, err);
		}
	}

	async _getTenantUserGroup(ctxt) {
		try {
			const apiSrvc = this.$dependencies.ApiService;
			const tenantUserGroup = await apiSrvc.execute('Main::getTenantUserGroup', ctxt);

			ctxt.status = 200;
			ctxt.body = tenantUserGroup.shift();

			return null;
		}
		catch(err) {
			throw new TwyrComponentError(`Error retrieving tenant user group`, err);
		}
	}

	async _addTenantUserGroup(ctxt) {
		try {
			const apiSrvc = this.$dependencies.ApiService;
			const tenantUserGroup = await apiSrvc.execute('Main::addTenantUserGroup', ctxt);

			ctxt.status = 200;
			ctxt.body = tenantUserGroup.shift();

			return null;
		}
		catch(err) {
			throw new TwyrComponentError(`Error adding tenant user to group`, err);
		}
	}

	async _deleteTenantUserGroup(ctxt) {
		try {
			const apiSrvc = this.$dependencies.ApiService;
			await apiSrvc.execute('Main::deleteTenantUserGroup', ctxt);

			ctxt.status = 204;
			return null;
		}
		catch(err) {
			throw new TwyrComponentError(`Error deleting tenant user from group`, err);
		}
	}

	async _addTenantGroupPermission(ctxt) {
		try {
			const apiSrvc = this.$dependencies.ApiService;
			const tenantGroupPermission = await apiSrvc.execute('Main::addTenantGroupPermission', ctxt);

			ctxt.status = 200;
			ctxt.body = tenantGroupPermission.shift();

			return null;
		}
		catch(err) {
			throw new TwyrComponentError(`Error adding permission to group`, err);
		}
	}

	async _deleteTenantGroupPermission(ctxt) {
		try {
			const apiSrvc = this.$dependencies.ApiService;
			await apiSrvc.execute('Main::deleteTenantGroupPermission', ctxt);

			ctxt.status = 204;
			return null;
		}
		catch(err) {
			throw new TwyrComponentError(`Error deleting permission from group`, err);
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
