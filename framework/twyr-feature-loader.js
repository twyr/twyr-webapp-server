'use strict';

/**
 * Module dependencies, required for ALL Twyr modules
 * @ignore
 */

/**
 * Module dependencies, required for this module
 * @ignore
 */
const TwyrModuleLoader = require('./twyr-module-loader').TwyrModuleLoader;

/**
 * @class   TwyrFeatureLoader
 * @extends {TwyrModuleLoader}
 * @classdesc The Twyr Server Base Class for all Feature Loaders.
 *
 * @param   {TwyrBaseModule} [twyrModule] - The parent module, if any.
 *
 * @description
 * Serves as the "base class" for all other feature loaders in the Twyr Web Application Server.
 *
 * Responsible for invoking the standard "lifecycle" hooks on sub-modules of this module, if any - see {@link TwyrBaseModule#load},
 * {@link TwyrBaseModule#initialize}, {@link TwyrBaseModule#start}, {@link TwyrBaseModule#stop}, {@link TwyrBaseModule#uninitialize},
 * and {@link TwyrBaseModule#unload}.
 *
 */
class TwyrFeatureLoader extends TwyrModuleLoader {
	// #region Constructor
	constructor(twyrModule) {
		super(twyrModule);
	}
	// #endregion
}

exports.TwyrFeatureLoader = TwyrFeatureLoader;
