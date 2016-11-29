const StreamSplitter = require('stream-splitter');
import { spawn } from 'child_process';
import * as vscode from 'vscode';

class CompletionProvider implements vscode.CompletionItemProvider {
    shell;
    ghciLoaded;
    completionsLoaded;
    fileLoaded;
    suggestions;
    newSuggestions;
    constructor() {
        this.suggestions = [];
        this.shell = spawn('stack', ['ghci', '--with-ghc', 'intero']);
        this.shellOutput();
    }

    private shellOutput() {
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
                } else {
                    this.suggestions.push(new vscode.CompletionItem(token));
                }
            }
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

    public provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): Thenable<vscode.CompletionItem[]> {
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
            } else if (this.ghciLoaded && this.fileLoaded) {
                console.log('Completions at:', position.line, position.character);
                this.completionsLoaded = true;
                this.newSuggestions = true;

                const word = this.getWord(position, document.getText());
                this.shell.stdin.write(`:complete-at "${document.uri.path}" ${position.line} ${position.character} ${position.line} ${position.character} "${word}" \n`);
                
                setTimeout(() => {
                    resolve(this.suggestions);
                }, 30);
            }
        });   
    }
}

export default CompletionProvider;