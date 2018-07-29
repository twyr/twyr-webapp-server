'use strict';

exports.up = async function(knex) {
	let exists = null;

	// Step 1: Setup the basics in the database
	await knex.schema.raw('SET check_function_bodies = true');
	await knex.schema.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public');

	// Step 2: Create the enums we need
	await knex.schema.raw("CREATE TYPE public.module_type AS ENUM ('component','middleware','service', 'server', 'template')");
	await knex.schema.raw("CREATE TYPE public.contact_type AS ENUM ('email','landline','mobile','other')");

	// Step 3: Create the basic tables - modules, tenants, and users
	exists = await knex.schema.withSchema('public').hasTable('modules');
	if(!exists) {
		await knex.schema.withSchema('public').createTable('modules', (modTbl) => {
			modTbl.uuid('id').notNullable().primary().defaultTo(knex.raw('uuid_generate_v4()'));
			modTbl.uuid('parent').references('id').inTable('modules').onDelete('CASCADE').onUpdate('CASCADE');
			modTbl.specificType('type', 'public.module_type').notNullable().defaultTo('component');
			modTbl.text('name').notNullable();
			modTbl.text('display_name').notNullable();
			modTbl.text('description').notNullable().defaultTo('Another PlantWorks Module');
			modTbl.jsonb('metadata').notNullable().defaultTo('{}');
			modTbl.jsonb('configuration').notNullable().defaultTo('{}');
			modTbl.jsonb('configuration_schema').notNullable().defaultTo('{}');
			modTbl.boolean('admin_only').notNullable().defaultTo(false);
			modTbl.boolean('enabled').notNullable().defaultTo(true);
			modTbl.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
			modTbl.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

			modTbl.unique(['parent', 'name', 'type']);
		});
	}


	exists = await knex.schema.withSchema('public').hasTable('tenants');
	if(!exists) {
		await knex.schema.withSchema('public').createTable('tenants', function(tenantTbl) {
			tenantTbl.uuid('id').notNullable().primary().defaultTo(knex.raw('uuid_generate_v4()'));
			tenantTbl.text('name').notNullable();
			tenantTbl.text('sub_domain').notNullable();
			tenantTbl.boolean('enabled').notNullable().defaultTo(true);
			tenantTbl.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
			tenantTbl.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

			tenantTbl.unique(['sub_domain']);
		});
	}

	exists = await knex.schema.withSchema('public').hasTable('users');
	if(!exists) {
		await knex.schema.withSchema('public').createTable('users', function(userTbl) {
			userTbl.uuid('id').notNullable().primary().defaultTo(knex.raw('uuid_generate_v4()'));
			userTbl.text('email').notNullable();
			userTbl.text('password').notNullable();
			userTbl.text('first_name').notNullable();
			userTbl.text('middle_names');
			userTbl.text('last_name').notNullable();
			userTbl.text('nickname');
			userTbl.uuid('profile_image');
			userTbl.jsonb('profile_image_metadata');
			userTbl.boolean('enabled').notNullable().defaultTo(true);
			userTbl.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
			userTbl.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

			userTbl.unique('email');
		});
	}

	// Step 4: Setup second-level tables - those that have foreign key relationships with the primary tables
	exists = await knex.schema.withSchema('public').hasTable('component_permissions');
	if(!exists) {
		await knex.schema.withSchema('public').createTable('component_permissions', function(permTbl) {
			permTbl.uuid('id').notNullable().primary().defaultTo(knex.raw('uuid_generate_v4()'));
			permTbl.uuid('module').notNullable().references('id').inTable('modules').onDelete('CASCADE').onUpdate('CASCADE');
			permTbl.text('name').notNullable();
			permTbl.text('display_name').notNullable();
			permTbl.jsonb('depends_on').notNullable().defaultTo('[]');
			permTbl.text('description').notNullable().defaultTo('Another Random Permission');
			permTbl.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
			permTbl.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

			permTbl.unique(['module', 'name']);
			permTbl.unique(['module', 'id']);
		});
	}

	exists = await knex.schema.withSchema('public').hasTable('tenants_modules');
	if(!exists) {
		await knex.schema.withSchema('public').createTable('tenants_modules', function(tenantModuleTbl) {
			tenantModuleTbl.uuid('id').notNullable().primary().defaultTo(knex.raw('uuid_generate_v4()'));
			tenantModuleTbl.uuid('tenant').notNullable().references('id').inTable('tenants').onDelete('CASCADE').onUpdate('CASCADE');
			tenantModuleTbl.uuid('module').notNullable().references('id').inTable('modules').onDelete('CASCADE').onUpdate('CASCADE');
			tenantModuleTbl.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
			tenantModuleTbl.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
			tenantModuleTbl.unique(['tenant', 'module']);
		});
	}

	exists = await knex.schema.withSchema('public').hasTable('tenants_users');
	if(!exists) {
		await knex.schema.withSchema('public').createTable('tenants_users', function(tenantUserTbl) {
			tenantUserTbl.uuid('id').notNullable().primary().defaultTo(knex.raw('uuid_generate_v4()'));
			tenantUserTbl.uuid('tenant').notNullable().references('id').inTable('tenants').onDelete('CASCADE').onUpdate('CASCADE');
			tenantUserTbl.uuid('login').notNullable().references('id').inTable('users').onDelete('CASCADE').onUpdate('CASCADE');
			// tenantUserTbl.uuid('default_tenant_application').references('id').inTable('tenant_applications').onDelete('SET NULL').onUpdate('CASCADE');
			tenantUserTbl.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
			tenantUserTbl.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
			tenantUserTbl.unique(['tenant', 'login']);
			tenantUserTbl.unique(['tenant', 'id']);
		});
	}

	exists = await knex.schema.withSchema('public').hasTable('tenant_groups');
	if(!exists) {
		await knex.schema.withSchema('public').createTable('tenant_groups', function(groupTbl) {
			groupTbl.uuid('id').notNullable().primary().defaultTo(knex.raw('uuid_generate_v4()'));
			groupTbl.uuid('tenant').notNullable().references('id').inTable('tenants').onDelete('CASCADE').onUpdate('CASCADE');
			groupTbl.uuid('parent').references('id').inTable('tenant_groups').onDelete('CASCADE').onUpdate('CASCADE');
			groupTbl.text('name').notNullable();
			groupTbl.text('display_name').notNullable();
			groupTbl.text('description');
			groupTbl.boolean('default_for_new_user').notNullable().defaultTo(false);
			groupTbl.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
			groupTbl.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

			groupTbl.unique(['parent', 'name']);
			groupTbl.unique(['tenant', 'id']);
		});
	}

	exists = await knex.schema.withSchema('public').hasTable('user_social_logins');
	if(!exists) {
		await knex.schema.withSchema('public').createTable('user_social_logins', function(socialLoginTbl) {
			socialLoginTbl.uuid('id').notNullable().primary().defaultTo(knex.raw('uuid_generate_v4()'));
			socialLoginTbl.uuid('login').notNullable().references('id').inTable('users').onDelete('CASCADE').onUpdate('CASCADE');
			socialLoginTbl.text('provider').notNullable();
			socialLoginTbl.text('provider_uid').notNullable();
			socialLoginTbl.text('display_name').notNullable();
			socialLoginTbl.jsonb('social_data').notNullable();
			socialLoginTbl.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
			socialLoginTbl.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
			socialLoginTbl.unique(['provider', 'provider_uid']);
		});
	}

	exists = await knex.schema.withSchema('public').hasTable('user_contacts');
	if(!exists) {
		await knex.schema.withSchema('public').createTable('user_contacts', function(contactsTbl) {
			contactsTbl.uuid('id').notNullable().primary().defaultTo(knex.raw('uuid_generate_v4()'));
			contactsTbl.uuid('login').notNullable().references('id').inTable('users').onDelete('CASCADE').onUpdate('CASCADE');
			contactsTbl.text('contact').notNullable();
			contactsTbl.specificType('type', 'public.contact_type').notNullable().defaultTo('other');
			contactsTbl.boolean('verified').notNullable().defaultTo(false);
			contactsTbl.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
			contactsTbl.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

			contactsTbl.unique(['login', 'type', 'contact']);
		});
	}

	// Step 5: Setup third-level tables
	exists = await knex.schema.withSchema('public').hasTable('tenants_users_groups');
	if(!exists) {
		await knex.schema.withSchema('public').createTable('tenants_users_groups', function(tenantUserGroupTbl) {
			tenantUserGroupTbl.uuid('id').notNullable().primary().defaultTo(knex.raw('uuid_generate_v4()'));
			tenantUserGroupTbl.uuid('tenant').notNullable();
			tenantUserGroupTbl.uuid('tenant_group').notNullable();
			tenantUserGroupTbl.uuid('tenant_user').notNullable();
			tenantUserGroupTbl.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
			tenantUserGroupTbl.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
			tenantUserGroupTbl.unique(['tenant', 'tenant_group', 'tenant_user']);

			tenantUserGroupTbl.foreign(['tenant', 'tenant_group']).references(['tenant', 'id']).inTable('tenant_groups').onDelete('CASCADE').onUpdate('CASCADE');
			tenantUserGroupTbl.foreign(['tenant', 'tenant_user']).references(['tenant', 'id']).inTable('tenants_users').onDelete('CASCADE').onUpdate('CASCADE');

			tenantUserGroupTbl.unique(['tenant_group', 'id']);
		});
	}

	exists = await knex.schema.withSchema('public').hasTable('tenant_group_permissions');
	if(!exists) {
		await knex.schema.withSchema('public').createTable('tenant_group_permissions', function(groupPermissionTbl) {
			groupPermissionTbl.uuid('id').notNullable().primary().defaultTo(knex.raw('uuid_generate_v4()'));
			groupPermissionTbl.uuid('tenant').notNullable();
			groupPermissionTbl.uuid('tenant_group').notNullable();
			groupPermissionTbl.uuid('module').notNullable();
			groupPermissionTbl.uuid('permission').notNullable();
			groupPermissionTbl.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
			groupPermissionTbl.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
			groupPermissionTbl.unique(['tenant_group', 'permission']);

			groupPermissionTbl.foreign(['module', 'permission']).references(['module', 'id']).inTable('component_permissions').onDelete('CASCADE').onUpdate('CASCADE');
			groupPermissionTbl.foreign(['tenant', 'tenant_group']).references(['tenant', 'id']).inTable('tenant_groups').onDelete('CASCADE').onUpdate('CASCADE');
			groupPermissionTbl.foreign(['tenant', 'module']).references(['tenant', 'module']).inTable('tenants_modules').onDelete('CASCADE').onUpdate('CASCADE');
		});
	}

	// Step 6: Setup user-defined functions on Modules table
	await knex.schema.withSchema('public').raw(
		'CREATE OR REPLACE FUNCTION public.fn_get_module_ancestors (IN moduleid uuid) ' +
			'RETURNS TABLE ( level integer,  id uuid,  parent uuid,  name text,  type public.module_type) ' +
			'LANGUAGE plpgsql ' +
			'VOLATILE  ' +
			'CALLED ON NULL INPUT ' +
			'SECURITY INVOKER ' +
			'COST 1 ' +
			'AS $$ ' +
		'BEGIN ' +
			'RETURN QUERY ' +
			'WITH RECURSIVE q AS ( ' +
				'SELECT ' +
					'1 AS level, ' +
					'A.id, ' +
					'A.parent, ' +
					'A.name, ' +
					'A.type ' +
				'FROM ' +
					'modules A ' +
				'WHERE ' +
					'A.id = moduleid ' +
				'UNION ALL ' +
				'SELECT ' +
					'q.level + 1, ' +
					'B.id, ' +
					'B.parent, ' +
					'B.name, ' +
					'B.type ' +
				'FROM ' +
					'q, ' +
					'modules B ' +
				'WHERE ' +
					'B.id = q.parent ' +
			') ' +
			'SELECT DISTINCT ' +
				'q.level, ' +
				'q.id, ' +
				'q.parent, ' +
				'q.name, ' +
				'q.type ' +
			'FROM ' +
				'q ' +
			'ORDER BY ' +
				'q.level, ' +
				'q.parent; ' +
		'END; ' +
		'$$;'
	);

	await knex.schema.withSchema('public').raw(
		'CREATE OR REPLACE FUNCTION public.fn_is_module_enabled (IN moduleid uuid) ' +
			'RETURNS boolean ' +
			'LANGUAGE plpgsql ' +
			'VOLATILE ' +
			'CALLED ON NULL INPUT ' +
			'SECURITY INVOKER ' +
			'COST 1 ' +
			'AS $$ ' +
		'DECLARE ' +
			'is_disabled	integer; ' +
		'BEGIN ' +
			'SELECT ' +
				'COUNT(id) ' +
			'FROM ' +
				'modules ' +
			'WHERE ' +
				'id IN  (SELECT id FROM fn_get_module_ancestors(moduleid)) AND ' +
				'enabled = false ' +
			'INTO ' +
				'is_disabled; ' +

			'RETURN is_disabled <= 0; ' +
		'END; ' +
		'$$;'
	);

	await knex.schema.withSchema('public').raw(
		'CREATE OR REPLACE FUNCTION public.fn_get_module_descendants (IN moduleid uuid) ' +
			'RETURNS TABLE ( level integer,  id uuid,  parent uuid,  name text,  type public.module_type, enabled boolean ) ' +
			'LANGUAGE plpgsql ' +
			'VOLATILE  ' +
			'CALLED ON NULL INPUT ' +
			'SECURITY INVOKER ' +
			'COST 1 ' +
			'AS $$ ' +
		'BEGIN ' +
			'RETURN QUERY ' +
			'WITH RECURSIVE q AS ( ' +
				'SELECT ' +
					'1 AS level, ' +
					'A.id, ' +
					'A.parent, ' +
					'A.name, ' +
					'A.type, ' +
					'fn_is_module_enabled(A.id) AS enabled ' +
				'FROM ' +
					'modules A ' +
				'WHERE ' +
					'A.id = moduleid ' +
				'UNION ALL ' +
				'SELECT ' +
					'q.level + 1, ' +
					'B.id, ' +
					'B.parent, ' +
					'B.name, ' +
					'B.type, ' +
					'fn_is_module_enabled(B.id) AS enabled ' +
				'FROM ' +
					'q, ' +
					'modules B ' +
				'WHERE ' +
					'B.parent = q.id ' +
			') ' +
			'SELECT DISTINCT ' +
				'q.level, ' +
				'q.id, ' +
				'q.parent, ' +
				'q.name, ' +
				'q.type, ' +
				'q.enabled ' +
			'FROM ' +
				'q ' +
			'ORDER BY ' +
				'q.level, ' +
				'q.parent; ' +
		'END; ' +
		'$$;'
	);

	await knex.schema.withSchema('public').raw(
		'CREATE OR REPLACE FUNCTION public.fn_check_module_upsert_is_valid () ' +
			'RETURNS trigger ' +
			'LANGUAGE plpgsql ' +
			'VOLATILE  ' +
			'CALLED ON NULL INPUT ' +
			'SECURITY INVOKER ' +
			'COST 1 ' +
			'AS $$ ' +
		'DECLARE ' +
			'parent_module_type	TEXT; ' +
			'is_module_in_tree	INTEGER; ' +
		'BEGIN ' +
			'IF TG_OP = \'UPDATE\' ' +
			'THEN ' +
				'IF OLD.name <> NEW.name ' +
				'THEN ' +
					'RAISE SQLSTATE \'2F003\' USING MESSAGE = \'Module name is NOT mutable\'; ' +
					'RETURN NULL; ' +
				'END IF; ' +

				'IF OLD.type <> NEW.type ' +
				'THEN ' +
					'RAISE SQLSTATE \'2F003\' USING MESSAGE = \'Module type is NOT mutable\'; ' +
					'RETURN NULL; ' +
				'END IF; ' +
			'END IF; ' +

			'IF NEW.type = \'server\' AND NEW.parent IS NULL ' +
			'THEN ' +
				'RETURN NEW; ' +
			'END IF; ' +

			'IF NEW.type = \'server\' AND NEW.parent IS NOT NULL ' +
			'THEN ' +
				'RAISE SQLSTATE \'2F003\' USING MESSAGE = \'Server Modules cannot have parents\' ; ' +
				'RETURN NULL; ' +
			'END IF; ' +

			'IF NEW.type <> \'server\' AND NEW.parent IS NULL ' +
			'THEN ' +
				'RAISE SQLSTATE \'2F003\' USING MESSAGE = \'Only Server Modules cannot have parents - all other module types must belong to a Server\' ; ' +
				'RETURN NULL; ' +
			'END IF; ' +

			'parent_module_type := \'\'; ' +
			'SELECT ' +
				'type ' +
			'FROM ' +
				'modules ' +
			'WHERE ' +
				'id = NEW.parent ' +
			'INTO ' +
				'parent_module_type; ' +

			'IF parent_module_type = \'template\' ' +
			'THEN ' +
				'RAISE SQLSTATE \'2F003\' USING MESSAGE = \'Only Server Templates cannot have sub-modules\' ; ' +
				'RETURN NULL; ' +
			'END IF; ' +

			'IF parent_module_type = \'service\' AND NEW.type <> \'service\' ' +
			'THEN ' +
				'RAISE SQLSTATE \'2F003\' USING MESSAGE = \'Services cannot have sub-modules other than Services\' ; ' +
				'RETURN NULL; ' +
			'END IF; ' +

			'IF NEW.id = NEW.parent ' +
			'THEN ' +
				'RAISE SQLSTATE \'2F003\' USING MESSAGE = \'Module cannot be its own parent\'; ' +
				'RETURN NULL; ' +
			'END IF; ' +

			'is_module_in_tree := 0; ' +
			'SELECT ' +
				'COUNT(id) ' +
			'FROM ' +
				'fn_get_module_ancestors(NEW.parent) ' +
			'WHERE ' +
				'id = NEW.id ' +
			'INTO ' +
				'is_module_in_tree; ' +

			'IF is_module_in_tree > 0 ' +
			'THEN ' +
				'RAISE SQLSTATE \'2F003\' USING MESSAGE = \'Module cannot be its own ancestor\'; ' +
				'RETURN NULL; ' +
			'END IF; ' +

			'is_module_in_tree := 0; ' +
			'SELECT ' +
				'COUNT(id) ' +
			'FROM ' +
				'fn_get_module_descendants(NEW.id) ' +
			'WHERE ' +
				'id = NEW.id AND ' +
				'level > 1 ' +
			'INTO ' +
				'is_module_in_tree; ' +

			'IF is_module_in_tree > 0 ' +
			'THEN ' +
				'RAISE SQLSTATE \'2F003\' USING MESSAGE = \'Module cannot be its own descendant\'; ' +
				'RETURN NULL; ' +
			'END IF; ' +

			'RETURN NEW; ' +
		'END; ' +
		'$$;'
	);

	await knex.schema.withSchema('public').raw(
		'CREATE OR REPLACE FUNCTION public.fn_notify_config_change () ' +
			'RETURNS trigger ' +
			'LANGUAGE plpgsql ' +
			'VOLATILE ' +
			'CALLED ON NULL INPUT ' +
			'SECURITY INVOKER ' +
			'COST 1 ' +
			'AS $$ ' +
		'DECLARE ' +
			'twyr_application_name TEXT; ' +
		'BEGIN ' +
			'IF OLD.configuration = NEW.configuration AND OLD.enabled = NEW.enabled ' +
			'THEN ' +
				'RETURN NEW; ' +
			'END IF; ' +

			'SELECT ' +
				'name ' +
			'FROM ' +
				'fn_get_module_ancestors(NEW.id) ' +
			'WHERE ' +
				'parent IS NULL ' +
			'INTO ' +
				'twyr_application_name; ' +

			'IF OLD.configuration <> NEW.configuration ' +
			'THEN ' +
				'PERFORM pg_notify(CONCAT(twyr_application_name, \'ConfigChange\'), CAST(NEW.id AS text)); ' +
			'END IF; ' +

			'IF OLD.enabled <> NEW.enabled ' +
			'THEN ' +
				'PERFORM pg_notify(CONCAT(twyr_application_name, \'StateChange\'), CAST(NEW.id AS text)); ' +
			'END IF; ' +

			'RETURN NEW; ' +
		'END; ' +
		'$$;'
	);

	await knex.schema.withSchema('public').raw(
		'CREATE OR REPLACE FUNCTION public.fn_assign_module_to_tenant () ' +
			'RETURNS trigger ' +
			'LANGUAGE plpgsql ' +
			'VOLATILE  ' +
			'CALLED ON NULL INPUT ' +
			'SECURITY INVOKER ' +
			'COST 1 ' +
			'AS $$ ' +

		'BEGIN ' +
			'IF NEW.type <> \'component\' AND NEW.type <> \'server\' ' +
			'THEN ' +
				'RETURN NEW; ' +
			'END IF; ' +

			'IF NEW.admin_only = false OR NEW.type = \'server\' ' +
			'THEN ' +
				'INSERT INTO tenants_modules ( ' +
					'tenant, ' +
					'module ' +
				') ' +
				'SELECT ' +
					'id, ' +
					'NEW.id ' +
				'FROM ' +
					'tenants; ' +
			'END IF; ' +

			'IF NEW.admin_only = true AND NEW.type <> \'server\' ' +
			'THEN ' +
				'INSERT INTO tenants_modules ( ' +
					'tenant, ' +
					'module ' +
				') ' +
				'SELECT ' +
					'id, ' +
					'NEW.id ' +
				'FROM ' +
					'tenants ' +
				'WHERE ' +
					'sub_domain = \'www\'; ' +
			'END IF; ' +

			'RETURN NEW; ' +
		'END; ' +
		'$$;'
	);

	// Step 7: Setup user-defined functions on Tenants table
	await knex.schema.withSchema('public').raw(
		'CREATE OR REPLACE FUNCTION public.fn_assign_defaults_to_tenant () ' +
			'RETURNS trigger ' +
			'LANGUAGE plpgsql ' +
			'VOLATILE  ' +
			'CALLED ON NULL INPUT ' +
			'SECURITY INVOKER ' +
			'COST 1 ' +
			'AS $$ ' +
		'DECLARE ' +
			'admin_group_id		UUID; ' +
			'user_group_id		UUID; ' +
			'tenant_app_id		UUID; ' +
			'app_category_id	UUID; ' +
		'BEGIN ' +
			'INSERT INTO tenant_groups ( ' +
				'parent, ' +
				'tenant, ' +
				'name, ' +
				'display_name, ' +
				'description ' +
			') ' +
			'VALUES ( ' +
				'NULL, ' +
				'NEW.id, ' +
				'\'administrators\', ' +
				'NEW.name || \' Administrators\', ' +
				'\'The Administrator Group for \' || NEW.name ' +
			') ' +
			'RETURNING ' +
				'id ' +
			'INTO ' +
				'admin_group_id; ' +

			'INSERT INTO tenant_groups ( ' +
				'parent, ' +
				'tenant, ' +
				'name, ' +
				'display_name, ' +
				'description, ' +
				'default_for_new_user ' +
			') ' +
			'VALUES ( ' +
				'admin_group_id, ' +
				'NEW.id, ' +
				'\'users\', ' +
				'NEW.name || \' Users\', ' +
				'\'All Users Group for \' || NEW.name, ' +
				'true ' +
			') ' +
			'RETURNING ' +
				'id ' +
			'INTO ' +
				'user_group_id; ' +

			'IF NEW.sub_domain = \'www\' ' +
			'THEN ' +
				'INSERT INTO tenants_modules ( ' +
					'tenant, ' +
					'module ' +
				') ' +
				'SELECT ' +
					'NEW.id, ' +
					'id ' +
				'FROM ' +
					'modules ' +
				'WHERE ' +
					'type = \'server\' OR type = \'component\' ; ' +
			'END IF; ' +

			'IF NEW.sub_domain <> \'www\' ' +
			'THEN ' +
				'INSERT INTO tenants_modules ( ' +
					'tenant, ' +
					'module ' +
				') ' +
				'SELECT ' +
					'NEW.id, ' +
					'id ' +
				'FROM ' +
					'modules ' +
				'WHERE ' +
					'type = \'server\' OR ' +
					'(type = \'component\' AND admin_only = false); ' +
			'END IF; ' +

			'INSERT INTO tenant_group_permissions ( ' +
				'tenant, ' +
				'tenant_group, ' +
				'module, ' +
				'permission ' +
			') ' +
			'SELECT ' +
				'NEW.id, ' +
				'user_group_id, ' +
				'module, ' +
				'permission ' +
			'FROM ' +
				'tenant_group_permissions ' +
			'WHERE ' +
				'tenant_group = (SELECT id FROM tenant_groups WHERE tenant = (SELECT id FROM tenants WHERE sub_domain = \'www\') AND default_for_new_user = true) ' +
			'ON CONFLICT ' +
				'DO NOTHING; ' +

			'RETURN NEW; ' +
		'END; ' +
		'$$;'
	);

	// Step 8: Setup user-defined functions on Users table
	await knex.schema.withSchema('public').raw(
		'CREATE OR REPLACE FUNCTION public.fn_get_user_permissions (IN tenantId uuid, IN userid uuid) ' +
			'RETURNS TABLE (permission uuid, name text, depends_on jsonb) ' +
			'LANGUAGE plpgsql ' +
			'VOLATILE  ' +
			'CALLED ON NULL INPUT ' +
			'SECURITY INVOKER ' +
			'COST 1 ' +
			'AS $$ ' +
		'BEGIN ' +
			'RETURN QUERY ' +
			'SELECT ' +
				'Z.id, ' +
				'Z.name, ' +
				'Z.depends_on ' +
			'FROM ' +
				'component_permissions Z ' +
			'WHERE ' +
				'Z.id IN (' +
					'SELECT DISTINCT ' +
						'A.permission ' +
					'FROM ' +
						'tenant_group_permissions A ' +
					'WHERE ' +
						'A.tenant_group IN ( ' +
							'SELECT ' +
								'B.tenant_group ' +
							'FROM ' +
								'tenants_users_groups B ' +
							'WHERE ' +
								'B.tenant_user IN ( ' +
									'SELECT ' +
										'C.id ' +
									'FROM ' +
										'tenants_users C ' +
									'WHERE ' +
										'C.login = userid AND ' +
										'C.tenant = tenantId ' +
								') ' +
						') ' +
					'); ' +
		'END; ' +
		'$$;'
	);

	// Step 9: Setup user-defined functions on Permissions table
	await knex.schema.withSchema('public').raw(
		'CREATE OR REPLACE FUNCTION public.fn_check_permission_insert_is_valid () ' +
			'RETURNS trigger ' +
			'LANGUAGE plpgsql ' +
			'VOLATILE ' +
			'CALLED ON NULL INPUT ' +
			'SECURITY INVOKER ' +
			'COST 1 ' +
			'AS $$ ' +
		'DECLARE ' +
			'is_component	INTEGER; ' +
		'BEGIN ' +
			'SELECT ' +
				'count(id) ' +
			'FROM ' +
				'modules ' +
			'WHERE ' +
				'id = NEW.module AND ' +
				'(type = \'component\' OR type = \'server\') ' +
			'INTO ' +
				'is_component; ' +

			'IF is_component <= 0 ' +
			'THEN ' +
				'RAISE SQLSTATE \'2F003\' USING MESSAGE = \'Permissions can be defined only for Servers and Components, and not for other types of modules\'; ' +
				'RETURN NULL; ' +
			'END IF; ' +

			'RETURN NEW; ' +
		'END; ' +
		'$$;'
	);

	await knex.schema.withSchema('public').raw(
		'CREATE OR REPLACE FUNCTION public.fn_check_permission_update_is_valid () ' +
			'RETURNS trigger ' +
			'LANGUAGE plpgsql ' +
			'VOLATILE ' +
			'CALLED ON NULL INPUT ' +
			'SECURITY INVOKER ' +
			'COST 1 ' +
			'AS $$ ' +

		'BEGIN ' +
			'IF OLD.module <> NEW.module ' +
			'THEN ' +
				'RAISE SQLSTATE \'2F003\' USING MESSAGE = \'Module assigned to a permission is NOT mutable\'; ' +
				'RETURN NULL; ' +
			'END IF; ' +

			'IF OLD.name <> NEW.name ' +
			'THEN ' +
				'RAISE SQLSTATE \'2F003\' USING MESSAGE = \'Permission name is NOT mutable\'; ' +
				'RETURN NULL; ' +
			'END IF; ' +

			'RETURN NEW; ' +
		'END; ' +
		'$$;'
	);

	await knex.schema.withSchema('public').raw(
		'CREATE OR REPLACE FUNCTION public.fn_assign_permission_to_tenants () ' +
			'RETURNS trigger ' +
			'LANGUAGE plpgsql ' +
			'VOLATILE  ' +
			'CALLED ON NULL INPUT ' +
			'SECURITY INVOKER ' +
			'COST 1 ' +
			'AS $$ ' +
		'BEGIN ' +
			'INSERT INTO tenant_group_permissions ( ' +
				'tenant, ' +
				'tenant_group, ' +
				'module, ' +
				'permission ' +
			') ' +
			'SELECT ' +
				'A.tenant, ' +
				'B.id, ' +
				'A.module, ' +
				'NEW.id ' +
			'FROM ' +
				'tenants_modules A ' +
				'INNER JOIN tenant_groups B ON (A.tenant = B.tenant) ' +
			'WHERE ' +
				'A.module = NEW.module AND ' +
				'B.parent IS NULL; ' +

			'RETURN NEW; ' +
		'END; ' +
		'$$;'
	);

	// Step 10: Setup user-defined functions on Tenant Modules table
	await knex.schema.withSchema('public').raw(
		'CREATE OR REPLACE FUNCTION public.fn_check_tenant_module_upsert_is_valid () ' +
			'RETURNS trigger ' +
			'LANGUAGE plpgsql ' +
			'VOLATILE  ' +
			'CALLED ON NULL INPUT ' +
			'SECURITY INVOKER ' +
			'COST 1 ' +
			'AS $$ ' +

		'DECLARE ' +
			'is_component	INTEGER; ' +
			'component_parent	UUID; ' +
			'is_admin_only	BOOLEAN; ' +
			'tenant_sub_domain	TEXT; ' +
		'BEGIN ' +
			'is_component := 0; ' +
			'SELECT ' +
				'count(id) ' +
			'FROM ' +
				'modules ' +
			'WHERE ' +
				'id = NEW.module AND ' +
				'(type = \'component\' OR type = \'server\') ' +
			'INTO ' +
				'is_component; ' +

			'IF is_component <= 0 ' +
			'THEN ' +
				'RAISE SQLSTATE \'2F003\' USING MESSAGE = \'Only Servers and Components can be mapped to tenants\'; ' +
				'RETURN NULL; ' +
			'END IF; ' +

			'component_parent := NULL; ' +
			'SELECT  ' +
				'parent ' +
			'FROM ' +
				'modules ' +
			'WHERE ' +
				'id = NEW.module ' +
			'INTO ' +
				'component_parent; ' +

			'IF component_parent IS NULL ' +
			'THEN ' +
				'RETURN NEW; ' +
			'END IF; ' +

			'IF component_parent IS NOT NULL ' +
			'THEN ' +
				'is_component := 0; ' +
				'SELECT ' +
					'count(id) ' +
				'FROM ' +
					'tenants_modules ' +
				'WHERE ' +
					'tenant = NEW.tenant AND ' +
					'module = component_parent ' +
				'INTO ' +
					'is_component; ' +

				'IF is_component = 0 ' +
				'THEN ' +
					'RAISE WARNING SQLSTATE \'2F003\' USING MESSAGE = \'Parent component not mapped to this Tenant\'; ' +
				'END IF; ' +
			'END IF; ' +

			'is_admin_only := false; ' +
			'SELECT ' +
				'admin_only ' +
			'FROM ' +
				'modules ' +
			'WHERE ' +
				'id = NEW.module ' +
			'INTO ' +
				'is_admin_only; ' +

			'IF is_admin_only = false ' +
			'THEN ' +
				'RETURN NEW; ' +
			'END IF; ' +

			'tenant_sub_domain := \'\'; ' +
			'SELECT ' +
				'sub_domain ' +
			'FROM ' +
				'tenants ' +
			'WHERE ' +
				'id = NEW.tenant ' +
			'INTO ' +
				'tenant_sub_domain; ' +

			'IF tenant_sub_domain <> \'www\' ' +
			'THEN ' +
				'RAISE SQLSTATE \'2F003\' USING MESSAGE = \'Admin only components can be mapped only to root tenant\'; ' +
				'RETURN NULL; ' +
			'END IF; ' +

			'RETURN NEW; ' +
		'END; ' +
		'$$;'
	);

	await knex.schema.withSchema('public').raw(
		'CREATE OR REPLACE FUNCTION public.fn_assign_permission_to_tenant_group () ' +
			'RETURNS trigger ' +
			'LANGUAGE plpgsql ' +
			'VOLATILE  ' +
			'CALLED ON NULL INPUT ' +
			'SECURITY INVOKER ' +
			'COST 1 ' +
			'AS $$ ' +

		'DECLARE ' +
			'tenant_root_tenant_group	UUID; ' +
		'BEGIN ' +
			'tenant_root_tenant_group := NULL; ' +
			'SELECT ' +
				'id ' +
			'FROM ' +
				'tenant_groups ' +
			'WHERE ' +
				'tenant = NEW.tenant AND ' +
				'parent IS NULL ' +
			'INTO ' +
				'tenant_root_tenant_group; ' +

			'IF tenant_root_tenant_group IS NULL ' +
			'THEN ' +
				'RETURN NEW; ' +
			'END IF; ' +

			'INSERT INTO tenant_group_permissions( ' +
				'tenant, ' +
				'tenant_group, ' +
				'module, ' +
				'permission ' +
			') ' +
			'SELECT ' +
				'NEW.tenant, ' +
				'tenant_root_tenant_group, ' +
				'module, ' +
				'id ' +
			'FROM ' +
				'component_permissions ' +
			'WHERE ' +
				'module = NEW.module; ' +

			'RETURN NEW; ' +
		'END; ' +
		'$$;'
	);

	await knex.schema.withSchema('public').raw(
		'CREATE OR REPLACE FUNCTION public.fn_remove_descendant_module_from_tenant () ' +
			'RETURNS trigger ' +
			'LANGUAGE plpgsql ' +
			'VOLATILE  ' +
			'CALLED ON NULL INPUT ' +
			'SECURITY INVOKER ' +
			'COST 1 ' +
			'AS $$ ' +

		'BEGIN ' +
			'DELETE FROM ' +
				'tenants_modules ' +
			'WHERE ' +
				'tenant = OLD.tenant AND ' +
				'module IN (SELECT id FROM fn_get_module_descendants(OLD.module) WHERE level = 2); ' +

			'RETURN OLD; ' +
		'END; ' +
		'$$;'
	);

	// Step 11: Setup user-defined functions on Groups & Group Permissions table
	await knex.schema.withSchema('public').raw(
		'CREATE OR REPLACE FUNCTION public.fn_get_group_ancestors (IN groupid uuid) ' +
			'RETURNS TABLE (level integer,  id uuid,  parent uuid,  name text) ' +
			'LANGUAGE plpgsql ' +
			'VOLATILE  ' +
			'CALLED ON NULL INPUT ' +
			'SECURITY INVOKER ' +
			'COST 1 ' +
			'AS $$ ' +
		'BEGIN ' +
			'RETURN QUERY ' +
			'WITH RECURSIVE q AS ( ' +
				'SELECT ' +
					'1 AS level, ' +
					'A.id, ' +
					'A.parent, ' +
					'A.name ' +
				'FROM ' +
					'tenant_groups A ' +
				'WHERE ' +
					'A.id = groupid ' +
				'UNION ALL ' +
				'SELECT ' +
					'q.level + 1, ' +
					'B.id, ' +
					'B.parent, ' +
					'B.name ' +
				'FROM ' +
					'q, ' +
					'tenant_groups B ' +
				'WHERE ' +
					'B.id = q.parent ' +
			') ' +
			'SELECT DISTINCT ' +
				'q.level, ' +
				'q.id, ' +
				'q.parent, ' +
				'q.name ' +
			'FROM ' +
				'q ' +
			'ORDER BY ' +
				'q.level, ' +
				'q.parent; ' +
		'END; ' +
		'$$;'
	);

	await knex.schema.withSchema('public').raw(
		'CREATE OR REPLACE FUNCTION public.fn_get_group_descendants (IN groupid uuid) ' +
			'RETURNS TABLE (level integer,  id uuid,  parent uuid,  name text) ' +
			'LANGUAGE plpgsql ' +
			'VOLATILE  ' +
			'CALLED ON NULL INPUT ' +
			'SECURITY INVOKER ' +
			'COST 1 ' +
			'AS $$ ' +
		'BEGIN ' +
			'RETURN QUERY ' +
			'WITH RECURSIVE q AS ( ' +
				'SELECT ' +
					'1 AS level, ' +
					'A.id, ' +
					'A.parent, ' +
					'A.name ' +
				'FROM ' +
					'tenant_groups A ' +
				'WHERE ' +
					'A.id = groupid ' +
				'UNION ALL ' +
				'SELECT ' +
					'q.level + 1, ' +
					'B.id, ' +
					'B.parent, ' +
					'B.name ' +
				'FROM ' +
					'q, ' +
					'tenant_groups B ' +
				'WHERE ' +
					'B.parent = q.id ' +
			') ' +
			'SELECT DISTINCT ' +
				'q.level, ' +
				'q.id, ' +
				'q.parent, ' +
				'q.name ' +
			'FROM ' +
				'q ' +
			'ORDER BY ' +
				'q.level, ' +
				'q.parent; ' +
		'END; ' +
		'$$;'
	);

	await knex.schema.withSchema('public').raw(
		'CREATE OR REPLACE FUNCTION public.fn_check_group_update_is_valid () ' +
			'RETURNS trigger ' +
			'LANGUAGE plpgsql ' +
			'VOLATILE ' +
			'CALLED ON NULL INPUT ' +
			'SECURITY INVOKER ' +
			'COST 1 ' +
			'AS $$ ' +

		'BEGIN ' +
			'IF OLD.parent <> NEW.parent ' +
			'THEN ' +
				'RAISE SQLSTATE \'2F003\' USING MESSAGE = \'Group cannot change parent\'; ' +
				'RETURN NULL; ' +
			'END IF; ' +

			'RETURN NEW; ' +
		'END; ' +
		'$$;'
	);

	await knex.schema.withSchema('public').raw(
		'CREATE OR REPLACE FUNCTION public.fn_check_group_permission_insert_is_valid () ' +
			'RETURNS trigger ' +
			'LANGUAGE plpgsql ' +
			'VOLATILE  ' +
			'CALLED ON NULL INPUT ' +
			'SECURITY INVOKER ' +
			'COST 1 ' +
			'AS $$ ' +
		'DECLARE ' +
			'parent_tenant_group					UUID; ' +
			'does_parent_group_have_permission	INTEGER; ' +
		'BEGIN ' +
			'parent_tenant_group := NULL; ' +
			'SELECT ' +
				'parent ' +
			'FROM ' +
				'tenant_groups ' +
			'WHERE ' +
				'id = NEW.tenant_group ' +
			'INTO ' +
				'parent_tenant_group; ' +

			'IF parent_tenant_group IS NULL ' +
			'THEN ' +
				'RETURN NEW; ' +
			'END IF; ' +

			'does_parent_group_have_permission := 0; ' +
			'SELECT ' +
				'count(id) ' +
			'FROM ' +
				'tenant_group_permissions ' +
			'WHERE ' +
				'tenant_group = parent_tenant_group AND ' +
				'permission = NEW.permission ' +
			'INTO ' +
				'does_parent_group_have_permission; ' +

			'IF does_parent_group_have_permission > 0 ' +
			'THEN ' +
				'RETURN NEW; ' +
			'END IF; ' +

			'RAISE SQLSTATE \'2F003\' USING MESSAGE = \'Parent Group does not have this permission\'; ' +
			'RETURN NULL; ' +
		'END; ' +
		'$$;'
	);

	await knex.schema.withSchema('public').raw(
		'CREATE OR REPLACE FUNCTION public.fn_remove_group_permission_from_descendants () ' +
			'RETURNS trigger ' +
			'LANGUAGE plpgsql ' +
			'VOLATILE  ' +
			'CALLED ON NULL INPUT ' +
			'SECURITY INVOKER ' +
			'COST 1 ' +
			'AS $$ ' +

		'BEGIN ' +
			'DELETE FROM ' +
				'tenant_group_permissions ' +
			'WHERE ' +
				'tenant_group IN (SELECT id FROM fn_get_group_descendants(OLD.tenant_group) WHERE level = 2) AND ' +
				'permission = OLD.permission; ' +

			'RETURN OLD; ' +
		'END; ' +
		'$$;'
	);

	// Step 12: Setup user-defined functions on Tenants Users table
	await knex.schema.withSchema('public').raw(
		'CREATE OR REPLACE FUNCTION public.fn_assign_default_group_to_tenant_user () ' +
			'RETURNS trigger ' +
			'LANGUAGE plpgsql ' +
			'VOLATILE  ' +
			'CALLED ON NULL INPUT ' +
			'SECURITY INVOKER ' +
			'COST 1 ' +
			'AS $$ ' +

		'DECLARE ' +
			'default_tenant_group	UUID; ' +
		'BEGIN ' +
			'default_tenant_group := NULL; ' +
			'SELECT ' +
				'id ' +
			'FROM ' +
				'tenant_groups ' +
			'WHERE ' +
				'tenant = NEW.tenant AND ' +
				'default_for_new_user = true ' +
			'INTO ' +
				'default_tenant_group; ' +

			'IF default_tenant_group IS NULL ' +
			'THEN ' +
				'RETURN NEW; ' +
			'END IF; ' +

			'INSERT INTO tenants_users_groups ( ' +
				'tenant, ' +
				'tenant_group, ' +
				'tenant_user ' +
			') ' +
			'VALUES ( ' +
				'NEW.tenant, ' +
				'default_tenant_group, ' +
				'NEW.id ' +
			'); ' +

			'RETURN NEW; ' +
		'END; ' +
		'$$;'
	);

	await knex.schema.withSchema('public').raw(
		'CREATE OR REPLACE FUNCTION public.fn_check_tenant_user_upsert_is_valid () ' +
			'RETURNS trigger ' +
			'LANGUAGE plpgsql ' +
			'VOLATILE  ' +
			'CALLED ON NULL INPUT ' +
			'SECURITY INVOKER ' +
			'COST 1 ' +
			'AS $$ ' +
		'BEGIN ' +
			'IF TG_OP = \'UPDATE\' ' +
			'THEN ' +
				'IF OLD.tenant <> NEW.tenant ' +
				'THEN ' +
					'RAISE SQLSTATE \'2F003\' USING MESSAGE = \'Tenant is NOT mutable\'; ' +
					'RETURN NULL; ' +
				'END IF; ' +

				'IF OLD.login <> NEW.login ' +
				'THEN ' +
					'RAISE SQLSTATE \'2F003\' USING MESSAGE = \'Login is NOT mutable\'; ' +
					'RETURN NULL; ' +
				'END IF; ' +
			'END IF; ' +

			'RETURN NEW; ' +
		'END; ' +
		'$$;'
	);

	// Step 13: Setup user-defined functions on Tenants Users Groups table
	await knex.schema.withSchema('public').raw(
		'CREATE OR REPLACE FUNCTION public.fn_check_tenant_user_group_upsert_is_valid () ' +
			'RETURNS trigger ' +
			'LANGUAGE plpgsql ' +
			'VOLATILE  ' +
			'CALLED ON NULL INPUT ' +
			'SECURITY INVOKER ' +
			'COST 1 ' +
			'AS $$ ' +
		'DECLARE ' +
			'is_member_of_ancestor_group	INTEGER; ' +
		'BEGIN ' +
			'is_member_of_ancestor_group := 0; ' +
			'SELECT ' +
				'count(id) ' +
			'FROM ' +
				'tenants_users_groups ' +
			'WHERE ' +
				'tenant = NEW.tenant AND ' +
				'tenant_group IN (SELECT id FROM fn_get_group_ancestors(NEW.tenant_group) WHERE level > 1) AND ' +
				'tenant_user = NEW.tenant_user ' +
			'INTO ' +
				'is_member_of_ancestor_group; ' +

			'IF is_member_of_ancestor_group = 0 ' +
			'THEN ' +
				'RETURN NEW; ' +
			'END IF; ' +

			'RAISE SQLSTATE \'2F003\' USING MESSAGE = \'User is already a member of a Parent Group\'; ' +
			'RETURN NULL; ' +
		'END; ' +
		'$$;'
	);

	await knex.schema.withSchema('public').raw(
		'CREATE OR REPLACE FUNCTION public.fn_remove_descendant_group_from_tenant_user () ' +
			'RETURNS trigger ' +
			'LANGUAGE plpgsql ' +
			'VOLATILE  ' +
			'CALLED ON NULL INPUT ' +
			'SECURITY INVOKER ' +
			'COST 1 ' +
			'AS $$ ' +
		'BEGIN ' +
			'DELETE FROM ' +
				'tenants_users_groups ' +
			'WHERE ' +
				'tenant = NEW.tenant AND ' +
				'tenant_group IN (SELECT id FROM fn_get_group_descendants(NEW.tenant_group) WHERE level >= 2) AND ' +
				'tenant_user = NEW.tenant_user; ' +

			'RETURN NEW; ' +
		'END; ' +
		'$$;'
	);

	// Finally: Create the triggers on all the tables
	await knex.schema.withSchema('public').raw('CREATE TRIGGER trigger_notify_config_change AFTER UPDATE ON public.modules FOR EACH ROW EXECUTE PROCEDURE public.fn_notify_config_change();');
	await knex.schema.withSchema('public').raw('CREATE TRIGGER trigger_check_module_upsert_is_valid BEFORE INSERT OR UPDATE ON public.modules FOR EACH ROW EXECUTE PROCEDURE public.fn_check_module_upsert_is_valid();');
	await knex.schema.withSchema('public').raw('CREATE TRIGGER trigger_assign_module_to_tenant AFTER INSERT ON public.modules FOR EACH ROW EXECUTE PROCEDURE public.fn_assign_module_to_tenant();');
	await knex.schema.withSchema('public').raw('CREATE TRIGGER trigger_assign_defaults_to_tenant AFTER INSERT ON public.tenants FOR EACH ROW EXECUTE PROCEDURE public.fn_assign_defaults_to_tenant();');
	await knex.schema.withSchema('public').raw('CREATE TRIGGER trigger_check_permission_insert_is_valid BEFORE INSERT ON public.component_permissions FOR EACH ROW EXECUTE PROCEDURE public.fn_check_permission_insert_is_valid();');
	await knex.schema.withSchema('public').raw('CREATE TRIGGER trigger_check_permission_update_is_valid BEFORE UPDATE ON public.component_permissions FOR EACH ROW EXECUTE PROCEDURE public.fn_check_permission_update_is_valid();');
	await knex.schema.withSchema('public').raw('CREATE TRIGGER trigger_assign_default_group_to_tenant_user AFTER INSERT ON public.tenants_users FOR EACH ROW EXECUTE PROCEDURE public.fn_assign_default_group_to_tenant_user();');
	await knex.schema.withSchema('public').raw('CREATE TRIGGER trigger_check_tenant_user_upsert_is_valid BEFORE INSERT OR UPDATE ON public.tenants_users FOR EACH ROW EXECUTE PROCEDURE public.fn_check_tenant_user_upsert_is_valid();');
	await knex.schema.withSchema('public').raw('CREATE TRIGGER trigger_check_group_update_is_valid BEFORE UPDATE ON public.tenant_groups FOR EACH ROW EXECUTE PROCEDURE public.fn_check_group_update_is_valid();');
	await knex.schema.withSchema('public').raw('CREATE TRIGGER trigger_check_tenant_module_upsert_is_valid BEFORE INSERT OR UPDATE ON public.tenants_modules FOR EACH ROW EXECUTE PROCEDURE public.fn_check_tenant_module_upsert_is_valid();');
	await knex.schema.withSchema('public').raw('CREATE TRIGGER trigger_assign_permission_to_tenant_group AFTER INSERT OR UPDATE ON public.tenants_modules FOR EACH ROW EXECUTE PROCEDURE public.fn_assign_permission_to_tenant_group();');
	await knex.schema.withSchema('public').raw('CREATE TRIGGER trigger_remove_descendant_module_from_tenant AFTER DELETE ON public.tenants_modules FOR EACH ROW EXECUTE PROCEDURE public.fn_remove_descendant_module_from_tenant();');
	await knex.schema.withSchema('public').raw('CREATE TRIGGER trigger_remove_group_permission_from_descendants AFTER DELETE ON public.tenant_group_permissions FOR EACH ROW EXECUTE PROCEDURE public.fn_remove_group_permission_from_descendants();');
	await knex.schema.withSchema('public').raw('CREATE TRIGGER trigger_check_group_permission_insert_is_valid BEFORE INSERT OR UPDATE ON public.tenant_group_permissions FOR EACH ROW EXECUTE PROCEDURE public.fn_check_group_permission_insert_is_valid();');
	await knex.schema.withSchema('public').raw('CREATE TRIGGER trigger_assign_permission_to_tenants AFTER INSERT ON public.component_permissions FOR EACH ROW EXECUTE PROCEDURE public.fn_assign_permission_to_tenants();');
	await knex.schema.withSchema('public').raw('CREATE TRIGGER trigger_remove_descendant_group_from_tenant_user AFTER INSERT OR UPDATE ON public.tenants_users_groups FOR EACH ROW EXECUTE PROCEDURE public.fn_remove_descendant_group_from_tenant_user();');
	await knex.schema.withSchema('public').raw('CREATE TRIGGER trigger_check_tenant_user_group_upsert_is_valid BEFORE INSERT OR UPDATE ON public.tenants_users_groups FOR EACH ROW EXECUTE PROCEDURE public.fn_check_tenant_user_group_upsert_is_valid();');

	return null;
};

exports.down = async function(knex) {
	await knex.schema.raw('DROP SCHEMA public CASCADE;');
	await knex.schema.raw('CREATE SCHEMA public;');

	return null;
};
