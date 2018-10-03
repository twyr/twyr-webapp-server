'use strict';

const chai = require('chai'); // eslint-disable-line node/no-unpublished-require
const chaiHttp = require('chai-http'); // eslint-disable-line node/no-unpublished-require

chai.use(chaiHttp);

describe('Session Component Test Cases', function() {
	const agent = chai.request.agent('http://localhost:9100');
	const expect = chai.expect;

	chai.should();

	it('Should return the Public User details', function(done) {
		agent
			.get('/session/user')
			.end((err, response) => {
				expect(response).to.have.status(200);
				response.body.should.have.property('name').eql('Public');
				response.body.should.have.property('loggedIn').eql(false);
				response.body.should.have.property('permissions').eql(['public']);

				done(err);
			});
	});

	it('Should throw an error on Logout before Login', function(done) {
		agent
			.get('/session/logout')
			.end((err, response) => {
				expect(response).to.have.status(422);
				done(err);
			});
	});

	it('Should throw an error on Login without a password', function(done) {
		agent
			.post('/session/login')
			.type('form')
			.send({
				'username': 'root@twyr.com'
			})
			.end((err, response) => {
				expect(response).to.have.status(422);
				done(err);
			});
	});

	it('Should throw an error on Login with an invalid User', function(done) {
		agent
			.post('/session/login')
			.type('form')
			.send({
				'username': 'root@something.com',
				'password': 'twyr'
			})
			.end((err, response) => {
				expect(response).to.have.status(422);
				done(err);
			});
	});

	it('Should throw an error on Login with an invalid Password', function(done) {
		agent
			.post('/session/login')
			.type('form')
			.send({
				'username': 'root@twyr.com',
				'password': 'twyr2'
			})
			.end((err, response) => {
				expect(response).to.have.status(422);
				done(err);
			});
	});

	it('Should Login and Start a Session with a Cookie', function(done) {
		agent
			.post('/session/login')
			.type('form')
			.send({
				'username': 'root@twyr.com',
				'password': 'twyr'
			})
			.end((err, response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.cookie('twyr!webapp!server');

				done(err);
			});
	});

	it('Should throw an error on Login for an authenticated session', function(done) {
		agent
			.post('/session/login')
			.type('form')
			.send({
				'username': 'root@twyr.com',
				'password': 'twyr'
			})
			.end((err, response) => {
				expect(response).to.have.status(422);
				done(err);
			});
	});

	it('Should return the Root User details', function(done) {
		agent
			.get('/session/user')
			.end((err, response) => {
				expect(response).to.have.status(200);
				response.body.should.have.property('name').eql('Root Twyr');
				response.body.should.have.property('loggedIn').eql(true);
				response.body.should.have.property('permissions').with.lengthOf(16);

				done(err);
			});
	});

	it('Should logout', function(done) {
		agent
			.get('/session/logout')
			.end((err, response) => {
				expect(response).to.have.status(200);
				done(err);
			});
	});

	it('Should throw an error on Logout after a Logout', function(done) {
		agent
			.get('/session/logout')
			.end((err, response) => {
				expect(response).to.have.status(422);
				done(err);
			});
	});

	it('Should go back to returning the Public User details', function(done) {
		agent
			.get('/session/user')
			.end((err, response) => {
				expect(response).to.have.status(200);
				response.body.should.have.property('name').eql('Public');
				response.body.should.have.property('loggedIn').eql(false);
				response.body.should.have.property('permissions').eql(['public']);

				done(err);
			});
	});

	it('Should throw a reset password error if User is not registered', function(done) {
		agent
			.post('/session/reset-password')
			.type('form')
			.send({
				'username': 'unknown-user@twyr.com'
			})
			.end((err, response) => {
				expect(response).to.have.status(422);
				done(err);
			});
	});

	it('Should reset password if User is registered', function(done) {
		agent
			.post('/session/reset-password')
			.type('form')
			.send({
				'username': 'root@twyr.com'
			})
			.end((err, response) => {
				expect(response).to.have.status(200);
				done(err);
			});
	});

	it('Login with old password should not work anymore', function(done) {
		agent
			.post('/session/login')
			.type('form')
			.send({
				'username': 'root@twyr.com',
				'password': 'twyr'
			})
			.end((err, response) => {
				expect(response).to.have.status(422);
				done(err);
			});
	});
});
