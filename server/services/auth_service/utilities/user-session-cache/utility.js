'use strict';

/**
 * Module dependencies, required for ALL PlantWorks modules
 * @ignore
 */
const promises = require('bluebird');

/**
 * Module dependencies, required for this module
 * @ignore
 */

const getUserDetails = function(tenant, userId, callback) {
	const cacheSrvc = this.$dependencies.CacheService,
		databaseSrvc = this.$dependencies.DatabaseService,
		loggerSrvc = this.$dependencies.LoggerService;

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

	this._dummyAsync()
	.then(() => {
		return cacheSrvc.getAsync(`twyr!webapp!user!${userId}!basics`);
	})
	.then((cachedUser) => {
		if(cachedUser) {
			cachedUser = JSON.parse(cachedUser);
			return promises.all([cachedUser, false]);
		}

		return promises.all([User.forge({
			'id': userId
		}).fetch({
			'withRelated': ['social']
		}), true]);
	})
	.then((results) => {
		const shouldCache = results.pop(),
			user = results.shift();

		if(!user) throw new Error(`User Not Found: ${userId}`);

		const databaseUser = user.toJSON ? user.toJSON() : user;
		delete databaseUser.password;

		databaseUser.social.forEach((social) => {
			delete social.social_data;
		});

		const promiseResolutions = [databaseUser];
		if(shouldCache)
			promiseResolutions.push(cacheSrvc.setAsync(`twyr!webapp!!user!${userId}!basics`, JSON.stringify(databaseUser)));

		return promises.all(promiseResolutions);
	})
	.then((results) => {
		if(callback) callback(null, results.shift());
		return null;
	})
	.catch((err) => {
		loggerSrvc.error(`userSessionCache::getUserDetails Error:\nUser Id: ${userId}\nTenant: ${tenant}\nError: `, err);
		if(callback) callback(err);
	});
};

const getTenantUserPermissions = function(tenant, userId, callback) {
	const cacheSrvc = this.$dependencies.CacheService,
		databaseSrvc = this.$dependencies.DatabaseService,
		loggerSrvc = this.$dependencies.LoggerService;

	this._dummyAsync()
	.then(() => {
		return cacheSrvc.getAsync(`twyr!webapp!user!${userId}!${tenant}!permissions`);
	})
	.then((cachedTenantUserPermissions) => {
		if(cachedTenantUserPermissions) {
			cachedTenantUserPermissions = JSON.parse(cachedTenantUserPermissions);
			return promises.all([false, cachedTenantUserPermissions]);
		}

		const promiseResolutions = [];

		promiseResolutions.push(true);
		promiseResolutions.push(databaseSrvc.knex.raw(`SELECT id AS permission, name, depends_on FROM component_permissions WHERE name = ?`, ['public']));
		promiseResolutions.push(databaseSrvc.knex.raw('SELECT * FROM fn_get_user_permissions(?, ?)', [tenant, userId]));

		if(userId !== 'ffffffff-ffff-4fff-ffff-ffffffffffff')
			promiseResolutions.push(databaseSrvc.knex.raw('SELECT Z.id AS permission, Z.name, Z.depends_on FROM component_permissions Z WHERE Z.id IN (SELECT DISTINCT permission FROM tenant_group_permissions WHERE tenant_group = (SELECT id FROM tenant_groups WHERE tenant = (SELECT id FROM tenants WHERE sub_domain = \'www\') AND default_for_new_user = true))'));
		else
			promiseResolutions.push({ 'rows': [] });

		return promises.all(promiseResolutions);
	})
	.then((allPermissions) => {
		const shouldCache = allPermissions.shift();
		let tenantUserPermissions = [];

		if(allPermissions.length > 1) {
			const defaultPermissions = allPermissions[2],
				publicPermission = allPermissions[0],
				userPermissions = allPermissions[1];

			const combinedPermissions = {
				[publicPermission.rows[0].name]: publicPermission.rows[0]
			};

			while(userPermissions.rows.length) {
				const currPerm = userPermissions.rows.shift();
				combinedPermissions[currPerm.name] = currPerm;
			}

			while(defaultPermissions.rows.length) {
				const defPerm = defaultPermissions.rows.shift();
				combinedPermissions[defPerm.name] = defPerm;
			}

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
		}
		else {
			tenantUserPermissions = allPermissions.shift();
		}

		const promiseResolutions = [tenantUserPermissions];
		if(shouldCache) { // eslint-disable-line curly
			promiseResolutions.push(cacheSrvc.setAsync(`twyr!webapp!user!${userId}!${tenant}!permissions`, JSON.stringify(tenantUserPermissions)));
		}

		return promises.all(promiseResolutions);
	})
	.then((results) => {
		if(callback) callback(null, results.shift());
		return null;
	})
	.catch((err) => {
		loggerSrvc.error(`userSessionCache::getTenantUserPermissions Error:\nUser Id: ${userId}\nTenant: ${tenant}\nError: `, err);
		if(callback) callback(err);
	});
};

