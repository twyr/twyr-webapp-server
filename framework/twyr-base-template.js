/* eslint-disable security/detect-object-injection */
'use strict';

/**
 * Module dependencies, required for ALL Twy'r modules
 * @ignore
 */

/**
 * Module dependencies, required for this module
 * @ignore
 */
const inflection = require('inflection');

const TwyrBaseModule = require('./twyr-base-module').TwyrBaseModule;
const TwyrTmplError = require('twyr-template-error').TwyrTemplateError;

/**
 * @class   TwyrBaseTemplate
 * @extends {TwyrBaseModule}
 * @classdesc The Twyr Web Application Server Base Class for all Templates.
 *
 * @param   {TwyrBaseModule} [parent] - The parent module, if any.
 * @param   {TwyrModuleLoader} [loader] - The loader to be used for managing modules' lifecycle, if any.
 *
 * @description
 * Serves as the "base class" for all other services in the Twyr Web Application Server.
 *
 */
class TwyrBaseTemplate extends TwyrBaseModule {
	// #region Constructor
	constructor(parent, loader) {
		super(parent, null);

		const TwyrTmplLoader = require('./twyr-template-loader').TwyrTemplateLoader;
		this.$loader = (loader instanceof TwyrTmplLoader) ? loader : new TwyrTmplLoader(this);

		const Router = require('koa-router');
		this.$router = new Router();
	}
	// #endregion

	// #region Lifecycle hooks
	/**
	 * @async
	 * @function
	 * @override
	 * @instance
	 * @memberof TwyrBaseTemplate
	 * @name     _setup
	 *
	 * @returns  {undefined} Nothing.
	 *
	 * @summary  Adds the Koa Router routes.
	 */
	async _setup() {
		try {
			await super._setup();
			await this._addRoutes();

			return null;
		}
		catch(err) {
			throw new TwyrTmplError(`${this.name}::_setup error`, err);
		}
	}

	/**
	 * @async
	 * @function
	 * @override
	 * @instance
	 * @memberof TwyrBaseTemplate
	 * @name     _teardown
	 *
	 * @returns  {undefined} Nothing.
	 *
	 * @summary  Destroys the Koa Router routes.
	 */
	async _teardown() {
		try {
			await this._deleteRoutes();
			await super._teardown();

			return null;
		}
		catch(err) {
			throw new TwyrTmplError(`${this.name}::_teardown error`, err);
		}
	}
	// #endregion

