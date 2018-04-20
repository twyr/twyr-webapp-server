'use strict';

/**
 * Module dependencies, required for ALL Twyr' modules
 * @ignore
 */

/**
 * Module dependencies, required for this module
 * @ignore
 */
const TwyrBaseService = require('./../../twyr-base-service').TwyrBaseService;

/**
 * @class   CacheService
 * @extends {TwyrBaseService}
 * @classdesc The Twyr Web Application Server Cache Service.
 *
 * @description
 * Allows the rest of the Twyr Modules to store / retrieve data in the cache.
 *
 */
class CacheService extends TwyrBaseService {
	// #region Constructor
	constructor(parent, loader) {
		super(parent, loader);
	}
	// #endregion

	// #region Properties
	/**
	 * @override
	 */
	get dependencies() {
		return ['ConfigurationService'].concat(super.dependencies || []);
	}

	/**
	 * @override
	 */
	get basePath() {
		return __dirname;
	}
	// #endregion
}

exports.service = CacheService;
