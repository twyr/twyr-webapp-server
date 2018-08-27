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
const TwyrSrvcError = require('twyr-service-error').TwyrServiceError;

/**
 * @class   CassandraService
 * @extends {TwyrBaseService}
 * @classdesc The Twyr Web Application Server Cassandra Service.
 *
 * @description
 * Allows the rest of the Twyr Modules to use Cassandra as a NoSQL Storage.
 *
 */
class CassandraService extends TwyrBaseService {
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
	 * @memberof CassandraService
	 * @name     _setup
	 *
	 * @returns  {null} Nothing.
	 *
	 * @summary  Sets up the connection to the AWS SDK.
	 */
	async _setup() {
		try {
			await super._setup();

			const Cassandra = require('cassandra-driver');
			const promises = require('bluebird');

			const distance = Cassandra.types.distance;
			this.$config.promiseFactory = promises.fromCallback;

			this.$config.pooling.coreConnectionsPerHost = {
				[distance.local]: this.$config.pooling.coreConnectionsPerHost.local || 2,
				[distance.remote]: this.$config.pooling.coreConnectionsPerHost.remote || 1
			};

			this.$Cassandra = new Cassandra.Client(this.$config);

			this.$Cassandra.on('log', this._onCassandraLog.bind(this));
			this.$Cassandra.on('hostDown', this._onCassandraHostDown.bind(this));
			this.$Cassandra.on('hostRemove', this._onCassandraHostRemoved.bind(this));
			this.$Cassandra.on('error', this._onCassandraError.bind(this));

			await this.$Cassandra.connect();
			return null;
		}
		catch(err) {
			throw new TwyrSrvcError(`${this.name}::_setup error`, err);
		}
	}

	/**
	 * @async
	 * @function
	 * @override
	 * @instance
	 * @memberof CassandraService
	 * @name     _teardown
	 *
	 * @returns  {undefined} Nothing.
	 *
	 * @summary  Quits the connection to the Cassandra cluster.
	 */
	async _teardown() {
		try {
			if(!this.$Cassandra) return null;

			await this.$Cassandra.shutdown();
			this.$Cassandra = null;
			delete this.$Cassandra;

			await super._teardown();
			return null;
		}
		catch(err) {
			throw new TwyrSrvcError(`${this.name}::_teardown error`, err);
		}
	}
	// #endregion

	// #region Private Methods
	_onCassandraLog(level, className, message, furtherInfo) {
		if(level === 'warning') level = 'warn';
		if(level === 'verbose') level = 'silly';

		this.$dependencies.LoggerService[level](message, (furtherInfo ? (`Further Info: ${furtherInfo}`) : null));
	}

	async _onCassandraError() {
		const ringpopService = this.$dependencies.RingpopService;
		const leader = ringpopService.lookup('LEADER');
		if(leader !== ringpopService.whoami())
			return;

		const loggerService = this.$dependencies.LoggerService;
		const mailerService = this.$dependencies.MailerService;
		const mailOptions = {
			'from': 'root@twyr.io',
			'to': 'shadyvd@hotmail.com',
			'subject': 'Twyr Cassandra Error',
			'text': `Cassandra Error: ${JSON.stringify(arguments, null, '\t')}`
		};

		const mailInfo = await mailerService.sendMailAsync(mailOptions);
		loggerService.error(`Cassandra Error: ${JSON.stringify(arguments, null, '\t')}\nEmail Details: ${JSON.stringify(mailInfo, null, '\t')}`);
	}

	async _onCassandraHostDown(host) {
		const ringpopService = this.$dependencies.RingpopService;
		const leader = ringpopService.lookup('LEADER');
		if(leader !== ringpopService.whoami())
			return;

		const loggerService = this.$dependencies.LoggerService;
		const mailerService = this.$dependencies.MailerService;
		const mailOptions = {
			'from': 'root@twyr.io',
			'to': 'shadyvd@hotmail.com',
			'subject': 'Twyr Cassandra Host Down',
			'text': `Cassandra Host Down:\nDataCenter: ${host.datacenter}\nRack: ${host.rack}\nAddress:${host.address}`
		};

		const mailInfo = await mailerService.sendMailAsync(mailOptions);
		loggerService.warn(`Cassandra Host Down:\nDataCenter: ${host.datacenter}\nRack: ${host.rack}\nAddress:${host.address}\nEmail Sent: ${JSON.stringify(mailInfo, null, '\t')}`);
	}

	async _onCassandraHostRemoved(host) {
		const ringpopService = this.$dependencies.RingpopService;
		const leader = ringpopService.lookup('LEADER');
		if(leader !== ringpopService.whoami())
			return;

		const loggerService = this.$dependencies.LoggerService;
		const mailerService = this.$dependencies.MailerService;
		const mailOptions = {
			'from': 'root@twyr.io',
			'to': 'shadyvd@hotmail.com',
			'subject': 'Twyr Cassandra Host Removed',
			'text': `Cassandra Host Removed:\nDataCenter: ${host.datacenter}\nRack: ${host.rack}\nAddress:${host.address}`
		};

		const mailInfo = await mailerService.sendMailAsync(mailOptions);
		loggerService.warn(`Cassandra Host Removed: \nDataCenter: ${host.datacenter}\nRack: ${host.rack}\nAddress:${host.address}\nEmail Sent: ${JSON.stringify(mailInfo, null, '\t')}`);
	}
	// #endregion

	// #region Properties
	/**
	 * @override
	 */
	get Interface() {
		return this.$Cassandra;
	}

	/**
	 * @override
	 */
	get dependencies() {
		return ['ConfigurationService', 'LoggerService', 'MailerService', 'RingpopService'].concat(super.dependencies);
	}

	/**
	 * @override
	 */
	get basePath() {
		return __dirname;
	}
	// #endregion
}

exports.service = CassandraService;
