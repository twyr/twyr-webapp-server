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
 * @class   ConfigurationService
 * @extends {TwyrBaseService}
 * @classdesc The Twyr Web Application Server Configuration Service.
 *
 * @description
 * Serves as the "single source of truth" for configuration related operations across the rest of the codebase.
 *
 */
class ConfigurationService extends TwyrBaseService {
	// #region Constructor
	constructor(parent, loader) {
		super(parent, loader);
	}
	// #endregion

	// #region API
	async loadConfiguration(twyrModule) {
		return { 'state': !!twyrModule };
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

exports.service = ConfigurationService;
