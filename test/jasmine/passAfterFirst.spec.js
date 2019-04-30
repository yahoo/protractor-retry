/* global describe, it, expect, browser */
var argv = require('yargs').argv;

describe('Test Retry', function() {
    it('retry', function(done) {
        browser.get('https://www.yahoo.com').then(function() {
            if (argv.retry) {
                expect(true).toEqual(true);
            } else {
                expect(true).toEqual(false);
            }
        });
    });
});
