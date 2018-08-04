'use strict';

module.exports = function (grunt) {
	require('load-grunt-tasks')(grunt);

	grunt.initConfig({
		'pkg': grunt.file.readJSON('package.json'),

		'env': {
			'mochaTest': {
				'NODE_ENV': 'test'
			}

		},

		'eslint': {
			'options': {
				'config': '.eslintrc.json',
				'format': 'junit',
				'outputFile': 'buildresults/eslint-orig.xml'
			},
			'target': ['.']
		},

		'exec': {
			'clean': {
				'command': 'npm run-script clean'
			},
			'clinic-clean': {
				'command': 'npm run-script clinic-clean'
			},
			'docs': {
				'command': 'npm run-script docs'
			},
			'doctor': {
				'command': 'npm run-script clinic-doctor && npm run-script clinic-flame'
			},
			'organize_build_results': {
				'command': 'mkdir ./buildresults/mocha && mkdir ./buildresults/eslint && mkdir ./buildresults/istanbul && mkdir ./buildresults/performance && mv ./*.clinic-* ./buildresults/performance && mv ./buildresults/lint.xml ./buildresults/eslint/results.xml && mv ./buildresults/tests.xml ./buildresults/mocha/results.xml && mv ./buildresults/cobertura-coverage.xml ./buildresults/istanbul/results.xml && mv ./buildresults/lcov.info ./buildresults/istanbul/lcov.info'
			},
			'rename-docs': {
				'command': 'mv ./jsdoc_default/twyr-webapp-server/<%= pkg.version %> ./docs && rm -r ./jsdoc_default'
			},
			'setup-test-db': {
				'command': 'cd ./knex_migrations && NODE_ENV=test ./../node_modules/.bin/knex migrate:latest && NODE_ENV=test ./../node_modules/.bin/knex seed:run && cd ..'
			}
		},

		'mochaTest': {
			'test': {
				'options': {
					'clearRequireCache': false,
					'noFail': false,
					'quiet': false,
					'recursive': true,
					'reporter': 'mocha-junit-reporter',
					'reporterOptions': {
						'mochaFile': './buildresults/tests.xml'
					},
					'require': ['./test/setup_mocks'],
					'timeout': 5000
				},

				'src': ['./test/**/*.js']
			}
		},

		'mocha_istanbul': {
			'coverage': {
				'src': 'test',
				'options': {
					'mask': '**/*.spec.js',
					'coverageFolder': 'buildresults',
					'reportFormats': ['cobertura', 'lcovonly']
				}
			}
		},

		'coveralls': {
			// Options relevant to all targets
			'options': {
				'force': true
			},

			'webapp-server': {
				'src': 'buildresults/instanbul/lcov.info',
				'options': {
					// Any options for just this target
				}
			}
		},

		'xmlstoke': {
			'deleteESLintBugs': {
				'options': {
					'actions': [{
						'type': 'D',
						'xpath': '//failure[contains(@message, \'node_modules\')]/ancestor::testsuite'
					}]
				},
				'files': {
					'buildresults/eslint-no-bugs.xml': 'buildresults/eslint-orig.xml'
				}
			},
			'deleteEmptyTestcases': {
				'options': {
					'actions': [{
						'type': 'D',
						'xpath': '//testcase[not(node())]'
					}]
				},
				'files': {
					'buildresults/eslint-no-empty-testcases.xml': 'buildresults/eslint-no-bugs.xml'
				}
			},
			'deleteEmptyTestsuites': {
				'options': {
					'actions': [{
						'type': 'D',
						'xpath': '//testsuite[not(descendant::testcase)]'
					}]
				},
				'files': {
					'buildresults/eslint-no-empty-testsuites.xml': 'buildresults/eslint-no-empty-testcases.xml'
				}
			},
			'prettify': {
				'options': {
					'actions': [{
						'type': 'U',
						'xpath': '//text()'
					}]
				},
				'files': {
					'buildresults/lint.xml': 'buildresults/eslint-no-empty-testsuites.xml'
				}
			}
		},

		'jsbeautifier': {
			'src': ['buildresults/*.xml'],
			'options': {
				'config': '.jsbeautifyrc'
			}
		},

		'clean': ['buildresults/eslint-orig.xml', 'buildresults/eslint-no-bugs.xml', 'buildresults/eslint-no-empty-testcases.xml', 'buildresults/eslint-no-empty-testsuites.xml', 'buildresults/coverage.raw.json']
	});

	grunt.loadNpmTasks('grunt-coveralls');
	grunt.loadNpmTasks('grunt-eslint');
	grunt.loadNpmTasks('grunt-env');
	grunt.loadNpmTasks('grunt-mocha-istanbul');
	grunt.loadNpmTasks('grunt-xmlstoke');

	grunt.registerTask('default', ['exec:clean', 'env', 'eslint', 'xmlstoke:deleteESLintBugs', 'xmlstoke:deleteEmptyTestcases', 'xmlstoke:deleteEmptyTestsuites', 'xmlstoke:prettify', 'exec:setup-test-db', 'mochaTest', 'mocha_istanbul:coverage', 'exec:docs', 'exec:rename-docs', 'exec:doctor', 'clean', 'jsbeautifier', 'exec:organize_build_results', 'exec:clinic-clean', 'coveralls']);
};
