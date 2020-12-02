/*global browser */
var retry = require('../lib/retry');

exports.config = {
    framework: 'mocha',
    specs: ['./mocha/*.spec.js'],
    mochaOpts: {
        timeout: false
    },
    capabilities: {
        shardTestFiles: true,
        maxInstances: 4,
        browserName: 'chrome',
        Build: 'localrun-'+new Date(),
        name: __filename
    },
    sauceUser: 'pretry',
    sauceKey: 'dc3af908-f747-4245-989e-d34b8af7d387',
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
