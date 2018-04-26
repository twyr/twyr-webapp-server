'use strict';

/**
 * Module dependencies, required for ALL Twyr' modules
 * @ignore
 */

/**
 * Module dependencies, required for this module
 * @ignore
 */
const TwyrBaseService = require('./../../twyr-base-service').TwyrBaseService;
const TwyrSrvcError = require('./../../twyr-service-error').TwyrServiceError;

/**
 * @class   AWSService
 * @extends {TwyrBaseService}
 * @classdesc The Twyr Web Application Server AWS Service.
 *
 * @description
 * Allows the rest of the Twyr Modules to use AWS SDK API.
 *
 */
class AWSService extends TwyrBaseService {
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
	 * @memberof AWSService
	 * @name     _setup
	 *
	 * @returns  {null} Nothing.
	 *
	 * @summary  Sets up the connection to the AWS SDK.
	 */
	async _setup() {
		try {
			this.$AWS = require('aws-sdk');
			this.$AWS.config.update(this.$config);
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
	 * @memberof AWSService
	 * @name     _teardown
	 *
	 * @returns  {undefined} Nothing.
	 *
	 * @summary  Quits the connection to the AWS SDK.
	 */
	async _teardown() {
		try {
			if(this.$AWS) delete this.$AWS;
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
		return this.$AWS;
	}

	/**
	 * @override
	 */
	get dependencies() {
		return ['ConfigurationService', 'LoggerService'].concat(super.dependencies);
	}

	/**
	 * @override
	 */
	get basePath() {
		return __dirname;
	}
	// #endregion
}

exports.service = AWSService;
