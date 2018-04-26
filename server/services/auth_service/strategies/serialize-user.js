'use strict';

/**
 * Module dependencies, required for ALL PlantWorks modules
 * @ignore
 */

/**
 * Module dependencies, required for this module
 * @ignore
 */

exports.strategy = function() {
	const auth = this.Interface;

	auth.serializeUser((request, user, callback) => {
		this._dummyAsync()
		.then(() => {
			return this.$utilities.userSessionCacheAsync(request.tenant, user.id, request.device.type);
		})
		.then((deserializedUser) => {
			if(callback) callback(null, deserializedUser.id);
			return null;
		})
		.catch((err) => {
			if(callback) callback(err);
		});
	});

	auth.deserializeUser((request, userId, callback) => {
		this._dummyAsync()
		.then(() => {
			return this.$utilities.userSessionCacheAsync(request.tenant, userId, request.device.type);
		})
		.then((deserializedUser) => {
			if(callback) callback(null, deserializedUser);
			return null;
		})
		.catch((err) => {
			if(callback) callback(err);
		});
	});
};
