'use strict';

/* eslint-disable security/detect-object-injection */

/**
 * Module dependencies, required for ALL Twyr' modules
 * @ignore
 */

/**
 * Module dependencies, required for this module
 * @ignore
 */
const TwyrBaseService = require('twyr-base-service').TwyrBaseService;

const TwyrBaseError = require('twyr-base-error').TwyrBaseError;
const TwyrSrvcError = require('twyr-service-error').TwyrServiceError;

/**
 * @class   AuditService
 * @extends {TwyrBaseService}
 * @classdesc The Twyr Web Application Server Auditing Service.
 *
 * @description
 * Allows the rest of the Twyr Modules to publish audit trails.
 *
 */
class AuditService extends TwyrBaseService {
	// #region Constructor
	constructor(parent, loader) {
		super(parent, loader);
	}
	// #endregion

	// #region API
	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof AuditService
	 * @name     publish
	 *
	 * @param    {Object} auditPayload - The payload to be cleaned and published to the message queue.
	 *
	 * @returns  {null} Nothing.
	 *
	 * @summary  Publishes the audit trail to the messaging queue, and then deletes the cached details.
	 */
	async publish(auditPayload) {
		if(!auditPayload) return;
		try {
			this._cleanBeforePublish(auditPayload);
			if(!Object.keys(auditPayload).length) return;

			if(auditPayload.error) {
				this.$dependencies.LoggerService.error(`Error Servicing Request ${auditPayload.id} - ${auditPayload['request-meta']['url']}:`, auditPayload);
				await this.$dependencies.PubsubService.publish('twyr-audit', 'TWYR.AUDIT.ERROR', JSON.stringify(auditPayload));
			}
			else {
				if(twyrEnv === 'development') this.$dependencies.LoggerService.debug(`Serviced Request ${auditPayload.id} - ${auditPayload['request-meta']['url']}:`, auditPayload);
				await this.$dependencies.PubsubService.publish('twyr-audit', 'TWYR.AUDIT.LOG', JSON.stringify(auditPayload));
			}
		}
		catch(err) {
			throw new TwyrSrvcError(`${this.name}::_publishAudit error`, err);
		}
	}
	// #endregion

	// #region Private Methods
	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof AuditService
	 * @name     _cleanBeforePublish
	 *
	 * @param    {Object} auditDetails - The data for the request/response cycle.
	 * @param    {Object} [value] - The audit trail information.
	 *
	 * @returns  {null} Nothing.
	 *
	 * @summary  Deletes any empty keys in the audit trail data.
	 */
	_cleanBeforePublish(auditDetails, value) {
		if(!auditDetails && value) auditDetails = { 'payload': value };
		if(!auditDetails) return null;

		if(!Object.keys(auditDetails).length)
			return null;

		Object.keys(auditDetails).forEach((key) => {
			if(!auditDetails[key]) {
				delete auditDetails[key];
				return;
			}

			if(['password', 'image', 'random'].indexOf(key.toLowerCase()) >= 0) {
				auditDetails[key] = '****';
				return;
			}

			if(key.startsWith('_')) {
				delete auditDetails[key];
				return;
			}

			if(auditDetails[key] instanceof TwyrBaseError) {
				auditDetails[key] = auditDetails[key].toString();
				return;
			}

			if(auditDetails[key] instanceof Error) {
				auditDetails[key] = new TwyrBaseError(`Wrapped for Auditing`, auditDetails[key]).toString();
				return;
			}

			if(typeof auditDetails[key] === 'object') {
				auditDetails[key] = this._cleanBeforePublish(auditDetails[key]);

				if(!auditDetails[key]) {
					delete auditDetails[key];
					return;
				}

				if(!Object.keys(auditDetails[key]).length) {
					delete auditDetails[key];
					return;
				}
			}
		});

		if(!Object.keys(auditDetails).length)
			return null;

		return auditDetails;
	}
	// #endregion

	// #region Properties
	/**
	 * @override
	 */
	get Interface() {
		return {
			'publish': this.publish.bind(this)
		};
	}

	/**
	 * @override
	 */
	get dependencies() {
		return ['ConfigurationService', 'LoggerService', 'PubsubService'].concat(super.dependencies);
	}

	/**
	 * @override
	 */
	get basePath() {
		return __dirname;
	}
	// #endregion
}

exports.service = AuditService;
