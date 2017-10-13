/* global describe, it, expect, browser */

describe('Test Retry', function() {    
    it('retry', function() {
        browser.get('https://www.yahoo.com').then(function() {
            expect(true).toEqual(true);
        });
    });
});
