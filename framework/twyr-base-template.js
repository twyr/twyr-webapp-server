'use strict';

/**
 * Module dependencies, required for ALL PlantWorks modules
 * @ignore
 */

/**
 * Module dependencies, required for this module
 * @ignore
 */
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
			const renderConfig = Object.assign({}, ctxt.state.tenant['template']['base_template_configuration'], ctxt.state.tenant['template']['configuration']);
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
		return ['ConfigurationService', 'LoggerService'].concat(super.dependencies);
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
