const fs = require('fs');
const exec = require('child_process').exec;
const path = require('path');
import { guid } from '../utils/uuid';

function parseStdout(out, isStack) {
    const rawOut = out.split('\n');
    const passedTests = [];
    const failedTests = [];

    let i = 0;
    while (i < rawOut.length) {
        const splitLine = rawOut[i].split(' ');

        // Ignore line
        if (isStack && (rawOut[i] == '' || (rawOut[i] != '' && (rawOut[i + 1].slice(0, 3) !== '+++' && rawOut[i + 1].slice(0, 3) !== '***')))) {
            i++;
            continue;
        }

        // Start of a test
        if (splitLine[0] === '===' || isStack) {
            i++;
            const passed = rawOut[i].slice(0, 3) === '+++';
            const test = {
                name: isStack ? rawOut[i - 1] : splitLine[1],
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
        
        if (!isStack) i++;
    }
    return { passedTests, failedTests };
}

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

function removeMainFunction(data) {
    const dataArray = data.toString().split('\n');

    let start;
    let end;
    for (let i = 0; i < dataArray.length; i++) {
        if (dataArray[i].slice(0, 6) === 'main =') {
            start = i;
            end = i;
        } else if (start !== undefined) {
            if (dataArray[i] === '') {
                break;
            } else {
                end++;
            }   
        }
    }

    dataArray.splice(start, end - start + 1);
    return dataArray.join('\n');
}

export function testHaskellFile(filePath, stackWd) {
    return new Promise((resolve, reject) => {
        const tempName = guid();
        const newPath = `${path.dirname(filePath)}/${tempName}.hs`;

        if (stackWd === undefined) {
            fs.createReadStream(filePath).pipe(fs.createWriteStream(newPath));
            fs.readFile(newPath, 'utf-8', (err, data) => {
                if (err) reject(err);

                const newValue = '{-# LANGUAGE TemplateHaskell #-}\nimport Test.QuickCheck.All\n' + removeMainFunction(data)
                    + '\nreturn []\nrunTests = $quickCheckAll\nmain = runTests';

                fs.writeFile(newPath, newValue, 'utf-8', err => {
                    if (err) reject(err);
                    console.log('QuickCheking...');
                    
                    shell(`stack runhaskell ${newPath}`, {}).then(std => {
                        console.log(std[0]);
                        fs.unlinkSync(newPath);
                        resolve(parseStdout(std[0], false));
                    }).catch(error => {
                        fs.unlinkSync(newPath);
                        reject(error);
                    });
                });
            });
        } else {
            shell('stack test', { cwd: stackWd}).then(std => {
                resolve(parseStdout(std[0], true));
            }).catch(error => {
                reject(error);
            });
        }        
    });
}