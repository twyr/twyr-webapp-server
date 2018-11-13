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
 * @classdesc The Twyr Web Application Server Tenant Administration Groups Main middleware - manages CRUD for tenant groups.
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

			Object.defineProperty(this, '$TenantGroupModel', {
				'__proto__': null,
				'configurable': true,

				'value': dbSrvc.Model.extend({
					'tableName': 'tenant_groups',
					'idAttribute': 'group_id',
					'hasTimestamps': true,

					'tenant': function() {
						return this.belongsTo(self.$TenantModel, 'tenant_id');
					},

					'parent': function() {
						return this.belongsTo(self.$TenantGroupModel, 'parent_group_id');
					},

					'groups': function() {
						return this.hasMany(self.$TenantGroupModel, 'parent_group_id');
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
			delete this.$TenantGroupModel;
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

			await ApiService.add(`${this.name}::getTenantGroupTree`, this._getTenantGroupTree.bind(this));
			await ApiService.add(`${this.name}::getTenantGroup`, this._getTenantGroup.bind(this));
			await ApiService.add(`${this.name}::addTenantGroup`, this._addTenantGroup.bind(this));
			await ApiService.add(`${this.name}::updateTenantGroup`, this._updateTenantGroup.bind(this));
			await ApiService.add(`${this.name}::deleteTenantGroup`, this._deleteTenantGroup.bind(this));

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

			await ApiService.remove(`${this.name}::deleteTenantGroup`, this._deleteTenantGroup.bind(this));
			await ApiService.remove(`${this.name}::updateTenantGroup`, this._updateTenantGroup.bind(this));
			await ApiService.remove(`${this.name}::addTenantGroup`, this._addTenantGroup.bind(this));
			await ApiService.remove(`${this.name}::getTenantGroup`, this._getTenantGroup.bind(this));
			await ApiService.remove(`${this.name}::getTenantGroupTree`, this._getTenantGroupTree.bind(this));

			await super._deregisterApis();
			return null;
		}
		catch(err) {
			throw new TwyrMiddlewareError(`${this.name}::_deregisterApis`, err);
		}
	}
	// #endregion

	// #region API
	async _getTenantGroupTree(ctxt) {
		try {
			const dbSrvc = this.$dependencies.DatabaseService;

			let tenantGroups = null;
			if(ctxt.query.id === '#')
				tenantGroups = await dbSrvc.knex.raw(`SELECT group_id AS id, COALESCE(CAST(parent_group_id AS text), '#') AS parent, display_name AS text FROM tenant_groups WHERE tenant_id = ?`, [ctxt.state.tenant.tenant_id]);
			else
				tenantGroups = await dbSrvc.knex.raw(`SELECT group_id AS id, COALESCE(CAST(parent_group_id AS text), '#') AS parent, display_name AS text FROM tenant_groups WHERE tenant_id = ? AND group_id IN (SELECT group_id FROM fn_get_group_descendants(?) WHERE level >= 2)`, [ctxt.state.tenant.tenant_id, ctxt.query.id]);

			return tenantGroups.rows;
		}
		catch(err) {
			throw new TwyrMiddlewareError(`${this.name}::_getTenantGroupTree`, err);
		}
	}

	async _getTenantGroup(ctxt) {
		try {
			const TenantGroupRecord = new this.$TenantGroupModel({
				'tenant_id': ctxt.state.tenant['tenant_id'],
				'group_id': ctxt.params['tenant_group_id']
			});

			let tenantGroupData = await TenantGroupRecord.fetch({
				'withRelated': (ctxt.query.include && ctxt.query.include.length) ? ctxt.query.include.split(',').map((incl) => { return incl.trim(); }) : ['tenant', 'parent', 'groups']
			});

			tenantGroupData = this.$jsonApiMapper.map(tenantGroupData, 'tenant-administration/group-manager/tenant-group', {
				'typeForModel': {
					'tenant': 'tenant-administration/tenant',
					'parent': 'tenant-administration/group-manager/tenant-group',
					'groups': 'tenant-administration/group-manager/tenant-group'
				},

				'enableLinks': false
			});

			delete tenantGroupData.included;
			return tenantGroupData;
		}
		catch(err) {
			throw new TwyrMiddlewareError(`${this.name}::_getTenantGroup`, err);
		}
	}

	async _addTenantGroup(ctxt) {
		try {
			const tenantGroup = ctxt.request.body;

			const jsonDeserializedData = await this.$jsonApiDeserializer.deserializeAsync(tenantGroup);
			jsonDeserializedData['group_id'] = jsonDeserializedData.id;

			delete jsonDeserializedData.id;
			delete jsonDeserializedData.created_at;
			delete jsonDeserializedData.updated_at;

			Object.keys(tenantGroup.data.relationships || {}).forEach((relationshipName) => {
				if(!tenantGroup.data.relationships[relationshipName].data) {
					delete jsonDeserializedData[relationshipName];
					return;
				}

				if(!tenantGroup.data.relationships[relationshipName].data.id) {
					delete jsonDeserializedData[relationshipName];
					return;
				}

				jsonDeserializedData[`${relationshipName}_id`] = tenantGroup.data.relationships[relationshipName].data.id;
			});

			jsonDeserializedData['parent_group_id'] = jsonDeserializedData['parent_id'];
			delete jsonDeserializedData['parent_id'];

			const savedRecord = await this.$TenantGroupModel
				.forge()
				.save(jsonDeserializedData, {
					'method': 'insert',
					'patch': false
				});

			return {
				'data': {
					'type': tenantGroup.data.type,
					'id': savedRecord.get('group_id')
				}
			};
		}
		catch(err) {
			throw new TwyrMiddlewareError(`${this.name}::_addTenantGroup`, err);
		}
	}

	async _updateTenantGroup(ctxt) {
		try {
			const tenantGroup = ctxt.request.body;

			const jsonDeserializedData = await this.$jsonApiDeserializer.deserializeAsync(tenantGroup);
			jsonDeserializedData['group_id'] = jsonDeserializedData.id;

			Object.keys(tenantGroup.data.relationships || {}).forEach((relationshipName) => {
				if(!tenantGroup.data.relationships[relationshipName].data) {
					delete jsonDeserializedData[relationshipName];
					return;
				}

				if(!tenantGroup.data.relationships[relationshipName].data.id) {
					delete jsonDeserializedData[relationshipName];
					return;
				}

				jsonDeserializedData[`${relationshipName}_id`] = tenantGroup.data.relationships[relationshipName].data.id;
			});

			delete jsonDeserializedData.id;
			delete jsonDeserializedData.created_at;
			delete jsonDeserializedData.updated_at;

			const savedRecord = await this.$TenantGroupModel
				.forge()
				.save(jsonDeserializedData, {
					'method': 'update',
					'patch': true
				});

			return {
				'data': {
					'type': tenantGroup.data.type,
					'id': savedRecord.get('group_id')
				}
			};
		}
		catch(err) {
			throw new TwyrMiddlewareError(`${this.name}::_updateTenantGroup`, err);
		}
	}

	async _deleteTenantGroup(ctxt) {
		try {
			const tenantGroup = await new this.$TenantGroupModel({
				'tenant_id': ctxt.state.tenant['tenant_id'],
				'group_id': ctxt.params['tenant_group_id']
			})
			.fetch();

			if(!tenantGroup) throw new Error('Unknown Tenant Group');
			if(tenantGroup.get('default_for_new_user')) throw new Error('Cannot delete default group');

			await tenantGroup.destroy();
			return null;
		}
		catch(err) {
			throw new TwyrMiddlewareError(`${this.name}::_deleteTenantGroup`, err);
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
