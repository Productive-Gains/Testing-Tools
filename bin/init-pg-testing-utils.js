#!/usr/bin/env node

var http = require('http'),
    fs = require('fs');

var platform = process.platform,
    wiremockJarPath = 'http://repo1.maven.org/maven2/com/github/tomakehurst/wiremock/1.55/',
    wiremockJarFileName = 'wiremock-1.55-standalone.jar';

console.log('Downloading: ' + wiremockJarPath + wiremockJarFileName);

var request = http.get(wiremockJarPath + wiremockJarFileName, function(response) {
    var file = fs.createWriteStream(__dirname + wiremockJarFileName);
    response.pipe(file);
});