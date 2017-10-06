<a href="https://badge.fury.io/js/protractor-retry"><img src="https://badge.fury.io/js/protractor-retry.svg" alt="npm version" height="18"></a>

## Protractor-retry

 * A solution to address the **flakyness** of your Protractor FE automation test suites.  
 * This module used protractor features to automatically re-run failed tests with a specific configurable number of attempts.
 * This module is added in our CICD pipelines  where we have a zero failure policy in order to bless an environment.
 * Mocha & Jasmine are supported.
 *

<img src="https://user-images.githubusercontent.com/12041605/30343044-cd942a4c-97b0-11e7-850e-a7111996a554.png" align="center" height="75" width="600" /><br/><br/>

This module fully relies on protractor available callbacks and internal functionalities.

It is from within protractor itself and not relying on any external dependency. All the changes that you need to add in order to integrate this module is located only in one file, the protractor configuration file. **You don’t need to update a single line of the *spec.js files.**

The module will create an XML file which contains the failed spec(s) filename(s). and will re-run only them, till either we don't have anymore failures or we reached the retry attempt maximum.

The process of retrying is not happening on the fly of a test failure but only after the whole testsuite is run. The failed tests are stored and only those ones are going to be rerun.

<img src="https://user-images.githubusercontent.com/12041605/30344129-ea28261e-97b4-11e7-99fe-4a28ff74b547.jpg" align="center" height="390" width="390" /><br/><br/>

### Steps to Integrate

#### Install

```
npm i -g  protractor-retry
```

#### Step 1: Require the Package ( Your Protractor Config )
```js
var retry = require('protractor-retry').retry;
```

#### Step 2: onPrepare ( Your Protractor Config )
```js
onPrepare: function() {
  retry.onPrepare();
}
```
#### Step 3: onCleanUp ( Your Protractor Config )
```js
onCleanUp = function(results) {
    retry.onCleanUp(results);
};
```
It is Mandatory to provide the `results` to the retry.onCleanUp function

#### Step 4: afterLaunch ( Your Protractor Config )
 ```js
afterLaunch = function() {
    return retry.afterLaunch(NUMBER_OF_RETRIES);
}
```
It is Mandatory to use `return` here

#### Full Protractor Config snippet with 2 retries
```js
exports.config = {
    // rest of your config
    onCleanUp: function (results) {
        retry.onCleanUp(results);
    },
    onPrepare: function () {
        retry.onPrepare();
    },
    afterLaunch: function() {
        return retry.afterLaunch(2);
    }
};
```

### Example

Checkout this example file [protractor.conf.js](test/specs/protractor.conf.js)

### Known Caveat
If you are NOT Running in Parallel mode, the package will retry the whole testsuite if any failure.
