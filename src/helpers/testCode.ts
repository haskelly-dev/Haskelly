const fs = require('fs');
const exec = require('child_process').exec;
const path = require('path');
const uuidV4 = require('uuid/v4');

/* Parsing */
function parseStdout(out) {
    const rawOut = out.split('\n');
    const passedTests = [];
    const failedTests = [];

    let i = 0;
    while (i < rawOut.length) {
        const splitLine = rawOut[i].split(' ');

        // Start of a test
        if (splitLine[0] === '===') {
            i++;
            const passed = rawOut[i].slice(0, 3) === '+++';
            const test = {
                name: splitLine[1],
            };

            if (passed) {
                passedTests.push(test);
                i++;
            } else {
                const failedInput = [];
                i++;

                // Find test name
                while (rawOut[i] !== '') {
                    failedInput.push(rawOut[i]);
                    i++;
                }

                test['failedInput'] = failedInput;
                failedTests.push(test);
            }
        }
        
        i++;
    }
    return { passedTests, failedTests };
}

function parseStackStdout(out) {
    const rawOut = out.split('\n');
    const passedTests = [];
    const failedTests = [];

    // Checks if line is a QuickCheck test
    const isTest = (line) => {
        return line.slice(0, 3) === '+++' || line.slice(0, 3) === '***';
    }

    let i = 0;
    while (i < rawOut.length) {
        const splitLine = rawOut[i].split(' ');

        // Ignore empty line or with next line not being a test
        if (rawOut[i] == '' || (!isTest(rawOut[i]) && !isTest(rawOut[i + 1]))) {
            i++;
            continue;
        }

        // Start of test
        else  {
            i++;
            const passed = rawOut[i].slice(0, 3) === '+++';
            const name = isTest(rawOut[i - 1]) ? `Test ${passedTests.length + failedTests.length + 1}` : rawOut[i - 1];
            const test = {
                name: rawOut[i - 1],
            };

            if (passed) {
                passedTests.push(test);
                i++;
            } else {
                const failedInput = [];
                i++;

                while (rawOut[i] !== '') {
                    failedInput.push(rawOut[i]);
                    i++;
                }

                test['failedInput'] = failedInput;
                failedTests.push(test);
            }
        }
    }
    return { passedTests, failedTests };
}

/* Testing */
function shell(command, options) {
    return new Promise((resolve, reject) => {
        exec(command, options, (error, stdout, stderr) => {
            if (error) {
                reject(error);
            }
            resolve([stdout, stderr]);
        });
    });
}

function removeMultilineComments(data) {
    return data.replace(/{-[\s\S]*?-}/g, (comment) => {
        return comment.replace(/\S/g, ' ');
    });
}

function removeMainFunction(data) {
    const decl_regex = /^main\s*::.*$/m;
    const def_regex = /^main\s*=.*$/m;
    const comment_regex = /^\s*--.*$/m;
    const other_regex = /^\S+.*$/m;
    const dataArray = removeMultilineComments(data).split('\n');

    let decl_start;
    let decl_end;
    let def_start;
    let def_end;

    for (let i = 0; i < dataArray.length; i++) {
    	//main type signature
    	if (decl_regex.test(dataArray[i])) {
            if (def_start !== undefined && def_end === undefined) {
                def_end = i;
            }
            if (decl_start === undefined) {
                decl_start = i;
            }
        }
        //main definition
        else if (def_regex.test(dataArray[i])) {
            if (decl_start !== undefined && decl_end === undefined) {
                decl_end = i;
            }
            if (def_start === undefined) {
                def_start = i;
            }
        }
        //skip comments
        else if (comment_regex.test(dataArray[i])) {
        	//do nothing
        }
        //different expression/declaration
        else if (other_regex.test(dataArray[i])) {
            if (decl_start !== undefined && decl_end === undefined) {
                decl_end = i;
            }
            if (def_start !== undefined && def_end === undefined) {
                def_end = i;
            }
        }
    }

    if (decl_start !== undefined && decl_end === undefined) {
        decl_end = dataArray.length;
    }
    if (def_start !== undefined && def_end === undefined) {
        def_end = dataArray.length;
    }

    return dataArray.filter((value, index, arr) => {
        return (decl_start === undefined || index < decl_start || index >= decl_end) &&
               (def_start === undefined || index < def_start || index >= def_end);
    }).join('\n');
}

export function testHaskellFile(filePath, stackWd) {
    return new Promise((resolve, reject) => {
        const newPath = `${path.dirname(filePath)}/${uuidV4()}.hs`;

        // Not Stack project
        if (stackWd === undefined) {
            let writer = fs.createWriteStream(newPath);
            fs.createReadStream(filePath).pipe(writer);
            writer.once('finish', () => {
                fs.readFile(newPath, 'utf-8', (err, data) => {
                    if (err) reject(err);

                    const newValue = '{-# LANGUAGE TemplateHaskell #-}\nimport Test.QuickCheck.All\n' + removeMainFunction(data)
                        + '\nreturn []\nrunTests = $quickCheckAll\nmain = runTests';

                    fs.writeFile(newPath, newValue, 'utf-8', err => {
                        if (err) reject(err);
                        console.log('QuickCheking...');
                        
                        shell(`stack runhaskell "${newPath}"`, {}).then(std => {
                            console.log(std[0]);
                            fs.unlinkSync(newPath);
                            resolve(parseStdout(std[0]));
                        }).catch(error => {
                            fs.unlinkSync(newPath);
                            reject(error);
                        });
                    });
                });
            });
        } else {
            shell('stack test', { cwd: stackWd}).then(std => {
                resolve(parseStackStdout(std[0]));
            }).catch(error => {
                reject(error);
            });
        }        
    });
}
