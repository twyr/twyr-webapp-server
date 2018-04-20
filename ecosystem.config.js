'use strict';

module.exports = {
	'apps': [{
		'name': 'twyr-webapp',
		'script': './index.js',
		'exec_mode': 'cluster',

		'watch': false,
		'ignore_watch': [],

		'merge_logs': true,

		'env': {
			'BLUEBIRD_DEBUG': 1,
			'DEBUG': '*',
			'NODE_ENV': 'development'
		},
		'env_test': {
			'BLUEBIRD_DEBUG': 1,
			'DEBUG': '*',
			'NODE_ENV': 'test'
		},
		'env_stage': {
			'NODE_ENV': 'stage'
		},
		'env_production': {
			'NODE_ENV': 'production'
		}
	}]
};
