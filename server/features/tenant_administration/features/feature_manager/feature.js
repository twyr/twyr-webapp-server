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
// const TwyrFeatureError = require('twyr-feature-error').TwyrFeatureError;

/**
 * @class   FeatureManager
 * @extends {TwyrBaseFeature}
 * @classdesc The Twyr Web Application Server FeatureManager feature - manages tenant feature selection.
 *
 *
 */
class FeatureManager extends TwyrBaseFeature {
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

exports.feature = FeatureManager;
