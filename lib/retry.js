/* global browser */

/*
Copyright 2017, Yahoo Holdings Inc.
Copyrights licensed under the MIT License.
See the accompanying LICENSE file for terms.
Authors: Amro Altahtamouni <amrot@yahoo-inc.com>
         Dreux Ludovic <dreuxl@yahoo-inc.com>
         Dmytro Rodionov <dev@rodionov.uk>
*/

var fs = require('fs');
var path = require('path');
var xml2js = require('xml2js');
var argv = require('yargs').argv;
var debug = require('debug')('ProtractorRetry');
var unique = require('array-unique');
var crossSpawn = require('cross-spawn');
var Q = require('q');
var retry;

function afterLaunch(configRetry, isDeleteFailedSpecs = false, folderWithReports = undefined) {

    /**
     * configRetry ( default value will be 2 )
     */
    retry = (configRetry) ? configRetry : 2;

    /**
     * Since the ( afterLaunch ) called after protractor finished the execution
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
        failedTestList.list.failedTest.forEach(function (failTest) {
            list.push(failTest.spec.toString());
        });

        /* Protractor Command Generator */
        if (process.env.PROTRACTOR_RETRY_ARGS) {
            protractorCommand = protractorCommand.concat(process.env.PROTRACTOR_RETRY_ARGS.split(' '));
        } else {
            protractorCommand.push(argv._);
        }
        var fixedSpecList = fixSpecs(unique(list).join(','));
        protractorCommand.push('--specs', fixedSpecList);

        /* add the retry count to the running command  */
        protractorCommand.push('--retry', retryCount);
        protractorCommand.push('--disableChecks');
        /* the remaining command arg */
        var usedCommandKeys = ['$0', '_', 'test', 'specs', 'retry', 'suite', 'help', 'version'];

        const keyify = (obj, prefix = '--') =>
            Object.keys(obj).forEach(objectKey => {
                if (usedCommandKeys.indexOf(objectKey) === -1) {
                    if (Array.isArray(obj[objectKey])) {
                        Object.keys(obj[objectKey]).forEach(value => {
                            protractorCommand.push(prefix + objectKey, obj[objectKey][value]);
                        });
                    } else if (typeof obj[objectKey] === 'object' && obj[objectKey] !== null) {
                        keyify(obj[objectKey], prefix + objectKey + '.');
                    } else {
                        protractorCommand.push(prefix + objectKey, obj[objectKey]);
                    }
                }
            }, []);

        keyify(argv);

        if (retryCount <= retry) {
            /* remove failed specs reports from the specified folder to not have it in the result summary report  */
            if (isDeleteFailedSpecs && folderWithReports !== undefined) {
                deleteFailedSpecs(folderWithReports, fixedSpecList);
            }

            retryLogger(retryCount, fixedSpecList);
            const protractorExecutionPath = process.env.PROTRACTOR_RETRY_COMMAND ?
                process.env.PROTRACTOR_RETRY_COMMAND : prepareProtractorExecutionPath(argv.$0);
            return Q.fcall(spawn(protractorExecutionPath, protractorCommand));
        }

        /* There are still outstanding tests and no retry available, consider as failure */
        return 1;
    }
    /* There are no outstanding tests, consider as success */
    return 0;
}

function deleteFailedSpecs(folderName, failedSpecList) {
    if (fs.existsSync(folderName)) {
        fs.readdirSync(folderName).forEach(file => {
            failedSpecList.forEach((item) => {
                const filePath = `${folderName}/${file}`;
                if (fs.existsSync(filePath)) {
                    const data = fs.readFileSync(filePath,
                        {encoding: 'utf8', flag: 'r'});
                    if (data.includes(item)) {
                        fs.unlinkSync(filePath);
                    }
                }
            });
        });
    }
}

function fixSpecs(specList) {
    var list = specList.split(',');
    list.forEach(function (data, key) {
        if (data.indexOf('__protractor_internal_afterEach_setup_spec.js') > 0) {
            list.splice(key, 1);
        }
    });
    return list.join(',');
}

function onPrepare() {
    browser.getProcessedConfig().then(function (processedConfig) {
        global.browser.currentSpec = processedConfig;
    });
}

function onCleanUp(results, files) {
    if (results) {
        writeToFile(files);
    }
}

function prepareProtractorExecutionPath(path) {
    var executionPath = path.split(' ');
    return executionPath[executionPath.length - 1];
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
    return function () {
        return Q.Promise(function (resolve) {
            var child = crossSpawn(command, args);
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
    var txt;
    if (files && files.length > 0) {
        txt = prepareData(files);
    } else {
        txt = prepareData(browser.currentSpec.specs.toString());
    }
    if (!fs.existsSync(file)) {
        fs.writeFileSync(file, '<?xml version="1.0" encoding="UTF-8"?>\n<list>\n' + txt);
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
    return '<failedTest>\n<spec>' + files + '</spec>\n</failedTest>\n';
}


module.exports = {
    afterLaunch: afterLaunch,
    onCleanUp: onCleanUp,
    onPrepare: onPrepare
};
