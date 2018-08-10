'use strict';

/**
 * Module dependencies, required for ALL Twyr' modules
 * @ignore
 */

/**
 * Module dependencies, required for this module
 * @ignore
 */
const TwyrBaseTemplate = require('twyr-base-template').TwyrBaseTemplate;
// const TwyrTmplError = require('twyr-template-error').TwyrTemplateError;

/**
 * @class   DefaultTemplate
 * @extends {TwyrBaseTemplate}
 * @classdesc The Twyr Web Application Server Default Template class.
 *
 * @description
 * Renders the index file of the tenant's default template.
 *
 */
class DefaultTemplate extends TwyrBaseTemplate {
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
	 * @memberof DefaultTemplate
	 * @name     _addRoutes
	 *
	 * @returns  {undefined} Nothing.
	 *
	 * @summary  Adds routes to the Koa Router.
	 */
	async _addRoutes() {
		super._addRoutes();

		const path = require('path');
		const serveStatic = require('koa-static');

		this.$router.get('*', async (ctxt, next) => {
			try {
				const tenantTemplatePath = path.dirname(path.join(ctxt.state.tenant['tenant_template']['tenant_domain'], ctxt.state.tenant['tenant_template']['tmpl_name'], ctxt.state.tenant['tenant_template']['path_to_index']));
				const tmplStaticAssetPath = path.join(path.dirname(path.dirname(require.main.filename)), 'tenant_templates', tenantTemplatePath);

				await serveStatic(tmplStaticAssetPath)(ctxt, next);
			}
			catch(err) {
				console.error(`${err.message}\n${err.stack}`);
				await next();
			}
		});

		this.$router.get('/', async (ctxt, next) => {
			try {
				await this._serveTenantTemplate(ctxt);
			}
			catch(err) {
				console.error(`${err.message}\n${err.stack}`);
				await next();
			}
		});

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

exports.template = DefaultTemplate;
