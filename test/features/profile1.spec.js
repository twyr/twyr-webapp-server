'use strict';

const chai = require('chai'); // eslint-disable-line node/no-unpublished-require
const chaiHttp = require('chai-http'); // eslint-disable-line node/no-unpublished-require

chai.use(chaiHttp);

describe('Profile Feature Test Cases', function() {
	const agent = chai.request.agent('http://localhost:9100');
	const expect = chai.expect;

	chai.should();

	it('Should not return the User details if not logged in', function(done) {
		agent
			.get('/profile/get-image?_random=1538566796891')
			.end((err, response) => {
				expect(response).to.have.status(422);
				done(err);
			});
	});

	it('Should be able to login into the system:', function(done) {
		agent
			.post('/session/login')
			.type('form')
			.send({
				'username': 'root@twyr.com',
				'password': 'twyr'
			})
			.end((err, response) => {
				expect(response).to.have.status(200);
				done(err);
			});
	});

	it('Should return the profile image if logged in', function(done) {
		agent
			.get('/profile/get-image?_random=1538566796891')
			.end((err, response) => {
				expect(response.status).to.eql(200);
				done(err);
			});
	});

	it('Should give error if last name is null', function() {
		agent
			.patch('/profile/users/:user_id')
			.send({
				'first_name': 'Root',
				'last_name': ''
			})
			.then(function(res) {
				expect(res).to.have.status(422);
			})
			.catch(function(err) {
				throw err;
			});
	});

	it('Should give error if first name is null', function() {
		agent
			.patch('/profile/users/:user_id')
			.send({
				'first_name': '',
				'last_name': 'Twyr'
			})
			.then(function(res) {
				expect(res).to.have.status(422);
			})
			.catch(function(err) {
				throw err;
			});
	});

	it('Should allow to update profile if all the input is available', function() {
		agent
			.patch('/profile/users/user_id')
			.send({
				'first_name': 'Root1',
				'last_name': 'Twyr'
			})
			.then(function(res) {
				expect(res).to.have.status(200);
			})
			.catch(function(err) {
				throw err;
			});
	});

	it('Should give error if password(s) are not the same', function(done) {
		agent
			.post('/profile/changePassword')
			.type('form')
			.send({
				'newPassword1': '1',
				'newPassword2': '2'
			})
			.end((err, response) => {
				expect(response).to.have.status(422);
				done(err);
			});
	});

	it('Should give error if any field is empty in change password', function(done) {
		agent
			.post('/profile/changePassword')
			.type('form')
			.send({
				'currentPassword': '',
				'newPassword1': '',
				'newPassword2': ''
			})
			.end((err, response) => {
				expect(response).to.have.status(422);
				done(err);
			});
	});

	it('Should give error if current password is wrong', function(done) {
		agent
			.post('/profile/changePassword')
			.type('form')
			.send({
				'currentPassword': '1234',
				'newPassword1': '',
				'newPassword2': ''
			})
			.end((err, response) => {
				expect(response).to.have.status(422);
				done(err);
			});
	});

	it('Should allow to change password if all inputs are correct', function(done) {
		agent
			.post('/profile/changePassword')
			.type('form')
			.send({
				'currentPassword': 'twyr',
				'newPassword1': '12345',
				'newPassword2': '12345'
			})
			.end((err, response) => {
				expect(response).to.have.status(200);
				done(err);
			});
	});

	it('Should give error if contact field contains characters', function(done) {
		agent
			.post('/profile/user-contacts')
			.type('form')
			.send({
				'type': 'Mobile',
				'contact': 'abcd',
				'verified': false
			})
			.end((err, response) => {
				expect(response).to.have.status(422);
				done(err);
			});
	});

/*
	it('Should give error if contact id is wrong', function(done) {
	});

	it('Should allow to delete a correct contact number', function(done) {
	});*/
});
