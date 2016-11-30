const fs = require('fs');
const exec = require('child_process').exec;
const path = require('path');
import { guid } from './utils';

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

function shell(command) {
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
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

export function testHaskellFile(filePath) {
    return new Promise((resolve, reject) => {
        const tempName = guid();
        const newPath = `${path.dirname(filePath)}/${tempName}.hs`;

        fs.createReadStream(filePath).pipe(fs.createWriteStream(newPath));
        fs.readFile(newPath, 'utf-8', (err, data) => {
            if (err) reject(err);

            const newValue = '{-# LANGUAGE TemplateHaskell #-}\nimport Test.QuickCheck.All\n' + removeMainFunction(data)
                + '\nreturn []\nrunTests = $quickCheckAll\nmain = runTests';

            fs.writeFile(newPath, newValue, 'utf-8', err => {
                if (err) reject(err);
                console.log('QuickCheking...');
                
                shell(`stack runhaskell ${newPath}`).then(std => {
                    fs.unlinkSync(newPath);
                    resolve(parseStdout(std[0]));
                }).catch(error => {
                    fs.unlinkSync(newPath);
                    reject(error);
                });
            });
        });
    });
}