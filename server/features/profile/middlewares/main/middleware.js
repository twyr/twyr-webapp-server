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
 * @classdesc The Twyr Web Application Server Profile Feature Main middleware - manages CRUD for profile data.
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

			Object.defineProperty(this, '$UserModel', {
				'__proto__': null,
				'configurable': true,

				'value': dbSrvc.Model.extend({
					'tableName': 'users',
					'idAttribute': 'user_id',
					'hasTimestamps': true,

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
			delete this.$UserContactModel;
			delete this.$UserModel;

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

			await ApiService.add(`${this.name}::getProfile`, this._getProfile.bind(this));
			await ApiService.add(`${this.name}::updateProfile`, this._updateProfile.bind(this));
			await ApiService.add(`${this.name}::deleteProfile`, this._deleteProfile.bind(this));
			await ApiService.add(`${this.name}::changePassword`, this._changePassword.bind(this));

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

			await ApiService.remove(`${this.name}::changePassword`, this._changePassword.bind(this));
			await ApiService.remove(`${this.name}::deleteProfile`, this._deleteProfile.bind(this));
			await ApiService.remove(`${this.name}::updateProfile`, this._updateProfile.bind(this));
			await ApiService.remove(`${this.name}::getProfile`, this._getProfile.bind(this));

			await super._deregisterApis();
			return null;
		}
		catch(err) {
			throw new TwyrMiddlewareError(`${this.name}::_deregisterApis`, err);
		}
	}
	// #endregion

	// #region API
	async _getProfile(ctxt) {
		try {
			const UserRecord = new this.$UserModel({
				'user_id': ctxt.params.user_id
			});

			let profileData = await UserRecord.fetch({
				'withRelated': [ctxt.query.include]
			});

			profileData = this.$jsonApiMapper.map(profileData, 'profile/users', {
				'typeForModel': {
					'contacts': 'profile/user_contacts'
				},

				'enableLinks': false
			});

			delete profileData.data.attributes.password;
			profileData.data.attributes['middle_names'] = profileData.data.attributes['middle_names'] || '';

			return profileData;
		}
		catch(err) {
			throw new TwyrMiddlewareError(`${this.name}::_getProfile`, err);
		}
	}

	async _updateProfile(ctxt) {
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
			throw new TwyrMiddlewareError(`${this.name}::_updateProfile`, err);
		}
	}

	async _deleteProfile(ctxt) {
		try {
			const UserRecord = new this.$UserModel({
				'user_id': ctxt.state.user.user_id
			});

			const profileData = await UserRecord.fetch();

			const isUserSuper = ctxt.state.user.permissions.filter((permission) => {
				return permission.name === 'super-administrator';
			}).length;

			if(!isUserSuper) {
				profileData.destroy();
				return null;
			}

			const superPermId = ctxt.state.user.permissions.filter((permission) => {
				return permission.name === 'super-administrator';
			})[0]['permission_id'];

			const otherSupers = await this.$dependencies.DatabaseService.knex.raw(`SELECT user_id FROM tenants_users_groups WHERE tenant_id = ? AND group_id IN (SELECT group_id FROM tenant_group_permissions WHERE feature_permission_id = ?) AND user_id <> ?`, [
				ctxt.state.tenant.tenant_id,
				superPermId,
				ctxt.state.user.user_id
			]);

			if(otherSupers.length) {
				profileData.destroy();
				return null;
			}

			throw new Error(`Cannot delete the only Super Administrator for the Tenant`);
		}
		catch(err) {
			throw new TwyrMiddlewareError(`${this.name}::_deleteProfile`, err);
		}
	}

	async _changePassword(ctxt) {
		try {
			const upash = require('upash');
			const passwordData = ctxt.request.body;

			if(passwordData.currentPassword.trim() === '') throw new Error(`Current Password cannot be empty`);
			if(passwordData.newPassword1 === '') throw new Error(`New Password cannot be empty`);
			if(passwordData.newPassword1 !== passwordData.newPassword2) throw new Error(`New Password is not repeated correctly`);

			const UserRecord = new this.$UserModel({
				'user_id': ctxt.state.user.user_id
			});

			const profileData = await UserRecord.fetch();
			const credentialMatch = await upash.verify(profileData.get('password'), passwordData.currentPassword);
			if(!credentialMatch) throw new TwyrMiddlewareError('Invalid Credentials - please try again');

			const hashedNewPassword = await upash.hash(passwordData.newPassword1);
			profileData.set('password', hashedNewPassword);

			await profileData.save();

			return { 'status': 200, 'message': 'Password updated successfully' };
		}
		catch(err) {
			throw new TwyrMiddlewareError(`${this.name}::_changePassword`, err);
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
