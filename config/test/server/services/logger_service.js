exports.config = {
	"logger": {
		"level": "debug",
		"exitOnError": true
	},
	"transports": {
		"File1": {
			"name": "File",
			"level": "info",
			"maxsize": 10485760,
			"filename": "logs/twyr-web-application.log",
			"maxFiles": 10,
			"tailable": true,
			"zippedArchive": false
		},
		"Console": {
			"name": "Console",
			"level": "info",
			"stderrLevels": [
				"warn",
				"error"
			]
		}
	}
};