	// #region Protected methods - need to be overriden by derived classes
	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof TwyrBaseTemplate
	 * @name     _addRoutes
	 *
	 * @returns  {undefined} Nothing.
	 *
	 * @summary  Adds routes to the Koa Router.
	 */
	async _addRoutes() {
		return null;
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof TwyrBaseTemplate
	 * @name     _deleteRoutes
	 *
	 * @returns  {undefined} Nothing.
	 *
	 * @summary  Removes all the routes from the Koa Router.
	 */
	async _deleteRoutes() {
		// NOTICE: Undocumented koa-router data structure.
		// Be careful upgrading :-)
		if(this.$router) this.$router.stack.length = 0;
		return null;
	}
	// #endregion

	// #region The main render method
	async _serveTenantTemplate(ctxt, next) {
		if(ctxt.state.tenant['template']['base_template'] !== this.name) {
			await next();
			return;
		}

		try {
			const clientsideAssets = await this._getClientsideAssets(ctxt);

			const renderConfig = Object.assign({}, ctxt.state.tenant['template']['base_template_configuration'], ctxt.state.tenant['template']['configuration'], clientsideAssets);
			renderConfig['developmentMode'] = (twyrEnv === 'development') || (twyrEnv === 'test');

			const ejs = require('ejs');
			const path = require('path');

			const tmplPath = path.join(path.dirname(__dirname), 'tenant_templates', ctxt.state.tenant['template']['tenant_domain'], ctxt.state.tenant['template']['tmpl_name'], ctxt.state.tenant['template']['path_to_index']);
			const indexHTML = await ejs.renderFile(tmplPath, renderConfig, { 'async': true });

			ctxt.status = 200;
			ctxt.type = 'text/html';
			ctxt.body = indexHTML;
		}
		catch(err) {
			const error = new TwyrTmplError(`${this.name}::_serveTenantTemplate error`, err);
			throw error;
		}
	}
	// #endregion

	// #region Private Methods
	async _getClientsideAssets(ctxt) {
		let server = this.$parent;
		while(server.$parent) server = server.$parent;

		const featureNames = Object.keys(ctxt.state.tenant.features || {});
		const clientsideAssets = {
			'RouteMap': {
				'index': {
					'path': '/',
					'routes': {}
				}
			}
		};

		for(let idx = 0; idx < featureNames.length; idx++) {
			const featureName = featureNames[idx];
			const feature = server.$features[featureName];

			const featureClientsideAssets = await feature.getClientsideAssets(ctxt, ctxt.state.tenant.features[featureName]);
			if(!featureClientsideAssets) continue;

			Object.keys(featureClientsideAssets).forEach((featureClientsideAssetName) => {
				if(featureClientsideAssetName === 'RouteMap') {
					const inflectedFeatureName = inflection.transform(featureName, ['foreign_key', 'dasherize']).replace('-id', '');
					clientsideAssets['RouteMap'][inflectedFeatureName] = {
						'path': `/${inflectedFeatureName}`,
						'routes': featureClientsideAssets['RouteMap']
					};

					return;
				}

				if(!clientsideAssets[featureClientsideAssetName]) clientsideAssets[featureClientsideAssetName] = [];
				clientsideAssets[featureClientsideAssetName].push(featureClientsideAssets[featureClientsideAssetName]);
			});
		}

		Object.keys(clientsideAssets).forEach((clientsideAssetName) => {
			if(clientsideAssetName === 'RouteMap') return;
			clientsideAssets[clientsideAssetName] = clientsideAssets[clientsideAssetName].join('\n');
		});

		// Just for kicks - to make it look good when someone views the HTML in the Browser Developer tools.
		clientsideAssets['RouteMap'] = this._generateEmberRouteMap(clientsideAssets['RouteMap']).replace(/\n/g, '\n\t\t\t\t');
		return clientsideAssets;
	}

	_generateEmberRouteMap(featureRoutes) {
		let routeStr = '';
		const routeNames = Object.keys(featureRoutes);
		const indexSubRoute = routeNames.indexOf('index');
		if(indexSubRoute >= 0) routeNames.splice(indexSubRoute, 1);

		routeNames.forEach((routeName, idx) => {
			let thisFeatureRouteMap = idx ? '\n' : '';
			thisFeatureRouteMap += `this.route('${routeName}', { 'path': '${featureRoutes[routeName]['path']}' }`;

			const subRoutes = Object.keys(featureRoutes[routeName]['routes']);
			const subIndexSubRoute = subRoutes.indexOf('index');
			if(subIndexSubRoute >= 0) subRoutes.splice(subIndexSubRoute, 1);

			if(subRoutes.length) {
				thisFeatureRouteMap += ', function() {\n\t';
				thisFeatureRouteMap += this._generateEmberRouteMap(featureRoutes[routeName]['routes']).replace(/\n/g, '\t');
				thisFeatureRouteMap += '\n});\n';
			}
			else {
				thisFeatureRouteMap += `);`;
			}

			routeStr += thisFeatureRouteMap;
		});

		return routeStr;
	}
	// #endregion

	// #region Properties
	/**
	 * @member   {Object} Router
	 * @override
	 * @instance
	 * @memberof TwyrBaseTemplate
	 *
	 * @readonly
	 */
	get Router() {
		return this.$router;
	}

	/**
	 * @override
	 */
	get dependencies() {
		return ['ConfigurationService', 'LoggerService', 'WebserverService'].concat(super.dependencies);
	}

	/**
	 * @override
	 */
	get basePath() {
		return __dirname;
	}
	// #endregion
}

exports.TwyrBaseTemplate = TwyrBaseTemplate;
