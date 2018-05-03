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

	// #region startup/teardown code
	/**
	 * @async
	 * @function
	 * @override
	 * @instance
	 * @memberof AuditService
	 * @name     _setup
	 *
	 * @returns  {null} Nothing.
	 *
	 * @summary  Sets up the required resources.
	 */
	async _setup() {
		try {
			this.$auditCache = require('memory-cache');
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
	 * @memberof AuditService
	 * @name     _teardown
	 *
	 * @returns  {undefined} Nothing.
	 *
	 * @summary  Teardown the resources in use.
	 */
	async _teardown() {
		try {
			if(!this.$auditCache)
				return null;

			this.$auditCache.clear();
			delete this.$auditCache;

			return null;
		}
		catch(err) {
			throw new TwyrSrvcError(`${this.name}::_teardown error`, err);
		}
	}
	// #endregion

	// #region API
	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof AuditService
	 * @name     addRequest
	 *
	 * @param    {Object} requestDetails - The incoming request to which this server is responding.
	 *
	 * @returns  {null} Nothing.
	 *
	 * @summary  Stores the request and, if the response has already been logged, publishes the audit trail.
	 */
	async addRequest(requestDetails) {
		try {
			if(!this.$auditCache) {
				const requestDetailsError = new Error('Audit capture not available');
				throw requestDetailsError;
			}

			if(!(requestDetails.twyrRequestId && requestDetails.userId)) {
				const requestDetailsError = new Error('Incorrectly formed request details');
				throw requestDetailsError;
			}

			let hasResponse = this.$auditCache.get(requestDetails.twyrRequestId);
			if(hasResponse) {
				const deepmerge = require('deepmerge');
				const emptyTarget = value => Array.isArray(value) ? [] : {};
				const clone = (value, options) => deepmerge(emptyTarget(value), value, options);

				const oldArrayMerge = (target, source, options) => {
					const destination = target.slice();

					source.forEach(function(e, i) {
						if(typeof destination[i] === 'undefined') {
							const cloneRequested = options.clone !== false;
							const shouldClone = cloneRequested && options.isMergeableObject(e);

							destination[i] = shouldClone ? clone(e, options) : e;
						}
						else if(options.isMergeableObject(e)) {
							destination[i] = deepmerge(target[i], e, options);
						}
						else if(target.indexOf(e) === -1) {
							destination.push(e);
						}
					});

					return destination;
				};

				hasResponse = deepmerge(hasResponse, requestDetails, {
					'arrayMerge': oldArrayMerge
				});

				await this._publishAudit(hasResponse.twyrRequestId);
			}
			else {
				hasResponse = requestDetails;
				this.$auditCache.put(hasResponse.twyrRequestId, hasResponse, 10000, this._processTimedoutRequests.bind(this));
			}

			return null;
		}
		catch(err) {
			const requestDetailsError = new TwyrSrvcError(`${this.name}::addRequest error`, err);
			throw requestDetailsError;
		}
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof AuditService
	 * @name     addResponse
	 *
	 * @param    {Object} responseDetails - The response this server is sending out.
	 *
	 * @returns  {null} Nothing.
	 *
	 * @summary  Stores the response and, if the request has already been logged, publishes the audit trail.
	 */
	async addResponse(responseDetails) {
		try {
			if(!this.$auditCache) {
				const requestDetailsError = new Error('Audit capture not available');
				throw requestDetailsError;
			}

			if(!(responseDetails.twyrRequestId && responseDetails.userId)) {
				const responseDetailsError = new Error('Incorrectly formed response details');
				throw responseDetailsError;
			}

			let hasRequest = this.$auditCache.get(responseDetails.twyrRequestId);
			if(hasRequest) {
				const deepmerge = require('deepmerge');
				const emptyTarget = value => Array.isArray(value) ? [] : {};
				const clone = (value, options) => deepmerge(emptyTarget(value), value, options);

				const oldArrayMerge = (target, source, options) => {
					const destination = target.slice();

					source.forEach(function(e, i) {
						if(typeof destination[i] === 'undefined') {
							const cloneRequested = options.clone !== false;
							const shouldClone = cloneRequested && options.isMergeableObject(e);

							destination[i] = shouldClone ? clone(e, options) : e;
						}
						else if(options.isMergeableObject(e)) {
							destination[i] = deepmerge(target[i], e, options);
						}
						else if(target.indexOf(e) === -1) {
							destination.push(e);
						}
					});

					return destination;
				};

				hasRequest = deepmerge(hasRequest, responseDetails, {
					'arrayMerge': oldArrayMerge
				});

				await this._publishAudit(hasRequest.twyrRequestId);
			}
			else {
				hasRequest = responseDetails;
				this.$auditCache.put(hasRequest.twyrRequestId, hasRequest, 10000, this._processTimedoutRequests.bind(this));
			}

			return null;
		}
		catch(err) {
			const responseDetailsError = new TwyrSrvcError(`${this.name}::addResponse error`, err);
			throw responseDetailsError;
		}
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof AuditService
	 * @name     addResponsePayload
	 *
	 * @param    {Object} payloadDetails - Additional details about the request/response cycle.
	 *
	 * @returns  {null} Nothing.
	 *
	 * @summary  Stores optional details.
	 */
	async addResponsePayload(payloadDetails) {
		try {
			if(!this.$auditCache) {
				const payloadDetailsError = new Error('Audit capture not available');
				throw payloadDetailsError;
			}

			if(!payloadDetails.twyrRequestId) {
				const payloadDetailsError = new Error('Incorrectly formed payload details');
				throw payloadDetailsError;
			}

			let hasPayload = this.$auditCache.get(payloadDetails.twyrRequestId);
			if(hasPayload) {
				const deepmerge = require('deepmerge');
				const emptyTarget = value => Array.isArray(value) ? [] : {};
				const clone = (value, options) => deepmerge(emptyTarget(value), value, options);

				const oldArrayMerge = (target, source, options) => {
					const destination = target.slice();

					source.forEach(function(e, i) {
						if(typeof destination[i] === 'undefined') {
							const cloneRequested = options.clone !== false;
							const shouldClone = cloneRequested && options.isMergeableObject(e);

							destination[i] = shouldClone ? clone(e, options) : e;
						}
						else if(options.isMergeableObject(e)) {
							destination[i] = deepmerge(target[i], e, options);
						}
						else if(target.indexOf(e) === -1) {
							destination.push(e);
						}
					});

					return destination;
				};

				hasPayload = deepmerge(hasPayload, payloadDetails, {
					'arrayMerge': oldArrayMerge
				});
			}
			else {
				hasPayload = payloadDetails;
			}

			this.$auditCache.put(payloadDetails.twyrRequestId, hasPayload, 10000, this._processTimedoutRequests.bind(this));
			return null;
		}
		catch(err) {
			const payloadDetailsError = new TwyrSrvcError(`${this.name}::addResponsePayload error`, err);
			throw payloadDetailsError;
		}
	}
	// #endregion

	// #region Private Methods
	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof AuditService
	 * @name     _publishAudit
	 *
	 * @param    {Object} id - The ID assigned to the request/response cycle.
	 *
	 * @returns  {null} Nothing.
	 *
	 * @summary  Publishes the audit trail to the messaging queue, and then deletes the cached details.
	 */
	async _publishAudit(id) {
		try {
			const alreadyScheduled = this.$auditCache.get(`${id}-scheduled`);
			if(alreadyScheduled) return;

			this.$auditCache.put(`${id}-scheduled`, true);
			await snooze(500);

			const auditDetails = this._cleanBeforePublish(id);
			if(auditDetails.error) {
				this.$dependencies.LoggerService.error(`Error Servicing Request ${auditDetails.twyrRequestId} - ${auditDetails.url}:`, JSON.stringify(auditDetails, null, '\t'));
				await this.$dependencies.PubsubService.publish('twyr-audit', 'TWYR.AUDIT.ERROR', JSON.stringify(auditDetails));
			}
			else {
				if(twyrEnv === 'development') this.$dependencies.LoggerService.debug(`Serviced Request ${auditDetails.twyrRequestId} - ${auditDetails.url}:`, JSON.stringify(auditDetails, null, '\t'));
				await this.$dependencies.PubsubService.publish('twyr-audit', 'TWYR.AUDIT.LOG', JSON.stringify(auditDetails));
			}

			return;
		}
		catch(err) {
			throw new TwyrSrvcError(`${this.name}::_publishAudit error`, err);
		}
		finally {
			this.$auditCache.del(`${id}-scheduled`);
			this.$auditCache.del(id);
		}
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof AuditService
	 * @name     _processTimedoutRequests
	 *
	 * @param    {Object} key - The ID assigned to the request/response cycle.
	 * @param    {Object} [value] - The audit trail information.
	 *
	 * @returns  {null} Nothing.
	 *
	 * @summary  Publishes the audit trail to the timeout error queue, and deletes the cached details.
	 */
	async _processTimedoutRequests(key, value) {
		try {
			const auditDetails = this._cleanBeforePublish(key, value);
			auditDetails.error = 'Timed Out';

			this.$dependencies.LoggerService.error(`Timeout Servicing Request ${auditDetails.twyrRequestId} - ${auditDetails.url}:`, JSON.stringify(auditDetails, null, '\t'));
			await this.$dependencies.PubsubService.publish('twyr-audit', 'TWYR.AUDIT.TIMEOUT', JSON.stringify(auditDetails));

			this.$auditCache.del(key);
			return;
		}
		catch(err) {
			this.$dependencies.LoggerService.error(`${this.name} process timedout request error:`, err.stack);
			return;
		}
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof AuditService
	 * @name     _cleanBeforePublish
	 *
	 * @param    {Object} id - The ID assigned to the request/response cycle.
	 * @param    {Object} [value] - The audit trail information.
	 *
	 * @returns  {null} Nothing.
	 *
	 * @summary  Deletes any empty keys in the audit trail data.
	 */
	_cleanBeforePublish(id, value) {
		let auditDetails = this.$auditCache.get(id);
		if(!auditDetails && value) auditDetails = value;
		if(!auditDetails) return null;

		if(!Object.keys(auditDetails).length)
			return null;

		Object.keys(auditDetails).forEach((key) => {
			if(!auditDetails[key]) {
				delete auditDetails[key];
				return;
			}

			Object.keys(auditDetails[key]).filter((auditDetailsKeyKey) => {
				return (auditDetailsKeyKey.toLowerCase().indexOf('password') >= 0) || (auditDetailsKeyKey.toLowerCase().indexOf('image') >= 0) || (auditDetailsKeyKey.toLowerCase().indexOf('random') >= 0) || (auditDetailsKeyKey === '_');
			})
			.forEach((dangerousKey) => {
				delete auditDetails[key][dangerousKey];
			});

			if(!Object.keys(auditDetails[key]).length)
				delete auditDetails[key];
		});

		// eslint-disable-next-line curly
		if(auditDetails.params) {
			Object.keys(auditDetails.params).forEach((key) => {
				auditDetails.url = auditDetails.url.replace(`/${auditDetails.params[key]}`, '');
			});
		}

		return auditDetails;
	}
	// #endregion

	// #region Properties
	/**
	 * @override
	 */
	get Interface() {
		return {
			'addRequest': this.addRequest.bind(this),
			'addResponse': this.addResponse.bind(this),
			'addResponsePayload': this.addResponsePayload.bind(this)
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
