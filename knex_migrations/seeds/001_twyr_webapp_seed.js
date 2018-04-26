'use strict';

exports.seed = function(knex, Promise) {
	let rootTenantId = null,
		rootUserId = null;

	return knex.raw('SELECT id FROM modules WHERE name = ? AND parent IS NULL', ['TwyrWebappServer'])
	.then(function(webappId) {
		if(webappId.rows.length)
			return null;

		return knex('modules').insert({
			'name': 'TwyrWebappServer',
			'type': 'server',
			'admin_only': true,
			'display_name': 'Twyr Web Application',
			'description': 'The Twyr Web Application Module - the "Application Class" for the Web Application',
			'configuration': {
				'title': 'Twyr Web Application'
			},
			'configuration_schema': {
				'title': 'Twyr Web Application Schema',
				'type': 'object',
				'properties': {
					'title': {
						'type': 'string'
					}
				}
			},
			'metadata': {
				'author': 'Twyr',
				'version': '3.0.1',
				'website': 'https://twyr.com',
				'demo': 'https://twyr.com',
				'documentation': 'https://twyr.com'
			}
		})
		.returning('id')
		.then(function(parentId) {
			return Promise.all([
				parentId,
				knex('modules').insert({
					'parent': parentId[0],
					'type': 'service',
					'admin_only': true,
					'name': 'AuditService',
					'display_name': 'Audit Service',
					'description': 'The Twyr Web Application Audit Service - waits for a request response pair, and sends it off to the audit pubsub channel',
					'metadata': {
						'author': 'Twyr',
						'version': '3.0.1',
						'website': 'https://twyr.com',
						'demo': 'https://twyr.com',
						'documentation': 'https://twyr.com'
					}
				}),
				knex('modules').insert({
					'parent': parentId[0],
					'type': 'service',
					'admin_only': true,
					'name': 'ApiService',
					'display_name': 'API Service',
					'description': 'The Twyr Web Application API Service - allows modules to expose interfaces for use by other modules without direct references to each other',
					'metadata': {
						'author': 'Twyr',
						'version': '3.0.1',
						'website': 'https://twyr.com',
						'demo': 'https://twyr.com',
						'documentation': 'https://twyr.com'
					}
				}),
				knex('modules').insert({
					'parent': parentId[0],
					'type': 'service',
					'admin_only': true,
					'name': 'AuthService',
					'display_name': 'Authentication Service',
					'description': 'The Twyr Web Application Authentication Service - based on Passport and its infinite strategies',
					'metadata': {
						'author': 'Twyr',
						'version': '3.0.1',
						'website': 'https://twyr.com',
						'demo': 'https://twyr.com',
						'documentation': 'https://twyr.com'
					}
				}),
				knex('modules').insert({
					'parent': parentId[0],
					'type': 'service',
					'admin_only': true,
					'name': 'AWSService',
					'display_name': 'AWS Service',
					'description': 'The Twyr Web Application base AWS Service - AWS feature-specific services (S3, for eg.) use this as a dependency for managing connections',
					'metadata': {
						'author': 'Twyr',
						'version': '3.0.1',
						'website': 'https://twyr.com',
						'demo': 'https://twyr.com',
						'documentation': 'https://twyr.com'
					}
				}),
				knex('modules').insert({
					'parent': parentId[0],
					'type': 'service',
					'admin_only': true,
					'name': 'IotService',
					'display_name': 'IoT Service',
					'description': 'The Twyr Web Application base IoT Service - wrapper around a cloud provider (AWS for right now)',
					'metadata': {
						'author': 'Twyr',
						'version': '3.0.1',
						'website': 'https://twyr.com',
						'demo': 'https://twyr.com',
						'documentation': 'https://twyr.com'
					}
				}),
				knex('modules').insert({
					'parent': parentId[0],
					'type': 'service',
					'admin_only': true,
					'name': 'CacheService',
					'display_name': 'Cache Service',
					'description': 'The Twyr Web Application Cache Service - based on Redis',
					'metadata': {
						'author': 'Twyr',
						'version': '3.0.1',
						'website': 'https://twyr.com',
						'demo': 'https://twyr.com',
						'documentation': 'https://twyr.com'
					}
				}),
				knex('modules').insert({
					'parent': parentId[0],
					'type': 'service',
					'admin_only': true,
					'name': 'ConfigurationService',
					'display_name': 'Configuration Service',
					'description': 'The Twyr Web Application Configuration Service',
					'metadata': {
						'author': 'Twyr',
						'version': '3.0.1',
						'website': 'https://twyr.com',
						'demo': 'https://twyr.com',
						'documentation': 'https://twyr.com'
					}
				})
				.returning('id')
				.then(function(configSrvcId) {
					return Promise.all([
						knex('modules').insert({
							'parent': configSrvcId[0],
							'type': 'service',
							'admin_only': true,
							'name': 'DotEnvConfigurationService',
							'display_name': '.env Configuration Service',
							'description': 'The Twyr Web Application .env Configuration Service',
							'metadata': {
								'author': 'Twyr',
								'version': '3.0.1',
								'website': 'https://twyr.com',
								'demo': 'https://twyr.com',
								'documentation': 'https://twyr.com'
							}
						}),
						knex('modules').insert({
							'parent': configSrvcId[0],
							'type': 'service',
							'admin_only': true,
							'name': 'FileConfigurationService',
							'display_name': 'File Configuration Service',
							'description': 'The Twyr Web Application Filesystem-based Configuration Service',
							'metadata': {
								'author': 'Twyr',
								'version': '3.0.1',
								'website': 'https://twyr.com',
								'demo': 'https://twyr.com',
								'documentation': 'https://twyr.com'
							}
						})
					]);
				}),
					knex('modules').insert({
					'parent': parentId[0],
					'type': 'service',
					'admin_only': true,
					'name': 'DatabaseService',
					'display_name': 'Database Service',
					'description': 'The Twyr Web Application Database Service - built on top of Knex / Bookshelf',
					'metadata': {
						'author': 'Twyr',
						'version': '3.0.1',
						'website': 'https://twyr.com',
						'demo': 'https://twyr.com',
						'documentation': 'https://twyr.com'
					}
				}),
				knex('modules').insert({
					'parent': parentId[0],
					'type': 'service',
					'admin_only': true,
					'name': 'ExpressService',
					'display_name': 'Express Service',
					'description': 'The Twyr Web Application Webserver Service - based on Express and node.js HTTP/HTTPS modules',
					'metadata': {
						'author': 'Twyr',
						'version': '3.0.1',
						'website': 'https://twyr.com',
						'demo': 'https://twyr.com',
						'documentation': 'https://twyr.com'
					}
				}),
				knex('modules').insert({
					'parent': parentId[0],
					'type': 'service',
					'admin_only': true,
					'name': 'LocalizationService',
					'display_name': 'Localization Service',
					'description': 'The Twyr Web Application Localization Service',
					'metadata': {
						'author': 'Twyr',
						'version': '3.0.1',
						'website': 'https://twyr.com',
						'demo': 'https://twyr.com',
						'documentation': 'https://twyr.com'
					}
				}),
				knex('modules').insert({
					'parent': parentId[0],
					'type': 'service',
					'admin_only': true,
					'name': 'LoggerService',
					'display_name': 'Logger Service',
					'description': 'The Twyr Web Application Logger Service',
					'metadata': {
						'author': 'Twyr',
						'version': '3.0.1',
						'website': 'https://twyr.com',
						'demo': 'https://twyr.com',
						'documentation': 'https://twyr.com'
					}
				}),
				knex('modules').insert({
					'parent': parentId[0],
					'type': 'service',
					'admin_only': true,
					'name': 'MailerService',
					'display_name': 'Mailer Service',
					'description': 'The Twyr Web Application Mailer Service - based on nodemailer and node-smtp-transport',
					'metadata': {
						'author': 'Twyr',
						'version': '3.0.1',
						'website': 'https://twyr.com',
						'demo': 'https://twyr.com',
						'documentation': 'https://twyr.com'
					}
				}),
				knex('modules').insert({
					'parent': parentId[0],
					'type': 'service',
					'admin_only': true,
					'name': 'PubsubService',
					'display_name': 'Publish/Subscribe Service',
					'description': 'The Twyr Web Application Publish/Subscribe Service - based on Ascoltatori',
					'metadata': {
						'author': 'Twyr',
						'version': '3.0.1',
						'website': 'https://twyr.com',
						'demo': 'https://twyr.com',
						'documentation': 'https://twyr.com'
					}
				}),
				knex('modules').insert({
					'parent': parentId[0],
					'type': 'service',
					'admin_only': true,
					'name': 'WebsocketService',
					'display_name': 'Websocket Service',
					'description': 'The Twyr Web Application Websocket Service - based on Primus using WS Transformer',
					'metadata': {
						'author': 'Twyr',
						'version': '3.0.1',
						'website': 'https://twyr.com',
						'demo': 'https://twyr.com',
						'documentation': 'https://twyr.com'
					}
				})
			]);
		})
		.then(function(parentId) {
			return Promise.all([
				parentId[0][0],
				knex('component_permissions').insert({
					'module': parentId[0][0],
					'name': 'public',
					'display_name': 'Public User Permissions',
					'description': 'The Twyr Web Application Permissions for non-logged-in Users'
				})
				.returning('id'),
				knex('component_permissions').insert({
					'module': parentId[0][0],
					'name': 'registered',
					'display_name': 'Registered User Permissions',
					'description': 'The Twyr Web Application Permissions for logged-in Users'
				})
				.returning('id'),
				knex('component_permissions').insert({
					'module': parentId[0][0],
					'name': 'administrator',
					'display_name': 'Administrator Permissions',
					'description': 'The Twyr Web Application Permissions for Administrators'
				})
				.returning('id'),
				knex('component_permissions').insert({
					'module': parentId[0][0],
					'name': 'super-administrator',
					'display_name': 'Super Administrator Permissions',
					'description': 'The Twyr Web Application Permissions for Super Administrators'
				})
				.returning('id')
			]);
		});
	})
	.then(function() {
		return knex.raw('SELECT id FROM tenants WHERE sub_domain =\'www\'');
	})
	.then(function(tenantid) {
		if(tenantid.rows.length)
			return [tenantid.rows[0].id];

		return knex('tenants').insert({
			'name': 'Twyr',
			'sub_domain': 'www'
		})
		.returning('id');
	})
	.then(function(tenantId) {
		rootTenantId = tenantId[0];
		return knex.raw('SELECT id FROM users WHERE email = \'root@twyr.com\'');
	})
	.then(function(userId) {
		if(userId.rows.length) return [userId.rows[0].id];

		return knex('users').insert({
			'email': 'root@twyr.com',
			'password': '{"hash":"{\\"secret\\":\\"b3XlvUf6bcKNvUIKuQ7GNGHQX5t+m3/x/8/jTVOIyHR4Nu0S7YUNnkx+YTzE/FyW2mNHLI1ESenRukBjUlDnP+U5ykoNKbq7Jlflq88PMhKhE7iZNOiUgdlhELNKHEyiXB5zerpBLxo0gCgP/RmyJquwI1TluuL+I6fUFUNylX0=\\",\\"salt\\":\\"Ev4McCjb0qLjGTnMRVPis0i7zpwk+c3y763fYyXCxk5MtLaVCwouTB6chl8WC6HY5bezdsCNTprh9qmcqNVMnYnFB1TdHL8Uhped/7ZWPaGRE1+t0PgXGIxd5vj3bU5guvCEiEsraZLWtfSLUOrRXOabQ9UMYma3xnyDi63Tw+Y=\\",\\"iterations\\":10000,\\"keylen\\":128,\\"digest\\":\\"sha512\\"}","func":"pbkdf2"}',
			'first_name': 'Root',
			'last_name': 'Twyr',
			'nickname': 'root',
			'profile_image': 'f8a9da32-26c5-495a-be9a-42f2eb8e4ed1',
			'profile_image_metadata': '{"zoom": "1", "points": ["2", "0", "336", "334"]}'
		})
		.returning('id');
	})
	.then(function(userId) {
		rootUserId = userId[0];
		return knex.raw('SELECT id FROM user_contacts WHERE login = ? AND type = ? AND contact = ?', [rootUserId, 'mobile', '01234567890']);
	})
	.then(function(userContactId) {
		if(userContactId.rows.length) return null;

		return knex('user_contacts').insert({
			'login': rootUserId,
			'contact': '01234567890',
			'type': 'mobile',
			'verified': true
		});
	})
	.then(function() {
		let adminGroupId = null,
			publicGroupId = null,
			registeredGroupId = null,
			superAdminGroupId = null;

		return knex.raw(`SELECT id FROM tenant_groups WHERE tenant = '${rootTenantId}' AND parent IS NULL;`)
			.then(function(groupId) {
				superAdminGroupId = groupId.rows[0].id;

				return knex('tenant_groups').where('id', '=', superAdminGroupId).update({
					'name': 'super-administators',
					'display_name': 'Super Administrators',
					'description': 'The Super Administrator Group for the root tenant'
				});
			})
			.then(function() {
				return knex.raw(`SELECT id FROM tenant_groups WHERE tenant = '${rootTenantId}' AND parent = '${superAdminGroupId}';`);
			})
			.then(function(groupId) {
				return knex('tenant_groups').where('id', '=', groupId.rows[0].id).update({
					'name': 'administrators',
					'display_name': 'Twyr Root Administrators',
					'description': 'The Administrator Group for the root tenant',
					'default_for_new_user': false
				})
				.returning('id');
			})
			.then(function(groupId) {
				adminGroupId = groupId[0];
				return knex.raw(`SELECT id FROM tenant_groups WHERE tenant = '${rootTenantId}' AND parent = '${adminGroupId}';`);
			})
			.then(function(groupId) {
				if(groupId.rows.length) return [groupId.rows[0].id];

				return knex('tenant_groups').insert({
					'tenant': rootTenantId,
					'parent': adminGroupId,
					'name': 'registered-users',
					'display_name': 'Twyr Registered Users',
					'description': 'The Registered User Group for the root tenant',
					'default_for_new_user': true
				})
				.returning('id');
			})
			.then(function(groupId) {
				registeredGroupId = groupId[0];
				return knex.raw(`SELECT id FROM tenant_groups WHERE tenant = '${rootTenantId}' AND parent = '${registeredGroupId}';`);
			})
			.then(function(groupId) {
				if(groupId.rows.length) return [groupId.rows[0].id];

				return knex('tenant_groups').insert({
					'tenant': rootTenantId,
					'parent': registeredGroupId,
					'name': 'public',
					'display_name': 'Twyr Public Users',
					'description': 'The public, non-logged-in, Users'
				})
				.returning('id');
			})
			.then(function(groupId) {
				publicGroupId = groupId[0];
				return knex.raw(`INSERT INTO tenant_group_permissions (tenant, tenant_group, module, permission) SELECT '${rootTenantId}', '${adminGroupId}', module, id FROM component_permissions WHERE name IN ('administrator', 'registered', 'public') ON CONFLICT DO NOTHING;`);
			})
			.then(function() {
				return knex.raw(`INSERT INTO tenant_group_permissions (tenant, tenant_group, module, permission) SELECT '${rootTenantId}', '${registeredGroupId}', module, id FROM component_permissions WHERE name IN ('registered', 'public') ON CONFLICT DO NOTHING;`);
			})
			.then(function() {
				return knex.raw(`INSERT INTO tenant_group_permissions (tenant, tenant_group, module, permission) SELECT '${rootTenantId}', '${publicGroupId}', module, id FROM component_permissions WHERE name IN ('public') ON CONFLICT DO NOTHING;`);
			});
	})
	.then(function() {
		return knex.raw(`SELECT id FROM tenants_users WHERE tenant = '${rootTenantId}' AND login = '${rootUserId}';`);
	})
	.then(function(rootTenantUserId) {
		if(rootTenantUserId.rows.length) return [rootTenantUserId.rows[0].id];

		return knex('tenants_users').insert({
			'tenant': rootTenantId,
			'login': rootUserId
		})
		.returning('id');
	})
	.then(function(tenantUserId) {
		return knex.raw(`INSERT INTO tenants_users_groups (tenant, tenant_user, tenant_group) SELECT '${rootTenantId}', '${tenantUserId[0]}', id FROM tenant_groups WHERE tenant = '${rootTenantId}' AND parent IS NULL ON CONFLICT DO NOTHING;`);
	})
	.then(function() {
		return knex.raw(`SELECT id FROM users WHERE email = 'public@twyr.com'`);
	})
	.then(function(userId) {
		if(userId.rows.length)
			return null;

		return knex('users').insert({
			'id': 'ffffffff-ffff-4fff-ffff-ffffffffffff',
			'email': 'public@twyr.com',
			'password': '',
			'first_name': 'Public',
			'last_name': 'Visitor',
			'nickname': 'public'
		});
	})
	.then(function(userId) {
		if(!userId) return;
		return knex('tenants_users').insert({
			'tenant': rootTenantId,
			'login': 'ffffffff-ffff-4fff-ffff-ffffffffffff'
		})
		.returning('id');
	})
	.then(function(tenantUserId) {
		if(!tenantUserId) return;
		return Promise.all([tenantUserId, knex('tenants_users_groups').where('tenant_user', tenantUserId[0]).del()]);
	})
	.then(function(tenantUserId) {
		if(!tenantUserId) return;
		return knex.raw(`INSERT INTO tenants_users_groups (tenant, tenant_user, tenant_group) SELECT '${rootTenantId}', '${tenantUserId[0]}', id FROM tenant_groups WHERE tenant = '${rootTenantId}' AND name = 'public' ON CONFLICT DO NOTHING;`);
	});
};
