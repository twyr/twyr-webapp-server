'use strict';

/**
 * Module dependencies, required for ALL PlantWorks modules
 * @ignore
 */

/**
 * Module dependencies, required for this module
 * @ignore
 */

const getUserDetails = async function(tenantId, userId) {
	const cacheSrvc = this.$dependencies.CacheService,
		databaseSrvc = this.$dependencies.DatabaseService,
		loggerSrvc = this.$dependencies.LoggerService;

	try {
		let cachedUser = await cacheSrvc.getAsync(`twyr!webapp!user!${userId}!basics`);
		if(cachedUser) {
			cachedUser = JSON.parse(cachedUser);
			return cachedUser;
		}


		// Setup the models...
		const User = databaseSrvc.Model.extend({
			'tableName': 'users',
			'idAttribute': 'id',

			'social': function() {
				// eslint-disable-next-line no-use-before-define
				return this.hasMany(UserSocialLogins, 'login');
			}
		});

		const UserSocialLogins = databaseSrvc.Model.extend({
			'tableName': 'user_social_logins',
			'idAttribute': 'id',

			'user': function() {
				return this.belongsTo(User, 'login');
			}
		});

		let databaseUser = await User.forge({ 'id': userId }).fetch({ 'withRelated': ['social'] });
		if(!databaseUser) throw new Error(`User Not Found: ${userId}`);

		databaseUser = databaseUser.toJSON();
		delete databaseUser.password;

		databaseUser.social.forEach((social) => {
			delete social.social_data;
		});

		await cacheSrvc.setAsync(`twyr!webapp!user!${userId}!basics`, JSON.stringify(databaseUser));
		return databaseUser;
	}
	catch(err) {
		loggerSrvc.error(`userSessionCache::getUserDetails Error:\nUser Id: ${userId}\nTenant Id: ${tenantId}\nError: `, err);
		throw (err);
	}
};

const getTenantUserPermissions = async function(tenantId, userId) {
	const cacheSrvc = this.$dependencies.CacheService,
		databaseSrvc = this.$dependencies.DatabaseService,
		loggerSrvc = this.$dependencies.LoggerService;

	try {
		let cachedTenantUserPermissions = await cacheSrvc.getAsync(`twyr!webapp!user!${userId}!${tenantId}!permissions`);
		if(cachedTenantUserPermissions) {
			cachedTenantUserPermissions = JSON.parse(cachedTenantUserPermissions);
			return cachedTenantUserPermissions;
		}

		const publicPermission = (await databaseSrvc.knex.raw(`SELECT id AS permission, name, depends_on FROM component_permissions WHERE name = ?`, ['public'])).rows;
		const userPermissions = (await databaseSrvc.knex.raw('SELECT * FROM fn_get_user_permissions(?, ?)', [tenantId, userId])).rows;
		const defaultPermissions = (userId === 'ffffffff-ffff-4fff-ffff-ffffffffffff') ? [] : (await databaseSrvc.knex.raw('SELECT Z.id AS permission, Z.name, Z.depends_on FROM component_permissions Z WHERE Z.id IN (SELECT DISTINCT permission FROM tenant_group_permissions WHERE tenant_group = (SELECT id FROM tenant_groups WHERE tenant = ? AND default_for_new_user = true))', [tenantId])).rows;

		const combinedPermissions = {
			[publicPermission[0].name]: publicPermission[0]
		};

		while(userPermissions.length) {
			const currPerm = userPermissions.shift();
			combinedPermissions[currPerm.name] = currPerm;
		}

		while(defaultPermissions.length) {
			const defPerm = defaultPermissions.shift();
			combinedPermissions[defPerm.name] = defPerm;
		}

		const tenantUserPermissions = [];

		const permissionNames = Object.keys(combinedPermissions);
		permissionNames.forEach((permissionName) => {
			if(tenantUserPermissions.indexOf(combinedPermissions[permissionName].permission) >= 0)
				return;

			const dependsOn = combinedPermissions[permissionName].depends_on;
			if(dependsOn.length) return;

			tenantUserPermissions.push(combinedPermissions[permissionName].permission);
		});

		let currentPermissionLength = 0;
		while(currentPermissionLength !== tenantUserPermissions.length) {
			currentPermissionLength = tenantUserPermissions.length;

			for(const permissionName of permissionNames) {
				if(tenantUserPermissions.indexOf(combinedPermissions[permissionName].permission) >= 0)
					continue;

				const dependsOn = combinedPermissions[permissionName].depends_on;
				if(!dependsOn.length) continue;

				let shouldAdd = true;
				for(const dependOn of dependsOn) { // eslint-disable-line curly
					shouldAdd = shouldAdd && (tenantUserPermissions.indexOf(dependOn) >= 0);
				}

				if(shouldAdd) tenantUserPermissions.push(combinedPermissions[permissionName].permission);
			}
		}

		await cacheSrvc.setAsync(`twyr!webapp!user!${userId}!${tenantId}!permissions`, JSON.stringify(tenantUserPermissions));
		return tenantUserPermissions;
	}
	catch(err) {
		loggerSrvc.error(`userSessionCache::getTenantUserPermissions Error:\nUser Id: ${userId}\nTenant Id: ${tenantId}\nError: `, err);
		throw (err);
	}
};

