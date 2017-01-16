const StreamSplitter = require('stream-splitter');
import { spawn } from 'child_process';
import { getWorkDir } from '../utils/workDir'
import * as vscode from 'vscode';
import SyncSpawn from '../utils/syncSpawn';

class CompletionProvider implements vscode.CompletionItemProvider {
    shell;
    firstLoaded;
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
            // Check if first suggestion is valid
            const re = /.*>.*/;
            if (this.newSuggestions && re.test(token)) {
                this.newSuggestions = false;
                this.suggestions = [];
                const suggestion = token.split(' ');
                this.suggestions.push(new vscode.CompletionItem(suggestion[suggestion.length - 1]));
            } else if (!this.newSuggestions) {
                this.suggestions.push(new vscode.CompletionItem(token));
            }
        });
        splitter.on('done', () => {
            console.log("DONE")
        })
        splitter.on('error', (e) => {
            console.log("error: ", e)
        })
    }

    private tryNewShell(documentPath) {
        console.log("Trying new shell");
        return new Promise((resolve, reject) => {
            // Load GHCi in temp shell
            const workDir = getWorkDir(documentPath);
            const isStack = workDir["cwd"] !== undefined;
            let loaded;

            let sync = new SyncSpawn(['stack', 'ghci', '--with-ghc', 'intero'], isStack ? 'Ok' : 'Type', 'Failed', workDir, (line, error) => {
                // No stack project
                if (!error && !loaded) {
                    console.log('Loaded GHCi');

                    // Change prompt
                    sync.runSyncCommand(":set prompt  \"\x03BB> \"");
                    loaded = true;

                    if (!isStack) {
                        sync.runCommand(`:l ${documentPath}`, 'Collecting', 'Failed', (line, error) => {
                            if (error) {
                                sync = null;
                                reject(line);
                            } else {
                                console.log('Loaded file');
                                this.shell = sync.getShell();
                                this.shellOutput(); 
                                sync = null; // Remove temp shell
                                resolve();
                            }
                        });
                    } else {
                        this.shell = sync.getShell();
                        this.shellOutput(); 
                        sync = null; // Remove temp shell
                        resolve();
                    }
                } else if (error) {
                    console.error(line);
                    reject(line);
                }                       
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

    private getCompletionsAtPosition(position, document, timeout = 100) {
        return new Promise((resolve, reject) => {
            this.completionsLoaded = true;
            this.newSuggestions = true;
            const word = this.getWord(position, document.getText());

            // Request completions
            let filePathBeginning = document.uri.fsPath.slice(0,3)            
            if (filePathBeginning === 'c:\\') {
                filePathBeginning = 'C:\\';
            }
            const filepath = filePathBeginning + document.uri.fsPath.slice(3, document.uri.fsPath.length);
            this.shell.stdin.write(`:complete-at ${filepath} ${position.line} ${position.character} ${position.line} ${position.character} "${word}" \n`)
            
            setTimeout(() => {
                resolve(this.suggestions);
            }, timeout);
        });
    }

     private listenChanges() {
        const reload = (document: vscode.TextDocument) => {
            var filePathBeginning = document.uri.fsPath.slice(0,3)            
            if (filePathBeginning === 'c:\\') {
                filePathBeginning = 'C:\\';
            }
            const filepath = filePathBeginning + document.uri.fsPath.slice(3, document.uri.fsPath.length);
            this.tryNewShell(filepath)
            .catch(e => console.error(e));
        }

        vscode.workspace.onDidSaveTextDocument((document) => {
            reload(document);
        });

        vscode.workspace.onDidOpenTextDocument((document) => {
            reload(document);
        });
    }

    public provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): Thenable<vscode.CompletionItem[]> {
        return new Promise((resolve, reject) => {
            // New file
            if (!this.firstLoaded) {
                this.tryNewShell(document.uri.fsPath).then(() => {
                    this.getCompletionsAtPosition(position, document, 35).then((completions) => {
                        this.firstLoaded = true;
                        resolve(completions);
                    }).catch(e => console.error(e));
                }).catch(e => console.error(e));

                this.listenChanges();
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