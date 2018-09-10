exports.config = {
	"test": true,

	"transporter": {
		"host": "smtp.ethereal.email",
		"port": 587,
		"secure": false,
		"auth": {
			"user": "",
			"pass": ""
		}
	},

	"sendMail": {
		"from": "Twy'r WebApp Server"
	}
};
