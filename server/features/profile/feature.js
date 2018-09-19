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
 * @class   Profile
 * @extends {TwyrBaseFeature}
 * @classdesc The Twyr Web Application Server Profile feature - manages user profile updates.
 *
 *
 */
class Profile extends TwyrBaseFeature {
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
	 * @memberof Profile
	 * @name     getDashboardDisplayDetails
	 *
	 * @param    {Object} ctxt - Koa context.
	 *
	 * @returns  {Object} Dashboard display stuff for this Feature.
	 *
	 * @summary  Everyone logged-in gets access.
	 */
	async getDashboardDisplayDetails(ctxt) {
		const defaultDisplay = await super.getDashboardDisplayDetails(ctxt);

		defaultDisplay['attributes']['name'] = `${ctxt.state.user.first_name} ${ctxt.state.user.last_name}`;
		defaultDisplay['attributes']['description'] = `Edit ${ctxt.state.user.first_name}'s Profile Information`;
		defaultDisplay['attributes']['icon_type'] = 'img';
		defaultDisplay['attributes']['icon_path'] = '/profile/get-image';

		return defaultDisplay;
	}

	/**
	 * @async
	 * @function
	 * @override
	 * @instance
	 * @memberof Profile
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
	 * @memberof Profile
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

exports.feature = Profile;
