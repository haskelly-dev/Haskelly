const StreamSplitter = require('stream-splitter');
import { spawn } from 'child_process';
import * as vscode from 'vscode';
import SyncSpawn from '../utils/syncSpawn';

class CompletionProvider implements vscode.CompletionItemProvider {
    shell;
    fileLoaded;
    completionsLoaded;
    suggestions;
    newSuggestions;

    constructor() {
        this.suggestions = [];        
    }

    private shellOutput() {
        const splitter = this.shell.stdout.pipe(StreamSplitter("\n"));
        splitter.encoding = 'utf8';
        splitter.on('token', (token) => {
            console.log(token);
            // New completion
            if (this.newSuggestions && token.split(' ')[0] === '*Main>') {
                this.newSuggestions = false;
                this.suggestions = [];
                const suggestion = token.split(' ');
                this.suggestions.push(new vscode.CompletionItem(suggestion[suggestion.length - 1]));
            } else {
                this.suggestions.push(new vscode.CompletionItem(token));
            }
        });
    }

    private tryNewShell(documentPath) {
        return new Promise((resolve, reject) => {
            // Load GHCi in temp shell
            let sync = new SyncSpawn(['stack', 'ghci', '--with-ghc', 'intero'], 'Type', () => {
                console.log('Loaded GHCi');
                // Try compiling file
                sync.runCommand(`:l ${documentPath} \n`, 'Collecting', 'Failed', (line, error) => {
                    if (error) {
                        sync = null;
                        reject(line);
                    } else {
                        console.log('Loaded file');
                        this.fileLoaded = true;
                        this.shell = sync.getShell();
                        this.shellOutput(); 
                        sync = null; // Remove temp shell
                        resolve();
                    }
                });
            });
        });
        
    }

    private getWord(position:vscode.Position, text:String) {
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

    private getCompletionsAtPosition(position, document, timeout = 30) {
        return new Promise((resolve, reject) => {
            this.completionsLoaded = true;
            this.newSuggestions = true;
            const word = this.getWord(position, document.getText());

            // Request completions
            this.shell.stdin.write(`:complete-at "${document.uri.fsPath}" ${position.line} ${position.character} ${position.line} ${position.character} "${word}" \n`)
            
            setTimeout(() => {
                resolve(this.suggestions);
            }, timeout);
        });
    }

     private listenChanges(documentPath) {
        vscode.workspace.onDidSaveTextDocument((document) => {
            this.tryNewShell(document.uri.fsPath)
            .catch(e => console.error(e));
        });
    }

    public provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): Thenable<vscode.CompletionItem[]> {
        return new Promise((resolve, reject) => {
            // New file
            if (!this.fileLoaded) {
                this.tryNewShell(document.uri.fsPath).then(() => {
                    this.getCompletionsAtPosition(position, document, 35).then((completions) => {
                        resolve(completions);
                    }).catch(e => console.error(e));
                }).catch(e => console.error(e));
            } else {
                console.log('Completions at:', position.line, position.character);
                this.getCompletionsAtPosition(position, document).then((completions) => {
                    resolve(completions);
                }).catch(e => console.error(e));
            }
        });   
    }
}

export default CompletionProvider;