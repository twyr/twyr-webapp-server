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

					'users': function() {
						return this.hasMany(self.$TenantUserModel, 'tenant_id');
					}
				})
			});

			Object.defineProperty(this, '$TenantUserModel', {
				'__proto__': null,
				'configurable': true,

				'value': dbSrvc.Model.extend({
					'tableName': 'tenants_users',
					'idAttribute': 'tenant_user_id',
					'hasTimestamps': true,

					'tenant': function() {
						return this.belongsTo(self.$TenantModel, 'tenant_id');
					},

					'user': function() {
						return this.belongsTo(self.$UserModel, 'user_id');
					}
				})
			});

			Object.defineProperty(this, '$UserModel', {
				'__proto__': null,
				'configurable': true,

				'value': dbSrvc.Model.extend({
					'tableName': 'users',
					'idAttribute': 'user_id',
					'hasTimestamps': true,

					'tenantUsers': function() {
						return this.hasMany(self.$TenantUserModel, 'user_id');
					},

					'contacts': function() {
						return this.hasMany(self.$UserContactModel, 'user_id');
					}
				})
			});

			Object.defineProperty(this, '$UserContactModel', {
				'__proto__': null,
				'configurable': true,

				'value': dbSrvc.Model.extend({
					'tableName': 'user_contacts',
					'idAttribute': 'user_contact_id',
					'hasTimestamps': true,

					'user': function() {
						return this.belongsTo(self.$UserModel, 'user_id');
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

			await ApiService.add(`${this.name}::resetUserPassword`, this._resetUserPassword.bind(this));
			await ApiService.add(`${this.name}::getAllTenantUsers`, this._getAllTenantUsers.bind(this));
			await ApiService.add(`${this.name}::getTenantUser`, this._getTenantUser.bind(this));
			await ApiService.add(`${this.name}::updateTenantUser`, this._updateTenantUser.bind(this));

			await ApiService.add(`${this.name}::getUserFromTenantUser`, this._getUserFromTenantUser.bind(this));
			await ApiService.add(`${this.name}::getUser`, this._getUser.bind(this));
			await ApiService.add(`${this.name}::updateUser`, this._updateUser.bind(this));

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

			await ApiService.remove(`${this.name}::updateUser`, this._updateUser.bind(this));
			await ApiService.remove(`${this.name}::getUser`, this._getUser.bind(this));
			await ApiService.remove(`${this.name}::getUserFromTenantUser`, this._getUser.bind(this));

			await ApiService.remove(`${this.name}::updateTenantUser`, this._updateTenantUser.bind(this));
			await ApiService.remove(`${this.name}::getTenantUser`, this._getTenantUser.bind(this));
			await ApiService.remove(`${this.name}::getAllTenantUsers`, this._getAllTenantUsers.bind(this));
			await ApiService.remove(`${this.name}::resetUserPassword`, this._resetUserPassword.bind(this));

			await super._deregisterApis();
			return null;
		}
		catch(err) {
			throw new TwyrMiddlewareError(`${this.name}::_deregisterApis`, err);
		}
	}
	// #endregion

	// #region API
	async _resetUserPassword(ctxt) {
		const dbSrvc = this.$dependencies.DatabaseService;

		const userEmail = await dbSrvc.knex.raw(`SELECT email FROM users WHERE user_id = ?`, [ctxt.request.body.user]);
		if(!userEmail.rows.length) throw new TwyrMiddlewareError(`Invalid User: ${ctxt.request.body.user}`);

		const uuid = require('uuid/v4');
		const upash = require('upash');

		if(ctxt.request.body.generate === 'true') { // eslint-disable-line curly
			try {
				const RandomOrg = require('random-org');
				const random = new RandomOrg(this.$config.randomServer);

				const randomPasswordResponse = await random.generateStrings(this.$config.passwordFormat);
				ctxt.request.body.password = randomPasswordResponse.random.data.pop();
			}
			catch(err) {
				console.error(err.message);
				ctxt.request.body.password = uuid().toString().replace(/-/g, '');
			}
		}

		const hashedPassword = await upash.hash(ctxt.request.body.password);
		await dbSrvc.knex.raw(`UPDATE users SET password = ? WHERE user_id = ?`, [hashedPassword, ctxt.request.body.user]);

		const messageOptions = JSON.parse(JSON.stringify(this.$config.resetPasswordMail));
		messageOptions['to'] = userEmail.rows[0]['email'];
		messageOptions['text'] = `Your new password on Twyr is ${ctxt.request.body.password}`;

		const mailerSrvc = this.$dependencies.MailerService;
		const sendMailResult = await mailerSrvc.sendMail(messageOptions);

		if(twyrEnv === 'development' || twyrEnv === 'test') console.log(`Message Options: ${JSON.stringify(messageOptions, null, '\t')}\nSend Mail Result: ${JSON.stringify(sendMailResult, null, '\t')}`);
		return { 'status': true };
	}

	async _getAllTenantUsers(ctxt) {
		try {
			let tenantUserData = await this.$TenantUserModel
			.query(function(qb) {
				qb
				.where({ 'tenant_id': ctxt.state.tenant.tenant_id })
				.andWhere('user_id', '<>', 'ffffffff-ffff-4fff-ffff-ffffffffffff');
			})
			.fetchAll({
				'withRelated': (ctxt.query.include && ctxt.query.include.length) ? ctxt.query.include.split(',').map((related) => { return related.trim(); }) : ['tenant', 'user', 'user.contacts']
			});

			tenantUserData = this.$jsonApiMapper.map(tenantUserData, 'tenant-administration/user-manager/tenant-user', {
				'typeForModel': {
					'tenant': 'tenant-administration/tenant',
					'user': 'tenant-administration/user-manager/user',
					'contacts': 'tenant-administration/user-manager/user-contact'
				},

				'enableLinks': false
			});

			return tenantUserData;
		}
		catch(err) {
			throw new TwyrMiddlewareError(`${this.name}::_getAllTenantUsers`, err);
		}
	}

	async _getTenantUser(ctxt) {
		try {
			let tenantUserData = await this.$TenantUserModel
			.query(function(qb) {
				qb
				.where('tenant_user_id', '=', ctxt.params.tenantUserId)
				.andWhere({ 'tenant_id': ctxt.state.tenant.tenant_id });
			})
			.fetch({
				'withRelated': (ctxt.query.include && ctxt.query.include.length) ? ctxt.query.include.split(',').map((related) => { return related.trim(); }) : ['tenant', 'user', 'user.contacts']
			});

			tenantUserData = this.$jsonApiMapper.map(tenantUserData, 'tenant-administration/user-manager/tenant-user', {
				'typeForModel': {
					'tenant': 'tenant-administration/tenant',
					'user': 'tenant-administration/user-manager/user',
					'contacts': 'tenant-administration/user-manager/user-contact'
				},

				'enableLinks': false
			});

			return tenantUserData;
		}
		catch(err) {
			throw new TwyrMiddlewareError(`${this.name}::_getTenantUser`, err);
		}
	}

	async _updateTenantUser(ctxt) {
		try {
			const TenantUserRecord = new this.$TenantUserModel({
				'tenant_user_id': ctxt.params.tenantUserId
			});

			const tenantUserData = await TenantUserRecord
			.query(function(qb) {
				qb.where({ 'tenant_id': ctxt.state.tenant.tenant_id });
			})
			.fetch();

			if(!tenantUserData) throw new Error(`Invalid record id`);

			const jsonDeserializedData = await this.$jsonApiDeserializer.deserializeAsync(ctxt.request.body);

			jsonDeserializedData['tenant_user_id'] = jsonDeserializedData['id'];
			delete jsonDeserializedData['id'];

			const savedRecord = await tenantUserData
			.save(jsonDeserializedData, {
				'method': 'update',
				'patch': true
			});

			return {
				'data': {
					'type': ctxt.request.body.data.type,
					'id': savedRecord.get('tenant_user_id')
				}
			};
		}
		catch(err) {
			throw new TwyrMiddlewareError(`${this.name}::_updateTenantUser`, err);
		}
	}

	async _getUserFromTenantUser(ctxt) {
		try {
			const TenantUserRecord = new this.$TenantUserModel({
				'tenant_user_id': ctxt.params.tenantUserId
			});

			const tenantUserData = await TenantUserRecord
			.query(function(qb) {
				qb.where({ 'tenant_id': ctxt.state.tenant.tenant_id });
			})
			.fetch();

			const UserRecord = new this.$UserModel({
				'user_id': tenantUserData.get('user_id')
			});

			let userData = await UserRecord.fetch();
			userData = this.$jsonApiMapper.map(userData, 'tenant-administration/user-manager/users', {
				'enableLinks': false
			});

			delete userData.data.attributes.password;
			userData.data.attributes['middle_names'] = userData.data.attributes['middle_names'] || '';

			return userData;
		}
		catch(err) {
			throw new TwyrMiddlewareError(`${this.name}::_getUserFromTenantUser`, err);
		}
	}

	async _getUser(ctxt) {
		try {
			const UserRecord = new this.$UserModel({
				'user_id': ctxt.params.userId
			});

			let userData = await UserRecord.fetch({
				'withRelated': (ctxt.query.include && ctxt.query.include.length) ? ctxt.query.include.split(',').map((related) => { return related.trim(); }) : ['tenant', 'user', 'user.contacts']
			});

			userData = this.$jsonApiMapper.map(userData, 'tenant-administration/user-manager/users', {
				'typeForModel': {
					'tenant': 'tenant-administration/tenant',
					'user': 'tenant-administration/user-manager/user',
					'contacts': 'tenant-administration/user-manager/user-contact'
				},

				'enableLinks': false
			});

			delete userData.data.attributes.password;
			userData.data.attributes['middle_names'] = userData.data.attributes['middle_names'] || '';

			return userData;
		}
		catch(err) {
			throw new TwyrMiddlewareError(`${this.name}::_getUser`, err);
		}
	}

	async _updateUser(ctxt) {
		try {
			const user = ctxt.request.body;

			delete user.data.relationships;
			delete user.included;

			const jsonDeserializedData = await this.$jsonApiDeserializer.deserializeAsync(user);
			jsonDeserializedData['user_id'] = jsonDeserializedData.id;

			delete jsonDeserializedData.id;
			delete jsonDeserializedData.email;
			delete jsonDeserializedData.created_at;
			delete jsonDeserializedData.updated_at;

			const savedRecord = await this.$UserModel
				.forge()
				.save(jsonDeserializedData, {
					'method': 'update',
					'patch': true
				});

			const cacheSrvc = this.$dependencies['CacheService'];
			await cacheSrvc.delAsync(`twyr!webapp!user!${jsonDeserializedData['user_id']}!basics`);

			return {
				'data': {
					'type': user.data.type,
					'id': savedRecord.get('user_id')
				}
			};
		}
		catch(err) {
			throw new TwyrMiddlewareError(`${this.name}::_updateUser`, err);
		}
	}
	// #endregion

	// #region Properties
	/**
	 * @override
	 */
	get dependencies() {
		return ['MailerService'].concat(super.dependencies);
	}

	/**
	 * @override
	 */
	get basePath() {
		return __dirname;
	}
	// #endregion
}

exports.middleware = Main;
