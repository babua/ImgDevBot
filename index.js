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
    when(['/add :url'], 'AddController').
    when(['/delete :id'], 'DeleteController').
    otherwise('OtherwiseController')
	

tg.controller('DeleteController', ($) => {
	tg.for('/delete :id', ($) => {
		console.log($);
		fs.stat(config.imageFolder + $.user.id, function(err, stats) {
	    	if(!err){
	    		fs.readdir(config.imageFolder + $.user.id, function(err,files){
			    	files = files.filter(function(val){
			    		if(path.extname(val) === ".jpg" || path.extname(val) === ".jpeg" || path.extname(val) === ".png") return true
			    	});
			    	files = files.filter(function(val){
			    		if(path.basename(val).indexOf($.query.id) !== -1) return true
			    	});
			    	if(files.length === 1)
			    	{
			    		fs.unlink(config.imageFolder + $.user.id + "/" + files[0], function(err){
			    			if(!err){
			    				console.log(config.imageFolder + $.user.id + "/thumbnails/" + path.basename(files[0],path.extname(files[0])) + "-100x100" + path.extname(files[0]));
								fs.unlink(config.imageFolder + $.user.id + "/thumbnails/" + path.basename(files[0],path.extname(files[0])) + "-100x100" + path.extname(files[0]), function(err){
									if(!err){
										$.sendMessage("Image deleted",{reply_to_message_id: $.message.message_id});			
									} else {
										console.log("Thumbnail could not be deleted: " + config.imageFolder + $.user.id + "/thumbnails/" + path.basename(files[0],path.extname(files[0])) + "-100x100" + path.extname(files[0]));
										//TODO
										//Main file is deleted, but log the thumbnail deletion failure in a file
									} 
								});
			    			} else {
			    				console.log(err)
			    				$.sendMessage("Image could not be deleted",{reply_to_message_id: $.message.message_id});
			    			}
			    		});
			    	} else if (files.length === 0){
			    		$.sendMessage("ID not found",{reply_to_message_id: $.message.message_id});
			    	} else if (files.length > 1) {
			    		console.log("this really shouldn't happen");
			    		$.sendMessage("Somehow there's more than one image with this UNIQUE ID :( ",{reply_to_message_id: $.message.message_id});
			    	} else {
			    		console.log("something went wrong");
			    	}
			    });
			}
		});	

	})
})

tg.controller('AddController', ($) => {
    tg.for('/add :url', ($) => {
    	//Preliminary input checking
    	if(path.extname($.query.url) === ".gif"){
    		$.sendMessage("We don't work with GIFs");
    	} else {
    		//Check if URL exists
			urlExists($.query.url, function(err, exists) {
			if(exists)
			{
				//Check if URL is actually an image
				if(isImageUrl($.query.url)){
					//Check if it's too big
					remoteFileSize($.query.url, function(err, fileSize) {
						if(err) {
							$.sendMessage("URL is image but its size could not be determined");	
						} else {
							if(fileSize < config.fileSizeLimit){
								//We can start saving the image
								console.log($);	
								mkdirp(config.imageFolder + $.user.id, function (err) {
									//Make sure user's image folder exists
								    if (err)
								    {
								    	console.error(err);
								    } else {
								    	console.log('pow!');
								    	$.newFileName = uuid.v1() + path.extname($.query.url);
								    	//Download the file to user's folder, rename to unique id
										download($.query.url, {
											directory: config.imageFolder + $.user.id,
											filename: $.newFileName
										}, function(err){
											if (err) throw err
											//Download complete
											//Now we make a thumbnail
											//Make sure thumbnail folder exists
											mkdirp(config.imageFolder + $.user.id + "/thumbnails/", function (err) {
											    if (err){console.error(err);} else {
											    	console.log($);
											    	//Set up the thumbnail generator
													var thumbnail = new Thumbnail(config.imageFolder + $.user.id, config.imageFolder + $.user.id + "/thumbnails");    	
													thumbnail.ensureThumbnail($.newFileName, 100, 100, function (err, filename) {
													  // "filename" is the name of the thumb in '/path/to/thumbnails'
													  //Send a message to user after thumbnail is generated
													  $.sendMessage("Image added with ID: " + path.basename($.newFileName,path.extname($.newFileName)),{reply_to_message_id: $.message.message_id});
													});
											    }
											});
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

tg.controller('OtherwiseController', ($) => {
	console.log("=====OtherwiseController=====")
	console.log($);
	if($.message.photo !== undefined){
		// console.log($.message.photo)
		var photoIndex = $.message.photo.reduce(function(previousValue, currentValue, currentIndex, array) {
			console.log("prev: " + previousValue)
			console.log("curr: " + currentValue)
		  	if(currentValue.width > previousValue.width) return currentIndex;
		});
		var photo = $.message.photo[photoIndex];
		tg.getFile(photo.file_id, (body, err) => {console.log(body)}) 
	}
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