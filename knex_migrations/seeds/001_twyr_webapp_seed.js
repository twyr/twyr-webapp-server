'use strict';

exports.seed = async function(knex) {
	// Step 1: See if the seed file has already run. If yes, simply return
	let parentId = await knex.raw('SELECT id FROM modules WHERE name = ? AND parent IS NULL', ['TwyrWebappServer']);
	if(parentId.rows.length) return null;

	// Step 2: Insert the data for the "server" into the modules table
	parentId = await knex('modules').insert({
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
	.returning('id');

	// Step 3: Insert the data for all the standard services that ship with the codebase into the modules table
	await knex('modules').insert({
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
	});

	await knex('modules').insert({
		'parent': parentId[0],
		'type': 'service',
		'admin_only': true,
		'name': 'AuditService',
		'display_name': 'Audit Service',
		'description': 'The Twyr Web Application Audit Service - automatically publishes an audit log of all incoming REST calls',
		'metadata': {
			'author': 'Twyr',
			'version': '3.0.1',
			'website': 'https://twyr.com',
			'demo': 'https://twyr.com',
			'documentation': 'https://twyr.com'
		}
	});

	await knex('modules').insert({
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
	});

	await knex('modules').insert({
		'parent': parentId[0],
		'type': 'service',
		'admin_only': true,
		'name': 'AwsService',
		'display_name': 'AWS Service',
		'description': 'The Twyr Web Application base AWS Service - AWS feature-specific services (S3, for eg.) use this as a dependency for managing connections',
		'metadata': {
			'author': 'Twyr',
			'version': '3.0.1',
			'website': 'https://twyr.com',
			'demo': 'https://twyr.com',
			'documentation': 'https://twyr.com'
		}
	});

	await knex('modules').insert({
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
	});

	await knex('modules').insert({
		'parent': parentId[0],
		'type': 'service',
		'admin_only': true,
		'name': 'CassandraService',
		'display_name': 'Cassandra Service',
		'description': 'The Twyr Web Application Cassandra Service - allows other modules to use a Cassandra cluster as a nosql storage',
		'metadata': {
			'author': 'Twyr',
			'version': '3.0.1',
			'website': 'https://twyr.com',
			'demo': 'https://twyr.com',
			'documentation': 'https://twyr.com'
		}
	});

	const configSrvcId = await knex('modules').insert({
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
	.returning('id');

	await knex('modules').insert({
		'parent': configSrvcId[0],
		'type': 'service',
		'admin_only': true,
		'name': 'DatabaseConfigurationService',
		'display_name': 'PostgreSQL Configuration Service',
		'description': 'The Twyr Web Application PostgreSQL Configuration Service',
		'metadata': {
			'author': 'Twyr',
			'version': '3.0.1',
			'website': 'https://twyr.com',
			'demo': 'https://twyr.com',
			'documentation': 'https://twyr.com'
		}
	});

	await knex('modules').insert({
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
	});

	await knex('modules').insert({
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
	});

	await knex('modules').insert({
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
	});

	await knex('modules').insert({
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
	});

	await knex('modules').insert({
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
	});

	await knex('modules').insert({
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
	});

	await knex('modules').insert({
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
	});

	await knex('modules').insert({
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
	});

	await knex('modules').insert({
		'parent': parentId[0],
		'type': 'service',
		'admin_only': true,
		'name': 'StorageService',
		'display_name': 'Storage Service',
		'description': 'The Twyr Web Application Storage Service - depending on configuration, a wrapper around sandboxed-fs or s3fs',
		'metadata': {
			'author': 'Twyr',
			'version': '3.0.1',
			'website': 'https://twyr.com',
			'demo': 'https://twyr.com',
			'documentation': 'https://twyr.com'
		}
	});

	await knex('modules').insert({
		'parent': parentId[0],
		'type': 'service',
		'admin_only': true,
		'name': 'RingpopService',
		'display_name': 'Cluster Service',
		'description': 'The Twyr Web Application Cluster Service - based on Ringpop by Uber',
		'metadata': {
			'author': 'Twyr',
			'version': '3.0.1',
			'website': 'https://twyr.com',
			'demo': 'https://twyr.com',
			'documentation': 'https://twyr.com'
		}
	});

	await knex('modules').insert({
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
	});

	// Step 4: Insert the data for the standard permissiones that this "server" defines
	await knex('component_permissions').insert({
		'module': parentId[0],
		'name': 'public',
		'display_name': 'Public User Permissions',
		'description': 'The Twyr Web Application Permissions for non-logged-in Users'
	});

	await knex('component_permissions').insert({
		'module': parentId[0],
		'name': 'registered',
		'display_name': 'Registered User Permissions',
		'description': 'The Twyr Web Application Permissions for logged-in Users'
	});

	await knex('component_permissions').insert({
		'module': parentId[0],
		'name': 'administrator',
		'display_name': 'Administrator Permissions',
		'description': 'The Twyr Web Application Permissions for Administrators'
	});

	await knex('component_permissions').insert({
		'module': parentId[0],
		'name': 'super-administrator',
		'display_name': 'Super Administrator Permissions',
		'description': 'The Twyr Web Application Permissions for Super Administrators'
	});

	// Step 5: Insert the data for the only pre-defined tenant
	let tenantId = await knex.raw('SELECT id FROM tenants WHERE sub_domain =\'www\'');
	if(!tenantId.rows.length) {
		tenantId = await knex('tenants').insert({
			'name': 'Twyr',
			'sub_domain': 'www'
		})
		.returning('id');

		tenantId = tenantId[0];
	}
	else {
		tenantId = tenantId.rows[0].id;
	}

	// Step 6: Insert the data for the root user
	let userId = await knex.raw('SELECT id FROM users WHERE email = \'root@twyr.com\'');
	if(!userId.rows.length) {
		userId = await  knex('users').insert({
			'email': 'root@twyr.com',
			'password': '{"hash":"{\\"secret\\":\\"b3XlvUf6bcKNvUIKuQ7GNGHQX5t+m3/x/8/jTVOIyHR4Nu0S7YUNnkx+YTzE/FyW2mNHLI1ESenRukBjUlDnP+U5ykoNKbq7Jlflq88PMhKhE7iZNOiUgdlhELNKHEyiXB5zerpBLxo0gCgP/RmyJquwI1TluuL+I6fUFUNylX0=\\",\\"salt\\":\\"Ev4McCjb0qLjGTnMRVPis0i7zpwk+c3y763fYyXCxk5MtLaVCwouTB6chl8WC6HY5bezdsCNTprh9qmcqNVMnYnFB1TdHL8Uhped/7ZWPaGRE1+t0PgXGIxd5vj3bU5guvCEiEsraZLWtfSLUOrRXOabQ9UMYma3xnyDi63Tw+Y=\\",\\"iterations\\":10000,\\"keylen\\":128,\\"digest\\":\\"sha512\\"}","func":"pbkdf2"}',
			'first_name': 'Root',
			'last_name': 'Twyr',
			'nickname': 'root',
			'profile_image': 'f8a9da32-26c5-495a-be9a-42f2eb8e4ed1',
			'profile_image_metadata': '{"zoom": "1", "points": ["2", "0", "336", "334"]}'
		})
		.returning('id');

		userId = userId[0];
	}
	else {
		userId = userId.rows[0].id;
	}

	let userContactId = await knex.raw('SELECT id FROM user_contacts WHERE login = ? AND type = ? AND contact = ?', [userId, 'mobile', '01234567890']);
	if(!userContactId.rows.length) {
		userContactId = await knex('user_contacts').insert({
			'login': userId,
			'contact': '01234567890',
			'type': 'mobile',
			'verified': true
		});

		userContactId = userContactId[0];
	}
	else {
		userContactId = userContactId.rows[0].id;
	}

	// Step 6: Insert the data for the tenant's pre-defined groups - Super Admin, Admin, Registered, and Public
	let superAdminGroupId = await knex.raw(`SELECT id FROM tenant_groups WHERE tenant = '${tenantId}' AND parent IS NULL;`);
	if(!superAdminGroupId.rows.length) {
		superAdminGroupId = await knex('tenant_groups').insert({
			'tenant': tenantId,
			'name': 'super-administators',
			'display_name': 'Super Administrators',
			'description': 'The Super Administrator Group for the root tenant',
			'default_for_new_user': false
		})
		.returning('id');

		superAdminGroupId = superAdminGroupId[0];
	}
	else {
		superAdminGroupId = superAdminGroupId.rows[0].id;
		await knex('tenant_groups').where('id', '=', superAdminGroupId).update({
			'name': 'super-administators',
			'display_name': 'Super Administrators',
			'description': 'The Super Administrator Group for the root tenant',
			'default_for_new_user': false
		});
	}

	let adminGroupId = await knex.raw(`SELECT id FROM tenant_groups WHERE tenant = '${tenantId}' AND parent = '${superAdminGroupId}'`);
	if(!adminGroupId.rows.length) {
		adminGroupId = await knex('tenant_groups').insert({
			'tenant': tenantId,
			'name': 'administrators',
			'display_name': 'Twyr Root Administrators',
			'description': 'The Administrator Group for the root tenant',
			'default_for_new_user': false
		})
		.returning('id');

		adminGroupId = adminGroupId[0];
	}
	else {
		adminGroupId = adminGroupId.rows[0].id;
		await knex('tenant_groups').where('id', '=', adminGroupId).update({
			'name': 'administrators',
			'display_name': 'Twyr Root Administrators',
			'description': 'The Administrator Group for the root tenant',
			'default_for_new_user': false
		});
	}

	let registeredGroupId = await knex.raw(`SELECT id FROM tenant_groups WHERE tenant = '${tenantId}' AND parent = '${adminGroupId}';`);
	if(!registeredGroupId.rows.length) {
		registeredGroupId = await knex('tenant_groups').insert({
			'tenant': tenantId,
			'parent': adminGroupId,
			'name': 'registered-users',
			'display_name': 'Twyr Registered Users',
			'description': 'The Registered User Group for the root tenant',
			'default_for_new_user': true
		})
		.returning('id');

		registeredGroupId = registeredGroupId[0];
	}
	else {
		registeredGroupId = registeredGroupId.rows[0].id;
	}

	let publicGroupId = await knex.raw(`SELECT id FROM tenant_groups WHERE tenant = '${tenantId}' AND parent = '${registeredGroupId}';`);
	if(!publicGroupId.rows.length) {
		publicGroupId = await knex('tenant_groups').insert({
			'tenant': tenantId,
			'parent': registeredGroupId,
			'name': 'public',
			'display_name': 'Twyr Public Users',
			'description': 'The public, non-logged-in, Users'
		})
		.returning('id');

		publicGroupId = publicGroupId[0];
	}
	else {
		publicGroupId = publicGroupId.rows[0].id;
	}

	// Step 7: Assign appropriate permissions for the standard groups
	await knex.raw(`INSERT INTO tenant_group_permissions (tenant, tenant_group, module, permission) SELECT '${tenantId}', '${adminGroupId}', module, id FROM component_permissions WHERE name IN ('administrator', 'registered', 'public') ON CONFLICT DO NOTHING;`);
	await knex.raw(`INSERT INTO tenant_group_permissions (tenant, tenant_group, module, permission) SELECT '${tenantId}', '${registeredGroupId}', module, id FROM component_permissions WHERE name IN ('registered', 'public') ON CONFLICT DO NOTHING;`);
	await knex.raw(`INSERT INTO tenant_group_permissions (tenant, tenant_group, module, permission) SELECT '${tenantId}', '${publicGroupId}', module, id FROM component_permissions WHERE name IN ('public') ON CONFLICT DO NOTHING;`);

	// Step 8: Add the root user to the tenant's super-admin group
	let tenantUserId = await knex.raw(`SELECT id FROM tenants_users WHERE tenant = '${tenantId}' AND login = '${userId}';`);
	if(!tenantUserId.rows.length) {
		tenantUserId = await knex('tenants_users').insert({
			'tenant': tenantId,
			'login': userId
		})
		.returning('id');

		tenantUserId = tenantUserId[0];
	}
	else {
		tenantUserId = tenantUserId.rows[0].id;
	}

	await knex.raw(`INSERT INTO tenants_users_groups (tenant, tenant_user, tenant_group) SELECT '${tenantId}', '${tenantUserId}', id FROM tenant_groups WHERE tenant = '${tenantId}' AND parent IS NULL ON CONFLICT DO NOTHING;`);

	// Step 9: Create a User representing all the non-logged-in visitors to the portal, assign the user to the defaul tenant,
	// add the public user to the public group
	let publicUserId = await knex.raw(`SELECT id FROM users WHERE email = 'public@twyr.com'`);
	if(!publicUserId.rows.length) {
		publicUserId = await knex('users').insert({
			'id': 'ffffffff-ffff-4fff-ffff-ffffffffffff',
			'email': 'public@twyr.com',
			'password': '',
			'first_name': 'Public',
			'last_name': 'Visitor',
			'nickname': 'public'
		})
		.returning('id');

		publicUserId = publicUserId[0];
	}
	else {
		publicUserId = publicUserId.rows[0].id;
	}

	let publicTenantUserId = await knex.raw(`SELECT id FROM tenants_users WHERE tenant = ? AND login = ?`, [tenantId, publicUserId]);
	if(!publicTenantUserId.rows.length) {
		publicTenantUserId = await knex('tenants_users').insert({
			'tenant': tenantId,
			'login': publicUserId
		})
		.returning('id');

		publicTenantUserId = publicTenantUserId[0];
	}
	else {
		publicTenantUserId = publicTenantUserId.rows[0].id;
	}

	await knex('tenants_users_groups').where('tenant_user', publicTenantUserId).del();
	await knex.raw(`INSERT INTO tenants_users_groups (tenant, tenant_user, tenant_group) SELECT '${tenantId}', '${publicTenantUserId}', id FROM tenant_groups WHERE tenant = '${tenantId}' AND name = 'public' ON CONFLICT DO NOTHING;`);

	return null;
};
