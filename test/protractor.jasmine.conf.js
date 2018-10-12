/*global browser */
var retry = require('../lib/retry');

exports.config = {
    framework: 'jasmine2',
    specs: ['./jasmine/*.spec.js'],
    capabilities: {
        shardTestFiles: true,
        maxInstances: 4,
        browserName: 'chrome',
        Build: 'protractor-retry-'+process.env.TRAVIS_BRANCH +'-'+process.env.TRAVIS_BUILD_NUMBER,
        name: process.env.TRAVIS_BRANCH +'-'+process.env.TRAVIS_BUILD_NUMBER
    },
    sauceUser: process.env.SAUCE_USERNAME,
    sauceKey: process.env.SAUCE_ACCESS_KEY,
    onCleanUp: function (results) {
        retry.onCleanUp(results);
    },
    onPrepare: function () {
        retry.onPrepare();
        require('jasmine-expect');
        browser.ignoreSynchronization = true;
    },
    afterLaunch: function() {
        return retry.afterLaunch(2); // number of retries ( default is 2 )
    }
};
