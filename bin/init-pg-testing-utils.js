#!/usr/bin/env node

var http = require('http'),
    fs = require('fs'),
    tar = require('tar'),
    zlib = require('zlib');

var imageMagickDownloadFilePath,
    imageMagickDownloadFileName,
    platform = process.platform;

if (platform == 'darwin') {
    imageMagickDownloadFilePath = 'http://www.imagemagick.org/download/binaries/';
    imageMagickDownloadFileName = 'ImageMagick-x86_64-apple-darwin14.0.0.tar.gz';
} else if (platform == 'freebsd') {
    console.error('Unsupported platform "' + platform + '"');
    process.exit('1');
    //
    //imageMagickDownloadFilePath = 'http://www.imagemagick.org/download/linux/CentOS/i386/';
    //imageMagickDownloadFileName = 'ImageMagick-6.9.1-2.i386.rpm';
} else if (platform == 'linux') {
    console.error('Unsupported platform "' + platform + '"');
    process.exit('1');

    //imageMagickDownloadFilePath = 'http://www.imagemagick.org/download/linux/CentOS/i386/';
    //imageMagickDownloadFileName = 'ImageMagick-6.9.1-2.i386.rpm';
} else if (platform == 'sunos') {
    imageMagickDownloadFilePath = 'http://www.imagemagick.org/download/binaries/';
    imageMagickDownloadFileName = 'ImageMagick-sparc-sun-solaris2.10.tar.gz';
} else if (platform == 'win32') {
    imageMagickDownloadFilePath = 'http://www.imagemagick.org/download/binaries/';
    imageMagickDownloadFileName = 'ImageMagick-6.9.1-2-Q16-x86-windows.zip';
} else {
    console.error('Unsupported platform "' + platform + '"');
    process.exit('1');
}

console.log('Downloading: ' + imageMagickDownloadFilePath + imageMagickDownloadFileName);


var request = http.get(imageMagickDownloadFilePath + imageMagickDownloadFileName, function(response) {
    if (platform == 'win32') {
        response.pipe(zlib.createUnzip({path: __dirname + '/imagemagick'}));
    } else {
        console.log('Unziping and untaring the file');
        response.pipe(zlib.createUnzip()).pipe(tar.Extract({path: __dirname + '/imagemagick'}));
    }
});
