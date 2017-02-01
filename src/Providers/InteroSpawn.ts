import * as vscode from 'vscode';
import SyncSpawn from '../utils/syncSpawn';
import { getWorkDir } from '../utils/workDir'
const StreamSplitter = require('stream-splitter');

export default class InteroSpawn {
    private static _instance:InteroSpawn = new InteroSpawn();

    private shell;
    private requestingCompletion;
    private requestingType;
    private newSuggestions:boolean;
    private suggestions:Array<vscode.CompletionItem>;
    private type:string;

    private constructor() {
        if (InteroSpawn._instance) {
            throw new Error("Error: Instantiation failed: Use SingletonClass.getInstance() instead of new.");
        }
        InteroSpawn._instance = this;
        this.listenChanges();
    }

    public static getInstance():InteroSpawn {
        return InteroSpawn._instance;
    }

    /**
     * Initialize Spawn process with Stack and Intero
     */

    public tryNewIntero(documentPath) {
        return new Promise((resolve, reject) => {
            // Load GHCi in temp shell
            const workDir = getWorkDir(documentPath);
            const isStack = workDir["cwd"] !== undefined;
            let loaded;
            let errored;
       
            console.log("Trying new Intero from document", documentPath);
            this.loadIntero(isStack, workDir, documentPath)
            .then(result => {
                console.log('Intero loaded correctly')
                resolve();
            })
            .catch(error => {
                reject(error);                
            });
        });
    }

    public loadIntero(isStack:boolean, workDir:Object, documentPath:string) {
        return new Promise((resolve, reject) => {
            let hasLoaded;

            const sync = new SyncSpawn(['stack', 'ghci', '--with-ghc', 'intero'], isStack ? 'Ok' : 'Type', 'Failed', workDir, (line, error) => {  
                // File doens't compile
                if (error) {
                    reject(error);
                } else if (!hasLoaded) {
                    hasLoaded = true;
                    console.log('Loaded GHCi');

                    // Change prompt
                    sync.runSyncCommand(":set prompt  \"λ> \"");

                    // File is inside a Stack project
                    if (isStack) {
                        this.killCurrentShell();
                        this.shell = sync.getShell();
                        this.shellOutput();
                        resolve();
                    } else {
                        sync.runCommand(`:l ${documentPath}`, 'Collecting', 'Failed', (line, error) => {
                            if (error) {
                                reject(line);
                            } else {
                                console.log('Loaded file');
                                this.killCurrentShell();
                                this.shell = sync.getShell();
                                this.shellOutput();
                                resolve();
                            }
                        });
                    } 
                }            
            });
        });
    }

    private listenChanges() {
        const reload = (document: vscode.TextDocument) => {
            var filePathBeginning = document.uri.fsPath.slice(0,3)            
            if (filePathBeginning === 'c:\\') {
                filePathBeginning = 'C:\\';
            }
            const filepath = filePathBeginning + document.uri.fsPath.slice(3, document.uri.fsPath.length);
            this.tryNewIntero(filepath)
            .catch(e => console.error(e));
        }

        vscode.workspace.onDidSaveTextDocument((document) => {
            if (document.languageId == 'haskell') {
                reload(document);
            }
        });

        vscode.workspace.onDidOpenTextDocument((document) => {
            if (document.languageId == 'haskell') {
                reload(document);
            }
        });

        vscode.workspace.onDidChangeTextDocument((documentEvent:vscode.TextDocumentChangeEvent) => {
            if (documentEvent.document.languageId == 'haskell') {
                reload(documentEvent.document);
            }
        });
    }

    public killCurrentShell() {
        if (this.shell) {
            this.shell.stdin.pause();
            this.shell.kill();
        }
    }

    /**
     * Intero requests
     */
    public requestCompletions(filePath:string, position:vscode.Position, word:String) {
        return new Promise((resolve, reject) => {
            if (this.shell) {
                this.newSuggestions = true;
                this.requestingCompletion = true;

                this.shell.stdin.write(`:complete-at ${filePath} ${position.line} ${position.character} ${position.line} ${position.character} "${word}" \n`);

                setTimeout(() => {
                    this.requestingCompletion = false;
                    resolve(this.suggestions);
                }, 50);
            }
        });
    }

    public requestType(filePath:string, position:vscode.Position, word:String): Promise<vscode.Hover> {
        return new Promise((resolve, reject) => {
            if (this.shell) {
                this.requestingType = true;
                this.type = '';

                this.shell.stdin.write(`:type-at ${filePath} ${position.line} ${position.character} ${position.line} ${position.character} "${word}" \n`);

                setTimeout(() => {
                    if (this.type) {
                        resolve(new vscode.Hover({ language: 'haskell', value: this.type }));
                    } else {
                        resolve(new vscode.Hover('Type not available.'));
                    }
                }, 50);
            }
        });
    }

    /**
     *  Intero output parser
     */
    private shellOutput() {
        const splitter = this.shell.stdout.pipe(StreamSplitter("\n"));
        splitter.encoding = 'utf8';

        splitter.on('token', (token) => {
            const re = /.*>.*/;
            console.log(token);

            if (this.requestingCompletion) {
                // Check if first suggestion is valid
                if (this.newSuggestions && re.test(token)) {
                    this.newSuggestions = false;
                    this.suggestions = [];
                    const suggestion = token.split(' ');
                    this.suggestions.push(new vscode.CompletionItem(suggestion[suggestion.length - 1]));
                } else if (!this.newSuggestions) {
                    this.suggestions.push(new vscode.CompletionItem(token));
                } 
            } else if (this.requestingType) {
                this.type += token.replace(/λ> /g, '');
            }                         
        });

        splitter.on('done', () => {
            console.log("Intero shell terminated.")
        });

        splitter.on('error', (e) => {
            console.log("error: ", e)
        });
    }
}