'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const StreamSplitter = require('stream-splitter');
const utils_1 = require('./helpers/utils');
const testHelper_1 = require('./helpers/testHelper');
const child_process_1 = require('child_process');
class HaskellCompletionItemProvider {
    constructor() {
        this.suggestions = [];
        this.shell = child_process_1.spawn('stack', ['ghci', '--with-ghc', 'intero']);
        this.shellOutput();
    }
    shellOutput() {
        const splitter = this.shell.stdout.pipe(StreamSplitter("\n"));
        splitter.encoding = 'utf8';
        splitter.on('token', (token) => {
            console.log(token);
            if (!this.ghciLoaded) {
                if (token.substr(0, 4) === 'Type') {
                    console.log('GHCi loaded');
                    this.ghciLoaded = true;
                }
            }
            if (!this.fileLoaded) {
                if (token.substr(0, 2) === 'Ok') {
                    console.log('Loaded file');
                    this.fileLoaded = true;
                }
            }
            if (this.completionsLoaded) {
                if (this.newSuggestions && token.split(' ')[0] === '*Main>') {
                    this.newSuggestions = false;
                    this.suggestions = [];
                    this.suggestions.push(new vscode.CompletionItem(token.split(' ')[1]));
                }
                else {
                    this.suggestions.push(new vscode.CompletionItem(token));
                }
            }
        });
    }
    getWord(position, text) {
        const lines = text.split('\n');
        const line = lines[position.line];
        let word = '';
        for (let i = position.character - 1; i >= 0; i--) {
            if (line[i] === ' ') {
                break;
            }
            word = `${line[i]}${word}`;
        }
        return word;
    }
    provideCompletionItems(document, position, token) {
        return new Promise((resolve, reject) => {
            console.log('Hello');
            if (this.ghciLoaded && !this.fileLoaded) {
                this.shell.stdin.write(`:l ${document.uri.path} \n`);
                vscode.workspace.onDidSaveTextDocument((document) => {
                    console.log('Did save');
                    this.newSuggestions = true;
                    this.fileLoaded = false;
                    this.shell.stdin.write(`:l ${document.uri.path} \n`);
                });
                resolve([]);
            }
            else if (this.ghciLoaded && this.fileLoaded) {
                console.log('Completions at:', position.line, position.character);
                this.completionsLoaded = true;
                this.newSuggestions = true;
                const word = this.getWord(position, document.getText());
                this.shell.stdin.write(`:complete-at "${document.uri.path}" ${position.line} ${position.character} ${position.line} ${position.character} "${word}" \n`);
                setTimeout(() => {
                    resolve(this.suggestions);
                }, 5);
            }
        });
    }
}
function createButtons(context, buttons) {
    for (let i = 0; i < buttons.length; i++) {
        const button = vscode.window.createStatusBarItem(1, 0);
        button.text = buttons[i][0];
        button.command = buttons[i][1];
        button.show();
    }
}
function loadGHCi(extPath, src) {
    const term = vscode.window.createTerminal('Haskell GHCi');
    term.show();
    term.sendText(`node ${extPath}/src/helpers/runHelper.js ghci ${src}`);
}
function runHaskell(extPath, src) {
    const term = vscode.window.createTerminal('Haskell Run');
    term.show();
    term.sendText(`node ${extPath}/src/helpers/runHelper.js run ${src}`);
}
function showTestOutput(passed, failed) {
    if (failed.length > 0) {
        if (failed.length === 1) {
            vscode.window.showErrorMessage(`${failed[0].name} test failed!`);
        }
        else {
            vscode.window.showErrorMessage(`${failed.length} tests failed!`);
        }
    }
    else if (passed.length > 0) {
        vscode.window.showInformationMessage('All tests passed!');
    }
    else {
        vscode.window.showErrorMessage('No tests were found!');
    }
}
function showTestError(error, extPath) {
    vscode.window.showErrorMessage('VS Code can\'t execute this file. Check the terminal.');
    const errorFilePath = `${extPath}/${utils_1.guid()}.txt`;
    fs.writeFile(errorFilePath, error, 'utf-8', err => {
        const term = vscode.window.createTerminal('Haskell Tests');
        term.sendText(`cat ${errorFilePath}`);
        term.show();
        setTimeout(() => fs.unlinkSync(errorFilePath), 1000);
    });
}
function testHaskell(extPath, src) {
    let counter = -1;
    var doneTesting = false;
    const loader = () => {
        counter = (counter + 1) % 4;
        const sign = ['|', '/', '-', '\\'][counter];
        if (!doneTesting)
            setTimeout(loader, 200);
        vscode.window.setStatusBarMessage(`${sign}  Running QuickCheck`, 200);
    };
    loader();
    testHelper_1.testHaskellFile(src).then(testResults => {
        doneTesting = true;
        showTestOutput(testResults['passedTests'], testResults['failedTests']);
    }).catch(error => {
        doneTesting = true;
        showTestError(error, extPath);
    });
}
function activate(context) {
    createButtons(context, [['Load GHCi', 'editor.ghci'], ['Run file', 'editor.runHaskell'],
        ['Run QuickCheck', 'editor.runQuickCheck']]);
    context.subscriptions.push(vscode.commands.registerTextEditorCommand('editor.ghci', editor => {
        vscode.window.setStatusBarMessage('Loading module in GHCi...', 1000);
        loadGHCi(context.extensionPath, editor.document.uri.path);
    }));
    context.subscriptions.push(vscode.commands.registerTextEditorCommand('editor.runHaskell', editor => {
        vscode.window.setStatusBarMessage('Running your code...', 1000);
        runHaskell(context.extensionPath, editor.document.uri.path);
    }));
    context.subscriptions.push(vscode.commands.registerTextEditorCommand('editor.runQuickCheck', editor => {
        testHaskell(context.extensionPath, editor.document.uri.path);
    }));
    let sel = 'haskell';
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider(sel, new HaskellCompletionItemProvider(), '.', '\"'));
}
exports.activate = activate;
function deactivate() {
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map