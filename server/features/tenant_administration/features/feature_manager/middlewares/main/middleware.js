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

			Object.defineProperty(this, '$TenantModel', {
				'__proto__': null,
				'configurable': true,

				'value': dbSrvc.Model.extend({
					'tableName': 'tenants',
					'idAttribute': 'tenant_id',
					'hasTimestamps': true,

					'features': function() {
						return this.hasMany(self.$TenantFeatureModel, 'tenant_id');
					}
				})
			});

			Object.defineProperty(this, '$TenantFeatureModel', {
				'__proto__': null,
				'configurable': true,

				'value': dbSrvc.Model.extend({
					'tableName': 'tenants_features',
					'idAttribute': 'tenant_feature_id',
					'hasTimestamps': true,

					'tenant': function() {
						return this.belongsTo(self.$TenantModel, 'tenant_id');
					},

					'feature': function() {
						return this.belongsTo(self.$FeatureModel, 'module_id');
					}
				})
			});

			Object.defineProperty(this, '$FeatureModel', {
				'__proto__': null,
				'configurable': true,

				'value': dbSrvc.Model.extend({
					'tableName': 'modules',
					'idAttribute': 'module_id',
					'hasTimestamps': true
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
			delete this.$FeatureModel;
			delete this.$TenantFeatureModel;
			delete this.$TenantModel;

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

			await ApiService.add(`${this.name}::getTenantFeatureTree`, this._getTenantFeatureTree.bind(this));
			await ApiService.add(`${this.name}::getAllTenantFeatures`, this._getAllTenantFeatures.bind(this));

			await ApiService.add(`${this.name}::getTenantFeature`, this._getTenantFeature.bind(this));
			await ApiService.add(`${this.name}::addTenantFeature`, this._addTenantFeature.bind(this));
			await ApiService.add(`${this.name}::deleteTenantFeature`, this._deleteTenantFeature.bind(this));

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

			await ApiService.remove(`${this.name}::deleteTenantFeature`, this._deleteTenantFeature.bind(this));
			await ApiService.remove(`${this.name}::addTenantFeature`, this._addTenantFeature.bind(this));
			await ApiService.remove(`${this.name}::getTenantFeature`, this._getTenantFeature.bind(this));

			await ApiService.remove(`${this.name}::getAllTenantFeatures`, this._getAllTenantFeatures.bind(this));
			await ApiService.remove(`${this.name}::getTenantFeatureTree`, this._getTenantFeatureTree.bind(this));

			await super._deregisterApis();
			return null;
		}
		catch(err) {
			throw new TwyrMiddlewareError(`${this.name}::_deregisterApis`, err);
		}
	}
	// #endregion

	// #region API
	async _getTenantFeatureTree(ctxt) {
		try {
			let serverModule = this.$parent;
			while(serverModule.$parent) serverModule = serverModule.$parent;

			const configSrvc = this.$dependencies.ConfigurationService;
			const serverModuleId = await configSrvc.getModuleID(serverModule);

			const dbSrvc = this.$dependencies.DatabaseService;
			const tenantFeatures = await dbSrvc.knex.raw(`SELECT module_id AS id, COALESCE(CAST(parent_module_id AS text), '#') AS parent, display_name AS text FROM modules WHERE module_id IN (SELECT module_id FROM fn_get_module_descendants(?) WHERE (type = 'server' OR type = 'feature') AND module_id IN (SELECT module_id FROM tenants_features WHERE tenant_id = ?))`, [serverModuleId, ctxt.state.tenant.tenant_id]);

			return tenantFeatures.rows;
		}
		catch(err) {
			throw new TwyrMiddlewareError(`${this.name}::_getTenantFeatureTree`, err);
		}
	}

	async _getAllTenantFeatures(ctxt) {
		try {
			let tenantFeatureData = await this.$TenantFeatureModel
			.query(function(qb) {
				qb.where({ 'tenant_id': ctxt.state.tenant.tenant_id });
			})
			.fetchAll({
				'withRelated': ['tenant', 'feature']
			});

			tenantFeatureData = this.$jsonApiMapper.map(tenantFeatureData, 'tenant-administration/feature-manager/tenant-feature', {
				'typeForModel': {
					'tenant': 'tenant-administration/tenant',
					'feature': 'server-administration/feature'
				},

				'enableLinks': false
			});

			delete tenantFeatureData.included;
			return tenantFeatureData;
		}
		catch(err) {
			throw new TwyrMiddlewareError(`${this.name}::_getAllTenantFeatures`, err);
		}
	}

	async _getTenantFeature(ctxt) {
		try {
			const TenantFeatureRecord = new this.$TenantFeatureModel({
				'tenant_id': ctxt.state.tenant['tenant_id'],
				'tenant_feature_id': ctxt.params['tenant_feature_id']
			});

			let tenantFeatureData = await TenantFeatureRecord.fetch({
				'withRelated': ['tenant', 'feature']
			});

			tenantFeatureData = this.$jsonApiMapper.map(tenantFeatureData, 'tenant-administration/feature-manager/tenant-feature', {
				'typeForModel': {
					'tenant': 'tenant-administration/tenant',
					'feature': 'server-administration/feature'
				},

				'enableLinks': false
			});

			delete tenantFeatureData.included;
			return tenantFeatureData;
		}
		catch(err) {
			throw new TwyrMiddlewareError(`${this.name}::_getTenantFeature`, err);
		}
	}

	async _addTenantFeature(ctxt) {
		try {
			const tenantFeature = ctxt.request.body;

			const jsonDeserializedData = await this.$jsonApiDeserializer.deserializeAsync(tenantFeature);
			jsonDeserializedData['tenant_feature_id'] = jsonDeserializedData.id;

			Object.keys(tenantFeature.data.relationships || {}).forEach((relationshipName) => {
				if(!tenantFeature.data.relationships[relationshipName].data) {
					delete jsonDeserializedData[relationshipName];
					return;
				}

				if(!tenantFeature.data.relationships[relationshipName].data.id) {
					delete jsonDeserializedData[relationshipName];
					return;
				}

				jsonDeserializedData[`${relationshipName}_id`] = tenantFeature.data.relationships[relationshipName].data.id;
			});

			jsonDeserializedData['module_id'] = jsonDeserializedData['feature_id'];

			delete jsonDeserializedData.id;
			delete jsonDeserializedData.feature_id;
			delete jsonDeserializedData.created_at;
			delete jsonDeserializedData.updated_at;

			const savedRecord = await this.$TenantFeatureModel
				.forge()
				.save(jsonDeserializedData, {
					'method': 'insert',
					'patch': false
				});

			return {
				'data': {
					'type': tenantFeature.data.type,
					'id': savedRecord.get('tenant_feature_id')
				}
			};
		}
		catch(err) {
			throw new TwyrMiddlewareError(`${this.name}::_addTenantFeature`, err);
		}
	}

	async _deleteTenantFeature(ctxt) {
		try {
			await new this.$TenantFeatureModel({
				'tenant_feature_id': ctxt.params['tenant_feature_id']
			})
			.destroy({
				'require': false
			});

			return null;
		}
		catch(err) {
			throw new TwyrMiddlewareError(`${this.name}::_deleteTenantFeature`, err);
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
