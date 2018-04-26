'use strict';

/**
 * Module dependencies, required for ALL PlantWorks modules
 * @ignore
 */
const promises = require('bluebird');

/**
 * Module dependencies, required for this module
 * @ignore
 */

exports.strategy = function() {
	const credential = require('credential-plus');
	credential.install(require('credential-plus-pbkdf2'));

	const databaseSrvc = this.$dependencies.DatabaseService;
	const User = databaseSrvc.Model.extend({
		'tableName': 'users',
		'idAttribute': 'id'
	});

	const LocalStrategy = require('passport-local').Strategy;
	const passport = this.Interface;
	passport.use('twyr-local', new LocalStrategy({ 'passReqToCallback': true }, (request, username, password, callback) => {
		this._dummyAsync()
		.then(() => {
			if(!this.$config.strategies.local.enabled) { // eslint-disable-line curly
				throw new Error('Username / Password Authentication has been disabled');
			}

			return new User({ 'email': username }).fetch();
		})
		.then((userRecord) => {
			if(!userRecord) throw new Error('Invalid Credentials - please try again');
			return promises.all([credential.verify(userRecord.get('password'), password), userRecord]);
		})
		.then((results) => {
			const credentialMatch = results.shift(),
				userRecord = results.shift();

			if(!credentialMatch) throw new Error('Invalid Credentials - please try again');
			if(callback) callback(null, userRecord.toJSON());

			return null;
		})
		.catch((err) => {
			if(callback) callback(err);
		});
	}));
};

