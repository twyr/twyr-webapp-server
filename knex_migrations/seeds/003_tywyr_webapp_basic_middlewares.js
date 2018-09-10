'use strict';

exports.seed = async function(knex) {
	let parentId = await knex.raw(`SELECT module_id FROM modules WHERE name = ? AND type = 'server' AND parent_module_id IS NULL`, ['TwyrWebappServer']);
	if(!parentId.rows.length)
		return null;

	parentId = parentId.rows[0]['module_id'];

	let componentId = await knex.raw(`SELECT module_id FROM fn_get_module_descendants(?) WHERE name = ? AND type = 'middleware'`, [parentId, 'SessionMiddleware']);
	if(componentId.rows.length)
		return null;

	await knex('modules').insert({
		'parent_module_id': parentId,
		'type': 'middleware',
		'deploy': 'default',
		'name': 'SessionMiddleware',
		'display_name': 'Session Middleware',
		'description': 'The Twyr Web Application Session Middleware - executes reset password and similar operations',
		'metadata': {
			'author': 'Twyr',
			'version': '3.0.1',
			'website': 'https://twyr.com',
			'demo': 'https://twyr.com',
			'documentation': 'https://twyr.com'
		}
	});
};
