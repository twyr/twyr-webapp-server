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
 * @class   RingpopService
 * @extends {TwyrBaseService}
 * @classdesc The Twyr Web Application Server Ringpop Service.
 *
 * @description
 * Allows the rest of the Twyr Modules to use Ringpop SDK API.
 *
 */
class RingpopService extends TwyrBaseService {
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
	 * @memberof RingpopService
	 * @name     _setup
	 *
	 * @returns  {null} Nothing.
	 *
	 * @summary  Sets up the connection to the Ringpop SDK.
	 */
	async _setup() {
		try {
			const Promise = require('bluebird');
			const Ringpop = require('ringpop');
			const TChannel = require('tchannel');

			if((twyrEnv !== 'development') && !this.$config.host) {
				const networkInterfaceList = require('os').networkInterfaces();
				let hosts = null;
				Object.keys(networkInterfaceList).forEach((networkInterface) => {
					const interfaceAddresses = networkInterfaceList[networkInterface].filter((address) => {
						if(address.internal)
							return false;

						if(address.family.toLowerCase() !== 'ipv4')
							return false;

						return true;
					});

					if(!interfaceAddresses.length)
						return;

					hosts = interfaceAddresses.map((interfaceAddress) => {
						return interfaceAddress.address;
					});
				});

				this.$config.port = Number(this.$config.port);
				if(hosts.length === 1)
					this.$config.host = hosts[0];
				else
					throw new Error(`Multiple possible hosts for clustering: ${JSON.stringify(hosts)}`);
			}

			return new Promise((resolve, reject) => {
				try {
					const tchannel = new TChannel({
						'statTags': {
							'app': this.$parent.$application,
							'cluster': process.title
						},

						'logger': this.$dependencies.LoggerService,
						'trace': (twyrEnv === 'development')
					});

					const ringpop = new Ringpop({
						'app': this.$parent.$application,
						'hostPort': `${this.$config.host}:${this.$config.port}`,
						'channel': tchannel.makeSubChannel({
							'serviceName': 'ringpop',
							'trace': (twyrEnv === 'development')
						}),

                        'joinSize': 1,
						'joinTimeout': 100,

                        'logger': this.$dependencies.LoggerService
					});

					ringpop.setupChannel();
					ringpop.channel.topChannel.listen(this.$config.port, this.$config.host, () => {
						ringpop.bootstrap({
							'joinParallelismFactor': 2,
							'hosts': this.$config.bootstrapNodes
						}, (err) => {
							if(err) {
								console.error(`${JSON.stringify(err, null, '\t')}`);

								err = new TwyrSrvcError(`${this.name}::_startup::ringpop bootstrap error`, err);
								this.$dependencies.LoggerService.error(err.toString());

								reject(err);
								return;
							}

							this.$ringpop = ringpop;
							this.$parent.on('server-online', this._printInformation.bind(this));

							resolve();
							return;
						});
					});
				}
				catch(err) {
					reject(new TwyrSrvcError(`${this.name}::_startup::inner error`, err));
				}
			});
		}
		catch(err) {
			throw new TwyrSrvcError(`${this.name}::_startup::outer error`, err);
		}
	}

	/**
	 * @async
	 * @function
	 * @override
	 * @instance
	 * @memberof RingpopService
	 * @name     _teardown
	 *
	 * @returns  {undefined} Nothing.
	 *
	 * @summary  Quits the connection to the Ringpop SDK.
	 */
	async _teardown() {
		if(!this.$ringpop)
			return null;

		try {
			this.$ringpop.destroy();
			delete this.$ringpop;

			return null;
		}
		catch(err) {
			throw new TwyrSrvcError(`${this.name}::_teardown error`, err);
		}
	}
	// #endregion

	// #region Private API
	async _printInformation() {
		if(twyrEnv !== 'development')
			return;

		await snooze(600);
		this.$dependencies.LoggerService.debug(`Ringpop cluster initialized at ${this.$ringpop.whoami()}`);
	}
	// #endregion

	// #region Properties
	/**
	 * @override
	 */
	get Interface() {
		return this.$ringpop;
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

exports.service = RingpopService;
