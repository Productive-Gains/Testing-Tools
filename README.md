# PG Testing Utils for NodeJS Projects

This a NPM module for use in testing in Productive Gains.  
Version: 1.0.0

# Summary of set up

var testingUtils = require('pg-testing-utils');
testingUtils.imageUtils.functionName();

# Dependencies

To use this module to its fullest you need to install Imagemagick on your system.

# How to run tests
npm test

### Contribution guidelines ###

# Git Process

This project uses the Gitflow process, so no development happens in master.  Only work done branched off of master is
hot fixes to production problems.  The develop branch is used for all feature development, while relase branches are used
for making final changes to a release.  More details are in the link below.

https://www.atlassian.com/git/tutorials/comparing-workflows/gitflow-workflow


### Who do I talk to? ###

* Created by Joe Bailey


# Wiremock

Wiremock is a proxy we use between the browser and server to inject faults and other data.  It allows us to test for
real-world conditions.  To inject we must first use Wiremock to record traffic we want to change.  Then we take those
recordings and alter them for our tests.

http://wiremock.org/running-standalone.html

## Recording network traffic
Configure your browser ot have all HTTP traffic go through localhost:8080 and make it allows localhost traffic to the proxy.

To record network traffic:
1. open a terminal
2. Navigate to the lib folder in this project
3. run `java -jar wiremock-1.54-standalone-mod.jar --verbose --root-dir mappings --record-mappings --match-headers="Accept,Content-Type --enable-brower-proxying" `

In the root directory (--root-dir) there will be two folders: mappings and ____files.  Mappings are the headers and other details
 of a request.  While the files in ____files are the body of the message and contain the data. You will need to identify
 the specific files related to your test.  Then add the contents of the mapping file and body to your tests.

The request section in the mapping files goes in exports.systemCalls with the injection-utils file in lib.  This makes
it available to tests.  Recommend using a key that is business centric, as they will be displayed in the Gherkin.
The response section will be provided in the test.

## Setting up Firefox for Testing Through Wiremock

Wiremock is a proxy designed to influence the data between the server and the browser.  This gives our tests great control
over the data going to the browser and we can inject faults for negative testing.  Firefox can be configured to use
Wiremock by adding a Mozilla.cfg in the same folder as the firefox binary with the settings below.

Add to Mozilla.cfg:

    defaultPref("network.proxy.type", 1);
    pref("network.proxy.http", "localhost");
    pref("network.proxy.http_port", 8080);
    pref("network.proxy.no_proxies_on", "");

To run the wiremock enabled tests add ":injection" to the end of a grunt e2e call.
Example: grunt e2e:firefox:injection

This will only run the injection proxy enabled tests and start wiremock.

**NOTE:** If you see the message below try to rerun the e2e tests with the injection command.  Otherwise, you need to kill
the java process running wiremock.
```
>> 2015-04-17 12:10:01.670 failed DelayableSocketConnector@0.0.0.0:8080: java.net.BindException: Address already in use: JVM_Bind
>> 2015-04-17 12:10:01.670 failed Server@807653: java.net.BindException: Address already in use: JVM_Bind
>> java.lang.RuntimeException: java.net.BindException: Address already in use: JVM_Bind
```


### Manual Running of Wiremock
Then you do the following from the build_scripts folder:

1. `java -jar node_modules\gcp-testing-tools\lib\wiremock-1.54-standalone-mod.jar --root-dir ..\..\tmp\mappings node_modules\gcp-testing-tools\lib\mappings --enable_browser_proxy`
2. `grunt e2e:firefox --cucumberOpts={\"tags\":\"@proxy_browser_test\"}` or this for all `grunt e2e:firefox --cucumberOpts=`

### Changing Proxy Host and Port in e2e Tests

Setting environment variables: WIREMOCK_HOST and WIREMOCK_PORT will set the host and port in the tests.
Otherwise, it defaults to localhost:8080.
