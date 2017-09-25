/* global describe, it, expect, browser */
var argv = require('yargs').argv;

describe('Test Retry', function() {    
    it('retry', function() {
        browser.get('https://www.yahoo.com').then(function() {
            if (argv.retry === 2 ) {
                expect(true).to.be.equal(true);
            } else {
                expect(true).to.be.equal(false);
            }
        });
    });
});
