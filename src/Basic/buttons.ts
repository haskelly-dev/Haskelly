import * as vscode from 'vscode';

import { testHaskellFile } from '../helpers/testCode';
import { getWorkDir } from '../utils/workDir'

const fs = require('fs');
const path = require('path');


let shownButtons : Array<vscode.StatusBarItem> = [];

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
        if (buttonsConfig['ghci'] === true ||  buttonsConfig['ghci'] === undefined) {
            buttons.push(['Load GHCi', 'editor.ghci']);
        }

        if (isStack) {
            if (buttonsConfig['stackTest'] === true ||  buttonsConfig['stackTest'] === undefined) {
                buttons.push(['Stack Test', 'editor.stackTest']);
            }

            if (buttonsConfig['stackBuild'] === true ||  buttonsConfig['stackBuild'] === undefined) {
                buttons.push(['Stack Build', 'editor.stackBuild']);
            }

            if (buttonsConfig['stackRun'] === true ||  buttonsConfig['stackRun'] === undefined) {
                buttons.push(['Stack Run', 'editor.stackRun']);
            }
        } else {
            if (buttonsConfig['runfile'] === true ||  buttonsConfig['runfile'] === undefined) {
                buttons.push(['Run File', 'editor.runHaskell']);
            }

            if (buttonsConfig['quickcheck'] === true ||  buttonsConfig['quickcheck'] === undefined) {
                buttons.push(['QuickCheck', 'editor.runQuickCheck']);
            }
        }

        createButtons(context, buttons);
    } else {
        if (isStack) {
            createButtons(context, [['Load GHCi', 'editor.ghci'], ['Stack Build', 'editor.stackBuild'],
            ['Stack Run', 'editor.stackRun'], ['Stack Test', 'editor.stackTest']]);
        } else {
            createButtons(context, [['Load GHCi', 'editor.ghci'], ['Run File', 'editor.runHaskell'], ['QuickCheck', 'editor.runQuickCheck']]);
        }
    }
}

export default function initButtons(context:vscode.ExtensionContext) {
    const config = vscode.workspace.getConfiguration('haskelly');
    const buttonsConfig = config['buttons'];
    const documentPath = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.document.uri.fsPath 
                        : vscode.workspace.textDocuments[0].uri.fsPath;
    
    let stackWd = getWorkDir(documentPath)["cwd"];
    let isStack = stackWd !== undefined;

    /* Set up Stack buttons */
    const loadButtons = (document:vscode.TextDocument) => {
        stackWd = getWorkDir(document.uri.fsPath)["cwd"];
        isStack = stackWd !== undefined;
        showButtons(context, buttonsConfig, isStack);
    };

    /* Load initial buttons */
    loadButtons(vscode.window.activeTextEditor ? vscode.window.activeTextEditor.document 
        : vscode.workspace.textDocuments[0]);
    
    /* Listen for document change to update buttons */
    vscode.window.onDidChangeActiveTextEditor((editor:vscode.TextEditor) => {
        if (editor) { // Avoid the double callback when opening a new file
            removeAllButtons()
            .then(() => {
                loadButtons(editor.document);
            });
        }
    });
}
