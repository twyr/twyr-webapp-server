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
	 * @instance
	 * @memberof Profile
	 * @name     _doesUserHavePermission
	 *
	 * @param    {Object} ctxt - Koa context.
	 * @param    {callback} next - Callback to pass the request on to the next route in the chain.
	 *
	 * @returns  {undefined} Nothing.
	 *
	 * @summary  Derived classes should call next, or throw a {TwyrFeatureError} - depending on whether the user has the required permission(s).
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
	 * @instance
	 * @memberof Profile
	 * @name     _canUserAccessThisResource
	 *
	 * @param    {Object} ctxt - Koa context.
	 * @param    {callback} next - Callback to pass the request on to the next route in the chain.
	 *
	 * @returns  {undefined} Nothing.
	 *
	 * @summary  Derived classes should call next, or throw a {TwyrFeatureError} - depending on whether the user can access this particular resource.
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
	get dependencies() {
		return ['DatabaseService'].concat(super.dependencies);
	}

	/**
	 * @override
	 */
	get basePath() {
		return __dirname;
	}
	// #endregion
}

exports.feature = Profile;
