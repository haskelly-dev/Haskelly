import * as vscode from 'vscode';
import { spawn } from 'child_process';
import InteroSpawn from '../InteroSpawn';
import { getWord } from '../../utils/other';
const fs = require('fs');
const StreamSplitter = require('stream-splitter');

class CompletionProvider implements vscode.CompletionItemProvider {
    shell;
    isListening;
    completionsLoaded;
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

    private getCompletionsAtPosition(position, document, timeout = 100) {
        return new Promise((resolve, reject) => {
            this.completionsLoaded = true;
            const word = getWord(position, document.getText());

            // Request completions
            let filePathBeginning = document.uri.fsPath.slice(0,3)            
            if (filePathBeginning === 'c:\\') {
                filePathBeginning = 'C:\\';
            }
            const filepath = filePathBeginning + document.uri.fsPath.slice(3, document.uri.fsPath.length);

            InteroSpawn.getInstance().requestCompletions(filepath, position, word)
            .then((suggestions:Array<vscode.CompletionItem>) => {
                let filteredSuggestions = [];
                // No snippets
                if (this.snippets.length == 0) {
                    filteredSuggestions = suggestions;
                } else {
                    // Filter suggestions
                    suggestions.forEach(suggestion => {
                        // Suggesstion is not a snippet
                        if (!this.snippets[suggestion.label]) {
                            filteredSuggestions.push(suggestion);
                        }
                    });
                }

                setTimeout(() => {
                    resolve(filteredSuggestions);
                }, timeout);
            })
            .catch(err => reject(err));            
        });
    }

     

    public provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): Thenable<vscode.CompletionItem[]> {
        return new Promise((resolve, reject) => {
            // New file
           this.getCompletionsAtPosition(position, document, 35).then((completions) => {
                resolve(completions);
            }).catch(e => console.error(e));
        });   
    }
}

export default CompletionProvider;