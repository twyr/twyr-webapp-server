'use strict';

/**
 * Module dependencies, required for ALL Twyr modules
 * @ignore
 */

/**
 * Module dependencies, required for this module
 * @ignore
 */
const TwyrBaseModule = require('./twyr-base-module').TwyrBaseModule;

/**
 * @class   TwyrBaseService
 * @extends {TwyrBaseModule}
 * @classdesc The Twyr Web Application Server Base Class for all Services.
 *
 * @param   {TwyrBaseModule} [parent] - The parent module, if any.
 * @param   {TwyrModuleLoader} [loader] - The loader to be used for managing modules' lifecycle, if any.
 *
 * @description
 * Serves as the "base class" for all other services in the Twyr Web Application Server.
 *
 */
class TwyrBaseService extends TwyrBaseModule {
	// #region Constructor
	constructor(parent, loader) {
		super(parent, null);

		const TwyrSrvcLoader = require('./twyr-service-loader').TwyrServiceLoader;
		const actualLoader = (loader instanceof TwyrSrvcLoader) ? loader : new TwyrSrvcLoader(this);

		this.$loader = actualLoader;
	}
	// #endregion

	// #region Properties
	/**
	 * @member   {Object} Interface
	 * @instance
	 * @memberof TwyrBaseService
	 *
	 * @readonly
	 */
	get Interface() {
		return this;
	}

	/**
	 * @override
	 */
	get basePath() {
		return __dirname;
	}
	// #endregion
}

exports.TwyrBaseService = TwyrBaseService;
