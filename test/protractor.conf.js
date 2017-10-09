/*global browser */
var retry = require('../lib/retry');

exports.config = {
    framework:'mocha',
    mochaOpts: {
        enableTimeouts: false
    },
    specs: ['./specs/*.spec.js'],
    capabilities: {
        shardTestFiles: true,
        maxInstances: 4,
        browserName: 'firefox'
        tunnel-identifier: process.env.TRAVIS_JOB_NUMBER,
        build: process.env.TRAVIS_BUILD_NUMBER
    },
    sauceUser: process.env.SAUCE_USERNAME,
    sauceKey: process.env.SAUCE_ACCESS_KEY,
    onCleanUp: function (results) {
        retry.onCleanUp(results);
    },
    onPrepare: function () {
        retry.onPrepare();
        var chai = require('chai');
        var chaiAsPromised = require('chai-as-promised');
        chai.use(chaiAsPromised);
        global.expect = chai.expect;
        browser.ignoreSynchronization = true;
    },
    afterLaunch: function() {
        return retry.afterLaunch(2); // number of retries ( default is 2 )
    }
};
