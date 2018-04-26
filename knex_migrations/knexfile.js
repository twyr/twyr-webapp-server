'use strict';

module.exports = {
	'development': {
		'client': 'pg',
		'debug': true,

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
