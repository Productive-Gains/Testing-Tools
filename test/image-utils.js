/**
 * Created by jlb on 5/16/15.
 */

var fs = require('fs'),
    rimraf = require('rimraf'),
    tmpFolder = __dirname + '/../tmp/test/tmp',
    testFolder = __dirname + '/../tmp/test/test',
    promise = require('selenium-webdriver').promise;

var imageUtils;

var sandbox = sinon.sandbox.create();

describe('Image-Utils', function () {
    var easyImage = {
        info: function(fileName) {
            var deferred = defer();
            deferred.resolve({width:900});
            return deferred.promise;
        },
        crop: function(obj) {
            var deferred = defer();
            deferred.resolve({path: __dirname + '/resources/testCropScreenShot.png'});
            return deferred.promise;
        }
    };

    before(function (done) {
        rimraf(testFolder, function(err){
            if (err) throw err;
            rimraf(tmpFolder, function(err){
                if (err) throw err;
                done()
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
        mockery.registerAllowable('../lib/image-utils', true); // Allow our module under test to be loaded normally as well
        imageUtils = require(__dirname + '/../lib/image-utils.js')(testFolder, tmpFolder);            // Load your module under test
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
            /** @type webdriver.WebDriver */
            var webDriver = {
                getSession: function () {
                    return new promise.when({
                        getCapability: function () {
                            return 'chrome';
                        }
                    });
                }
            };
            expect(imageUtils.getBrowserName(webDriver)).to.eventually.equal('chrome').notify(done);
        });

        it('should fail with error when their is an error getting browser name', function (done) {
            /** @type webdriver.WebDriver */
            var err = new Error('I failed'),
                webDriver = {
                getSession: function () {
                    return new promise.when({
                        getCapability: function () {
                            return err;
                        }
                    });
                }
            };
            expect(imageUtils.getBrowserName(webDriver)).to.eventually.equal(err).notify(done);
        })
    });

    describe('createReferenceImageForElement', function () {
        it('should create a reference image as expected', function (done) {
            var webDriver = {
                takeScreenshot: function() {
                    return new promise.when(__dirname + '/resources/testScreenShot.png');
                },
                getSession: function () {
                    return new promise.when({
                        getCapability: function () {
                            return 'chrome';
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
                                            width:900
                                        }
                                    })
                                }
                            }
                        }
                    }
                }
            };
            var element = {
                getLocation: function() {
                    return new promise.when({
                            value: {
                                x: 0,
                                y: 0
                            }
                    })
                },
                getSize: function() {
                    return new promise.when({
                        value: {
                            width: 100,
                            height: 100
                        }
                    })
                }
            };
            var featureName = 'test',
                subFeatureName = 'subTest';
            expect(imageUtils.createReferenceImageForElement(webDriver, element, featureName, subFeatureName).then(function(fileName) {
                fs.exists(fileName, function(exists) {
                    (exists)?done(): done(false);
                })
            }));
        });
    })
});