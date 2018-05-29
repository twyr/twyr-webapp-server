'use strict';

/**
 * Module dependencies, required for ALL Twyr' modules
 * @ignore
 */

/**
 * Module dependencies, required for this module
 * @ignore
 */
const TwyrBaseService = require('twyr-base-service').TwyrBaseService;
const TwyrSrvcError = require('twyr-service-error').TwyrServiceError;

/**
 * @class   StorageService
 * @extends {TwyrBaseService}
 * @classdesc The Twyr Web Application Server Storage Service.
 *
 * @description
 * Allows the rest of the Twyr Modules to use either file-based, or S3-based, storage transparently.
 *
 */
class StorageService extends TwyrBaseService {
	// #region Constructor
	constructor(parent, loader) {
		super(parent, loader);
	}
	// #endregion

	// #region startup/teardown code
	/**
	 * @async
	 * @function
	 * @override
	 * @instance
	 * @memberof StorageService
	 * @name     _setup
	 *
	 * @returns  {null} Nothing.
	 *
	 * @summary  Sets up the connection to the Storage Media - either a filesystem folder, or a S3 bucket.
	 */
	async _setup() {
		try {
			await super._setup();

			if(this.$config.mode === 'fs')
				this.$Storage = require('fs');

			if(this.$config.mode === 's3')
				this.$Storage = this.$dependencies.AwsService.S3(); // eslint-disable-line new-cap

			return null;
		}
		catch(err) {
			throw new TwyrSrvcError(`${this.name}::_startup error`, err);
		}
	}

	/**
	 * @async
	 * @function
	 * @override
	 * @instance
	 * @memberof StorageService
	 * @name     _teardown
	 *
	 * @returns  {undefined} Nothing.
	 *
	 * @summary  Closes the connection to the Storage Media.
	 */
	async _teardown() {
		try {
			if(this.$Storage) delete this.$Storage;

			await super._teardown();
			return null;
		}
		catch(err) {
			throw new TwyrSrvcError(`${this.name}::_teardown error`, err);
		}
	}
	// #endregion

	// #region Properties
	/**
	 * @override
	 */
	get Interface() {
		const httpContext = require('express-http-context');
		const tenant = httpContext.get('tenant');

		const promises = require('bluebird');
		const tenantDomain = tenant ? tenant['sub_domain'] : 'www';

		let fsInterface = null;
		if(this.$config.mode === 'fs') {
			const sanboxedFs = require('sandboxed-fs');
			const path = require('path');

			fsInterface = sanboxedFs.bind(path.join(path.dirname(require.main.filename), 'static_assets', tenantDomain));
		}

		if(this.$config.mode === 's3') {
			const S3FS = require('s3fs');
			fsInterface = new S3FS(`twyr-storage-service-${tenantDomain}`, this.$Storage);
		}

		return promises.promisifyAll(fsInterface);
	}

	/**
	 * @override
	 */
	get dependencies() {
		return ['AwsService', 'ConfigurationService', 'LoggerService'].concat(super.dependencies);
	}

	/**
	 * @override
	 */
	get basePath() {
		return __dirname;
	}
	// #endregion
}

exports.service = StorageService;
