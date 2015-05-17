/**
 * Created by jlb on 5/16/15.
 */

var fs = require('fs'),
    nodeFs = require('node-fs'),
    path = require('path'),
    rimraf = require('rimraf'),
    tmpFolder = __dirname + '/../tmp/test/tmp',
    testFolder = __dirname + '/../tmp/test/test',
    promise = require('selenium-webdriver').promise;

var imageUtils;

//var sandbox = sinon.sandbox.create();

describe('Image-Utils', function () {
    var easyImage = {
        info: function (fileName) {
            var deferred = defer();
            deferred.resolve({width: 900});
            return deferred.promise;
        },
        crop: function (obj) {
            var deferred = defer();
            deferred.resolve({path: __dirname + '/resources/testCropScreenShot.png'});
            return deferred.promise;
        }
    };


    /** @type webdriver.WebDriver */
    var webDriver = {
        browserName: 'chrome',
        takeScreenshot: function () {
            return new promise.when(__dirname + '/resources/testScreenShot.png');
        },
        getSession: function () {
            var self = this;
            return new promise.when({
                getCapability: function () {
                    return self.browserName;
                }
            });
        },
        manage: function () {
            return {
                window: function () {
                    return {
                        getSize: function () {
                            return new promise.when({
                                value: {
                                    width: 900
                                }
                            })
                        }
                    }
                }
            }
        }
    };
    var element = {
        getLocation: function () {
            return new promise.when({
                value: {
                    x: 0,
                    y: 0
                }
            })
        },
        getSize: function () {
            return new promise.when({
                value: {
                    width: 100,
                    height: 100
                }
            })
        }
    };

    var comparisonValue = '0';
    var process = {
        exec: function (cmd, options, callback) {
            callback(undefined, '', comparisonValue);
        }
    };

    var crypto = {
        randomBytes: function (howMany) {
            return [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
        }
    };


    before(function (done) {
        rimraf(testFolder, function (err) {
            if (err) throw err;
            rimraf(tmpFolder, function (err) {
                if (err) throw err;
                nodeFs.mkdir(testFolder, 511, true, function(err){
                    if (err) throw err;
                    nodeFs.mkdir(tmpFolder, 511, true, function(err) {
                        if (err) throw err;
                        done()
                    })
                })
            });
        });

        mockery.enable({
            warnOnReplace: false,
            warnOnUnregistered: false
        }); // Enable mockery at the start of your test suite
    });

    beforeEach(function () {
        mockery.registerAllowable('path');                    // Allow some modules to be loaded normally
        mockery.registerMock('easyimage', easyImage);    // Register others to be replaced with our stub
        mockery.registerMock('child_process', process);    // Register others to be replaced with our stub
        mockery.registerMock('crypto', crypto);    // Register others to be replaced with our stub
        mockery.registerAllowable('../lib/image-utils', true); // Allow our module under test to be loaded normally as well
        imageUtils = require(__dirname + '/../lib/image-utils.js')(testFolder, tmpFolder);            // Load your module under test
        imageUtils.setOsTempDir(tmpFolder);
        webDriver.browserName = 'chrome';
    });

    afterEach(function () {
        //sandbox.verifyAndRestore(); // Verify all Sinon mocks have been honored
        mockery.deregisterAll();    // Deregister all Mockery mocks from node's module cache
    });

    after(function () {
        mockery.disable(); // Disable Mockery after tests are completed
    });
    describe('yearToSecondFormat', function () {
        it('should be in a valid format for file systems', function () {
            var d = new Date();
            var yyyy = d.getFullYear().toString(),
                mm = d.getMonth().toString(),
                dd = d.getDate().toString(),
                hh = d.getHours().toString(),
                mi = d.getMinutes().toString(),
                ss = d.getSeconds().toString(),
                formattedDate = yyyy + '-' + mm + '-' + dd + '-' + hh + '-' + mi + '-' + ss;
            expect(d.yearToSecondFormat()).to.equal(formattedDate);
        })
    });

    describe('getBrowserName', function () {
        it('should return chrome for a browser name', function (done) {
            expect(imageUtils.getBrowserName(webDriver)).to.eventually.equal('chrome').notify(done);
        });

        it('should fail with error when their is an error getting browser name', function (done) {
            var err = new Error('I failed');
            webDriver.browserName = err;
            expect(imageUtils.getBrowserName(webDriver)).to.eventually.equal(err).notify(done);
        })
    });

    describe('createReferenceImageForElement', function () {
        it('should create a reference image as expected', function (done) {
            var featureName = 'test',
                subFeatureName = 'subTest';
            expect(imageUtils.createReferenceImageForElement(webDriver, element, featureName, subFeatureName).then(function (fileName) {
                fs.exists(fileName, function (exists) {
                    (exists) ? done() : done(false);
                })
            }));
        });
    });

    describe('compareReferenceImageWithElementScreenShot', function () {
        it('should compare screen shot with reference image', function (done) {
            var featureName = 'test',
                subFeatureName = 'subTest';
            expect(imageUtils.compareReferenceImageWithElementScreenShot(element, webDriver, featureName, subFeatureName, 0)).to.eventually.have.property('comparisonNumber').equal(0).notify(done);
        });
        it('should keep images on failure', function (done) {
            var featureName = 'test',
                subFeatureName = 'subTest';
            comparisonValue = '10';
            webDriver.browserName = 'chrome';
            fs.createReadStream(__dirname + '/resources/testCropScreenShot.png').pipe(fs.createWriteStream(path.join(tmpFolder, 'unit_test_bbbbbbbbbbbbbbbbbbbb_compare.png')));
            expect(imageUtils.compareReferenceImageWithElementScreenShot(element, webDriver, featureName, subFeatureName, 0)).to.eventually.have.property('comparisonNumber').equal(10).notify(done);
        })
    });

    describe('takeScreenShot', function(done){
        it('should take a picture and put it in a specific location', function(done){
            expect(imageUtils.takeScreenShot(webDriver)).to.eventually.equal(path.normalize(tmpFolder) + '/screenshot_bbbbbbbbbbbbbbbbbbbb.png').notify(done);
        });
    });
});