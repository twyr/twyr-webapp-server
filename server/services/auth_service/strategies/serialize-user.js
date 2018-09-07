'use strict';

/**
 * Module dependencies, required for ALL Twy'r modules
 * @ignore
 */

/**
 * Module dependencies, required for this module
 * @ignore
 */

exports.strategy = function() {
	const auth = this.Interface;

	auth.serializeUser(async (request, user, callback) => {
		try {
			const tenant = JSON.parse(request.headers['tenant']);
			const deserializedUser = await this.$utilities.userSessionCache(tenant.tenant_id, user.user_id);

			// console.log(`serializeUser::deserialized User: ${JSON.stringify(deserializedUser, null, '\t')}`);
			if(callback) callback(null, deserializedUser.user_id);
			return null;
		}
		catch(err) {
			if(callback) callback(err);
			return null;
		}
	});

	auth.deserializeUser(async (request, userId, callback) => {
		try {
			const tenant = JSON.parse(request.headers['tenant']);
			const deserializedUser = await this.$utilities.userSessionCache(tenant.tenant_id, userId);

			// console.log(`deserializeUser::deserialized User: ${JSON.stringify(deserializedUser, null, '\t')}`);
			if(callback) callback(null, deserializedUser);
			return null;
		}
		catch(err) {
			if(callback) callback(err);
			return null;
		}
	});
};
