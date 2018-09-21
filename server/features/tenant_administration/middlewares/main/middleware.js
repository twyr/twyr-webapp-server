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

					'location': function() {
						return this.hasOne(self.$TenantLocationModel, 'tenant_id');
					}
				})
			});

			Object.defineProperty(this, '$TenantLocationModel', {
				'__proto__': null,
				'configurable': true,

				'value': dbSrvc.Model.extend({
					'tableName': 'tenant_locations',
					'idAttribute': 'tenant_location_id',
					'hasTimestamps': true,

					'tenant': function() {
						return this.belongsTo(self.$TenantModel, 'tenant_id');
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
			delete this.$TenantLocationModel;
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

			await ApiService.add(`${this.name}::getTenant`, this._getTenant.bind(this));
			await ApiService.add(`${this.name}::updateTenant`, this._updateTenant.bind(this));
			await ApiService.add(`${this.name}::deleteTenant`, this._deleteTenant.bind(this));

			await ApiService.add(`${this.name}::getLocation`, this._getLocation.bind(this));
			await ApiService.add(`${this.name}::addLocation`, this._addLocation.bind(this));
			await ApiService.add(`${this.name}::deleteLocation`, this._deleteLocation.bind(this));

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

			await ApiService.remove(`${this.name}::deleteLocation`, this._deleteLocation.bind(this));
			await ApiService.remove(`${this.name}::addLocation`, this._addLocation.bind(this));
			await ApiService.remove(`${this.name}::getLocation`, this._getLocation.bind(this));

			await ApiService.remove(`${this.name}::deleteTenant`, this._deleteTenant.bind(this));
			await ApiService.remove(`${this.name}::updateTenant`, this._updateTenant.bind(this));
			await ApiService.remove(`${this.name}::getTenant`, this._getTenant.bind(this));

			await super._deregisterApis();
			return null;
		}
		catch(err) {
			throw new TwyrMiddlewareError(`${this.name}::_deregisterApis`, err);
		}
	}
	// #endregion

	// #region API
	async _getTenant(ctxt) {
		try {
			const TenantRecord = new this.$TenantModel({
				'tenant_id': ctxt.state.tenant.tenant_id
			});

			let tenantData = await TenantRecord.fetch({
				'withRelated': [{
					[ctxt.query.include]: function(qb) {
						qb.where('is_primary', true);
					}
				}]
			});

			tenantData = this.$jsonApiMapper.map(tenantData, 'tenant-administration/tenants', {
				'typeForModel': {
					'location': 'tenant-administration/tenant_locations'
				},

				'enableLinks': false
			});

			return tenantData;
		}
		catch(err) {
			throw new TwyrMiddlewareError(`${this.name}::_getTenant`, err);
		}
	}

	async _updateTenant(ctxt) {
		try {
			const tenant = ctxt.request.body;

			delete tenant.data.relationships;
			delete tenant.included;

			const jsonDeserializedData = await this.$jsonApiDeserializer.deserializeAsync(tenant);
			jsonDeserializedData['tenant_id'] = jsonDeserializedData['id'];

			delete jsonDeserializedData.id;
			delete jsonDeserializedData.created_at;
			delete jsonDeserializedData.updated_at;

			const savedRecord = await this.$TenantModel
				.forge()
				.save(jsonDeserializedData, {
					'method': 'update',
					'patch': true
				});

			return {
				'data': {
					'type': tenant.data.type,
					'id': savedRecord.get('tenant_id')
				}
			};
		}
		catch(err) {
			throw new TwyrMiddlewareError(`${this.name}::_updateTenant`, err);
		}
	}

	async _deleteTenant(ctxt) {
		try {
			if(ctxt.state.tenant['sub_domain'] === 'www') { // eslint-disable-line curly
				throw new Error(`WWW tenant cannot be deleted`);
			}

			await new this.$TenantModel({
				'tenant_id': ctxt.state.tenant.tenant_id
			}).destroy();

			return null;
		}
		catch(err) {
			throw new TwyrMiddlewareError(`${this.name}::_deleteTenant`, err);
		}
	}

	async _getLocation(ctxt) {
		try {
			const TenantLocationRecord = new this.$TenantLocationModel({
				'tenant_location_id': ctxt.params['tenant_location_id']
			});

			let tenantLocationData = await TenantLocationRecord.fetch({
				'withRelated': [ctxt.query.include]
			});

			tenantLocationData = this.$jsonApiMapper.map(tenantLocationData, 'tenant-administration/tenant_locations', {
				'typeForModel': {
					'tenant': 'tenant-administration/tenants'
				},

				'enableLinks': false
			});

			return tenantLocationData;
		}
		catch(err) {
			throw new TwyrMiddlewareError(`${this.name}::_getLocation`, err);
		}
	}

	async _addLocation(ctxt, insert) {
		try {
			const tenantLocation = ctxt.request.body;

			const jsonDeserializedData = await this.$jsonApiDeserializer.deserializeAsync(tenantLocation);
			jsonDeserializedData['tenant_location_id'] = jsonDeserializedData.id;

			delete jsonDeserializedData.id;
			delete jsonDeserializedData.created_at;
			delete jsonDeserializedData.updated_at;

			Object.keys(tenantLocation.data.relationships || {}).forEach((relationshipName) => {
				if(!tenantLocation.data.relationships[relationshipName].data) {
					delete jsonDeserializedData[relationshipName];
					return;
				}

				if(!tenantLocation.data.relationships[relationshipName].data.id) {
					delete jsonDeserializedData[relationshipName];
					return;
				}

				jsonDeserializedData[`${relationshipName}_id`] = tenantLocation.data.relationships[relationshipName].data.id;
			});

			const savedRecord = await this.$TenantLocationModel
				.forge()
				.save(jsonDeserializedData, {
					'method': insert ? 'insert' : 'update',
					'patch': !insert
				});

			return {
				'data': {
					'type': tenantLocation.data.type,
					'id': savedRecord.get('tenant_location_id')
				}
			};
		}
		catch(err) {
			throw new TwyrMiddlewareError(`${this.name}::_addLocation`, err);
		}
	}

	async _deleteLocation(ctxt) {
		try {
			await new this.$TenantLocationModel({
				'tenant_location_id': ctxt.params['tenant_location_id']
			})
			.destroy();

			return null;
		}
		catch(err) {
			throw new TwyrMiddlewareError(`${this.name}::_deleteLocation`, err);
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
