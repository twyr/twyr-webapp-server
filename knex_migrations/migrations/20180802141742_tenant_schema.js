exports.up = async function(knex) {
	let exists = null;

	// Step 1: Create the basic "tenants" table
	exists = await knex.schema.withSchema('public').hasTable('tenants');
	if(!exists) {
		await knex.schema.withSchema('public').createTable('tenants', function(tenantTbl) {
			tenantTbl.uuid('tenant_id').notNullable().primary().defaultTo(knex.raw('uuid_generate_v4()'));
			tenantTbl.text('name').notNullable();
			tenantTbl.text('sub_domain').notNullable();
			tenantTbl.boolean('enabled').notNullable().defaultTo(true);
			tenantTbl.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
			tenantTbl.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

			tenantTbl.unique(['sub_domain']);
		});
	}

	// Step 2: Create the "tenant_groups" table
	exists = await knex.schema.withSchema('public').hasTable('tenant_groups');
	if(!exists) {
		await knex.schema.withSchema('public').createTable('tenant_groups', function(groupTbl) {
			groupTbl.uuid('tenant_id').notNullable().references('tenant_id').inTable('tenants').onDelete('CASCADE').onUpdate('CASCADE');
			groupTbl.uuid('group_id').notNullable().defaultTo(knex.raw('uuid_generate_v4()'));
			groupTbl.uuid('parent_group_id');
			groupTbl.text('name').notNullable();
			groupTbl.text('display_name').notNullable();
			groupTbl.text('description');
			groupTbl.boolean('default_for_new_user').notNullable().defaultTo(false);
			groupTbl.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
			groupTbl.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

			groupTbl.primary(['tenant_id', 'group_id']);
			groupTbl.foreign(['tenant_id', 'parent_group_id']).references(['tenant_id', 'group_id']).inTable('tenant_groups').onDelete('CASCADE').onUpdate('CASCADE');

			groupTbl.unique(['parent_group_id', 'name']);
		});
	}

	// Step 3: Create the "tenant_templates" table
	exists = await knex.schema.withSchema('public').hasTable('tenant_templates');
	if(!exists) {
		await knex.schema.withSchema('public').createTable('tenant_templates', function(tmplTbl) {
			tmplTbl.uuid('tenant_id').notNullable().references('tenant_id').inTable('tenants').onDelete('CASCADE').onUpdate('CASCADE');
			tmplTbl.uuid('tenant_template_id').notNullable().defaultTo(knex.raw('uuid_generate_v4()'));
			tmplTbl.text('name').notNullable();
			tmplTbl.text('display_name').notNullable();
			tmplTbl.text('relative_path_to_index').notNullable().defaultTo('dist/index.html');
			tmplTbl.text('description');
			tmplTbl.boolean('default').notNullable().defaultTo(false);
			tmplTbl.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
			tmplTbl.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

			tmplTbl.primary(['tenant_id', 'tenant_template_id']);
		});
	}

	// Step 4: Create the "tenant_template_positions" table
	exists = await knex.schema.withSchema('public').hasTable('tenant_template_positions');
	if(!exists) {
		await knex.schema.withSchema('public').createTable('tenant_template_positions', function(tmplPositionTbl) {
			tmplPositionTbl.uuid('tenant_id').notNullable();
			tmplPositionTbl.uuid('tenant_template_id').notNullable();
			tmplPositionTbl.uuid('tenant_template_position_id').notNullable().defaultTo(knex.raw('uuid_generate_v4()'));
			tmplPositionTbl.text('name').notNullable();
			tmplPositionTbl.text('display_name').notNullable();
			tmplPositionTbl.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
			tmplPositionTbl.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

			tmplPositionTbl.primary(['tenant_id', 'tenant_template_id', 'tenant_template_position_id']);
			tmplPositionTbl.foreign(['tenant_id', 'tenant_template_id']).references(['tenant_id', 'tenant_template_id']).inTable('tenant_templates').onDelete('CASCADE').onUpdate('CASCADE');
		});
	}

	// Step 5: Create the tenant_relationships table
	await knex.schema.raw("CREATE TYPE public.tenant_relationship_type AS ENUM ('customer', 'oem', 'service provider', 'vendor')");
	exists = await knex.schema.withSchema('public').hasTable('tenant_relationships');
	if(!exists) {
		await knex.schema.withSchema('public').createTable('tenant_relationships', function(tenantRelationshipsTbl) {
			tenantRelationshipsTbl.uuid('tenant_id').notNullable();
			tenantRelationshipsTbl.uuid('other_tenant_id').notNullable();
			tenantRelationshipsTbl.uuid('tenant_relationship_id').notNullable().defaultTo(knex.raw('uuid_generate_v4()'));
			tenantRelationshipsTbl.specificType('relationship', 'public.tenant_relationship_type').notNullable();

			tenantRelationshipsTbl.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
			tenantRelationshipsTbl.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

			tenantRelationshipsTbl.primary(['tenant_id', 'other_tenant_id', 'relationship']);
			tenantRelationshipsTbl.unique(['tenant_relationship_id']);

			tenantRelationshipsTbl.foreign(['tenant_id']).references(['tenant_id']).inTable('tenants').onDelete('CASCADE').onUpdate('CASCADE');
			tenantRelationshipsTbl.foreign(['other_tenant_id']).references(['tenant_id']).inTable('tenants').onDelete('CASCADE').onUpdate('CASCADE');
		});
	}

	// Step 6: Setup user-defined functions on the groups table for traversing the tree, etc.
	await knex.schema.withSchema('public').raw(
`CREATE OR REPLACE FUNCTION public.fn_get_group_ancestors (IN groupid uuid)
	RETURNS TABLE (level integer, tenant_id uuid,  group_id uuid,  parent_group_id uuid,  name text)
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
			A.tenant_id,
			A.group_id,
			A.parent_group_id,
			A.name
		FROM
			tenant_groups A
		WHERE
			A.group_id = groupid
		UNION ALL
		SELECT
			q.level + 1,
			B.tenant_id,
			B.group_id,
			B.parent_group_id,
			B.name
		FROM
			q,
			tenant_groups B
		WHERE
			B.group_id = q.parent_group_id
	)
	SELECT DISTINCT
		q.level,
		q.tenant_id,
		q.group_id,
		q.parent_group_id,
		q.name
	FROM
		q
	ORDER BY
		q.level;
END;
$$;`
	);

	await knex.schema.withSchema('public').raw(
`CREATE OR REPLACE FUNCTION public.fn_get_group_descendants (IN groupid uuid)
	RETURNS TABLE (level integer,  tenant_id uuid, group_id uuid,  parent_group_id uuid,  name text)
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
			A.tenant_id,
			A.group_id,
			A.parent_group_id,
			A.name
		FROM
			tenant_groups A
		WHERE
			A.group_id = groupid
		UNION ALL
		SELECT
			q.level + 1,
			B.tenant_id,
			B.group_id,
			B.parent_group_id,
			B.name
		FROM
			q,
			tenant_groups B
		WHERE
			B.parent_group_id = q.group_id
	)
	SELECT DISTINCT
		q.level,
		q.tenant_id,
		q.group_id,
		q.parent_group_id,
		q.name
	FROM
		q
	ORDER BY
		q.level;
END;
$$;`
	);

	await knex.schema.withSchema('public').raw(
`CREATE OR REPLACE FUNCTION public.fn_get_tenant_template (IN tenantid uuid)
	RETURNS TABLE (tenant_id uuid,  sub_domain text,  name text, path_to_index text)
	LANGUAGE plpgsql
	VOLATILE
	CALLED ON NULL INPUT
	SECURITY INVOKER
	COST 1
	AS $$
DECLARE
	tenant_uuid		UUID;
	tenant_domain	TEXT;
	tmpl_name		TEXT;
	index_path		TEXT;
BEGIN
	tenant_uuid		:= NULL;
	tenant_domain	:= NULL;
	tmpl_name		:= NULL;
	index_path		:= NULL;

	SELECT
		A.tenant_id,
		A.sub_domain,
		B.name,
		B.relative_path_to_index
	FROM
		tenants A LEFT OUTER JOIN
		tenant_templates B ON (B.tenant_id = A.tenant_id)
	WHERE
		A.enabled = true AND
		B.default = true
	INTO
		tenant_uuid,
		tenant_domain,
		tmpl_name,
		index_path;

	IF tmpl_name IS NOT NULL
	THEN
		RETURN QUERY
		SELECT tenant_uuid, tenant_domain, tmpl_name, index_path;
	END IF;

	IF tenant_domain IS NULL
	THEN
		RAISE SQLSTATE '2F003' USING MESSAGE = 'Incorrect Tenant Id';
	END IF;

	SELECT
		A.tenant_id
	FROM
		tenants A
	WHERE
		A.sub_domain = (SELECT array_to_string(ARRAY(SELECT unnest(string_to_array(tenant_domain, '.')) OFFSET 1), '.'))
	INTO
		tenant_uuid;

	RETURN QUERY
	SELECT
		*
	FROM
		fn_get_tenant_template(tenant_uuid);
END;
$$;`
	);

	// Step 7: Enforce rules for sanity using triggers.
	await knex.schema.withSchema('public').raw(
`CREATE OR REPLACE FUNCTION public.fn_assign_defaults_to_tenant ()
	RETURNS trigger
	LANGUAGE plpgsql
	VOLATILE
	CALLED ON NULL INPUT
	SECURITY INVOKER
	COST 1
	AS $$
DECLARE
	admin_group_id		UUID;
	user_group_id		UUID;
BEGIN
	INSERT INTO tenant_groups (
		parent_group_id,
		tenant_id,
		name,
		display_name,
		description
	)
	VALUES (
		NULL,
		NEW.tenant_id,
		'administrators',
		NEW.name || ' Administrators',
		'The Administrator Group for ' || NEW.name
	)
	RETURNING
		group_id
	INTO
		admin_group_id;

	INSERT INTO tenant_groups (
		parent_group_id,
		tenant_id,
		name,
		display_name,
		description,
		default_for_new_user
	)
	VALUES (
		admin_group_id,
		NEW.tenant_id,
		'users',
		NEW.name || ' Users',
		'All Users Group for ' || NEW.name,
		true
	)
	RETURNING
		group_id
	INTO
		user_group_id;

	RETURN NEW;
END;
$$;`
	);

	await knex.schema.withSchema('public').raw(
`CREATE OR REPLACE FUNCTION public.fn_check_group_update_is_valid ()
	RETURNS trigger
	LANGUAGE plpgsql
	VOLATILE
	CALLED ON NULL INPUT
	SECURITY INVOKER
	COST 1
	AS $$

BEGIN
	IF OLD.parent_group_id <> NEW.parent_group_id
	THEN
		RAISE SQLSTATE '2F003' USING MESSAGE = 'Group cannot change parent';
		RETURN NULL;
	END IF;

	RETURN NEW;
END;
$$;`
	);

	// Finally, create the triggers...
	await knex.schema.withSchema('public').raw('CREATE TRIGGER trigger_assign_defaults_to_tenant AFTER INSERT ON public.tenants FOR EACH ROW EXECUTE PROCEDURE public.fn_assign_defaults_to_tenant();');
	await knex.schema.withSchema('public').raw('CREATE TRIGGER trigger_check_group_update_is_valid BEFORE UPDATE ON public.tenant_groups FOR EACH ROW EXECUTE PROCEDURE public.fn_check_group_update_is_valid();');
};

