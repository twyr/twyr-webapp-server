'use strict';

/**
 * Module dependencies, required for ALL Twyr' modules
 * @ignore
 */

/**
 * Module dependencies, required for this module
 * @ignore
 */
const TwyrBaseFeature = require('twyr-base-feature').TwyrBaseFeature;
const TwyrFeatureError = require('twyr-feature-error').TwyrFeatureError;

/**
 * @class   Dashboard
 * @extends {TwyrBaseFeature}
 * @classdesc The Twyr Web Application Server Dashboard feature - single-point access for all features the Tenant/User combination has access to.
 *
 *
 */
class Dashboard extends TwyrBaseFeature {
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
	 * @memberof Dashboard
	 * @name     getDashboardDisplayDetails
	 *
	 * @param    {Object} ctxt - Koa context.
	 *
	 * @returns  {Object} Dashboard display stuff for this Feature.
	 *
	 * @summary  No display in the dashboard itself.
	 */
	async getDashboardDisplayDetails(ctxt) { // eslint-disable-line no-unused-vars
		return null;
	}

	/**
	 * @async
	 * @function
	 * @override
	 * @instance
	 * @memberof Dashboard
	 * @name     _doesUserHavePermission
	 *
	 * @param    {Object} ctxt - Koa context.
	 * @param    {callback} next - Callback to pass the request on to the next route in the chain.
	 *
	 * @returns  {undefined} Nothing.
	 *
	 * @summary  Everyone logged-in gets access.
	 */
	async _doesUserHavePermission(ctxt, next) {
		if(ctxt.state.user) {
			await next();
			return;
		}

		throw new TwyrFeatureError('No active session');
	}

	/**
	 * @async
	 * @function
	 * @override
	 * @instance
	 * @memberof Dashboard
	 * @name     _canUserAccessThisResource
	 *
	 * @param    {Object} ctxt - Koa context.
	 * @param    {callback} next - Callback to pass the request on to the next route in the chain.
	 *
	 * @returns  {undefined} Nothing.
	 *
	 * @summary  Everyone logged-in gets access.
	 */
	async _canUserAccessThisResource(ctxt, next) {
		if(ctxt.state.user) {
			await next();
			return;
		}

		throw new TwyrFeatureError('No active session');
	}
	// #endregion

	// #region Properties
	/**
	 * @override
	 */
	get basePath() {
		return __dirname;
	}
	// #endregion
}

exports.feature = Dashboard;
