/**
 * @file      index.js
 * @author    Vish Desai <shadyvd@hotmail.com>
 * @version   3.0.1
 * @copyright Copyright&copy; 2014 - 2018 {@link https://twyr.github.io/twyr-webapp-server|Twyr Web Application Server}
 * @license   {@link https://spdx.org/licenses/Unlicense.html|Unlicense}
 * @summary   The entry-point, and application class, for the web application server
 *
 */

'use strict';

/**
 * Pre-flight stuff - to be done before the application class starts the server
 * @ignore
 */
require('dotenv').config();

/**
 * Setup global variables (ugh!) to make life simpler across the rest of the codebase
 * @ignore
 */
global.twyrEnv = (process.env.NODE_ENV || 'development').toLocaleLowerCase();
process.title = 'twyr-webapp';

// Utility to allow non-blocking sleep in async/await mode without the ugly setTimeout
// appearing all over the place
global.snooze = async (ms) => {
	const Promise = require('bluebird');
	return new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
};

/**
 * Module dependencies, required for this module
 * @ignore
 */
const TwyrApplication = require('./server/twyr-application-class').TwyrApplication;

/**
 * Finally, start the server - let's get going!
 * @ignore
 */
const serverInstance = new TwyrApplication('TwyrWebappServer');

const onDeath = require('death')({ 'uncaughtException': true, 'debug': (twyrEnv === 'development') });
const offDeath = onDeath(async () => {
	try {
		offDeath();
		await serverInstance.shutdownServer();
	}
	catch(shutdownError) {
		console.error(`Shutdown Error: ${shutdownError.toString()}`);
	}
});

serverInstance.bootupServer()
.catch(() => {
	process.exit(1); // eslint-disable-line no-process-exit
});

