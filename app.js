#!/usr/bin/env node

var http = require('http');
var ProgressBar = require('progress');
var fs = require('fs');
var argv = require('minimist')(process.argv.slice(2));

var url = argv._[0];
if(url === undefined) {
	console.warn("Usage:\n" +
		"  arte7dl [-q 2200|1500|800] [--title 'title pattern'] <url>\n" +
		"\nExemple:\n" +
		"  arte7dl -q 800 'http://www.arte.tv/guide/fr/048707-028/silex-and-the-city'");
	return;
}

var quality = argv.q;
var titlePattern = argv.title;
if(titlePattern === undefined) {
	titlePattern = "%title%% - subtitle% %(year)% [arte]";
}

if(quality === 800) {
	quality = 'HQ';
} else if(quality === 1500) {
	quality = 'EQ';
} else {
	quality = 'SQ';
}

/**
 * Download data from url
 * @param  {string}   url      data to download
 * @param  {Function} callback
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

/**
 * Get json which contains the videos
 * @param  {string}   html     find json in source
 * @param  {Function} callback
 */
function getJson(html, callback) {

	var pattern = / arte_vp_url=["'](.+?)["']>/g,
	    match,
	    jsonUrl;

	while((match = pattern.exec(html))) {

		if(match[1].match('PLUS7')) {
			jsonUrl = match[1].replace("/player/", "/");
		}
	}

	download(jsonUrl, function(data) {
		var json = JSON.parse(data);
		callback(json);
	});
}

/**
 * Get mp4 video url
 * @param  {string}   url      Arte url
 * @param  {string}   quality  HQ, EQ, SQ
 * @param  {Function} callback
 */
function getVideoInfo(url, quality, callback) {
	download(url, function(html) {

		getJson(html, function(json) {

			if(json.video.VTI === null) {
				console.error("Error: No title found");
				return;
			}

			var jsonVideo = json.video;

			// Create video object with basic infos
			var video = {};
			video.title = jsonVideo.VTI;
			video.subtitle = jsonVideo.VSU || "";
			video.description = jsonVideo.VDE || "";
			video.lang = jsonVideo.videoIsoLang || "";
			video.year = jsonVideo.productionYear | 0;
			video.time = jsonVideo.VDU | 0; // minutes
			video.director = jsonVideo.director || "";
			video.image = jsonVideo.programImage || "";

			// Thanks to https://github.com/GuGuss/ARTE-7-Downloader
			for(var i = 0; i < jsonVideo.VSR.length; i++) {

				// Get the videos where VFO is "HBBTV".
				if(jsonVideo.VSR[i].VFO === "HBBTV") {

					// Get the video URL using the requested quality.
					if(jsonVideo.VSR[i].VQU === quality) {
						// console.log(quality + " MP4 URL : " + jsonVideo.VSR[i].VUR);
						callback(video, jsonVideo.VSR[i].VUR);
						return;
					}
				}
			}
		});
	});
}

/**
 * Download video from url
 * @param  {string}   url      Arte+7 page url
 * @param  {string}   fileName Filename
 * @param  {Function} callback
 */
function downloadVideo(url, fileName, callback) {
	var urlToken = require('url').parse(url);
	var data = '';
	var req = http.request({host: urlToken.host, path: urlToken.path});

	req.on('response', function(res) {
		if(fileName) {
			var len = parseInt(res.headers['content-length'], 10);

			// Show a progressbar
			var bar = new ProgressBar(' downloading [:bar] :percent  :etas', {
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
			callback(data);
		});
	});

	req.on('error', function(e) {
		console.log('problem with request: ' + e.message);
	});

	req.end();
}


// Main
console.log("Video url:  " + url);

getVideoInfo(url, quality, function(info, urlMedia) {

	/**
	 * Rename using file name pattern
	 */
	function rename(match, word, offset){
		return word.replace(/([^\w]*?)(\w+)(.*?)$/g, function(match, before, word, after) {
			if(info[word] === undefined) {
				return "";
			}
			return "" + before + info[word] + after;
		});
	}

	var title = titlePattern.replace(/%([^%]+?)%/g, rename);
	
	console.log("File title: " + title);

	// sanitize file name
	title = title.trim().replace(/[^\w\d_\-\.!\+\(\)\{\}\[\],;:~| áàâäãåçéèêëíìîïñóòôöõúùûüýÿæœÁÀÂÄÃÅÇÉÈÊËÍÌÎÏÑÓÒÔÖÕÚÙÛÜÝŸÆŒ]/g, "");

	downloadVideo(urlMedia, title + ".mp4", function() {
		console.log("Download complete");
	});
});

