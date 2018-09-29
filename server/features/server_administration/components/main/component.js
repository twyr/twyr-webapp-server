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
			this.$router.get('/features/tree', this._getFeatureTree.bind(this));
			this.$router.get('/features/:feature_id', this._getFeature.bind(this));

			await super._addRoutes();
			return null;
		}
		catch(err) {
			throw new TwyrComponentError(`${this.name}::_addRoutes error`, err);
		}
	}
	// #endregion

	// #region Route Handlers
	async _getFeatureTree(ctxt) {
		try {
			const apiSrvc = this.$dependencies.ApiService;
			const featureData = await apiSrvc.execute('Main::getModuleTree', ctxt);

			ctxt.status = 200;
			ctxt.body = featureData.shift();

			return null;
		}
		catch(err) {
			throw new TwyrComponentError(`Error retrieving feature data`, err);
		}
	}

	async _getFeature(ctxt) {
		try {
			const apiSrvc = this.$dependencies.ApiService;
			const featureData = await apiSrvc.execute('Main::getModule', ctxt);

			ctxt.status = 200;
			ctxt.body = featureData.shift();

			return null;
		}
		catch(err) {
			throw new TwyrComponentError(`Error retrieving feature data`, err);
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
