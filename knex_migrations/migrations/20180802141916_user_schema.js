exports.up = async function(knex) {
	let exists = null;

	// Step 1: Create the enums we need
	await knex.schema.raw("CREATE TYPE public.contact_type AS ENUM ('email','landline','mobile','other')");

	// Step 2: Create the basic "users" table
	exists = await knex.schema.withSchema('public').hasTable('users');
	if(!exists) {
		await knex.schema.withSchema('public').createTable('users', function(userTbl) {
			userTbl.uuid('user_id').notNullable().primary().defaultTo(knex.raw('uuid_generate_v4()'));
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

	// Step 3: Create the "user_social_logins" table
	exists = await knex.schema.withSchema('public').hasTable('user_social_logins');
	if(!exists) {
		await knex.schema.withSchema('public').createTable('user_social_logins', function(socialLoginTbl) {
			socialLoginTbl.uuid('user_id').notNullable().references('user_id').inTable('users').onDelete('CASCADE').onUpdate('CASCADE');
			socialLoginTbl.uuid('user_social_login_id').notNullable().defaultTo(knex.raw('uuid_generate_v4()'));
			socialLoginTbl.text('provider').notNullable();
			socialLoginTbl.text('provider_uid').notNullable();
			socialLoginTbl.text('display_name').notNullable();
			socialLoginTbl.jsonb('social_data').notNullable();
			socialLoginTbl.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
			socialLoginTbl.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

			socialLoginTbl.primary(['user_id', 'user_social_login_id']);
			socialLoginTbl.unique(['provider', 'provider_uid']);
		});
	}

	// Step 4: Create the "user_contacts" table
	exists = await knex.schema.withSchema('public').hasTable('user_contacts');
	if(!exists) {
		await knex.schema.withSchema('public').createTable('user_contacts', function(contactsTbl) {
			contactsTbl.uuid('user_id').notNullable().references('user_id').inTable('users').onDelete('CASCADE').onUpdate('CASCADE');
			contactsTbl.uuid('user_contact_id').notNullable().defaultTo(knex.raw('uuid_generate_v4()'));
			contactsTbl.text('contact').notNullable();
			contactsTbl.specificType('type', 'public.contact_type').notNullable().defaultTo('other');
			contactsTbl.boolean('verified').notNullable().defaultTo(false);
			contactsTbl.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
			contactsTbl.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

			contactsTbl.primary(['user_id', 'user_contact_id']);
			contactsTbl.unique(['user_id', 'type', 'contact']);
		});
	}
};

exports.down = async function(knex) {
	await knex.raw(`DROP TABLE IF EXISTS public.user_contacts CASCADE;`);
	await knex.raw(`DROP TABLE IF EXISTS public.user_social_logins CASCADE;`);
	await knex.raw(`DROP TABLE IF EXISTS public.users CASCADE;`);

	await knex.raw(`DROP TYPE IF EXISTS public.contact_type CASCADE;`);
};
