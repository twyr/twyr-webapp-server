exports.config = {
	'state': true,
	'configuration': {
		'priorities': {
			'FileConfigurationService': 10,
			'DatabaseConfigurationService': 20
		},
		'subservices': {
			'DatabaseConfigurationService': {
				'connection': {
					'host': '127.0.0.1',
					'port': '5432',
					'user': 'twyr',
					'password': 'twyr',
					'database': 'twyr'
				}
			}
		}
	}
};
