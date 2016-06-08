'use strict'
var config = require('./config/config.js'),
	tg = require('telegram-node-bot')(config.telegram.token),
	urlExists = require('url-exists'),
	isImageUrl = require('is-image-url'),
	remoteFileSize = require('remote-file-size'),
	mkdirp = require('mkdirp'),
	download = require('download-file'),
	uuid = require('node-uuid'),
	path = require('path'),
	Thumbnail = require('thumbnail'),
	fs = require('fs'),
	imageSize = require('image-size');

mkdirp.sync(config.imageFolder);

tg.router.
    when(['/add :url'], 'AddController')


tg.controller('AddController', ($) => {
    tg.for('/add :url', ($) => {
    	console.log(path.extname($.query.url));
    	if(path.extname($.query.url) === ".gif"){
    		$.sendMessage("We don't work with GIFs");
    	} else {
			urlExists($.query.url, function(err, exists) {
	    	console.log(exists);
			if(exists)
			{
				if(isImageUrl($.query.url)){
					remoteFileSize($.query.url, function(err, fileSize) {
						if(err) {
							$.sendMessage("URL is image but its size could not be determined");	
						} else {
							if(fileSize < config.fileSizeLimit){
								$.sendMessage("URL is image and its size is " + fileSize );	
								//TODO: save file
								console.log($);	
								mkdirp(config.imageFolder + $.user.id, function (err) {
								    if (err)
								    {
								    	console.error(err);
								    } else {
								    	console.log('pow!');
								    	$.newFileName = uuid.v1();
								    	//$.newFileName = uuid.v1() + "_" + path.basename($.query.url);
										download($.query.url, {
											directory: config.imageFolder + $.user.id,
											filename: $.newFileName
										}, function(err){

											console.log("download callback newFileName: " + $.newFileName);
											if (err) throw err
											console.log("meow")
											
											var mkdirpCallback = function (err) {
												console.log("injected filename: " + $.fileName);
											    if (err)
											    {
											    	console.error(err);
											    } else {
											    	console.log("thumbnail folder created");
											    	console.log("thumbnail callback newFileName: " + $.newFileName);
													var thumbnail = new Thumbnail(config.imageFolder + $.user.id, config.imageFolder + $.user.id + "/thumbnails");    	
													thumbnail.ensureThumbnail($.newFileName, 100, 100, function (err, filename) {
													  // "filename" is the name of the thumb in '/path/to/thumbnails'
													  console.log("thumbnail created at " + filename);
													});
											    }
											}

											mkdirp(config.imageFolder + $.user.id + "/thumbnails/", mkdirpCallback);
											
										}); 
								    }
								});
							} else {
								$.sendMessage("URL is image but it's larger than " + config.fileSizeLimitHumanReadable );		
							}
							
						}
						
					})
					
				} else {
					$.sendMessage("URL is not image");	
				}
			} else {
				$.sendMessage($.query.url + "doesn't exist");
			}
	    });
    	}
    })
}) 



tg.inlineMode(($) => {
	console.log($);

    var results = [];
    fs.stat(config.imageFolder + $.from.id, function(err, stats) {
    	if(!err){
    		fs.readdir(config.imageFolder + $.from.id, function(err,files){
		    	files = files.filter(function(val){
		    		if(path.extname(val) === ".jpg" || path.extname(val) === ".jpeg" || path.extname(val) === ".png") return true
		    	});
		    	files.forEach(function(val,ind,arr){
		    		var dimensions = imageSize(config.imageFolder + $.from.id + "/" + val);

		    		results.push({
		    			type: "photo",
		    			id : val.slice(0,36),
		    			photo_url : config.serverUrl + $.from.id + "/" + val,
		    			thumb_url : config.serverUrl + $.from.id + "/thumbnails/" + val.slice(0,val.lastIndexOf(".")) + "-100x100" + path.extname(val),
		    			//caption : config.serverUrl + $.from.id + "/" + val,
		    			photo_width : dimensions.width,
		    			photo_height : dimensions.height
		    		});
		    	});
		    	console.log(results);
		    	$.paginatedAnswer(results, 20);

		    });
    	}
    });
    
})