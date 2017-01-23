'use strict';
var __assign = (this && this.__assign) || Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
    }
    return t;
};
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require("vscode");
const fs = require('fs');
const path = require('path');
const uuidV4 = require('uuid/v4');
const testCode_1 = require("./helpers/testCode");
const index_1 = require("./CodeCompletion/index");
const workDir_1 = require("./utils/workDir");
let shownButtons = [];
let openDocumentPath;
/* GHCi */
function loadGHCi(extPath, src) {
    const term = vscode.window.createTerminal('Haskell GHCi');
    term.show();
    term.sendText('stack ghci');
    term.sendText(`:load ${src}`);
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
    const errorFilePath = `${extPath}/${uuidV4()}.txt`;
    fs.writeFile(errorFilePath, '-------- Error --------\n' + error + '------------------------', 'utf-8', err => {
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
function testHaskell(extPath, src, stackWd) {
    let counter = -1;
    let doneTesting = false;
    const loader = () => {
        counter = (counter + 1) % 4;
        const sign = ['|', '/', '-', '\\'][counter];
        if (!doneTesting)
            setTimeout(loader, 200);
        const text = stackWd ? 'Stack test' : 'QuickCheck';
        vscode.window.setStatusBarMessage(`${sign}  Running ${text}`, 200);
    };
    loader();
    testCode_1.testHaskellFile(src, stackWd).then(testResults => {
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
        shownButtons.push(button);
    }
}
function removeAllButtons() {
    return new Promise((resolve, reject) => {
        for (let i = 0; i < shownButtons.length; i++) {
            shownButtons[i].hide();
        }
        shownButtons = [];
        resolve();
    });
}
function showButtons(context, buttonsConfig, isStack) {
    if (buttonsConfig) {
        const buttons = [];
        if (buttonsConfig['ghci'] === true || buttonsConfig['ghci'] === undefined) {
            buttons.push(['Load GHCi', 'editor.ghci']);
        }
        if (isStack) {
            if (buttonsConfig['stackTest'] === true || buttonsConfig['stackTest'] === undefined) {
                buttons.push(['Stack test', 'editor.stackTest']);
            }
            if (buttonsConfig['stackRun'] === true || buttonsConfig['stackRun'] === undefined) {
                buttons.push(['Stack run', 'editor.stackRun']);
            }
        }
        else {
            if (buttonsConfig['runfile'] === true || buttonsConfig['runfile'] === undefined) {
                buttons.push(['Run file', 'editor.runHaskell']);
            }
            if (buttonsConfig['quickcheck'] === true || buttonsConfig['quickcheck'] === undefined) {
                buttons.push(['QuickCheck', 'editor.runQuickCheck']);
            }
        }
        createButtons(context, buttons);
    }
    else {
        if (isStack) {
            console.log('Stack');
            createButtons(context, [['Load GHCi', 'editor.ghci'], ['Stack run', 'editor.stackRun'], ['Stack test', 'editor.stackTest']]);
        }
        else {
            createButtons(context, [['Load GHCi', 'editor.ghci'], ['Run file', 'editor.runHaskell'], ['QuickCheck', 'editor.runQuickCheck']]);
        }
    }
}
function activate(context) {
    const config = vscode.workspace.getConfiguration('haskelly');
    const buttonsConfig = config['buttons'];
    let stackWd = workDir_1.getWorkDir(vscode.workspace.textDocuments[0].uri.fsPath)["cwd"];
    let isStack = stackWd !== undefined;
    const loadButtons = (document) => {
        stackWd = workDir_1.getWorkDir(document ? document.uri.fsPath : vscode.workspace.textDocuments[0].uri.fsPath)["cwd"];
        isStack = stackWd !== undefined;
        showButtons(context, buttonsConfig, isStack);
    };
    loadButtons(null);
    vscode.workspace.onDidOpenTextDocument((document) => {
        if (document.uri.fsPath != openDocumentPath) {
            openDocumentPath = document.uri.fsPath;
            removeAllButtons()
                .then(() => {
                loadButtons(document);
                console.log('New file');
            });
        }
    });
    /* Commands */
    context.subscriptions.push(vscode.commands.registerTextEditorCommand('editor.ghci', editor => {
        editor.document.save()
            .then(() => {
            vscode.window.setStatusBarMessage('Loading module in GHCi...', 1000);
            loadGHCi(context.extensionPath, editor.document.uri.fsPath);
        });
    }));
    context.subscriptions.push(vscode.commands.registerTextEditorCommand('editor.runHaskell', editor => {
        editor.document.save()
            .then(() => {
            if (isStack) {
                vscode.window.showErrorMessage('Not supported inside a Stack project.');
            }
            else {
                vscode.window.setStatusBarMessage('Running your code...', 1000);
                runHaskell(context.extensionPath, editor.document.uri.fsPath);
            }
        });
    }));
    context.subscriptions.push(vscode.commands.registerTextEditorCommand('editor.runQuickCheck', editor => {
        editor.document.save()
            .then(() => {
            if (isStack) {
                vscode.window.showErrorMessage('Not supported inside a Stack project.');
            }
            else {
                testHaskell(context.extensionPath, editor.document.uri.fsPath, undefined);
            }
        });
    }));
    context.subscriptions.push(vscode.commands.registerTextEditorCommand('editor.stackRun', editor => {
        editor.document.save();
        editor.document.save()
            .then(() => {
            if (isStack) {
                stackRun(stackWd);
            }
            else {
                vscode.window.showErrorMessage('No Stack project was found.');
            }
        });
    }));
    context.subscriptions.push(vscode.commands.registerTextEditorCommand('editor.stackTest', editor => {
        editor.document.save()
            .then(() => {
            if (isStack) {
                testHaskell(context.extensionPath, editor.document.uri.fsPath, stackWd);
            }
            else {
                vscode.window.showErrorMessage('No Stack project was found.');
            }
        });
    }));
    /* Code completion */
    if (config['codeCompletion'] === false) {
        console.log('Disabled code completion');
    }
    else {
        const sel = 'haskell';
        context.subscriptions.push(vscode.languages.registerCompletionItemProvider(sel, new index_1.default(context), '.', '\"'));
    }
    /* Custom snippets */
    const snippetsFilePath = `${context.extensionPath}/languages/snippets/haskell.json`;
    fs.readFile(snippetsFilePath, 'utf8', (err, data) => {
        if (err)
            console.log(err);
        else {
            const snippets = JSON.parse(data);
            const mergedSnippets = __assign({}, snippets, config['snippets']['custom']);
            // Modify the snippets file
            fs.writeFile(snippetsFilePath, JSON.stringify(mergedSnippets), function (err) {
                if (err) {
                    console.log(err);
                }
            });
        }
    });
}
exports.activate = activate;
function deactivate() {
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map