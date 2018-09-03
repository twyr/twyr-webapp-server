/**
 * This sets up the schema for servers based on the base TwyrServer - for e.g., the TwyrWebappServer
 * @ignore
 */
exports.up = async function(knex) {
	let exists = null;

	// Step 1: Setup the basics in the database
	await knex.schema.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public');

	// Step 2: Create the enums we need
	await knex.schema.raw("CREATE TYPE public.module_type AS ENUM ('component', 'feature', 'middleware', 'service', 'server', 'template')");
	await knex.schema.raw("CREATE TYPE public.module_deploy_type AS ENUM ('admin', 'custom', 'default')");

	// Step 3: Create the basic "modules" table
	exists = await knex.schema.withSchema('public').hasTable('modules');
	if(!exists) {
		await knex.schema.withSchema('public').createTable('modules', (modTbl) => {
			modTbl.uuid('module_id').notNullable().primary().defaultTo(knex.raw('uuid_generate_v4()'));
			modTbl.uuid('parent_module_id').references('module_id').inTable('modules').onDelete('CASCADE').onUpdate('CASCADE');
			modTbl.specificType('type', 'public.module_type').notNullable().defaultTo('feature');
			modTbl.specificType('deploy', 'public.module_deploy_type').notNullable().defaultTo('admin');
			modTbl.text('name').notNullable();
			modTbl.text('display_name').notNullable();
			modTbl.text('description').notNullable().defaultTo(`Another Twyr Module`);
			modTbl.jsonb('metadata').notNullable().defaultTo('{}');
			modTbl.jsonb('configuration').notNullable().defaultTo('{}');
			modTbl.jsonb('configuration_schema').notNullable().defaultTo('{}');
			modTbl.boolean('enabled').notNullable().defaultTo(true);
			modTbl.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
			modTbl.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

			modTbl.unique(['parent_module_id', 'type', 'name']);
		});
	}

	// Step 4: Setup permissions table - stores details of permissions defined/described by the features
	exists = await knex.schema.withSchema('public').hasTable('feature_permissions');
	if(!exists) {
		await knex.schema.withSchema('public').createTable('feature_permissions', function(permTbl) {
			permTbl.uuid('module_id').notNullable().references('module_id').inTable('modules').onDelete('CASCADE').onUpdate('CASCADE');
			permTbl.uuid('feature_permission_id').notNullable().defaultTo(knex.raw('uuid_generate_v4()'));
			permTbl.text('name').notNullable();
			permTbl.text('display_name').notNullable();
			permTbl.jsonb('implies_permissions').notNullable().defaultTo('[]');
			permTbl.text('description').notNullable().defaultTo('Another Random Permission');
			permTbl.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
			permTbl.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

			permTbl.primary(['module_id', 'feature_permission_id']);
			permTbl.unique(['module_id', 'name']);
		});
	}

	// Step 5: Setup feature front-end components table - self-contained ember components that can be embedded into any routes
	exists = await knex.schema.withSchema('public').hasTable('feature_frontend_components');
	if(!exists) {
		await knex.schema.withSchema('public').createTable('feature_frontend_components', function(featureFrontendComponentTbl) {
			featureFrontendComponentTbl.uuid('module_id').notNullable().references('module_id').inTable('modules').onDelete('CASCADE').onUpdate('CASCADE');
			featureFrontendComponentTbl.uuid('feature_frontend_component_id').notNullable().defaultTo(knex.raw('uuid_generate_v4()'));
			featureFrontendComponentTbl.text('name').notNullable();
			featureFrontendComponentTbl.text('display_name').notNullable();
			featureFrontendComponentTbl.jsonb('configuration_schema').notNullable().defaultTo('{}');
			featureFrontendComponentTbl.jsonb('default_configuration').notNullable().defaultTo('{}');
			featureFrontendComponentTbl.text('description').notNullable().defaultTo('A Random Ember Component');
			featureFrontendComponentTbl.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
			featureFrontendComponentTbl.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

			featureFrontendComponentTbl.primary(['module_id', 'feature_frontend_component_id']);
			featureFrontendComponentTbl.unique(['module_id', 'name']);
		});
	}

	// Step 6: Setup user-defined functions on the modules table for traversing the tree, etc.
	await knex.schema.withSchema('public').raw(
`CREATE OR REPLACE FUNCTION public.fn_get_module_ancestors (IN moduleid uuid)
	RETURNS TABLE (level integer,  module_id uuid,  parent_module_id uuid,  name text,  type public.module_type, enabled boolean)
	LANGUAGE plpgsql
	VOLATILE
	CALLED ON NULL INPUT
	SECURITY INVOKER
	COST 1
	AS $$
BEGIN
	RETURN QUERY
	WITH RECURSIVE q AS (
		SELECT
			1 AS level,
			A.module_id,
			A.parent_module_id,
			A.name,
			A.type,
			A.enabled
		FROM
			modules A
		WHERE
			A.module_id = moduleid
		UNION ALL
		SELECT
			q.level + 1,
			B.module_id,
			B.parent_module_id,
			B.name,
			B.type,
			B.enabled
		FROM
			q,
			modules B
		WHERE
			B.module_id = q.parent_module_id
	)
	SELECT DISTINCT
		q.level,
		q.module_id,
		q.parent_module_id,
		q.name,
		q.type,
		q.enabled
	FROM
		q
	ORDER BY
		q.level;
END;
$$;`
	);

	await knex.schema.withSchema('public').raw(
`CREATE OR REPLACE FUNCTION public.fn_get_module_descendants (IN moduleid uuid)
	RETURNS TABLE (level integer,  module_id uuid,  parent_module_id uuid,  name text,  type public.module_type, enabled boolean)
	LANGUAGE plpgsql
	VOLATILE
	CALLED ON NULL INPUT
	SECURITY INVOKER
	COST 1
	AS $$
BEGIN
	RETURN QUERY
	WITH RECURSIVE q AS (
		SELECT
			1 AS level,
			A.module_id,
			A.parent_module_id,
			A.name,
			A.type,
			A.enabled
		FROM
			modules A
		WHERE
			A.module_id = moduleid
		UNION ALL
		SELECT
			q.level + 1,
			B.module_id,
			B.parent_module_id,
			B.name,
			B.type,
			B.enabled
		FROM
			q,
			modules B
		WHERE
			B.parent_module_id = q.module_id
	)
	SELECT DISTINCT
		q.level,
		q.module_id,
		q.parent_module_id,
		q.name,
		q.type,
		q.enabled
	FROM
		q
	ORDER BY
		q.level;
END;
$$;`
	);

	await knex.schema.withSchema('public').raw(
`CREATE OR REPLACE FUNCTION public.fn_is_module_enabled (IN moduleid uuid)
	RETURNS boolean
	LANGUAGE plpgsql
	VOLATILE
	CALLED ON NULL INPUT
	SECURITY INVOKER
	COST 1
	AS $$
DECLARE
	is_disabled	integer;
BEGIN
	is_disabled := 0;

	SELECT
		COUNT(enabled)
	FROM
		fn_get_module_ancestors(moduleid)
	WHERE
		enabled = false
	INTO
		is_disabled;

	RETURN is_disabled <= 0;
END;
$$;`
	);

	// Step 7: Enforce rules for sanity using triggers.
	await knex.schema.withSchema('public').raw(
`CREATE OR REPLACE FUNCTION public.fn_check_module_upsert_is_valid ()
	RETURNS trigger
	LANGUAGE plpgsql
	VOLATILE
	CALLED ON NULL INPUT
	SECURITY INVOKER
	COST 1
	AS $$
DECLARE
	parent_module_type	TEXT;
	is_module_in_tree	INTEGER;
BEGIN
	/* Rule #1: No obviously infinite loops */
	IF NEW.module_id = NEW.parent_module_id
	THEN
		RAISE SQLSTATE '2F003' USING MESSAGE = 'Module cannot be its own parent';
		RETURN NULL;
	END IF;

	/* Rule #2: Name and Type are not mutable */
	IF TG_OP = 'UPDATE'
	THEN
		IF OLD.name <> NEW.name
		THEN
			RAISE SQLSTATE '2F003' USING MESSAGE = 'Module name is NOT mutable';
			RETURN NULL;
		END IF;

		IF OLD.type <> NEW.type
		THEN
			RAISE SQLSTATE '2F003' USING MESSAGE = 'Module type is NOT mutable';
			RETURN NULL;
		END IF;
	END IF;

	/* Rule #3: Servers cannot have parents */
	IF NEW.type = 'server' AND NEW.parent_module_id IS NULL
	THEN
		RETURN NEW;
	END IF;

	IF NEW.type = 'server' AND NEW.parent_module_id IS NOT NULL
	THEN
		RAISE SQLSTATE '2F003' USING MESSAGE = 'Server Modules cannot have parents' ;
		RETURN NULL;
	END IF;

	/* Rule #4: All non-servers MUST have parents */
	IF NEW.type <> 'server' AND NEW.parent_module_id IS NULL
	THEN
		RAISE SQLSTATE '2F003' USING MESSAGE = 'Only Server Modules cannot have parents - all other module types must belong to a Server' ;
		RETURN NULL;
	END IF;

	/* Rule #5: Modules cannot host other module types as parents - unless they are either Servers or Features */
	IF parent_module_type <> 'server' AND parent_module_type <> 'feature' AND parent_module_type <> CAST(NEW.type AS TEXT)
	THEN
		RAISE SQLSTATE '2F003' USING MESSAGE = 'Sub-modules must be of the same type as the parent module - except in cases of servers and features' ;
		RETURN NULL;
	END IF;

	/* Rule #6: Templates cannot have sub-modules */
	parent_module_type := '';
	SELECT
		type
	FROM
		modules
	WHERE
		module_id = NEW.parent_module_id
	INTO
		parent_module_type;

	IF parent_module_type = 'template'
	THEN
		RAISE SQLSTATE '2F003' USING MESSAGE = 'Templates cannot have sub-modules' ;
		RETURN NULL;
	END IF;

	/* Rule #7: Only Servers/ Features can have templates */
	IF NEW.type = 'template' AND (parent_module_type <> 'server' AND parent_module_type <> 'feature')
	THEN
		RAISE SQLSTATE '2F003' USING MESSAGE = 'Only servers or features can have templates';
		RETURN NULL;
	END IF;

	/* Rule #8: No non-obvious infinite loops, either */
	is_module_in_tree := 0;
	SELECT
		COUNT(module_id)
	FROM
		fn_get_module_ancestors(NEW.parent_module_id)
	WHERE
		module_id = NEW.module_id
	INTO
		is_module_in_tree;

	IF is_module_in_tree > 0
	THEN
		RAISE SQLSTATE '2F003' USING MESSAGE = 'Module cannot be its own ancestor';
		RETURN NULL;
	END IF;

	is_module_in_tree := 0;
	SELECT
		COUNT(module_id)
	FROM
		fn_get_module_descendants(NEW.module_id)
	WHERE
		module_id = NEW.module_id AND
		level > 1
	INTO
		is_module_in_tree;

	IF is_module_in_tree > 0
	THEN
		RAISE SQLSTATE '2F003' USING MESSAGE = 'Module cannot be its own descendant';
		RETURN NULL;
	END IF;

	/* We're good to go! */
	RETURN NEW;
END;
$$;`
	);

	await knex.schema.withSchema('public').raw(
`CREATE OR REPLACE FUNCTION public.fn_check_permission_upsert_is_valid ()
	RETURNS trigger
	LANGUAGE plpgsql
	VOLATILE
	CALLED ON NULL INPUT
	SECURITY INVOKER
	COST 1
	AS $$
DECLARE
	is_feature	INTEGER;
BEGIN
	IF TG_OP = 'UPDATE'
	THEN
		IF OLD.module_id <> NEW.module_id
		THEN
			RAISE SQLSTATE '2F003' USING MESSAGE = 'Module assigned to a permission is NOT mutable';
			RETURN NULL;
		END IF;

		IF OLD.name <> NEW.name
		THEN
			RAISE SQLSTATE '2F003' USING MESSAGE = 'Permission name is NOT mutable';
			RETURN NULL;
		END IF;
	END IF;

	is_feature := 0;
	SELECT
		COUNT(module_id)
	FROM
		modules
	WHERE
		module_id = NEW.module_id AND
		(type = 'feature' OR type = 'server')
	INTO
		is_feature;

	IF is_feature <= 0
	THEN
		RAISE SQLSTATE '2F003' USING MESSAGE = 'Only Servers and Features can define permissions';
		RETURN NULL;
	END IF;

	RETURN NEW;
END;
$$;`
	);

	await knex.schema.withSchema('public').raw(
`CREATE OR REPLACE FUNCTION public.fn_check_frontend_component_upsert_is_valid ()
	RETURNS trigger
	LANGUAGE plpgsql
	VOLATILE
	CALLED ON NULL INPUT
	SECURITY INVOKER
	COST 1
	AS $$
DECLARE
	is_feature	INTEGER;
BEGIN
	IF TG_OP = 'UPDATE'
	THEN
		IF OLD.module_id <> NEW.module_id
		THEN
			RAISE SQLSTATE '2F003' USING MESSAGE = 'Module assigned to a frontend component is NOT mutable';
			RETURN NULL;
		END IF;

		IF OLD.name <> NEW.name
		THEN
			RAISE SQLSTATE '2F003' USING MESSAGE = 'Frontend component name is NOT mutable';
			RETURN NULL;
		END IF;
	END IF;

	is_feature := 0;
	SELECT
		COUNT(module_id)
	FROM
		modules
	WHERE
		module_id = NEW.module_id AND
		type = 'feature'
	INTO
		is_feature;

	IF is_feature <= 0
	THEN
		RAISE SQLSTATE '2F003' USING MESSAGE = 'Only Features can own frontend components';
		RETURN NULL;
	END IF;

	RETURN NEW;
END;
$$;`
	);

	// Step 8: Update outside world of goings-on using triggers.
	await knex.schema.withSchema('public').raw(
`CREATE OR REPLACE FUNCTION public.fn_notify_module_change ()
	RETURNS trigger
	LANGUAGE plpgsql
	VOLATILE
	CALLED ON NULL INPUT
	SECURITY INVOKER
	COST 1
	AS $$
DECLARE
	server_name TEXT;
BEGIN
	server_name := '';

	IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE'
	THEN
		SELECT
			name
		FROM
			fn_get_module_ancestors(NEW.module_id)
		WHERE
			parent_module_id IS NULL
		INTO
			server_name;
	END IF;

	IF TG_OP = 'DELETE'
	THEN
		SELECT
			name
		FROM
			fn_get_module_ancestors(OLD.module_id)
		WHERE
			parent_module_id IS NULL
		INTO
			server_name;
	END IF;

	IF TG_OP = 'INSERT'
	THEN
		IF NEW.name = server_name
		THEN
			PERFORM pg_notify(CONCAT(server_name, '!Added'), CAST(NEW.module_id AS text));
		END IF;

		IF NEW.name <> server_name
		THEN
			PERFORM pg_notify(CONCAT(server_name, '!Module!Added'), CAST(NEW.module_id AS text));
		END IF;

		RETURN NEW;
	END IF;

	IF TG_OP = 'UPDATE'
	THEN
		IF NEW.name = server_name
		THEN
			PERFORM pg_notify(CONCAT(server_name, '!Updated'), CAST(NEW.module_id AS text));
		END IF;

		IF NEW.name <> server_name
		THEN
			PERFORM pg_notify(CONCAT(server_name, '!Module!Updated'), CAST(NEW.module_id AS text));
		END IF;

		IF OLD.configuration <> NEW.configuration
		THEN
			PERFORM pg_notify(CONCAT(server_name, '!Config!Changed'), CAST(NEW.module_id AS text));
		END IF;

		IF OLD.enabled <> NEW.enabled
		THEN
			PERFORM pg_notify(CONCAT(server_name, '!State!Changed'), CAST(NEW.module_id AS text));
		END IF;

		RETURN NEW;
	END IF;

	IF TG_OP = 'DELETE'
	THEN
		IF OLD.name = server_name
		THEN
			PERFORM pg_notify(CONCAT(server_name, '!Deleted'), CAST(OLD.module_id AS text));
		END IF;

		IF OLD.name <> server_name
		THEN
			PERFORM pg_notify(CONCAT(server_name, '!Module!Deleted'), CAST(OLD.module_id AS text));
		END IF;

		RETURN OLD;
	END IF;
END;
$$;`
	);

	// Finally, create the triggers...
	await knex.schema.withSchema('public').raw('CREATE TRIGGER trigger_check_module_upsert_is_valid BEFORE INSERT OR UPDATE ON public.modules FOR EACH ROW EXECUTE PROCEDURE public.fn_check_module_upsert_is_valid();');
	await knex.schema.withSchema('public').raw('CREATE TRIGGER trigger_check_permission_upsert_is_valid BEFORE INSERT OR UPDATE ON public.feature_permissions FOR EACH ROW EXECUTE PROCEDURE public.fn_check_permission_upsert_is_valid();');
	await knex.schema.withSchema('public').raw(`CREATE TRIGGER trigger_check_frontend_component_upsert_is_valid BEFORE INSERT OR UPDATE ON public.feature_frontend_components FOR EACH ROW EXECUTE PROCEDURE public.fn_check_frontend_component_upsert_is_valid()`);
	await knex.schema.withSchema('public').raw('CREATE TRIGGER trigger_notify_module_change AFTER UPDATE ON public.modules FOR EACH ROW EXECUTE PROCEDURE public.fn_notify_module_change();');
};