exports.down = async function(knex) {
	await knex.raw('DROP TRIGGER IF EXISTS trigger_check_group_update_is_valid ON public.tenant_groups CASCADE;');
	await knex.raw('DROP TRIGGER IF EXISTS trigger_assign_defaults_to_tenant ON public.tenants CASCADE;');

	await knex.raw(`DROP FUNCTION IF EXISTS public.fn_get_tenant_template (IN uuid)`);
	await knex.raw(`DROP FUNCTION IF EXISTS public.fn_check_group_update_is_valid () CASCADE;`);
	await knex.raw(`DROP FUNCTION IF EXISTS public.fn_assign_defaults_to_tenant () CASCADE;`);
	await knex.raw(`DROP FUNCTION IF EXISTS public.fn_get_group_descendants (IN uuid) CASCADE;`);
	await knex.raw(`DROP FUNCTION IF EXISTS public.fn_get_group_ancestors (IN uuid) CASCADE;`);

	await knex.raw('DROP TABLE IF EXISTS public.tenant_relationships CASCADE;');
	await knex.raw(`DROP TABLE IF EXISTS public.tenant_template_positions CASCADE;`);
	await knex.raw(`DROP TABLE IF EXISTS public.tenant_templates CASCADE;`);
	await knex.raw(`DROP TABLE IF EXISTS public.tenant_groups CASCADE;`);
	await knex.raw(`DROP TABLE IF EXISTS public.tenants CASCADE;`);

	await knex.raw(`DROP TYPE IF EXISTS public.tenant_relationship_type CASCADE;`);
};
