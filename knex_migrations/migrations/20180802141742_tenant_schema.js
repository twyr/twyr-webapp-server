exports.up = async function(knex) {
	let exists = null;

	await knex.schema.raw("CREATE TYPE public.tenant_relationship_type AS ENUM ('customer', 'oem', 'service provider', 'vendor')");

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

	// Step 2: Create the "tenant_locations" table
	exists = await knex.schema.withSchema('public').hasTable('tenant_locations');
	if(!exists) {
		await knex.schema.withSchema('public').createTable('tenant_locations', function(tenantLocationTbl) {
			tenantLocationTbl.uuid('tenant_id').notNullable().references('tenant_id').inTable('tenants').onDelete('CASCADE').onUpdate('CASCADE');
			tenantLocationTbl.uuid('tenant_location_id').notNullable().defaultTo(knex.raw('uuid_generate_v4()'));
			tenantLocationTbl.boolean('is_primary').notNullable().defaultTo(false);
			tenantLocationTbl.text('name').notNullable();
			tenantLocationTbl.text('line1').notNullable();
			tenantLocationTbl.text('line2');
			tenantLocationTbl.text('line3');
			tenantLocationTbl.text('area').notNullable();
			tenantLocationTbl.text('city').notNullable();
			tenantLocationTbl.text('state').notNullable();
			tenantLocationTbl.text('country').notNullable();
			tenantLocationTbl.text('postal_code').notNullable();
			tenantLocationTbl.specificType('latitude', 'double precision').notNullable();
			tenantLocationTbl.specificType('longitude', 'double precision').notNullable();
			tenantLocationTbl.text('timezone_id').notNullable();
			tenantLocationTbl.text('timezone_name').notNullable();
			tenantLocationTbl.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
			tenantLocationTbl.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

			tenantLocationTbl.primary(['tenant_id', 'tenant_location_id']);
			tenantLocationTbl.unique(['tenant_id', 'name']);
		});
	}

	// Step 3: Create the "tenant_groups" table
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

	// Step 4: Create the tenant_relationships table
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

	// Step 5: Setup user-defined functions on the groups table for traversing the tree, etc.
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

	// Step 6: Enforce rules for sanity using triggers.
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

	await knex.raw(`DROP FUNCTION IF EXISTS public.fn_check_group_update_is_valid () CASCADE;`);
	await knex.raw(`DROP FUNCTION IF EXISTS public.fn_assign_defaults_to_tenant () CASCADE;`);
	await knex.raw(`DROP FUNCTION IF EXISTS public.fn_get_group_descendants (IN uuid) CASCADE;`);
	await knex.raw(`DROP FUNCTION IF EXISTS public.fn_get_group_ancestors (IN uuid) CASCADE;`);

	await knex.raw('DROP TABLE IF EXISTS public.tenant_relationships CASCADE;');
	await knex.raw(`DROP TABLE IF EXISTS public.tenant_groups CASCADE;`);
	await knex.raw(`DROP TABLE IF EXISTS public.tenants CASCADE;`);
	await knex.raw(`DROP TABLE IF EXISTS public.tenant_locations CASCADE;`);

	await knex.raw(`DROP TYPE IF EXISTS public.tenant_relationship_type CASCADE;`);
};
