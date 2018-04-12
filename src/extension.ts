'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
const fs = require('fs');

import initCommands from './Basic/commands';
import initButtons from './Basic/buttons';

import InteroSpawn from './Providers/InteroSpawn';
import CompletionProvider from './Providers/Completion/index';
import HaskellDefinitionProvider from './Providers/Definition';
import HaskellReferenceProvider from './Providers/Reference';
import TypeProvider from './Providers/Type/index';


export function activate(context: vscode.ExtensionContext) {
    const config = vscode.workspace.getConfiguration('haskelly');
    const documentPath = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.document.uri.fsPath
                        : vscode.workspace.textDocuments[0].uri.fsPath;

    /* Init commands */
    initCommands(context);

    /* Init bottom buttons */
    initButtons(context);

    /* Init Intero process */
    InteroSpawn.getInstance().tryNewIntero(documentPath)
    .catch(error => console.log(error));

    const sel:vscode.DocumentSelector = [
        { language: 'haskell', scheme: 'file' },
        { language: 'haskell', scheme: 'untitled' }
    ];

    /* Type hover */
    context.subscriptions.push(vscode.languages.registerHoverProvider(sel, new TypeProvider()));

    /* Code completion */
    if (config['codeCompletion'] === false) {
        console.log('Disabled code completion');
    } else {
        context.subscriptions.push(vscode.languages.registerCompletionItemProvider(sel, new CompletionProvider(context), '.', '\"'));
    }

    /* Definition */
    context.subscriptions.push(vscode.languages.registerDefinitionProvider(sel, new HaskellDefinitionProvider(InteroSpawn.getInstance())));

    /* Reference */
    context.subscriptions.push(vscode.languages.registerReferenceProvider(sel, new HaskellReferenceProvider(InteroSpawn.getInstance())));

    /* Custom snippets */
    const snippetsFilePath = `${context.extensionPath}/languages/snippets/haskell.json`;
    fs.readFile(snippetsFilePath, 'utf8', (err, data) => {
        if (err) console.log(err);
        else {
            const snippets = JSON.parse(data);
            const mergedSnippets = {
                ...snippets,
                ...config['snippets']['custom'],
            };

            // Modify the snippets file
            fs.writeFile(snippetsFilePath, JSON.stringify(mergedSnippets, null, 4), function(err) {
                if (err) {
                    console.log(err);
                }
            });
        }
    });
}

export function deactivate() {
    // Cleanup of Spawn process
    InteroSpawn.getInstance().killCurrentShell();
}
