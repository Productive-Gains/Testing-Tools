/**
 * Created by jlb on 4/23/15.
 */

var crypto = require('crypto'),
    easyimg = require('easyimage'),
    exec = require('child_process').exec,
    fs = require('fs'),
    nodeFs = require('node-fs'),
    os = require('os'),
    path = require('path'),
    Q = require('q'),
    promise = require('selenium-webdriver').promise;

module.exports = function (testFolder, tmpFolder) {

    Date.prototype.yearToSecondFormat = function () {
        var yyyy = this.getFullYear().toString(),
            mm = this.getMonth().toString(),
            dd = this.getDate().toString(),
            hh = this.getHours().toString(),
            mi = this.getMinutes().toString(),
            ss = this.getSeconds().toString();
        return yyyy + '-' + mm + '-' + dd + '-' + hh + '-' + mi + '-' + ss;
    };

    var getBrowserName = function (webDriver) {
        var defer = promise.defer();
        webDriver.getSession().then(function (session) {
            defer.fulfill(session.getCapability('browserName'));
        }, function (err) {
            console.error(err);
            defer.reject(new Error(err));
        });
        return defer.promise;
    };

    var keepImagesForReview = function (screenShot, referenceFile, compareFile, webDriver, foldername, filename) {
        var defer = promise.defer();
        getBrowserName(webDriver).then(function (browserName) {
            var failedFolder = path.join(tmpFolder, 'screenshots', 'failed'),
                now = new Date().yearToSecondFormat(),
                screenShotFileName = path.join(failedFolder, process.platform + "-" + browserName + '-screenshot' + now + '-' + filename + '.png'),
                referenceFileName = path.join(failedFolder, process.platform + "-" + browserName + '-reference' + now + '-' + filename + '.png'),
                compareFileName = path.join(failedFolder, process.platform + "-" + browserName + '-compare' + now + '-' + filename + '.png');
            fs.createReadStream(screenShot).pipe(fs.createWriteStream(screenShotFileName));
            fs.createReadStream(referenceFile).pipe(fs.createWriteStream(referenceFileName));
            fs.createReadStream(compareFile).pipe(fs.createWriteStream(compareFileName));
            defer.fulfill();
        });
        return defer.promise;
    };

    var random = function (howMany, chars) {
        chars = chars
        || "abcdefghijklmnopqrstuwxyzABCDEFGHIJKLMNOPQRSTUWXYZ0123456789";
        var rnd = crypto.randomBytes(howMany)
            , value = new Array(howMany)
            , len = chars.length;

        for (var i = 0; i < howMany; i++) {
            value[i] = chars[rnd[i] % len]
        }

        return value.join('');
    };

    var tempFiles = [];
    var isExiting = false;

    function _deleteTempFiles() {
        if (isExiting) {
            return;
        }

        isExiting = true;
        var defer = promise.defer(),
            file,
            tempFileCount = tempFiles.length,
            closeCount = 0;

        while ((file = tempFiles.pop()) != undefined) {
            fs.close(file, function () {
                fs.unlink(file, function () {
                    if (closeCount == tempFileCount) {
                        defer.fulfill();
                    } else {
                        closeCount++;
                    }
                })
            })
        }
        return defer.promise;
    }


    var getTempFileName = function (prefix, suffix) {
        return path.join(os.tmpDir(), (prefix || 'pre-') + random(20) + (suffix || '.tmp'));
    };

    var getTempFile = function (prefix, suffix) {
        var defer = promise.defer(),
            fileName = getTempFileName(prefix, suffix);

        fs.open(fileName, 'w+', function (err, fd) {
            if (err) {
                defer.reject(new Error(err));
            }
            tempFiles.push(fd);
            defer.fulfill(fd);
        });

        return defer.promise;
    };

    var compareReferenceImageWithElementScreenShot = function (element, webDriver, featureName, subFeatureName, comparisonThreshold) {
        var defer = promise.defer();

        Q.allSettled([
            getReferenceImageFileName(webDriver, featureName, subFeatureName),
            takeElementScreenShot(webDriver, element)
        ]).spread(function (referenceImageFileName, elementScreenShot) {
            compareImages(elementScreenShot.value.path, referenceImageFileName.value).then(function (comparison) {
                if (comparison > comparisonThreshold) {
                    keepImagesForReview(elementScreenShot.value.path, referenceImageFileName.value, webDriver, featureName, subFeatureName);
                }
                defer.fulfill(comparison);
            }, function (err) {
                console.error(err);
                defer.reject(new Error(err));
            })
        }, function (err) {
            console.error(err);
            defer.reject(new Error(err));
        });
        return defer.promise;
    };

    var findImageMagickBinDir = function (startDir) {
        var dir = startDir || __dirname + '/imagemagick';

        fs.readDir(dir, function (err, list) {
            if (err) return defer.reject(err);
            var pending = list.length;
            if (!pending) return defer.reject('No files!');
            list.forEach(function (fileName) {
                if (fileName == 'bin') {
                    return path.normalize(path.join(dir, fileName));
                }
                var file = path.resolve(dir, fileName);
                fs.stat(file, function (err, stat) {
                    if (stat && stat.isDirectory()) {
                        var result = findImageMagickBinDir(file);
                        if (result != 'failed') {
                            return result;
                        }
                    }
                });
            });
            return 'failed';
        });
    };


    var findImageMagickHomeDir = function () {
        var dir = __dirname + '/imagemagick';

        fs.readDir(dir, function (err, list) {
            if (err) return defer.reject(err);
            var pending = list.length;
            if (!pending) return defer.reject('No files!');
            list.forEach(function (fileName) {
                return path.normalize(path.join(dir, fileName));
            });
        });
    };

    var setImageMagickEnvSettings = function () {
        var platform = process.platform;

        process.env.MAGICK_HOME = imageMagickHome();
        process.env.PATH = '$MAGICK_HOME/bin:$PATH';
        if (platform == 'darwin') {
            process.env.DYLD_LIBRARY_PATH = '$MAGICK_HOME/lib/';
        } else if (platform == 'freebsd' || platform == 'linux' || platform == 'sunos') {
            process.env.LD_LIBRARY_PATH = '${LD_LIBRARY_PATH:+$LD_LIBRARY_PATH:}$MAGICK_HOME/lib';
        } else {
            console.error('Unsupported platform "' + platform + '"');
        }
    };

    var compareImages = function (screenShotFileName, referenceImageFileName) {
        var bin = findImageMagickBinDir(),
            cmd = 'compare -metric AE -fuzz 0% ' + screenShotFileName + ' ' + referenceImageFileName + ' ' + getTempFileName('unit_test_', '_compare.png'),
            defer = new promise.Deferred(),
            imageMagickHome = findImageMagickHomeDir();

        setImageMagickEnvSettings();

        exec(cmd, {
            env: process.env
        }, function (err, stdout, stderr) {
            if (err) {
                defer.reject(new Error(err));
            }
            defer.fulfill(parseInt(stderr));
        });

        return defer.promise;
    };

    var getReferenceImageFileName = function (webDriver, featureName, subFeatureName) {
        var defer = new promise.Deferred();
        getBrowserName(webDriver).then(function (browserName) {
            var fileName = process.platform + '-' + browserName + '-' + subFeatureName + '.png';
            var absolutePath = path.normalize(path.join(testFolder, 'resources', 'screenshots', featureName, subFeatureName, fileName));
            defer.fulfill(absolutePath);
        }, function (err) {
            console.error(err);
            defer.reject(new Error(err));
        });
        return defer;
    };

    var createReferenceImageForElement = function (webDriver, element, featureName, subFeatureName) {
        var defer = promise.defer();
        Q.allSettled([
            getReferenceImageFileName(webDriver, featureName, subFeatureName),
            takeElementScreenShot(webDriver, element)
        ]).spread(function (referenceImageFileName, screenShotFileName) {
            var referencePathObj = path.parse(referenceImageFileName.value);
            nodeFs.mkdirSync(referencePathObj.dir, 0777, true);
            fs.createReadStream(screenShotFileName.value.path).pipe(fs.createWriteStream(referenceImageFileName.value));
            defer.fulfill();
        }, function (err) {
            console.error(err);
            defer.reject(new Error(err));
        });
        return defer.promise;
    };

    var takeElementScreenShot = function (webDriver, element) {
        defer = new promise.Deferred();
        setImageMagickEnvSettings();
        Q.allSettled([
            element.getLocation(),
            element.getSize(),
            takeScreenShot(),
            browser.driver.manage().window().getSize()
        ]).spread(function (location, size, screenShotFileName, windowSize) {
                easyimg.info(screenShotFileName.value).then(function (info) {
                    var screenRatio = info.width / windowSize.value.width;
                    var pathObj = path.parse(screenShotFileName.value);
                    pathObj.base = 'crop_' + pathObj.base;
                    var cropFileName = path.format(pathObj);
                    easyimg.crop({
                        src: screenShotFileName.value,
                        dst: cropFileName,
                        cropwidth: size.value.width * screenRatio,
                        cropheight: size.value.height * screenRatio,
                        x: location.value.x * screenRatio,
                        y: location.value.y * screenRatio,
                        gravity: 'NorthWest'
                    }).then(function (image) {
                        console.log('Element picture taken: ' + JSON.stringify(image));
                        defer.fulfill(image);
                    }, function (err) {
                        console.error(err);
                        defer.reject(new Error(err));
                    })
                }, function (err) {
                    console.error(err);
                    defer.reject(new Error(err));
                })
            }, function (err) {
                console.error(err);
                defer.reject(err);
            }
        );
        return defer;
    };

    var takeScreenShot = function () {
        var deferred = new promise.Deferred();
        var fileName = getTempFileName('screenshot_', '.png');
        browser.driver.takeScreenshot().then(
            function (image, err) {
                fs.writeFile(fileName, image, 'base64', function (err) {
                    (err) ? deferred.reject(new Error(err)) : deferred.fulfill(fileName);
                });
            }, function (err) {
                console.log('Error taking screenshot: ' + err);
                deferred.reject(new Error(err));
            }
        );
        return deferred;
    };

    process.on('SIGINT', _deleteTempFiles);
    process.on('SIGHUP', _deleteTempFiles);
    process.on('SIGTERM', _deleteTempFiles);
    process.on('beforeExit', _deleteTempFiles);

    return {
        getBrowserName: getBrowserName,
        keepImagesForReview: keepImagesForReview,
        compareReferenceImageWithElementScreenShot: compareReferenceImageWithElementScreenShot,
        compareImages: compareImages,
        createReferenceImageForElement: createReferenceImageForElement,
        takeScreenShot: takeScreenShot
    }
};
