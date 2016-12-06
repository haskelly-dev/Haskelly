const StreamSplitter = require('stream-splitter');
import { spawn } from 'child_process';
import * as vscode from 'vscode';
import SyncSpawn from './syncSpawn';

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
            if (this.newSuggestions && token.split(' ')[0] === '*Main>') {
                console.log(token);
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
            let sync = new SyncSpawn(['stack', 'ghci', '--with-ghc', 'intero'], 'Type', () => {
                console.log('Loaded GHCi');
                sync.runCommand(`:l ${documentPath} \n`, 'Ok', 'Failed', (line, error) => {
                    if (error) {
                        console.log('Error', line);
                        sync = null;
                        reject(line);
                    } else {
                        console.log('Loaded file');
                        this.fileLoaded = true;
                        this.shell = sync.getShell();
                        this.shellOutput(); 
                        sync = null;
                        resolve();
                    }
                });
            });
        });
        
    }

    private listenChanges(documentPath) {
        vscode.workspace.onDidSaveTextDocument((document) => {
            this.tryNewShell(document.uri.path);
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

    private getCompletionsAtPosition(position, document) {
        return new Promise((resolve, reject) => {
            this.completionsLoaded = true;
            this.newSuggestions = true;

            const word = this.getWord(position, document.getText());
            this.shell.stdin.write(`:complete-at "${document.uri.path}" ${position.line} ${position.character} ${position.line} ${position.character} "${word}" \n`)
            
            setTimeout(() => {
                resolve(this.suggestions);
            }, 30);
        });
    }

    public provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): Thenable<vscode.CompletionItem[]> {
        return new Promise((resolve, reject) => {
            if (!this.fileLoaded) {
                this.tryNewShell(document.uri.path).then(() => {
                    this.getCompletionsAtPosition(position, document).then((completions) => {
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