const getTenantUserEmberComponentsByModule = function(tenant, userId, callback) {
	const cacheSrvc = this.$dependencies.CacheService,
		databaseSrvc = this.$dependencies.DatabaseService,
		loggerSrvc = this.$dependencies.LoggerService;

	const getTenantUserPermissionsAsync = promises.promisify(getTenantUserPermissions.bind(this));

	this._dummyAsync()
	.then(() => {
		return getTenantUserPermissionsAsync(tenant, userId);
	})
	.then((userPermissions) => {
		return promises.all([userPermissions, cacheSrvc.getAsync(`twyr!webapp!user!${userId}!${tenant}!ember!components`)]);
	})
	.then((results) => {
		const userPermissions = results.shift();
		let cachedTenantUserEmberComponents = results.shift();

		if(cachedTenantUserEmberComponents) {
			cachedTenantUserEmberComponents = JSON.parse(cachedTenantUserEmberComponents);
			return promises.all([cachedTenantUserEmberComponents, false]);
		}

		return promises.all([databaseSrvc.knex.raw(`SELECT A.name AS component_name, B.id AS component_widget_id, B.ember_component, B.ember_template, FROM modules A INNER JOIN (SELECT X.id, X.module, X.ember_component, Y.ember_template FROM component_widgets X INNER JOIN component_widget_templates Y ON (Y.component_widget = X.id)) B ON (B.module = A.id) WHERE B.id IN (SELECT component_widget FROM component_widgets_permissions WHERE component_permission IN ('${userPermissions.join('\', \'')}'))`), true]);
	})
	.then((results) => {
		let componentList = undefined,
			tenantUserEmberComponents = results.shift();

		const shouldCache = results.shift();

		if(tenantUserEmberComponents.rows) {
			tenantUserEmberComponents = tenantUserEmberComponents.rows;
			componentList = {};

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
		else {
			componentList = tenantUserEmberComponents;
		}

		const promiseResolutions = [componentList];
		if(shouldCache)
			promiseResolutions.push(cacheSrvc.setAsync(`twyr!webapp!user!${userId}!${tenant}!ember!components`, JSON.stringify(componentList)));

		return promises.all(promiseResolutions);
	})
	.then((results) => {
		if(callback) callback(null, results.shift());
		return null;
	})
	.catch((err) => {
		loggerSrvc.error(`userSessionCache::getTenantUserEmberComponentsByModule Error:\nUser Id: ${userId}\nTenant: ${tenant}\nError: `, err);
		if(callback) callback(err);
	});
};

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

exports.utility = {
	'name': 'userSessionCache',
	'isAsync': true,
	'method': function(tenantId, userId, callback) {
		if(!tenantId) {
			if(callback) callback(new Error('No tenant id found in the request!'));
			return;
		}

		if(!userId) {
			if(callback) callback(new Error('No user id found in the request!'));
			return;
		}

		const cacheSrvc = this.$dependencies.CacheService,
			loggerSrvc = this.$dependencies.LoggerService;

		const getTenantUserDefaultApplicationAsync = promises.promisify(getTenantUserDefaultApplication.bind(this)),
			getTenantUserEmberComponentsByModuleAsync = promises.promisify(getTenantUserEmberComponentsByModule.bind(this)),
			getTenantUserPermissionsAsync = promises.promisify(getTenantUserPermissions.bind(this)),
			getUserDetailsAsync = promises.promisify(getUserDetails.bind(this));

		this._dummyAsync()
		.then(() => {
			return promises.all([
				getUserDetailsAsync(tenantId, userId),
				getTenantUserPermissionsAsync(tenantId, userId),
				getTenantUserEmberComponentsByModuleAsync(tenantId, userId),
				getTenantUserDefaultApplicationAsync(tenantId, userId)
			]);
		})
		.then((results) => {
			const defaultApplication = results[3],
				deserializedUser = results[0],
				tenantUserModules = results[2],
				tenantUserPermissions = results[1];

			deserializedUser.permissionList = tenantUserPermissions;
			deserializedUser.modules = tenantUserModules;
			deserializedUser['default_application'] = defaultApplication;

			return promises.all([deserializedUser, cacheSrvc.keysAsync(`twyr!webapp!user!${userId}*`)]);
		})
		.then((results) => {
			const cachedKeys = results[1],
				deserializedUser = results[0];

			if((process.env.NODE_ENV || 'development') !== 'development')
				return [deserializedUser];

			const cacheMulti = cacheSrvc.multi();
			cachedKeys.forEach((cachedKey) => {
				cacheMulti.expireAsync(cachedKey, 30);
			});

			return promises.all([deserializedUser, cacheMulti.execAsync()]);
		})
		.then((results) => {
			if(callback) callback(null, results.shift());
			return null;
		})
		.catch((err) => {
			loggerSrvc.error('userSessionCache Error:\nUser Id: ', userId, 'Error: ', err);
			if(callback) callback(err);
		});
	}
};
