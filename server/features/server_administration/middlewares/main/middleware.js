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
 * @classdesc The Twyr Web Application Server Tenant Administration Feature Main middleware - manages CRUD for account data.
 *
 *
 */
class Main extends TwyrBaseMiddleware {
	// #region Constructor
	constructor(parent, loader) {
		super(parent, loader);
	}
	// #endregion

	// #region startup/teardown code
	/**
	 * @async
	 * @function
	 * @override
	 * @instance
	 * @memberof ApiService
	 * @name     _setup
	 *
	 * @returns  {null} Nothing.
	 *
	 * @summary  Sets up the broker to manage API exposed by other modules.
	 */
	async _setup() {
		try {
			await super._setup();

			const dbSrvc = this.$dependencies.DatabaseService;
			const self = this; // eslint-disable-line consistent-this

			Object.defineProperty(this, '$ModuleModel', {
				'__proto__': null,
				'configurable': true,

				'value': dbSrvc.Model.extend({
					'tableName': 'modules',
					'idAttribute': 'module_id',
					'hasTimestamps': true,

					'parent': function() {
						return this.belongsTo(self.$ModuleModel, 'parent_module_id');
					},

					'modules': function() {
						return this.hasMany(self.$ModuleModel, 'parent_module_id');
					},

					'permissions': function() {
						return this.hasMany(self.$FeaturePermissionModel, 'module_id');
					}
				})
			});

			Object.defineProperty(this, '$FeaturePermissionModel', {
				'__proto__': null,
				'configurable': true,

				'value': dbSrvc.Model.extend({
					'tableName': 'feature_permissions',
					'idAttribute': 'feature_permission_id',
					'hasTimestamps': true,

					'module': function() {
						return this.belongsTo(self.$ModuleModel, 'module_id');
					}
				})
			});

			return null;
		}
		catch(err) {
			throw new TwyrMiddlewareError(`${this.name}::_setup error`, err);
		}
	}

	/**
	 * @async
	 * @function
	 * @override
	 * @instance
	 * @memberof ApiService
	 * @name     _teardown
	 *
	 * @returns  {undefined} Nothing.
	 *
	 * @summary  Deletes the broker that manages API.
	 */
	async _teardown() {
		try {
			delete this.$FeaturePermissionModel;
			delete this.$ModuleModel;

			await super._teardown();
			return null;
		}
		catch(err) {
			throw new TwyrMiddlewareError(`${this.name}::_teardown error`, err);
		}
	}
	// #endregion

	// #region Protected methods
	async _registerApis() {
		try {
			const ApiService = this.$dependencies.ApiService;

			await ApiService.add(`${this.name}::getModuleTree`, this._getModuleTree.bind(this));
			await ApiService.add(`${this.name}::getModule`, this._getModule.bind(this));

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

			await ApiService.remove(`${this.name}::getModule`, this._getModule.bind(this));
			await ApiService.remove(`${this.name}::getModuleTree`, this._getModuleTree.bind(this));

			await super._deregisterApis();
			return null;
		}
		catch(err) {
			throw new TwyrMiddlewareError(`${this.name}::_deregisterApis`, err);
		}
	}
	// #endregion

	// #region API
	async _getModuleTree(ctxt) {
		try {
			let serverModule = this.$parent;
			while(serverModule.$parent) serverModule = serverModule.$parent;

			const configSrvc = this.$dependencies.ConfigurationService;
			const serverModuleId = await configSrvc.getModuleID(serverModule);

			let query = `SELECT module_id AS id, COALESCE(CAST(parent_module_id AS text), '#') AS parent, display_name AS text FROM modules WHERE module_id IN (SELECT module_id FROM fn_get_module_descendants(?) WHERE (type = 'server' OR type = 'feature'))`;
			if(ctxt.state.tenant['sub_domain'] !== 'www') query += ` AND deploy <> 'admin'`;

			const dbSrvc = this.$dependencies.DatabaseService;
			const serverFeatures = await dbSrvc.knex.raw(query, [serverModuleId]);

			return serverFeatures.rows;
		}
		catch(err) {
			throw new TwyrMiddlewareError(`${this.name}::_getModuleTree`, err);
		}
	}

	async _getModule(ctxt) {
		try {
			const ModuleRecord = new this.$ModuleModel({
				'module_id': ctxt.params.feature_id
			});

			let moduleData = await ModuleRecord.fetch({
				'withRelated': ['parent', 'permissions', 'modules']
			});

			moduleData = this.$jsonApiMapper.map(moduleData, 'server_administration/features', {
				'typeForModel': {
					'parent': 'server_administration/features',
					'modules': 'server_administration/features',
					'permissions': 'server_administration/feature_permissions'
				},

				'enableLinks': false
			});

			moduleData.included = moduleData.included.filter((inclData) => {
				return inclData['type'] === 'server_administration/feature_permissions';
			});

			moduleData.data.relationships.features = JSON.parse(JSON.stringify(moduleData.data.relationships.modules));
			return moduleData;
		}
		catch(err) {
			throw new TwyrMiddlewareError(`${this.name}::_getModule`, err);
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
