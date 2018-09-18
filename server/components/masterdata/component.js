'use strict';

/**
 * Module dependencies, required for ALL Twyr' modules
 * @ignore
 */

/**
 * Module dependencies, required for this module
 * @ignore
 */
const TwyrBaseComponent = require('twyr-base-component').TwyrBaseComponent;
const TwyrCompError = require('twyr-component-error').TwyrComponentError;

/**
 * @class   Masterdata
 * @extends {TwyrBaseComponent}
 * @classdesc The Twyr Web Application Server Masterdata component - exposes a read-only view of the master data in Twyr.
 *
 *
 */
class Masterdata extends TwyrBaseComponent {
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
	 * @memberof Masterdata
	 * @name     _addRoutes
	 *
	 * @returns  {undefined} Nothing.
	 *
	 * @summary  Adds routes to the Koa Router.
	 */
	async _addRoutes() {
		try {
			this.$router.get('/contactTypes', this._getContactTypes.bind(this));

			await super._addRoutes();
			return null;
		}
		catch(err) {
			throw new TwyrCompError(`${this.name}::_addRoutes error`, err);
		}
	}
	// #endregion

	// #region Route Handlers
	async _getContactTypes(ctxt) {
		if(!ctxt.state.user) throw new Error('This information is available only to logged-in Users');

		const dbSrvc = this.$dependencies.DatabaseService;
		const contactTypes = await dbSrvc.knex.raw('SELECT unnest(enum_range(NULL::contact_type)) AS contact_types');

		const responseData = [];
		contactTypes.rows.forEach((contactTypeData) => {
			responseData.push(contactTypeData.contact_types);
		});

		ctxt.status = 200;
		ctxt.body = responseData;
	}
	// #endregion

	// #region Properties
	/**
	 * @override
	 */
	get dependencies() {
		return ['DatabaseService'].concat(super.dependencies);
	}

	/**
	 * @override
	 */
	get basePath() {
		return __dirname;
	}
	// #endregion
}

exports.component = Masterdata;
