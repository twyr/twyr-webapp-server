exports.config = {
	"logger": {
		"level": "debug",
		"exitOnError": true
	},
	"transports": {
		"File1": {
			"name": "File",
			"level": "warn",
			"maxsize": 10485760,
			"filename": "logs/twyr-web-application.log",
			"maxFiles": 10,
			"tailable": true,
			"zippedArchive": false
		},
		"Console": {
			"name": "Console",
			"level": "warn",
			"stderrLevels": [
				"warn",
				"error"
			]
		}
	}
};
