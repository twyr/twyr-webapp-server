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
 * @classdesc The Main component of the Tenant Administration Feature - manages CRUD for the account.
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
			this.$router.get('/tenants/:tenant_id', this._getTenant.bind(this));
			this.$router.patch('/tenants/:tenant_id', this._updateTenant.bind(this));
			this.$router.del('/tenants/:tenant_id', this._deleteTenant.bind(this));

			this.$router.get('/tenant-locations/:tenant_location_id', this._getLocation.bind(this));
			this.$router.post('/tenant-locations', this._addLocation.bind(this));
			this.$router.patch('/tenant-locations/:tenant_location_id', this._updateLocation.bind(this));
			this.$router.del('/tenant-locations/:tenant_location_id', this._deleteLocation.bind(this));

			await super._addRoutes();
			return null;
		}
		catch(err) {
			throw new TwyrComponentError(`${this.name}::_addRoutes error`, err);
		}
	}
	// #endregion

	// #region Route Handlers
	async _getTenant(ctxt) {
		try {
			const apiSrvc = this.$dependencies.ApiService;
			const tenantData = await apiSrvc.execute('Main::getTenant', ctxt);

			ctxt.status = 200;
			ctxt.body = tenantData.shift();

			return null;
		}
		catch(err) {
			throw new TwyrComponentError(`Error retrieving tenant data`, err);
		}
	}

	async _updateTenant(ctxt) {
		try {
			const apiSrvc = this.$dependencies.ApiService;
			const tenantData = await apiSrvc.execute('Main::updateTenant', ctxt);

			ctxt.status = 200;
			ctxt.body = tenantData.shift();

			return null;
		}
		catch(err) {
			throw new TwyrComponentError(`Error updating tenant data`, err);
		}
	}

	async _deleteTenant(ctxt) {
		try {
			const apiSrvc = this.$dependencies.ApiService;
			await apiSrvc.execute('Main::deleteTenant', ctxt);

			ctxt.status = 204;
			return null;
		}
		catch(err) {
			throw new TwyrComponentError(`Error deleting tenant`, err);
		}
	}

	async _getLocation(ctxt) {
		try {
			const apiSrvc = this.$dependencies.ApiService;
			const locationData = await apiSrvc.execute('Main::getLocation', ctxt);

			ctxt.status = 200;
			ctxt.body = locationData.shift();

			return null;
		}
		catch(err) {
			throw new TwyrComponentError(`Error retrieving location`, err);
		}
	}

	async _addLocation(ctxt) {
		try {
			const apiSrvc = this.$dependencies.ApiService;
			const status = await apiSrvc.execute('Main::addLocation', ctxt, true);

			ctxt.status = 200;
			ctxt.body = status.shift();

			return null;
		}
		catch(err) {
			throw new TwyrComponentError(`Error adding location`, err);
		}
	}

	async _updateLocation(ctxt) {
		try {
			const apiSrvc = this.$dependencies.ApiService;
			const status = await apiSrvc.execute('Main::addLocation', ctxt, false);

			ctxt.status = 200;
			ctxt.body = status.shift();

			return null;
		}
		catch(err) {
			throw new TwyrComponentError(`Error updating location`, err);
		}
	}

	async _deleteLocation(ctxt) {
		try {
			const apiSrvc = this.$dependencies.ApiService;
			await apiSrvc.execute('Main::deleteLocation', ctxt);

			ctxt.status = 204;
			return null;
		}
		catch(err) {
			throw new TwyrComponentError(`Error deleting location`, err);
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
