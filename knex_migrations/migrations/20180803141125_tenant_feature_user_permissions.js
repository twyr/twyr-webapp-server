exports.up = async function(knex) {
	await knex.schema.withSchema('public').raw(
`CREATE OR REPLACE FUNCTION public.fn_get_user_permissions (IN tenantId uuid, IN userId uuid)
	RETURNS TABLE (permission uuid, name text, implies_permissions jsonb)
	LANGUAGE plpgsql
	VOLATILE
	CALLED ON NULL INPUT
	SECURITY INVOKER
	COST 1
	AS $$
BEGIN
	RETURN QUERY
	SELECT
		Z.feature_permission_id,
		Z.name,
		Z.implies_permissions
	FROM
		feature_permissions Z
	WHERE
		feature_permission_id IN (
			SELECT DISTINCT
				feature_permission_id
			FROM
				tenant_group_permissions
			WHERE
				group_id IN (
					SELECT
						group_id
					FROM
						tenants_users_groups
					WHERE
						user_id = userId AND
						tenant_id = tenantId
				)
			);
END;
$$;`
	);
};

exports.down = async function(knex) {
	await knex.raw(`DROP FUNCTION IF EXISTS public.fn_get_user_permissions (IN UUID, IN UUID) CASCADE;`);
};
