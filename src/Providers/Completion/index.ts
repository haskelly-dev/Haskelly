import * as vscode from 'vscode';
import { spawn } from 'child_process';
import InteroSpawn from '../InteroSpawn';
import { getWord } from '../../utils/other';
const fs = require('fs');
const StreamSplitter = require('stream-splitter');

class CompletionProvider implements vscode.CompletionItemProvider {
    snippets:Array<String>;

    constructor(context:vscode.ExtensionContext) {
        const snippetsConf = vscode.workspace.getConfiguration('haskelly')['snippets'];
        if (snippetsConf && snippetsConf['important']) {
            fs.readFile(`${context.extensionPath}/languages/snippets/haskell.json`, 'utf8', (err, data) => {
                if (err) console.log(err);
                else this.snippets = JSON.parse(data);
            });
        } else {
            this.snippets = [];
        }
    }

    private getCompletionsAtPosition(position, document) {
        return new Promise((resolve, reject) => {
            const word = getWord(position, document.getText());

            let filePath = document.uri.fsPath;
            if (process.platform === 'win32') {
                filePath = filePath.charAt(0).toUpperCase() + filePath.substr(1);
            }

            // Request completions
            InteroSpawn.getInstance().requestCompletions(filePath, position, word)
            .then((suggestions:Array<vscode.CompletionItem>) => {
                let filteredSuggestions = [];
                // No snippets
                if (this.snippets.length == 0) {
                    filteredSuggestions = suggestions;
                } else {
                    // Filter suggestions from snippets
                    suggestions.forEach(suggestion => {
                        if (!this.snippets[suggestion.label]) {
                            filteredSuggestions.push(suggestion);
                        }
                    });
                }

                resolve(filteredSuggestions);
            })
            .catch(err => reject(err));            
        });
    }

    public provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): Thenable<vscode.CompletionItem[]> {
        return new Promise((resolve, reject) => {
           this.getCompletionsAtPosition(position, document).then((completions) => {
                resolve(completions);
            }).catch(e => console.error(e));
        });   
    }
}

export default CompletionProvider;