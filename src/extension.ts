'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
const fs = require('fs');
const path = require('path');
import { guid } from './utils/uuid';
import { testHaskellFile } from './helpers/testCode';
import CompletionProvider from './codeCompletion/index';
import { getWorkDir } from './utils/workDir'

/* GHCi */
function loadGHCi(extPath, src) {
    const term = vscode.window.createTerminal('Haskell GHCi');
    term.show();
    term.sendText('stack ghci');
    term.sendText(`:load ${src}`)
}

/* Run Haskell */
function runHaskell(extPath, src) {
    const term = vscode.window.createTerminal('Haskell Run');
    term.show();
    term.sendText(`stack runhaskell ${src}`);
}

/* Stack Run */
function stackRun(stackWd) {
    const term = vscode.window.createTerminal('Haskell Run');
    term.sendText(`cd ${stackWd}`);
    term.sendText(`stack run`);
    term.show();
}

/* QuickCheck */
function showTestError(error, extPath) {
    vscode.window.showErrorMessage('VS Code can\'t execute this file. Check the terminal.');

    const errorFilePath = `${extPath}/${guid()}.txt`;
    fs.writeFile(errorFilePath, '-------- Error --------\n' + error +'------------------------', 'utf-8', err => {
        const term = vscode.window.createTerminal('Haskell Tests');
        term.sendText(`node ${__dirname}/utils/print.js ${errorFilePath}`);
        term.show();
        setTimeout(() => fs.unlinkSync(errorFilePath), 3000);
    });
}

function showTestOutput(passed, failed) {
    if (failed.length > 0) {
        if (failed.length === 1) {
            vscode.window.showErrorMessage(`${failed[0].name} test failed!`);
        } else {                
            vscode.window.showErrorMessage(`${failed.length} tests failed!`);
        }
    } else if (passed.length > 0) {
        vscode.window.showInformationMessage('All tests passed!');
    } else {
        vscode.window.showErrorMessage('No tests were found!');
    }
}

function testHaskell(extPath, src, stackWd) {
    let counter = -1;
    let doneTesting = false;
    const loader = () => {
        counter = (counter + 1) % 4;
        const sign = ['|', '/', '-', '\\'][counter];

        if (!doneTesting) setTimeout(loader, 200);

        const text = stackWd ? 'Stack test' : 'QuickCheck';
        vscode.window.setStatusBarMessage(`${sign}  Running ${text}`, 200);
    }

    loader();

    testHaskellFile(src, stackWd).then(testResults => {
        doneTesting = true;
        showTestOutput(testResults['passedTests'], testResults['failedTests']);
    }).catch(error => {
        doneTesting = true;
        showTestError(error, extPath);
    });
}

/* UI */
function createButtons(context, buttons) {
    for (let i = 0; i < buttons.length; i++) {
        const button = vscode.window.createStatusBarItem(1, 0);
        button.text = buttons[i][0];
        button.command = buttons[i][1];
        button.show();
    }
}

function loadButtons(context, buttonsConfig, isStack) {
    if (buttonsConfig) {
        const buttons = [];
        if (buttonsConfig['ghci'] === true ||  buttonsConfig['ghci'] === undefined) {
            buttons.push(['Load GHCi', 'editor.ghci']);
        }

        if (isStack) {
            if (buttonsConfig['stackTest'] === true ||  buttonsConfig['stackTest'] === undefined) {
                buttons.push(['Stack test', 'editor.stackTest']);
            }

            if (buttonsConfig['stackRun'] === true ||  buttonsConfig['stackRun'] === undefined) {
                buttons.push(['Stack test', 'editor.stackTest']);
            }
        } else {
            if (buttonsConfig['runfile'] === true ||  buttonsConfig['runfile'] === undefined) {
                buttons.push(['Run file', 'editor.runHaskell']);
            }

            if (buttonsConfig['quickcheck'] === true ||  buttonsConfig['quickcheck'] === undefined) {
                buttons.push(['QuickCheck', 'editor.runQuickCheck']);
            }
        }

        createButtons(context, buttons);
    } else {
        if (isStack) {
            createButtons(context, [['Load GHCi', 'editor.ghci'], ['Stack run', 'editor.stackRun'], ['Stack test', 'editor.stackTest']]);
        } else {
            createButtons(context, [['Load GHCi', 'editor.ghci'], ['Run file', 'editor.runHaskell'], ['QuickCheck', 'editor.runQuickCheck']]);
        }
    }
}

export function activate(context: vscode.ExtensionContext) {
    const config = vscode.workspace.getConfiguration('haskelly');
    const buttonsConfig = config['buttons'];
    let stackWd = getWorkDir(vscode.workspace.textDocuments[0].uri.fsPath)["cwd"];
    let isStack = stackWd !== undefined;

    loadButtons(context, buttonsConfig, isStack);

    /* Commands */
    context.subscriptions.push(vscode.commands.registerTextEditorCommand('editor.ghci', editor => {
        vscode.window.setStatusBarMessage('Loading module in GHCi...', 1000);
        loadGHCi(context.extensionPath, editor.document.uri.fsPath);
    }));

    context.subscriptions.push(vscode.commands.registerTextEditorCommand('editor.runHaskell', editor => {
        if (!isStack) {
            vscode.window.setStatusBarMessage('Running your code...', 1000);
            runHaskell(context.extensionPath, editor.document.uri.fsPath);
        } else {
            vscode.window.showErrorMessage('Not supported inside a Stack project.');
        }        
    }));

    context.subscriptions.push(vscode.commands.registerTextEditorCommand('editor.runQuickCheck', editor => {
        if (!isStack) {
            testHaskell(context.extensionPath, editor.document.uri.fsPath, undefined);
        } else {
            vscode.window.showErrorMessage('Not supported inside a Stack project.');
        }
    }));

    context.subscriptions.push(vscode.commands.registerTextEditorCommand('editor.stackRun', editor => {
        if (isStack) {
            stackRun(stackWd);
        } else {
            vscode.window.showErrorMessage('No Stack project was found.');
        }
    }));

    context.subscriptions.push(vscode.commands.registerTextEditorCommand('editor.stackTest', editor => {
        if (isStack) {
            testHaskell(context.extensionPath, editor.document.uri.fsPath, stackWd);
        } else {
            vscode.window.showErrorMessage('No Stack project was found.');
        }
    }));    

    if (config['codeCompletion'] === false) {
        console.log('Disabled code completion');
    } else {
        const sel:vscode.DocumentSelector = 'haskell';
        context.subscriptions.push(vscode.languages.registerCompletionItemProvider(sel, new CompletionProvider(), '.', '\"'));
    }
}

export function deactivate() {
}