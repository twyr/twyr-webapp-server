/* eslint-disable security/detect-object-injection */

'use strict';

/**
 * Module dependencies, required for ALL Twyr' modules
 * @ignore
 */

/**
 * Module dependencies, required for this module
 * @ignore
 */
const TwyrBaseMiddleware = require('twyr-base-middleware').TwyrBaseMiddleware;
const TwyrMiddlewareError = require('twyr-middleware-error').TwyrMiddlewareError;

/**
 * @class   Main
 * @extends {TwyrBaseMiddleware}
 * @classdesc The Twyr Web Application Server Profile Feature Main middleware - manages CRUD for profile data.
 *
 *
 */
class Main extends TwyrBaseMiddleware {
	// #region Constructor
	constructor(parent, loader) {
		super(parent, loader);
	}
	// #endregion

	// #region Protected methods
	async _registerApis() {
		try {
			const ApiService = this.$dependencies.ApiService;

			await ApiService.add(`${this.name}::getFeatures`, this._getFeatures.bind(this));
			await super._registerApis();

			return null;
		}
		catch(err) {
			throw new TwyrMiddlewareError(`${this.name}::_registerApis`, err);
		}
	}

	async _deregisterApis() {
		try {
			const ApiService = this.$dependencies.ApiService;

			await ApiService.remove(`${this.name}::getFeatures`, this._getFeatures.bind(this));
			await super._deregisterApis();

			return null;
		}
		catch(err) {
			throw new TwyrMiddlewareError(`${this.name}::_deregisterApis`, err);
		}
	}
	// #endregion

	// #region API
	async _getFeatures(ctxt) {
		try {
			let serverModule = this.$parent;
			while(serverModule.$parent) serverModule = serverModule.$parent;

			const serverFeatureNames = Object.keys(serverModule.$features || {});
			const validFeatures = [];

			for(let idx = 0; idx < serverFeatureNames.length; idx++) {
				const featureModule = serverModule.$features[(serverFeatureNames[idx])];

				const dashboardDisplayDetails = await featureModule.getDashboardDisplayDetails(ctxt);
				if(!dashboardDisplayDetails) continue;

				validFeatures.push(dashboardDisplayDetails);
			}

			validFeatures.sort((left, right) => {
				if(left.name < right.name) return -1;
				if(left.name > right.name) return 1;

				return 0;
			});

			if(ctxt.state.user.tenantAttributes['default_route'] !== 'dashboard') { // eslint-disable-line curly
				validFeatures.unshift({
					'id': 'home',
					'type': 'dashboard/feature',

					'attributes': {
						'name': 'home',
						'type': 'feature',
						'route': ctxt.state.user.tenantAttributes['default_route'],
						'description': 'Home',

						'icon_type': 'fa', // Other choices are md, mdi, img, custom
						'icon_path': 'home'
					}
				});
			}

			return { 'data': validFeatures };
		}
		catch(err) {
			throw new TwyrMiddlewareError(`${this.name}::_getFeatures`, err);
		}
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

exports.middleware = Main;
