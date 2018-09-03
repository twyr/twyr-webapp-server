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
 * @class   BhairaviTemplate
 * @extends {TwyrBaseTemplate}
 * @classdesc The Twyr Web Application Server Default Template class.
 *
 * @description
 * Renders the index file of the tenant's default template.
 *
 */
class BhairaviTemplate extends TwyrBaseTemplate {
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
	 * @memberof BhairaviTemplate
	 * @name     _addRoutes
	 *
	 * @returns  {undefined} Nothing.
	 *
	 * @summary  Adds routes to the Koa Router.
	 */
	async _addRoutes() {
		await super._addRoutes();

		const path = require('path');

		const serveStatic = require('koa-static');

		const dirPath = path.join(path.dirname(path.dirname(require.main.filename)), 'node_modules/ember-source/dist');
		this.$router.use(serveStatic(dirPath));

		this.$router.get('*', async (ctxt, next) => {
			try {
				const tenantTemplatePath = path.dirname(path.join(ctxt.state.tenant['template']['tenant_domain'], ctxt.state.tenant['template']['tmpl_name'], ctxt.state.tenant['template']['path_to_index']));
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
				await this._serveTenantTemplate(ctxt, next);
			}
			catch(err) {
				console.error(`${err.message}\n${err.stack}`);
				throw err;
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

exports.template = BhairaviTemplate;
