/*global browser */
var retry = require('../lib/retry');

exports.config = {
    framework:'mocha',
    specs: ['./specs/*.spec.js'],
    capabilities: {
        shardTestFiles: true,
        maxInstances: 4,
        browserName: 'firefox'
    },
    sauceUser: 'sso-yahoo-homepage-sauce',
    sauceKeyName: 'sso-yahoo-homepage',
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
