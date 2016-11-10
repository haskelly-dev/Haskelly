'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
const fs = require('fs');
import { testHaskellFile } from './testHelper';

export function activate(context: vscode.ExtensionContext) {
    // Init button
    const runButton = vscode.window.createStatusBarItem(1, 0);
    runButton.text = "Run Haskell";
    runButton.command = "editor.runHaskell";
    runButton.show();

    const terminalInput = vscode.window.createStatusBarItem(1, 0);
    terminalInput.text = "Run QuickCheck";
    terminalInput.command = "editor.runQuickCheck";
    terminalInput.show();

    const runHaskell = (src) => {
        const term = vscode.window.createTerminal('Haskell runner');
        term.show();
        term.sendText(`node ${context.extensionPath}/src/runHelper.js run ${src}`);
    };

    const testHaskell = (src) => {
        vscode.window.setStatusBarMessage('Running QuickCheck on the file...', 1000);

        testHaskellFile(src).then(testResults => {
            const passed = testResults['passedTests'];
            const failed = testResults['failedTests'];
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
                vscode.window.showInformationMessage('No tests were found!');
            }
        }).catch(error => {
            vscode.window.showErrorMessage('VS Code can\'t execute this file. Check the terminal.');
            const errorFilePath = `${context.extensionPath}/errorFile.txt`;
            
            fs.writeFile(errorFilePath, error, 'utf-8', err => {
                const term = vscode.window.createTerminal('Haskell Tests');
                term.sendText(`cat ${errorFilePath}`);
                term.show();
                setTimeout(() => fs.unlinkSync(errorFilePath), 1000);
            });
        });
    };

    context.subscriptions.push(vscode.commands.registerTextEditorCommand('editor.runHaskell', editor => {
        vscode.window.setStatusBarMessage('Running your code...', 1000);
        runHaskell(editor.document.uri.path);
    }));

    context.subscriptions.push(vscode.commands.registerTextEditorCommand('editor.runQuickCheck', editor => {
        testHaskell(editor.document.uri.path);
    }));
}

// this method is called when your extension is deactivated
export function deactivate() {
}