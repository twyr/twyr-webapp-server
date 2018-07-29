'use strict';

module.exports = {
	'development': {
		'client': 'pg',
		'debug': false,

		'connection': {
			'database': 'twyr',
			'user': 'twyr',
			'password': 'twyr'
		},

		'migrations': {
			'tableName': 'knex_migrations'
		}
	},

	'test': {
		'client': 'pg',
		'debug': false,

		'connection': {
			'database': 'twyr',
			'user': 'twyr',
			'password': 'twyr'
		},

		'migrations': {
			'tableName': 'knex_migrations'
		}
	}
};
