'use strict';

/**
 * Module dependencies, required for ALL PlantWorks modules
 * @ignore
 */

/**
 * Module dependencies, required for this module
 * @ignore
 */
const TwyrBaseService = require('./../../../../twyr-base-service').TwyrBaseService;
const TwyrSrvcError = require('./../../../../twyr-service-error').TwyrServiceError;

class FileConfigurationService extends TwyrBaseService {
	constructor(parent) {
		super(parent);
		this.$cacheMap = {};
	}

	async _setup() {
		const chokidar = require('chokidar'),
			path = require('path');

		const env = (process.env.NODE_ENV || 'development').toLowerCase(),
			rootPath = path.dirname(require.main.filename);

		this.$watcher = chokidar.watch(path.join(rootPath, 'config', env), {
			'ignored': /[/\\]\./,
			'ignoreInitial': true
		});

		this.$watcher
			.on('add', this._onNewConfiguration.bind(this))
			.on('change', this._onUpdateConfiguration.bind(this))
			.on('unlink', this._onDeleteConfiguration.bind(this));

		return true;
	}

	async _teardown() {
		this.$watcher.close();
		return true;
	}

	async loadConfiguration(twyrModule) {
		try {
			const fs = require('fs-extra'),
				path = require('path'),
				promises = require('bluebird');

			const filesystem = promises.promisifyAll(fs);
			const rootPath = path.dirname(require.main.filename);

			const configPath = path.join(rootPath, 'config', `${path.relative(rootPath, twyrModule.basePath).replace('server', twyrEnv)}.js`);

			await filesystem.ensureDirAsync(path.dirname(configPath));

			const doesExist = await this._exists(configPath, filesystem.R_OK);

			let config = {};
			if(doesExist) config = require(configPath).config;

			this.$cacheMap[configPath] = config;
			return config;
		}
		catch(err) {
			throw new TwyrSrvcError(`${this.name}::loadConfig::${twyrModule.name} error`, err);
		}
	}

	async saveConfiguration(twyrModule, config) {
		try {
			const deepEqual = require('deep-equal'),
				fs = require('fs-extra'),
				path = require('path'),
				promises = require('bluebird');

			const filesystem = promises.promisifyAll(fs);
			const rootPath = path.dirname(require.main.filename);

			const configPath = path.join(rootPath, 'config', `${path.relative(rootPath, twyrModule.basePath).replace('server', twyrEnv)}.js`),
				configString = `exports.config = ${JSON.stringify(config, undefined, '\t')};\n`;

			if(deepEqual(this.$cacheMap[configPath], config))
				return config;

			await filesystem.ensureDirAsync(path.dirname(configPath));

			this.$cacheMap[configPath] = config;
			await filesystem.writeFileAsync(configPath, configString);

			return config;
		}
		catch(err) {
			throw new TwyrSrvcError(`${this.name}::saveConfig::${twyrModule.name} error`, err);
		}
	}

	async getModuleState(twyrModule) {
		return !!twyrModule;
	}

	async setModuleState(twyrModule, enabled) {
		return enabled;
	}

	async getModuleId() {
		return null;
	}

	_onNewConfiguration(filePath) {
		const path = require('path');

		const rootPath = path.dirname(require.main.filename);
		const twyrModule = path.relative(rootPath, filePath).replace(`config/${twyrEnv}/`, '').replace('.js', '');

		this.$cacheMap[filePath] = require(filePath).config;
		this.$parent.emit('new-config', this.name, twyrModule, require(filePath).config);
	}

	_onUpdateConfiguration(filePath) {
		const deepEqual = require('deep-equal'),
			path = require('path');

		const rootPath = path.dirname(require.main.filename);
		const twyrModule = path.relative(rootPath, filePath).replace(`config/${twyrEnv}/`, '').replace('.js', '');

		delete require.cache[filePath];
		setTimeout(() => {
			if(deepEqual(this.$cacheMap[filePath], require(filePath).config))
				return;

			this.$cacheMap[filePath] = require(filePath).config;
			this.$parent.emit('update-config', this.name, twyrModule, require(filePath).config);
		}, 500);
	}

	_onDeleteConfiguration(filePath) {
		const path = require('path');

		const rootPath = path.dirname(require.main.filename);
		const twyrModule = path.relative(rootPath, filePath).replace(`config/${twyrEnv}/`, '').replace('.js', '');

		delete require.cache[filePath];
		delete this.$cacheMap[filePath];

		this.$parent.emit('delete-config', this.name, twyrModule);
	}

	async _processConfigChange(configUpdateModule, config) {
		try {
			const deepEqual = require('deep-equal'),
				fs = require('fs-extra'),
				path = require('path'),
				promises = require('bluebird');

			const filesystem = promises.promisifyAll(fs);
			const rootPath = path.dirname(require.main.filename);

			const configPath = path.join(rootPath, 'config', twyrEnv, `${configUpdateModule}.js`),
				configString = `exports.config = ${JSON.stringify(config, undefined, '\t')};`;

			if(deepEqual(this.$cacheMap[configPath], config))
				return;

			await filesystem.ensureDirAsync(path.dirname(configPath));

			this.$cacheMap[configPath] = config;
			await filesystem.writeFileAsync(configPath, configString);
		}
		catch(err) {
			if(twyrEnv === 'development') console.error(`Save Configuration to File Error: ${err.stack}`);
		}
	}

	async _processStateChange() {
		return;
	}

	get basePath() { return __dirname; }
}

exports.service = FileConfigurationService;
