/*global browser */
var retry = require('../lib/retry');

exports.config = {
    framework: 'jasmine2',
    specs: ['./jasmine/*.spec.js'],
    capabilities: {
        shardTestFiles: true,
        maxInstances: 4,
        browserName: 'chrome',
        Build: 'localrun-'+new Date(),
        name: __filename
    },
    sauceUser: 'YOUR_SAUCE_USER',
    sauceKey: 'YOUR_SAUCE_KEY',
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
