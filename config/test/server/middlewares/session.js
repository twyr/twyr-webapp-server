exports.config = {
	"randomServer": {
		"apiKey": "YOUR_API_KEY"
	},
	"passwordFormat": {
		"n": 1,
		"length": 12,
		"characters": "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	},
	"resetPasswordMail": {
		"from": "do-not-reply@twyr.com",
		"subject": "Twy'r generated random password"
	}
};
