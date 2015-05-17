/**
 * Created by jlb on 5/17/15.
 */

/* globals describe, it, mockery, before, expect, beforeEach, afterEach, after */

var nock = require('nock'),
    nodeFs = require('node-fs'),
    rimraf = require('rimraf'),
    tmpFolder = __dirname + '/../tmp/test/tmp',
    testFolder = __dirname + '/../tmp/test/test';

var wireMockUtils;

describe('Wiremock-Utils', function () {
    before(function (done) {
        rimraf(testFolder, function (err) {
            if (err) {
                throw err;
            }
            rimraf(tmpFolder, function (err) {
                if (err) {
                    throw err;
                }
                nodeFs.mkdir(testFolder, 511, true, function (err) {
                    if (err) {
                        throw err;
                    }
                    nodeFs.mkdir(tmpFolder, 511, true, function (err) {
                        if (err) {
                            throw err;
                        }
                        done();
                    });
                });
            });
        });

        mockery.enable({
            warnOnReplace: false,
            warnOnUnregistered: false
        }); // Enable mockery at the start of your test suite
    });

    beforeEach(function () {
        mockery.registerAllowable('path');                    // Allow some modules to be loaded normally
        mockery.registerMock('child_process', process);    // Register others to be replaced with our stub
        mockery.registerAllowable('../lib/wiremock-utils', true); // Allow our module under test to be loaded normally as well
        wireMockUtils = require(__dirname + '/../lib/wiremock-utils.js')();            // Load your module under test
    });

    afterEach(function () {
        //sandbox.verifyAndRestore(); // Verify all Sinon mocks have been honored
        mockery.deregisterAll();    // Deregister all Mockery mocks from node's module cache
    });

    after(function () {
        mockery.disable(); // Disable Mockery after tests are completed
    });

    describe('EMPTY_RESPONSE', function () {
        it('should have the proper wiremock setting', function () {
            wireMockUtils.EMPTY_RESPONSE.should.deep.equal({'fault': 'EMPTY_RESPONSE'});
        });
    });
    describe('GARBAGE_DATA_RESPONSE', function () {
        it('should have the proper wiremock setting', function () {
            wireMockUtils.GARBAGE_DATA_RESPONSE.should.deep.equal({'fault': 'RANDOM_DATA_THEN_CLOSE'});
        });
    });
    describe('setDelay', function () {
        it('should return a modified mapping with a delay in the response section', function () {
            var delay = 10,
                mapping = {
                    response: {}
                },
                expected = {
                    response: {
                        fixedDelayMilliseconds: 10000
                    }
                };
            wireMockUtils.setDelay(mapping, delay).should.deep.equal(expected);
        });
        it('should return a modified mapping with a delay', function () {
            var delay = 10,
                mapping = {},
                expected = {
                    fixedDelayMilliseconds: 10000
                };
            wireMockUtils.setDelay(mapping, delay).should.deep.equal(expected);
        });
    });

    describe('shutdownProxy', function(){
        it('should send a valid shutdown command via HTTP', function(){
            var proxyResponse = nock('http://localhost:8080')
                .post('/__admin/shutdown')
                .reply(200, '');
            wireMockUtils.shutdownProxy();
            //noinspection BadExpressionStatementJS
            expect(proxyResponse.done()).to.be.undefined; // jshint ignore:line
        });
    });
    describe('reset', function(){
        it('should send a valid rest command via HTTP', function(){
            var proxyResponse = nock('http://localhost:8080')
                .post('/__admin/reset')
                .reply(200, '');
            wireMockUtils.reset();
            //noinspection BadExpressionStatementJS
            expect(proxyResponse.done()).to.be.undefined; // jshint ignore:line
        });
    });
    describe('resetToDefault', function(){
        it('should send a valid resetToDefault command via HTTP', function(){
            var proxyResponse = nock('http://localhost:8080')
                .post('/__admin/mappings/reset')
                .reply(200, '');
            wireMockUtils.resetToDefault();
            //noinspection BadExpressionStatementJS
            expect(proxyResponse.done()).to.be.undefined; // jshint ignore:line
        });
    });
    describe('sendMapping', function(){
        it('should send a valid sendMapping command via HTTP', function(done){
            var mappingBody = {},
                mappingResponse = {},
                reqBody = {},
                proxyResponse = nock('http://localhost:8080')
                    .post('/__admin/mappings/new')
                    .reply(200, function(uri, requestBody) {
                        reqBody = requestBody;
                        return undefined;
                    });
            wireMockUtils.sendMapping(mappingBody, mappingResponse);
            //noinspection BadExpressionStatementJS
            expect(proxyResponse.done()).to.be.undefined; // jshint ignore:line
            reqBody.should.equal('{"response":{}}');
            done();
        });
    });

});
