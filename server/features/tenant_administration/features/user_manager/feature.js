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
 * @class   UserManager
 * @extends {TwyrBaseFeature}
 * @classdesc The Twyr Web Application Server UserManager feature - manages tenant feature selection.
 *
 *
 */
class UserManager extends TwyrBaseFeature {
	// #region Constructor
	constructor(parent, loader) {
		super(parent, loader);
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

exports.feature = UserManager;
