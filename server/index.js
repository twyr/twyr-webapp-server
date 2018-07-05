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
require('app-module-path').addPath(`${__dirname}/../framework`);
require('dotenv').config();

/**
 * The name of the server - this is the name that is searched for in the database [modules.module_type = 'server' AND modules.name = ?]
 * @ignore
 */
const SERVER_NAME = process.env.SERVER_NAME || 'TwyrWebappServer';

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
const TwyrApplication = require('./twyr-application-class').TwyrApplication;

/**
 * Finally, start the server - let's get going!
 * @ignore
 */
const serverInstance = new TwyrApplication(SERVER_NAME);
let shuttingDown = false;

const onDeath = require('death')({ 'uncaughtException': false, 'debug': (twyrEnv === 'development' || twyrEnv === 'test') });
const offDeath = onDeath(async () => {
	if(shuttingDown) return;
	shuttingDown = true;

	console.time(`${SERVER_NAME} shutdown in: `);

	let shutDownErr = null;

	try {
		await serverInstance.shutdownServer();
	}
	catch(error) {
		shutDownErr = error;
	}

	console.timeEnd(`${SERVER_NAME} shutdown in: `);

	offDeath();
	process.exit(!!shutDownErr); // eslint-disable-line no-process-exit
});

console.time(`${SERVER_NAME} booted up in: `);

let bootError = null;
serverInstance.bootupServer()
.catch((bootupErr) => {
	bootError = bootupErr;
	shuttingDown = true;

	return serverInstance.shutdownServer();
})
.finally(() => {
	console.timeEnd(`${SERVER_NAME} booted up in: `);
	if(!bootError) return;

	offDeath();
	process.exit(1); // eslint-disable-line no-process-exit
});
