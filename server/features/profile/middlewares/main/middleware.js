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

			await super._registerApis();
			await ApiService.add(`${this.name}::getProfile`, this._getProfile.bind(this));

			return null;
		}
		catch(err) {
			throw new TwyrMiddlewareError(`${this.name}::_registerApis`, err);
		}
	}

	async _deregisterApis() {
		try {
			const ApiService = this.$dependencies.ApiService;

			await ApiService.remove(`${this.name}::getProfile`, this._getProfile.bind(this));
			await super._deregisterApis();

			return null;
		}
		catch(err) {
			throw new TwyrMiddlewareError(`${this.name}::_registerApis`, err);
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
			return profileData;
		}
		catch(err) {
			throw new TwyrMiddlewareError(`${this.name}::_getProfile`, err);
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
