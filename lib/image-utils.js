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

    /**
     * Date for mate for file names
     * @returns {string}
     */
    Date.prototype.yearToSecondFormat = function () {
        var yyyy = this.getFullYear().toString(),
            mm = this.getMonth().toString(),
            dd = this.getDate().toString(),
            hh = this.getHours().toString(),
            mi = this.getMinutes().toString(),
            ss = this.getSeconds().toString();
        return yyyy + '-' + mm + '-' + dd + '-' + hh + '-' + mi + '-' + ss;
    };

    /**
     * Returns the browser name based on the Selenium WebDriver
     * @param  {!webdriver.WebDriver} webDriver
     * @returns {webdriver.promise.Promise<T>}
     */
    var getBrowserName = function (webDriver) {
        /** @type {webdriver.promise.Deferred} */
        var defer = promise.defer();
        webDriver.getSession().then(function (session) {
            defer.fulfill(session.getCapability('browserName'));
        }, function (err) {
            console.error(err);
            defer.reject(new Error(err));
        });
        return defer.promise;
    };

    /**
     * Keeps all the images related to a failed comparison.
     *
     * @param {!string} screenShotFileName
     * @param {!string} referenceFileName
     * @param {!string} compareFileName
     * @param {!webdriver.WebDriver} webDriver
     * @param {!string} folderName
     * @param {!string} fileNameSuffix
     * @returns {webdriver.promise.Promise<T>}
     */
    var keepImagesForReview = function (screenShotFileName, referenceFileName, compareFileName, webDriver, folderName, fileNameSuffix) {
        /** @type {webdriver.promise.Deferred} */
        var defer = promise.defer();
        getBrowserName(webDriver).then(function (browserName) {
            var failedFolder = path.join(tmpFolder, 'screenshots', 'failed', folderName),
                now = new Date().yearToSecondFormat(),
                keepScreenShotFileName = path.join(failedFolder, process.platform + "-" + browserName + '-screenshot-' + now + '-' + fileNameSuffix + '.png'),
                keepReferenceFileName = path.join(failedFolder, process.platform + "-" + browserName + '-reference-' + now + '-' + fileNameSuffix + '.png'),
                keepCompareFileName = path.join(failedFolder, process.platform + "-" + browserName + '-compare-' + now + '-' + fileNameSuffix + '.png');
            nodeFs.mkdir(failedFolder, 511, true, function(err){
                if (err) throw err;
                fs.createReadStream(screenShotFileName).pipe(fs.createWriteStream(keepScreenShotFileName));
                fs.createReadStream(referenceFileName).pipe(fs.createWriteStream(keepReferenceFileName));
                fs.createReadStream(compareFileName).pipe(fs.createWriteStream(keepCompareFileName));
                defer.fulfill();
            });
        });
        return defer.promise;
    };

    /**
     * Random chars from a-z, A-Z and 0-9.
     *
     * @param {!number} howMany How
     * @param {string=} chars
     * @returns {string}
     */
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

    /**
     *
     * @param {!string} prefix
     * @param {!string} suffix
     * @returns {string}
     */
    var getTempFileName = function (prefix, suffix) {
        return path.join(getOsTempDir(), (prefix || 'pre-') + random(20) + (suffix || '.tmp'));
    };

    var osTempDir;
    var setOsTempDir = function(dir) {
        osTempDir = dir;
    };
    var getOsTempDir = function(){
        return osTempDir || os.tmpdir();
    };
    /**
     *
     * @param {!webdriver.WebElement} element
     * @param {!webdriver.WebDriver} webDriver
     * @param {!string} featureName
     * @param {!string} subFeatureName
     * @param {!number} comparisonThreshold
     * @returns {webdriver.promise.Promise<T>}
     */
    var compareReferenceImageWithElementScreenShot = function (element, webDriver, featureName, subFeatureName, comparisonThreshold) {
        /** @type {webdriver.promise.Deferred} */
        var defer = promise.defer();

        Q.allSettled([
            getReferenceImageFileName(webDriver, featureName, subFeatureName),
            takeElementScreenShot(webDriver, element)
        ]).spread(function (referenceImageFileName, elementScreenShot) {
            compareImages(elementScreenShot.value.path, referenceImageFileName.value).then(function (comparison) {
                if (comparison.comparisonNumber > comparisonThreshold) {
                    keepImagesForReview(elementScreenShot.value.path, referenceImageFileName.value, comparison.compareFileName, webDriver, featureName, subFeatureName);
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

    /**
     *
     * @param {!string} screenShotFileName
     * @param {!string} referenceImageFileName
     * @returns {webdriver.promise.Promise<T>}
     */
    var compareImages = function (screenShotFileName, referenceImageFileName) {
        var compareFileName = getTempFileName('unit_test_', '_compare.png'),
            cmd = 'compare -metric AE -fuzz 0% ' + screenShotFileName + ' ' + referenceImageFileName + ' ' + compareFileName;
        /** @type {webdriver.promise.Deferred} */
        var defer = promise.defer({});

        exec(cmd, {
            env: process.env
        }, function (err, stdout, stderr) {
            if (err) {
                defer.reject(new Error(err));
            }
            defer.fulfill({compareFileName: compareFileName, comparisonNumber: parseInt(stderr)});
        });

        return defer.promise;
    };

    /**
     *
     * @param {!webdriver.WebDriver} webDriver
     * @param {!string} featureName
     * @param {!string} subFeatureName
     * @returns {webdriver.promise.Promise<T>}
     */
    var getReferenceImageFileName = function (webDriver, featureName, subFeatureName) {
        /** @type {webdriver.promise.Deferred} */
        var defer = promise.defer();

        getBrowserName(webDriver).then(function (browserName) {
            var fileName = process.platform + '-' + browserName + '-' + subFeatureName + '.png';
            var absolutePath = path.normalize(path.join(testFolder, 'resources', 'screenshots', featureName, subFeatureName, fileName));
            defer.fulfill(absolutePath);
        }, function (err) {
            console.error(err);
            defer.reject(new Error(err));
        });
        return defer.promise;
    };

    /**
     *
     * @param {!webdriver.WebDriver} webDriver
     * @param {!webdriver.WebElement} element
     * @param {!string} featureName
     * @param {!string} subFeatureName
     * @returns {webdriver.promise.Promise<string>}
     */
    var createReferenceImageForElement = function (webDriver, element, featureName, subFeatureName) {
        /** @type {webdriver.promise.Deferred} */
        var defer = promise.defer();
        Q.allSettled([
            getReferenceImageFileName(webDriver, featureName, subFeatureName),
            takeElementScreenShot(webDriver, element)
        ]).spread(function (referenceImageFileName, screenShotFileName) {

            var referencePathObj = path.parse(referenceImageFileName.value);
            nodeFs.mkdirSync(referencePathObj.dir, 511, true);
            fs.createReadStream(screenShotFileName.value.path).pipe(fs.createWriteStream(referenceImageFileName.value));
            defer.fulfill(referenceImageFileName.value);
        }, function (err) {
            console.error(err);
            defer.reject(new Error(err));
        });
        return defer.promise;
    };

    /**
     *
     * @param {!webdriver.WebDriver} webDriver
     * @param {!webdriver.WebElement} element
     * @returns {webdriver.promise.Promise<T>}
     */
    var takeElementScreenShot = function (webDriver, element) {
        /** @type {webdriver.promise.Deferred} */
        var defer = promise.defer();

        Q.allSettled([
            element.getLocation(),
            element.getSize(),
            takeScreenShot(webDriver),
            webDriver.manage().window().getSize()
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
        return defer.promise;
    };

    /**
     *
     * @param {!webdriver.WebDriver} webDriver
     * @returns {webdriver.promise.Promise<T>}
     */
    var takeScreenShot = function (webDriver) {
        /** @type {webdriver.promise.Deferred} */
        var defer = promise.defer();

        var fileName = getTempFileName('screenshot_', '.png');
        webDriver.takeScreenshot().then(
            function (image) {
                fs.writeFile(fileName, image, 'base64', function (err) {
                    (err) ? defer.reject(new Error(err)) : defer.fulfill(fileName);
                });
            }, function (err) {
                console.error('Error taking screenshot: ' + err);
                defer.reject(new Error(err));
            }
        );
        return defer.promise;
    };

    return {
        getBrowserName: getBrowserName,
        createReferenceImageForElement: createReferenceImageForElement,
        compareReferenceImageWithElementScreenShot: compareReferenceImageWithElementScreenShot,
        takeScreenShot: takeScreenShot,
        setOsTempDir: setOsTempDir
    }
};
