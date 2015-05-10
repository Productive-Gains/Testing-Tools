#!/usr/bin/env node

var http = require('http'),
    fs = require('fs');

var platform = process.platform,
    downloadDir = __dirname + '/downloads/',
    wiremockJarPath = 'http://repo1.maven.org/maven2/com/github/tomakehurst/wiremock/1.55/',
    wiremockJarFileName = 'wiremock-1.55-standalone.jar';

console.log('Downloading: ' + wiremockJarPath + wiremockJarFileName);

var request = http.get(wiremockJarPath + wiremockJarFileName, function(response) {
    if (!fs.existsSync(downloadDir)){
        fs.mkdirSync(downloadDir);
    }
    var wiremockJarFileAbsolute = downloadDir + wiremockJarFileName;
    if (!fs.existsSync(wiremockJarFileAbsolute)) {
        var file = fs.createWriteStream();
        response.pipe(file);
    }
});