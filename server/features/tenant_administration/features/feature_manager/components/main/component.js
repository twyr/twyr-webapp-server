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
			this.$router.get('/tree', this._getTenantFeatureTree.bind(this));
			this.$router.get('/tenant-features', this._getTenantFeatures.bind(this));

			this.$router.get('/tenant-features/:tenant_feature_id', this._getTenantFeature.bind(this));
			this.$router.post('/tenant-features', this._addTenantFeature.bind(this));
			this.$router.del('/tenant-features/:tenant_feature_id', this._deleteTenantFeature.bind(this));

			await super._addRoutes();

			return null;
		}
		catch(err) {
			throw new TwyrComponentError(`${this.name}::_addRoutes error`, err);
		}
	}
	// #endregion

	// #region Route Handlers
	async _getTenantFeatureTree(ctxt) {
		try {
			const apiSrvc = this.$dependencies.ApiService;
			const tenantFeatureTree = await apiSrvc.execute('Main::getTenantFeatureTree', ctxt);

			ctxt.status = 200;
			ctxt.body = tenantFeatureTree.shift();

			return null;
		}
		catch(err) {
			throw new TwyrComponentError(`Error retrieving tenant feature tree`, err);
		}
	}

	async _getTenantFeatures(ctxt, next) {
		if(ctxt.params['tenant_feature_id']) {
			await next();
			return null;
		}

		try {
			const apiSrvc = this.$dependencies.ApiService;
			const tenantFeatures = await apiSrvc.execute('Main::getAllTenantFeatures', ctxt);

			ctxt.status = 200;
			ctxt.body = tenantFeatures.shift();

			return null;
		}
		catch(err) {
			throw new TwyrComponentError(`Error retrieving tenant feature`, err);
		}
	}

	async _getTenantFeature(ctxt) {
		try {
			const apiSrvc = this.$dependencies.ApiService;
			const tenantFeature = await apiSrvc.execute('Main::getTenantFeature', ctxt);

			ctxt.status = 200;
			ctxt.body = tenantFeature.shift();

			return null;
		}
		catch(err) {
			throw new TwyrComponentError(`Error retrieving tenant feature`, err);
		}
	}

	async _addTenantFeature(ctxt) {
		try {
			const apiSrvc = this.$dependencies.ApiService;
			const tenantFeature = await apiSrvc.execute('Main::addTenantFeature', ctxt);

			ctxt.status = 200;
			ctxt.body = tenantFeature.shift();

			return null;
		}
		catch(err) {
			throw new TwyrComponentError(`Error retrieving tenant feature`, err);
		}
	}

	async _deleteTenantFeature(ctxt) {
		try {
			const apiSrvc = this.$dependencies.ApiService;
			await apiSrvc.execute('Main::deleteTenantFeature', ctxt);

			ctxt.status = 204;
			return null;
		}
		catch(err) {
			throw new TwyrComponentError(`Error deleting tenant feature`, err);
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