const getTenantUserEmberComponentsByModule = async function(tenantId, userId) {
	const cacheSrvc = this.$dependencies.CacheService,
		databaseSrvc = this.$dependencies.DatabaseService,
		loggerSrvc = this.$dependencies.LoggerService;

	try {
		let cachedTenantUserEmberComponents = await cacheSrvc.getAsync(`twyr!webapp!user!${userId}!${tenantId}!ember!components`);
		if(cachedTenantUserEmberComponents) {
			cachedTenantUserEmberComponents = JSON.parse(cachedTenantUserEmberComponents);
			return cachedTenantUserEmberComponents;
		}

		const getPermissions = getTenantUserPermissions.bind(this);
		const userPermissions = await getPermissions(tenantId, userId);

		const tenantUserEmberComponents = (await databaseSrvc.knex.raw(`SELECT A.name AS component_name, B.id AS component_widget_id, B.ember_component, B.ember_template FROM modules A INNER JOIN (SELECT X.id, X.module, X.ember_component, Y.ember_template FROM component_widgets X INNER JOIN component_widget_templates Y ON (Y.component_widget = X.id)) B ON (B.module = A.id) WHERE B.id IN (SELECT component_widget FROM component_widgets_permissions WHERE component_permission IN ('${userPermissions.join('\', \'')}'))`)).rows;
		const componentList = {};

		if(tenantUserEmberComponents.length) {
			tenantUserEmberComponents.forEach((userEmberComponent) => {
				if(!componentList[userEmberComponent.component_name])
					componentList[userEmberComponent.component_name] = [];

				const relevantRecord = componentList[userEmberComponent.component_name].filter((componentWidget) => {
					return componentWidget.component_widget_id === userEmberComponent.component_widget_id;
				})[0];

				if(relevantRecord) {
					if(relevantRecord.ember_templates.indexOf(userEmberComponent.ember_template) < 0)
						relevantRecord.ember_templates.push(userEmberComponent.ember_template);
				}
				else {
					componentList[userEmberComponent.component_name].push({
						'component_widget_id': userEmberComponent.component_widget_id,
						'ember_component': userEmberComponent.ember_component,
						'ember_templates': [userEmberComponent.ember_template]
					});
				}
			});
		}

		await cacheSrvc.setAsync(`twyr!webapp!user!${userId}!${tenantId}!ember!components`, JSON.stringify(componentList));
		return componentList;
	}
	catch(err) {
		loggerSrvc.error(`userSessionCache::getTenantUserEmberComponentsByModule Error:\nUser Id: ${userId}\nTenant Id: ${tenantId}\nError: `, err);
		throw (err);
	}
};

/*
const getTenantUserDefaultApplication = function(tenant, userId, callback) {
	const cacheSrvc = this.$dependencies.CacheService,
		databaseSrvc = this.$dependencies.DatabaseService,
		loggerSrvc = this.$dependencies.LoggerService;

	this._dummyAsync()
	.then(() => {
		return cacheSrvc.getAsync(`twyr!webapp!user!${userId}!${tenant}!default!application`);
	})
	.then((cachedTenantUserDefaultApplication) => {
		if(cachedTenantUserDefaultApplication)
			return promises.all([cachedTenantUserDefaultApplication, false]);

		return promises.all([databaseSrvc.knex.raw('SELECT default_tenant_application FROM tenants_users WHERE login = ? AND tenant = (SELECT id FROM tenants WHERE sub_domain = ?)', [userId, tenant]), true]);
	})
	.then((results) => {
		let tenantUserDefaultApplication = results.shift();
		const shouldCache = results.shift();

		if(tenantUserDefaultApplication.rows)
			tenantUserDefaultApplication = tenantUserDefaultApplication.rows[0].default_tenant_application;

		const promiseResolutions = [tenantUserDefaultApplication];
		if(shouldCache) { // eslint-disable-line curly
			promiseResolutions.push(cacheSrvc.setAsync(`twyr!webapp!user!${userId}!${tenant}!default!application`, tenantUserDefaultApplication || 'NULL'));
		}

		return promises.all(promiseResolutions);
	})
	.then((results) => {
		if(results[0] === 'NULL') results[0] = null;
		if(callback) callback(null, results.shift());
		return null;
	})
	.catch((err) => {
		loggerSrvc.error(`userSessionCache::getTenantUserDefaultApplication Error:\nUser Id: ${userId}\nTenant: ${tenant}\nError: `, err);
		if(callback) callback(err);
	});
};
*/

exports.utility = {
	'name': 'userSessionCache',
	'isAsync': false,
	'method': async function(tenantId, userId) {
		const cacheSrvc = this.$dependencies.CacheService,
			loggerSrvc = this.$dependencies.LoggerService;

		try {
			if(!tenantId) throw (new Error('No tenant id found in the request!'));
			if(!userId) throw (new Error('No user id found in the request!'));

			// const getTenantUserDefaultApplicationAsync = promises.promisify(getTenantUserDefaultApplication.bind(this));
			const getEmberComponentsByModule = getTenantUserEmberComponentsByModule.bind(this);
			const getPermissions = getTenantUserPermissions.bind(this);
			const getDetails = getUserDetails.bind(this);

			const deserializedUser = await getDetails(tenantId, userId);
			const tenantUserPermissions = await getPermissions(tenantId, userId);
			const tenantUserModules = getEmberComponentsByModule(tenantId, userId);

			deserializedUser.permissionList = tenantUserPermissions;
			deserializedUser.modules = tenantUserModules;
			deserializedUser['default_application'] = null;

			if(twyrEnv === 'development') {
				const cachedKeys = await cacheSrvc.keysAsync(`twyr!webapp!user!${userId}*`);

				const cacheMulti = cacheSrvc.multi();
				cachedKeys.forEach((cachedKey) => {
					cacheMulti.expireAsync(cachedKey, 30);
				});

				await cacheMulti.execAsync();
			}

			return deserializedUser;
		}
		catch(err) {
			loggerSrvc.error('userSessionCache Error:\nUser Id: ', userId, 'Error: ', err);
			throw err;
		}
	}
};