exports.down = async function(knex) {
	await knex.raw(`DROP TRIGGER IF EXISTS trigger_notify_module_change ON public.modules CASCADE;`);
	await knex.raw(`DROP TRIGGER IF EXISTS trigger_check_frontend_component_upsert_is_valid ON public.feature_frontend_components CASCADE;`);
	await knex.raw(`DROP TRIGGER IF EXISTS trigger_check_permission_upsert_is_valid ON public.feature_permissions CASCADE;`);
	await knex.raw(`DROP TRIGGER IF EXISTS trigger_check_module_upsert_is_valid ON public.modules CASCADE;`);

	await knex.raw(`DROP FUNCTION IF EXISTS public.fn_notify_module_change () CASCADE;`);
	await knex.raw(`DROP FUNCTION IF EXISTS public.fn_check_frontend_component_upsert_is_valid() CASCADE;`);
	await knex.raw(`DROP FUNCTION IF EXISTS public.fn_check_permission_upsert_is_valid () CASCADE;`);
	await knex.raw(`DROP FUNCTION IF EXISTS public.fn_check_module_upsert_is_valid () CASCADE;`);

	await knex.raw(`DROP FUNCTION IF EXISTS public.fn_is_module_enabled (IN uuid) CASCADE;`);
	await knex.raw(`DROP FUNCTION IF EXISTS public.fn_get_module_descendants (IN uuid) CASCADE;`);
	await knex.raw(`DROP FUNCTION IF EXISTS public.fn_get_module_ancestors (IN uuid) CASCADE;`);

	await knex.raw(`DROP TABLE IF EXISTS public.feature_frontend_components CASCADE;`);
	await knex.raw(`DROP TABLE IF EXISTS public.feature_permissions CASCADE;`);
	await knex.raw(`DROP TABLE IF EXISTS public.modules CASCADE;`);

	await knex.raw(`DROP TYPE IF EXISTS public.module_type CASCADE;`);
	await knex.raw(`DROP TYPE IF EXISTS public.module_deploy_type CASCADE;`);

	await knex.raw('DROP EXTENSION IF EXISTS "uuid-ossp" CASCADE;');
};
