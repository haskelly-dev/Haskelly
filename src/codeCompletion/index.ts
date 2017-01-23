const StreamSplitter = require('stream-splitter');
import { spawn } from 'child_process';
import { getWorkDir } from '../utils/workDir'
import * as vscode from 'vscode';
import SyncSpawn from '../utils/syncSpawn';
const fs = require('fs');

class CompletionProvider implements vscode.CompletionItemProvider {
    shell;
    isListening;
    firstLoaded;
    completionsLoaded;
    suggestions;
    newSuggestions;
    snippets:Array<String>;

    constructor(context:vscode.ExtensionContext) {
        this.suggestions = [];

        const snippetsConf = vscode.workspace.getConfiguration('haskelly')['snippets'];
        if (snippetsConf && snippetsConf['important']) {
            fs.readFile(`${context.extensionPath}/languages/snippets/haskell.json`, 'utf8', (err, data) => {
                if (err) console.log(err);
                else this.snippets = JSON.parse(data);
            });
        } else {
            this.snippets = [];
        }

        this.listenChanges();
    }

    private shellOutput() {
        const splitter = this.shell.stdout.pipe(StreamSplitter("\n"));
        splitter.encoding = 'utf8';
        splitter.on('token', (token) => {
            // Check if first suggestion is valid
            const re = /.*>.*/;

            // Ignore if is snippet
            if (this.snippets.length == 0 || !this.snippets[token]) {
                if (this.newSuggestions && re.test(token) && !this.snippets[token]) {
                    this.newSuggestions = false;
                    this.suggestions = [];
                    const suggestion = token.split(' ');
                    this.suggestions.push(new vscode.CompletionItem(suggestion[suggestion.length - 1]));
                } else if (!this.newSuggestions) {
                    this.suggestions.push(new vscode.CompletionItem(token));
                }            
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
        return new Promise((resolve, reject) => {
            // Load GHCi in temp shell
            const workDir = getWorkDir(documentPath);
            const isStack = workDir["cwd"] !== undefined;
            let loaded;
            let errored;
       
            console.log("Trying new shell");
            const sync = new SyncSpawn(['stack', 'ghci', '--with-ghc', 'intero'], isStack ? 'Ok' : 'Type', 'Failed', workDir, (line, error) => {
                // No stack project
                if (!error && !loaded  && !errored) {
                    loaded = true;
                    console.log('Loaded GHCi');

                    // Change prompt
                    sync.runSyncCommand(":set prompt  \"\x03BB> \"");

                    // File is inside a Stack project
                    if (isStack) {
                        this.shell = sync.getShell();
                        this.shellOutput(); 
                        resolve();
                    } else {
                        sync.runCommand(`:l ${documentPath}`, 'Collecting', 'Failed', (line, error) => {
                            if (error) {
                                reject(line);
                            } else {
                                console.log('Loaded file');
                                this.shell = sync.getShell();
                                this.shellOutput(); 
                                resolve();
                            }
                        });
                    }
                } else if (error && !errored) {
                    errored = true;
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
        console.log('Listen for change');
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
            console.log(document);
            reload(document);
        });

        vscode.workspace.onDidOpenTextDocument((document) => {
            console.log('opened');
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