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
 * @class   LoggerService
 * @extends {TwyrBaseService}
 * @classdesc The Twyr Web Application Server Logger Service.
 *
 * @description
 * Allows the rest of the Twyr Modules to log stuff.
 *
 */
class LoggerService extends TwyrBaseService {
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
	 * @memberof LoggerService
	 * @name     _setup
	 *
	 * @returns  {null} Nothing.
	 *
	 * @summary  Sets up the logger - based on Winston.
	 */
	async _setup() {
		try {
			const path = require('path');
			const winston = require('winston');

			const rootPath = path.dirname(require.main.filename);
			const transports = [];

			this.$winston = new winston.Logger({
				'transports': [new winston.transports.Console()]
			});

			for(const transportIdx in this.$config) {
				if(!Object.prototype.hasOwnProperty.call(this.$config, transportIdx) && !{}.hasOwnProperty.call(this.$config, transportIdx))
					continue;

				const thisTransport = JSON.parse(JSON.stringify(this.$config[transportIdx]));
				if(thisTransport.filename) {
					const baseName = path.basename(thisTransport.filename, path.extname(thisTransport.filename));
					const dirName = path.isAbsolute(thisTransport.filename) ? path.dirname(thisTransport.filename) : path.join(rootPath, path.dirname(thisTransport.filename));

					thisTransport.filename = path.resolve(path.join(dirName, `${baseName}-${this.$parent.$uuid}${path.extname(thisTransport.filename)}`));
				}

				transports.push(new winston.transports[transportIdx](thisTransport));
			}

			// Re-configure with new
			this.$winston.configure({
				'transports': transports,
				'rewriters': [(level, msg, meta) => {
					if(!meta) return '\n';
					if(!Object.keys(meta).length) return '\n';

					Object.keys(meta).forEach((key) => {
						if(!meta[key]) {
							delete meta[key];
							return;
						}
						const dangerousKeys = Object.keys(meta[key]).filter((metaKeyKey) => {
							return (metaKeyKey.toLowerCase().indexOf('password') >= 0) || (metaKeyKey.toLowerCase().indexOf('image') >= 0) || (metaKeyKey.toLowerCase().indexOf('random') >= 0) || (metaKeyKey === '_');
						});

						dangerousKeys.forEach((dangerousKey) => {
							delete meta[key][dangerousKey];
						});

						if(!Object.keys(meta[key]).length)
							delete meta[key];
					});

					if(!Object.keys(meta).length) return '\n';
					return `${JSON.stringify(meta, undefined, '\t')}\n\n`;
				}]
			});

			// Add trace === silly
			this.$winston.trace = this.$winston.silly;

			// Console log any errors emitted by Winston itself
			this.$winston.on('error', (err) => {
				console.error(`Winston Logger Error:\n${err.stack}`);
			});

			// Ensure the logger isn't crashing the Server :-)
			this.$winston.exitOnError = false;

			// The first log of this logger instance...
			if(twyrEnv === 'development') this.$winston.debug('\n\nTicking away the packets that make up a dull day...');
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
	 * @memberof LoggerService
	 * @name     _teardown
	 *
	 * @returns  {undefined} Nothing.
	 *
	 * @summary  Deletes the logger instance.
	 */
	async _teardown() {
		try {
			// The last log of this logger instance...
			if(twyrEnv === 'development') this.$winston.debug('\n\nGoodbye, wi-fi, goodbye...');

			try {
				this.$winston.clear();
			}
			catch(err) {
				if(twyrEnv === 'development') console.error(new TwyrSrvcError(`Error Removing ${transportIdx} from the Winston instance`, err).toString());
			}

			delete this.$winston;
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
		return this.$winston;
	}

	/**
	 * @override
	 */
	get dependencies() {
		return ['ConfigurationService'].concat(super.dependencies);
	}

	/**
	 * @override
	 */
	get basePath() {
		return __dirname;
	}
	// #endregion
}

exports.service = LoggerService;
