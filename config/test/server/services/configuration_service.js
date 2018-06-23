exports.config = {
	'state': true,
	'configuration': {
		'priorities': {
			'FileConfigurationService': 10,
			'DatabaseConfigurationService': 20
		},
		'subservices': {
			'DatabaseConfigurationService': {
				'client': process.env.services_DatabaseService_client || 'pg',
				'debug': process.env.services_DatabaseService_debug === 'true',
				'connection': {
					'host': process.env.services_DatabaseService_connection_host || '127.0.0.1',
					'port': process.env.services_DatabaseService_connection_port || '5432',
					'user': process.env.services_DatabaseService_connection_user || 'twyr',
					'password': process.env.services_DatabaseService_connection_password || 'twyr',
					'database': process.env.services_DatabaseService_connection_database || 'twyr'
				},
				'pool': {
					'min': Number(process.env.services_DatabaseService_pool_min) || 2,
					'max': Number(process.env.services_DatabaseService_pool_max) || 4
				},
				'migrations': {
					'directory': process.env.services_ConfigurationService_subservices_DatabaseConfigurationService_migrations_directory || 'knex_migrations/migrations',
					'tableName': process.env.services_ConfigurationService_subservices_DatabaseConfigurationService_migrations_tableName || 'knex_migrations'
				},
				'seeds': {
					'directory': process.env.services_ConfigurationService_subservices_DatabaseConfigurationService_seeds_directory || 'knex_migrations/seeds',
					'tableName': process.env.services_ConfigurationService_subservices_DatabaseConfigurationService_seeds_tableName || 'knex_seeds'
				}
			}
		}
	}
};
