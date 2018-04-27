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

	auth.serializeUser(async (request, user, callback) => {
		try {
			const deserializedUser = await this.$utilities.userSessionCache(request.tenant.id, user.id);
			if(callback) callback(null, deserializedUser.id);

			return null;
		}
		catch(err) {
			if(callback) callback(err);
			return null;
		}
	});

	auth.deserializeUser(async (request, userId, callback) => {
		try {
			const deserializedUser = await this.$utilities.userSessionCache(request.tenant.id, userId);
			if(callback) callback(null, deserializedUser);

			return null;
		}
		catch(err) {
			if(callback) callback(err);
			return null;
		}
	});
};
