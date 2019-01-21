'use strict';

const chai = require('chai'); // eslint-disable-line node/no-unpublished-require
const chaiHttp = require('chai-http'); // eslint-disable-line node/no-unpublished-require

chai.use(chaiHttp);

describe('Profile Feature Test Cases', function() {
	const agent = chai.request.agent('http://localhost:9100');
	const expect = chai.expect;

	chai.should();

	it('Should return proper status code', function(done) {
		agent
			.get('/dashboard')
			.end((err, response) => {
				expect(response).to.have.status(200);
				done(err);
			});
	});

	it('Should return proper status code', function(done) {
		agent
			.get('/profile/user/:user_id')
			.end((err, response) => {
				expect(response).to.have.status(200);
				done(err);
			});
	});

	it('User id and password should match', function(done) {
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

	it('Password should be equal', function(done) {
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

	it('Current Password should be correct', function(done) {
        agent
            .post('/profile/changePassword')
            .type('form')
            .send({
				'currentPassword': '1234',
                'newPassword1': '1',
                'newPassword2': '2'
            })
            .end((err, response) => {
                expect(response).to.have.status(422);
                done(err);
            });
	});

	/*it('Testing using PATCH', function(done) {
        agent
            .get('/profile/users/:user_id')
            .end((err, response) => {
                expect(response).to.have.status(422);
                //expect(response.body.first_name).equal('Root');
				//response.body.should.have.property('user').eql({'last_name': 'Twyr'});
				//response.body.should.have.property('last_name').eql('Twyr');
				expect(response.to.have.property('last_name')).equal('Twyr');
				done(err);
            });
		});*/

		it('Should give error if first name or last name is null', function() {
        agent
            .patch('/profile/users')
            .send({
                'first_name': '',
                'last_name': ''
            })
            .then(function(res) {
                expect(res).to.have.status(422);
            })
            .catch(function(err) {
                throw err;
            });
    });

	it('Contact number should be a number', function(done) {
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
	
	it('Should allow to delete a correct contact number', function() {
        agent
        .del('/profile/users-contact/:user_contact_id', function(request) {
            expect(request).to.have.param('user_contact_id', '5709d6c8-c03b-4372-969c-6e3e666ae117');    //id from database
        })
        .then(function(response) {
            expect(response).to.have.status(200);
        })
        .catch(function(err) {
            throw err;
        });
    })

	 /*it('Should return proper contact id', function(done) {
       agent
            .del('/profile/user-contacts/:user_contact_id', function(request) {
                expect(request.params.user_contact_id).eql('89e2a252-85c8-4804-931b-96668d23a641');
            })
            .end((err, response) =>{
                done(err);
				expect(response).to.have.status(200);
			});
        });

		it('Should return proper contact id', function(done) {
			agent
			.del('/profile/user-contacts/89e2a252-85c8-4804-931b-96668d23a641')
				///expect(request.params.user_contact_id).eql('');
			.end((err, response) =>{
				done(err);
				expect(response).to.have.status(200);
			});
		});*/

	it('Any Password should not be blank', function(done) {
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
});
