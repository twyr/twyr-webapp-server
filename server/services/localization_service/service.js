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
 * @class   LocalizationService
 * @extends {TwyrBaseService}
 * @classdesc The Twyr Web Application Server Localization Service.
 *
 * @description
 * Allows the rest of the Twyr Modules to use localized strings.
 *
 */
class LocalizationService extends TwyrBaseService {
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
	 * @memberof LocalizationService
	 * @name     _setup
	 *
	 * @returns  {null} Nothing.
	 *
	 * @summary  Sets up the internationalization / localization module.
	 */
	async _setup() {
		try {
			await super._setup();

			const i18n = require('i18n'),
				path = require('path');

			const loggerSrvc = this.$dependencies.LoggerService;
			this.$config.directory = path.isAbsolute(this.$config.directory) ? this.$config.directory : path.join(path.dirname(path.dirname(require.main.filename)), this.$config.directory);
			this.$config.logDebugFn = (message) => { loggerSrvc.debug(message); };
			this.$config.logWarnFn = (message) => { loggerSrvc.warn(message); };
			this.$config.logErrorFn = (message) => { loggerSrvc.error(message); };

			// Hard-coded because of a memory leak in i18n module
			this.$config.autoReload = false;

			i18n.configure(this.$config);
			this.$i18n = i18n;

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
	 * @memberof LocalizationService
	 * @name     _teardown
	 *
	 * @returns  {undefined} Nothing.
	 *
	 * @summary  Deletes the internationalization / localization module.
	 */
	async _teardown() {
		try {
			if(this.$i18n) delete this.$i18n;

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
		return this.$i18n;
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

exports.service = LocalizationService;
