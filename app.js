#!/usr/bin/env node

var http = require('http');
var ProgressBar = require('progress');
var fs = require('fs');
var argv = require('minimist')(process.argv.slice(2));

var url = argv['_'][0];
var quality = argv.q;

if(quality === 800) {
	quality = 'HQ';
} else if(quality === 1500) {
	quality = 'EQ';
} else {
	quality = 'SQ';
}

/*
 * Download data from url
 */
function download(url, callback) {
	http.get(url, function(res) {
		var data = "";

		res.on('data', function(chunk) {
			data += chunk;
		});

		res.on("end", function() {
			callback(data);
		});
	}).on("error", function() {
		callback(null);
	});
}

/*
 * Get json which contains the videos
 */
function getJson(html, cb) {

	var pattern = / arte_vp_url="([^"]+)">/g,
	    match,
	    matches = [];

	while(match = pattern.exec(html)) {

		if(match[1].match('PLUS7')) {
			var jsonUrl = match[1].replace("player/", "");
		}

		matches.push(match[1].replace("player/", ""));
	}

	download(jsonUrl, function(data) {
		var json = JSON.parse(data);
		cb(json);
	});
}

/*
 * Get mp4 video url
 */
function getVideoInfo(url, quality, cb) {
	download(url, function(html) {

		var pattern = /<h6>([^<]+)<\/h6/g,
		    match,
		    matches = [];

		while(match = pattern.exec(html)) {
			matches.push(match[1]);
		}

		var title = matches[0];

		getJson(html, function(json) {

			// Thanks to https://github.com/GuGuss/ARTE-7-Downloader
			for(var i = 0; i < json["video"]["VSR"].length; i++) {

				// Get the videos where VFO is "HBBTV".
				if(json["video"]["VSR"][i]["VFO"] === "HBBTV") {

					// Get the video URL using the requested quality.
					if(json["video"]["VSR"][i]["VQU"] === quality) {
						// console.log(quality + " MP4 URL : " + json["video"]["VSR"][i]["VUR"]);
						cb(title, json["video"]["VSR"][i]["VUR"]);
					}
				}
			}
		});
	});
}

/*
 * Download video from url
 */
function downloadVideo(url, fileName, cb) {
	var urlToken = require('url').parse(url);
	var data = '';
	var req = http.request({host: urlToken.host, path: urlToken.path});

	req.on('response', function(res) {
		if(fileName) {
			var len = parseInt(res.headers['content-length'], 10);

			var bar = new ProgressBar(' downloading [:bar] :percent :etas', {
				incomplete: ' ',
				width: 30,
				total: len
			});

			res.on('data', function (chunk) {
				bar.tick(chunk.length);

				fs.appendFile(fileName + '.tmp', chunk);
			});
		} else {
			res.setEncoding('utf8');
			res.on('data', function (chunk) {
				data += chunk;
			});
		}

		res.on('end', function() {
			if(fileName) {
				fs.renameSync(fileName + '.tmp', fileName);
			}
			cb(data);
		})
	});

	req.on('error', function(e) {
		console.log('problem with request: ' + e.message);
	});

	req.end();
}

getVideoInfo(url, quality, function(title, url) {
	console.log("Video url: " + url);

	// sanitize file name
	title = title.trim().replace(/[^\w\d_\-\.!\+\(\)\{\}\[\],;:~| áàâäãåçéèêëíìîïñóòôöõúùûüýÿæœÁÀÂÄÃÅÇÉÈÊËÍÌÎÏÑÓÒÔÖÕÚÙÛÜÝŸÆŒ]/g, "");
	title += " [arte]";

	downloadVideo(url, title + ".mp4");
});

