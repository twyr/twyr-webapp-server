'use strict';

exports.seed = async function(knex) {
	let parentId = await knex.raw(`SELECT module_id FROM modules WHERE name = ? AND type = 'server' AND parent_module_id IS NULL`, ['TwyrWebappServer']);
	if(!parentId.rows.length)
		return null;

	parentId = parentId.rows[0]['module_id'];

	let componentId = await knex.raw(`SELECT module_id FROM fn_get_module_descendants(?) WHERE name = ? AND type = 'feature'`, [parentId, 'Profile']);
	if(!componentId.rows.length) {
		await knex('modules').insert({
			'parent_module_id': parentId,
			'type': 'feature',
			'deploy': 'default',
			'name': 'Profile',
			'display_name': 'Profile Manager',
			'description': 'The Twyr Web Application Profile - manages the user\'s personal information',
			'metadata': {
				'author': 'Twyr',
				'version': '3.0.1',
				'website': 'https://twyr.com',
				'demo': 'https://twyr.com',
				'documentation': 'https://twyr.com'
			}
		});
	}

	componentId = await knex.raw(`SELECT module_id FROM fn_get_module_descendants(?) WHERE name = ? AND type = 'feature'`, [parentId, 'Dashboard']);
	if(!componentId.rows.length) {
		let dashboardFeatureId = await knex('modules').insert({
			'parent_module_id': parentId,
			'type': 'feature',
			'deploy': 'default',
			'name': 'Dashboard',
			'display_name': 'Dashboard',
			'description': 'The Twyr Web Application Dashbaord - single-point access to all the features the User can access',
			'metadata': {
				'author': 'Twyr',
				'version': '3.0.1',
				'website': 'https://twyr.com',
				'demo': 'https://twyr.com',
				'documentation': 'https://twyr.com'
			}
		})
		.returning('module_id');

		dashboardFeatureId = dashboardFeatureId[0];
		await knex.raw(`UPDATE tenants_users SET default_application = ? WHERE user_id = (SELECT user_id FROM users WHERE email = 'root@twyr.com')`, [dashboardFeatureId]);
	}

	componentId = await knex.raw(`SELECT module_id FROM fn_get_module_descendants(?) WHERE name = ? AND type = 'feature'`, [parentId, 'ServerAdministration']);
	if(!componentId.rows.length) {
		await knex('modules').insert({
			'parent_module_id': parentId,
			'type': 'feature',
			'deploy': 'admin',
			'name': 'ServerAdministration',
			'display_name': 'Server Administration',
			'description': 'The Twyr Web Application Server Administration - allows administrators to configure the server',
			'metadata': {
				'author': 'Twyr',
				'version': '3.0.1',
				'website': 'https://twyr.com',
				'demo': 'https://twyr.com',
				'documentation': 'https://twyr.com'
			}
		});
	}

	componentId = await knex.raw(`SELECT module_id FROM fn_get_module_descendants(?) WHERE name = ? AND type = 'feature'`, [parentId, 'TenantAdministration']);
	if(!componentId.rows.length) {
		componentId = await knex('modules').insert({
			'parent_module_id': parentId,
			'type': 'feature',
			'deploy': 'default',
			'name': 'TenantAdministration',
			'display_name': 'Tenant Administration',
			'description': 'The Twyr Web Application Tenant Administration - allows administrators to configure the account',
			'metadata': {
				'author': 'Twyr',
				'version': '3.0.1',
				'website': 'https://twyr.com',
				'demo': 'https://twyr.com',
				'documentation': 'https://twyr.com'
			}
		})
		.returning('module_id');

		componentId = componentId[0];

		await knex('feature_permissions').insert({
			'module_id': componentId,
			'name': 'tenant-administration-read',
			'display_name': 'Tenant Administration Read',
			'description': 'The Read-only Permission for the Tenant Adminstration Module'
		});

		await knex('feature_permissions').insert({
			'module_id': componentId,
			'name': 'tenant-administration-update',
			'implies_permissions': '["tenant-administration-read"]',
			'display_name': 'Tenant Administration Update',
			'description': 'Update Permission for the Tenant Adminstration Module'
		});

		await knex('feature_permissions').insert({
			'module_id': componentId,
			'name': 'tenant-administration-all',
			'implies_permissions': '["tenant-administration-update"]',
			'display_name': 'Tenant Administration All',
			'description': 'All Permissions for the Tenant Adminstration Module'
		});
	}
	else {
		componentId = componentId.rows.shift()['module_id'];
	}

	const tenantAdminFeatureId = componentId;

	componentId = await knex.raw(`SELECT module_id FROM fn_get_module_descendants(?) WHERE name = ? AND type = 'feature'`, [tenantAdminFeatureId, 'FeatureManager']);
	if(!componentId.rows.length) {
		componentId = await knex('modules').insert({
			'parent_module_id': tenantAdminFeatureId,
			'type': 'feature',
			'deploy': 'default',
			'name': 'FeatureManager',
			'display_name': 'Feature Manager',
			'description': 'The Twyr Web Application Feature Manager - manages the tenants\' feature selections',
			'metadata': {
				'author': 'Twyr',
				'version': '3.0.1',
				'website': 'https://twyr.com',
				'demo': 'https://twyr.com',
				'documentation': 'https://twyr.com'
			}
		})
		.returning('module_id');

		componentId = componentId[0];

		await knex('feature_permissions').insert({
			'module_id': componentId,
			'name': 'feature-manager-read',
			'implies_permissions': '["tenant-administration-read"]',
			'display_name': 'Feature Manager Read',
			'description': 'The Read-only Permission for the Feature Manager Module'
		});

		await knex('feature_permissions').insert({
			'module_id': componentId,
			'name': 'feature-manager-update',
			'implies_permissions': '["feature-manager-read"]',
			'display_name': 'Feature Manager Update',
			'description': 'Update Permission for the Feature Manager Module'
		});

		await knex('feature_permissions').insert({
			'module_id': componentId,
			'name': 'feature-manager-all',
			'implies_permissions': '["feature-manager-update"]',
			'display_name': 'Feature Manager All',
			'description': 'All Permissions for the Feature Manager Module'
		});
	}

	componentId = await knex.raw(`SELECT module_id FROM fn_get_module_descendants(?) WHERE name = ? AND type = 'feature'`, [tenantAdminFeatureId, 'GroupManager']);
	if(!componentId.rows.length) {
		componentId = await knex('modules').insert({
			'parent_module_id': tenantAdminFeatureId,
			'type': 'feature',
			'deploy': 'default',
			'name': 'GroupManager',
			'display_name': 'Group & Permissions Manager',
			'description': 'The Twyr Web Application Groups Permissions Manager - manages the tenants\' groups, and permissions for those groups, etc.',
			'metadata': {
				'author': 'Twyr',
				'version': '3.0.1',
				'website': 'https://twyr.com',
				'demo': 'https://twyr.com',
				'documentation': 'https://twyr.com'
			}
		})
		.returning('module_id');

		componentId = componentId[0];

		await knex('feature_permissions').insert({
			'module_id': componentId,
			'name': 'group-manager-read',
			'implies_permissions': '["tenant-administration-read"]',
			'display_name': 'Group Manager Read',
			'description': 'The Read-only Permission for the Group Manager Module'
		});

		await knex('feature_permissions').insert({
			'module_id': componentId,
			'name': 'group-manager-update',
			'implies_permissions': '["group-manager-read"]',
			'display_name': 'Group Manager Update',
			'description': 'Update Permission for the Group Manager Module'
		});

		await knex('feature_permissions').insert({
			'module_id': componentId,
			'name': 'group-manager-all',
			'implies_permissions': '["group-manager-update"]',
			'display_name': 'Group Manager All',
			'description': 'All Permissions for the Group Manager Module'
		});
	}

	componentId = await knex.raw(`SELECT module_id FROM fn_get_module_descendants(?) WHERE name = ? AND type = 'feature'`, [tenantAdminFeatureId, 'UserManager']);
	if(!componentId.rows.length) {
		componentId = await knex('modules').insert({
			'parent_module_id': tenantAdminFeatureId,
			'type': 'feature',
			'deploy': 'default',
			'name': 'UserManager',
			'display_name': 'User Manager',
			'description': 'The Twyr Web Application User Manager - manages the tenants\' users',
			'metadata': {
				'author': 'Twyr',
				'version': '3.0.1',
				'website': 'https://twyr.com',
				'demo': 'https://twyr.com',
				'documentation': 'https://twyr.com'
			}
		})
		.returning('module_id');

		componentId = componentId[0];

		await knex('feature_permissions').insert({
			'module_id': componentId,
			'name': 'user-manager-read',
			'implies_permissions': '["tenant-administration-read"]',
			'display_name': 'User Manager Read',
			'description': 'The Read-only Permission for the User Manager Module'
		});

		await knex('feature_permissions').insert({
			'module_id': componentId,
			'name': 'user-manager-update',
			'implies_permissions': '["user-manager-read"]',
			'display_name': 'User Manager Update',
			'description': 'Update Permission for the User Manager Module'
		});

		await knex('feature_permissions').insert({
			'module_id': componentId,
			'name': 'user-manager-all',
			'implies_permissions': '["user-manager-update"]',
			'display_name': 'User Manager All',
			'description': 'All Permissions for the User Manager Module'
		});
	}
};
