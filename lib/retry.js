/* global browser, process */

/*
Copyright 2017, Yahoo Holdings Inc.
Copyrights licensed under the MIT License.
See the accompanying LICENSE file for terms.
Authors: Amro Altahtamouni <amrot@yahoo-inc.com>
         Dreux Ludovic <dreuxl@yahoo-inc.com>
*/

var fs = require('fs');
var path = require('path');
var xml2js = require('xml2js');
var argv = require('yargs').argv;
var debug = require('debug')('ProtractorRetry');
var unique = require('array-unique');
var childProcess = require('child_process');
var Q = require('q');
var retry;

function afterLaunch(configRetry) {

    /**
    * configRetry ( default value will be 2 )
    */
    retry = (configRetry) ? configRetry : 2;

    /**
    * Since the ( afterLaunch ) called after prtractor finished the execution
    * the results XML file should have the header added from the reporter call.
    * and we add this to close the list here
    */
    var file = resultsFilePath();
    if (!fs.existsSync(file)) {
      /* Result file is not created, because tests passed, consider as success */
        return 0;
    }

    fs.appendFileSync(file, '</list>');

    var failedTestList;
    var data = fs.readFileSync(file, 'utf8');
    var parser = new xml2js.Parser();
    parser.parseString(data, function (err, result) {
        if (err) {
            console.log(err);
        }
        failedTestList = result;
    });

    /* IF WE HAVE RETRY FROM COMMAND ( WE ALREADY DID ONE RETRY OR MORE ) */
    debug('ProtractorCommand', argv);
    var retryCount = 1;
    if (argv.retry) {
        retryCount = ++argv.retry;
    }

    /* Rename the XML file with the retry number */
    fs.renameSync(resultsFilePath(), resultsFilePath(retryCount));

    if (failedTestList.list.failedTest && failedTestList.list.failedTest.length !== 0) {
        var list = [];
        var protractorCommand = [];

        debug('failedTestList', failedTestList.list.failedTest);
        failedTestList.list.failedTest.forEach(function(failTest) {
            list.push(failTest.spec.toString());
        });

        /* Protractor Command Generator */
        protractorCommand.push(argv._);
        var fixedSpecList = fixSpecs(unique(list).join(','));
        protractorCommand.push('--specs', fixedSpecList);

        /* add the retry count to the running command  */
        protractorCommand.push('--retry', retryCount);
        protractorCommand.push('--disableChecks');
        /* the remaining command arg */
        var usedCommandKeys = ['$0', '_', 'test', 'specs', 'retry' , 'suite', 'help', 'version'];
        Object.keys(argv).forEach(function(key) {
            if (usedCommandKeys.indexOf(key) === -1) {
                if(key === 'params') {
                    Object.keys(argv[key]).forEach(function(param) {
                        protractorCommand.push('--params.'+param, argv[key][param]);
                    });
                } else {
                    protractorCommand.push('--'+key, argv[key]);
                }
            }
        });

        if (retryCount <= retry) {
            retryLogger(retryCount, fixedSpecList);
            var protExecutionPath = prepareProtractorExecutionPath(argv.$0);
            return Q.fcall(spawn(protExecutionPath, protractorCommand));
        }

        /* There are still outstanding tests and no retry available, consider as failure */
        return 1;
    }
    /* There are no outstanding tests, consider as success */
    return 0;
}

function fixSpecs(specList) {
    var list = specList.split(',');
    list.forEach(function(data,key) {
        if ( data.indexOf('__protractor_internal_afterEach_setup_spec.js') > 0 ) {
            list.splice(key,1);
        }
    });
    return list.join(',');
}

function onPrepare() {
    browser.getProcessedConfig().then(function(processedConfig) {
        global.browser.currentSpec = processedConfig;
    });
}

function onCleanUp(results,files) {
    if (results) {
        writeToFile(files);
    }
}

function prepareProtractorExecutionPath(path) {
    var executionPath = path.split(' ');
    return executionPath[executionPath.length-1];
}

function resultsFilePath(retry) {
    var resultsDir = path.resolve(process.cwd(), 'protractorFailuresReport');
    var fileName = 'protractorTestErrors';

    if (!fs.existsSync(resultsDir)) {
        fs.mkdirSync(resultsDir);
    }

    if (retry) {
        fileName = fileName + '-' + retry;
    }
    debug('resultsFile', resultsDir + '/' + fileName + '.xml');
    return resultsDir + '/' + fileName + '.xml';
}

function spawn(command, args) {
    debug('Command', command, args);
    return function() {
        return Q.Promise(function(resolve) {
            var child = childProcess.spawn(command, args);
            child.stdout.pipe(process.stdout);
            child.stderr.pipe(process.stderr);
            child.on('close', (code) => {
                resolve(code);
            });
        });
    };
}

function writeToFile(files) {
    var file = resultsFilePath();
    var txt = '';
    if (files && files.length > 0) {
        txt = prepareData(files);
    } else {
        txt = prepareData(browser.currentSpec.specs.toString());
    }
    if (!fs.existsSync(file)) {
        fs.writeFileSync(file, '<?xml version="1.0" encoding="UTF-8"?>\n<list>\n'+txt);
    } else {
        fs.appendFileSync(file, txt);
    }
}

function retryLogger(attempt, list) {
    console.log('\n');
    console.log(' Re-running tests , attempt : ', attempt);
    console.log(' Re-running the following test files :', list);
    console.log('\n');
}

function prepareData(files) {
    return '<failedTest>\n<spec>'+files+'</spec>\n</failedTest>\n';
}


module.exports = {
    afterLaunch: afterLaunch,
    onCleanUp: onCleanUp,
    onPrepare: onPrepare
};
