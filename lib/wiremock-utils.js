/**
 * Created by jlb on 5/9/15.
 */

var http = require('http');

var proxyHost = process.env.WIREMOCK_HOST || 'localhost',
    proxyPort = process.env.WIREMOCK_PORT || 8080;

module.exports = function () {

    var EMPTY_RESPONSE = {'fault': 'EMPTY_RESPONSE'};
    var GARBAGE_DATA_RESPONSE = {'fault': 'RANDOM_DATA_THEN_CLOSE'};

    /**
     * sets the delay in the reposne portion of a mapping or it assumes the mapping object is the response portion of a mapping
     * @param {!object} mapping
     * @param {!number} delayInSeconds
     * @returns {object}
     */
    var setDelay = function (mapping, delayInSeconds) {
        if (mapping.response){
            var res = mapping.response;
            res.fixedDelayMilliseconds = delayInSeconds * 1000;
            mapping.response = res;
        } else {
            mapping.fixedDelayMilliseconds = delayInSeconds * 1000;
        }
        return mapping;
    };

    var recordNetTraffic = function() {

    };

    var startPlayback = function() {

    };

    /**
     * Shuts down the proxy remotely
     */
    var shutdownProxy = function() {
        sendCommandToProxy(getCmdOptions('/__admin/shutdown'), '');
    };

    /**
     * Resets the whole proxy and removes all mappings, even the ones saved on disk.
     */
    var reset = function() {
        sendCommandToProxy(getCmdOptions('/__admin/reset'), '');
    };

    /**
     * Resets only the mappings in memory and does not touch the ones on disk.
     */
    var resetToDefault = function() {
        sendCommandToProxy(getCmdOptions('/__admin/mappings/reset'), '');
    };

    /**
     * Sets a delay on all mappings during playback.
     * @param {!number} delay in seconds
     */
    var globalMappingDelay = function(delay){
        var d = delay * 1000;
        sendCommandToProxy(getCmdOptions('/__admin/settings'), {"fixedDelay": d});
    };

    /**
     * Sets a delay on on the socket to create a timeout during playback.
     * @param {!number} delay in seconds
     */
    var socketDelay = function(delay){
        var d = delay*1000;
        sendCommandToProxy(getCmdOptions('/__admin/socket-delay'), {"milliseconds": d});
    };

    /**
     * Sets the common items for a command request to the proxy.  The cmd details are not handled here.
     * @param {!string} cmd
     * @returns {{hostname: string, port: string, path: string, method: string}}
     */
    var getCmdOptions = function(cmd) {
        return {
            hostname: proxyHost,
            port: proxyPort,
            path: cmd,
            method: 'POST'
        };
    };

    /**
     * sends a mapping object to Wiremock.
     * @param {!object} mappingBody
     * @param {!object} mappingResponse
     */
    var sendMapping = function(mappingBody, mappingResponse) {
        mappingBody.response = mappingResponse;

        sendCommandToProxy(getCmdOptions('/__admin/mappings/new'), mappingBody);
    };

    /**
     * Sends a command to Wiremock.
     * @param {!object} cmd
     * @param {!object} cmdDetails
     */
    var sendCommandToProxy = function (cmd, cmdDetails) {
        var req = getRequestForProxy(cmd);
        if (cmdDetails){
            req.write(JSON.stringify(cmdDetails));
        }
        req.end();
    };

    /**
     * is a HTTP GET request to Wiremock
     * @param {!object} options
     */
    var getRequestForProxy = function (options) {
        return  http.request(options, function(res){
            res.setEncoding('utf8');
            res.on('data', function(e){
                console.log('Problem with proxy request: ' + e);
            });
        });
    };

    return {
        recordNetTraffic: recordNetTraffic,
        startPlayback: startPlayback,
        EMPTY_RESPONSE: EMPTY_RESPONSE,
        GARBAGE_DATA_RESPONSE: GARBAGE_DATA_RESPONSE,
        setDelay: setDelay,
        shutdownProxy: shutdownProxy,
        reset: reset,
        resetToDefault: resetToDefault,
        sendMapping: sendMapping,
        globalMappingDelay: globalMappingDelay,
        socketDelay: socketDelay
    };
};