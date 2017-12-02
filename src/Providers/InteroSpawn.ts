import * as vscode from 'vscode';
import SyncSpawn from '../utils/syncSpawn';
import InitIntero from './InitIntero';

import { getWorkDir } from '../utils/workDir'
import { normalizePath } from '../utils/document';
import { WordInfo } from '../utils/other';
import { delay } from '../utils/promise';
const StreamSplitter = require('stream-splitter');

export default class InteroSpawn {
    private static _instance: InteroSpawn = new InteroSpawn();

    private shell;
    private requestingCompletion;
    private requestingType;
    private interoOutput: String;
    private openedDocument: String;
    private loading: boolean;

    private constructor() {
        if (InteroSpawn._instance) {
            throw new Error("Error: Instantiation failed: Use SingletonClass.getInstance() instead of new.");
        }
        InteroSpawn._instance = this;
        this.listenChanges();
    }

    public static getInstance(): InteroSpawn {
        return InteroSpawn._instance;
    }

    /**
     * Initialize Spawn process with Stack and Intero
     */
    public tryNewIntero(documentPath: String) {
        return new Promise((resolve, reject) => {
            // Load GHCi in temp shell
            const filePath = normalizePath(documentPath);
            const workDir = getWorkDir(filePath);
            const isStack = workDir["cwd"] !== undefined;

            console.log(`Trying new Intero for document ${filePath} and workDir ${workDir["cwd"]}`);
            this.loadIntero(isStack, workDir, filePath)
            .then(result => {
                console.log('Intero loaded correctly');
                resolve();
            })
            .catch(error => {
                console.log('Intero failed to load');
                reject(error);
            })
            .then(() => {
                this.loading = false;
            });
        });
    }

    public loadIntero(isStack: boolean, workDir: Object, documentPath: String) {
        return new Promise((resolve, reject) => {
            let stackLoaded;

            if (!this.loading) {
                this.loading = true;
                const intero = new InitIntero(['stack', 'ghci', '--with-ghc', 'intero'], workDir, isStack, (failed) => {
                    if (!stackLoaded) {
                        if (failed) {
                            intero.killProcess();
                            reject();
                        } else if (isStack) {
                            stackLoaded = true;
                            this.killCurrentShell();
                            this.openedDocument = workDir["cwd"];
                            this.shell = intero.getShell();
                            this.shellOutput();
                            resolve();
                        } else {
                            stackLoaded = true;
                            let fileLoaded = false;

                            intero.runCommand(`:l "${this.normaliseFilePath(documentPath)}"`, (error) => {
                                if (!fileLoaded) {
                                    fileLoaded = true;

                                    if (error) {
                                        intero.killProcess();
                                        reject();
                                        return;
                                    } else {
                                        this.killCurrentShell();
                                        this.openedDocument = documentPath;
                                        this.shell = intero.getShell();
                                        this.shellOutput();
                                        resolve();
                                        return;
                                    }
                                }
                            });
                        }
                    }
                });
            }
        });
    }

    private listenChanges() {
        const reload = (document: vscode.TextDocument) => {
            this.tryNewIntero(document.uri.fsPath)
            .catch(e => console.error(e));
        }

        vscode.workspace.onDidSaveTextDocument((document) => {
            if (document.languageId == 'haskell') {
                reload(document);
            }
        });

        vscode.window.onDidChangeActiveTextEditor((editor: vscode.TextEditor) => {
            if (editor && editor.document.languageId === 'haskell') {
                const stackDir = getWorkDir(editor.document.uri.fsPath)["cwd"];

                // Avoid reload if opened document from same Stack project
                if (stackDir && (this.openedDocument !== stackDir)) {
                    this.openedDocument = stackDir;
                    reload(editor.document);
                } else if (!stackDir && (this.openedDocument !== editor.document.uri.fsPath)) {
                    this.openedDocument = editor.document.uri.fsPath;
                    reload(editor.document);
                }
            }
        });
    }

    public killCurrentShell() {
        if (this.shell) {
            this.shell.stdin.pause();
            this.shell.kill();
        }

        return Promise.resolve();
    }

    /**
     * Intero requests
     */
    public requestCompletions(filePath: String, position: vscode.Position, word: String) {
        return new Promise((resolve, reject) => {
            if (this.shell && !this.loading) {
                this.requestingCompletion = true;

                this.shell.stdin.write(`:complete-at "${this.normaliseFilePath(filePath)}" ${position.line} ${position.character} ${position.line} ${position.character} "${word}"\n`);

                if (this.interoOutput) {
                    setTimeout(() => {
                        const suggestions = this.interoOutput.split('\n');
                        const completionItems:Array<vscode.CompletionItem> = [];
                        suggestions.forEach(suggestion => {
                            if (suggestion) {
                                completionItems.push(new vscode.CompletionItem(suggestion.trim().replace(/\s+/g, ' ')));
                            }
                        });
                        resolve(completionItems);
                    }, 35);
                } else {
                    resolve([]);
                }
            }
        });
    }

    public async requestType(filePath: String, position: vscode.Position, wordInfo: WordInfo): Promise<vscode.Hover> {
        const word = wordInfo['word'];
        const start = wordInfo['start'];
        const end = wordInfo['end'];

        const getTypeDefCommand = `:type-at "${this.normaliseFilePath(filePath)}" ${position.line + 1} ${start + 1} ${position.line + 1} ${end + 1} "${word}"`;

        try {
            const output = await this.executeCommandOnIntero(getTypeDefCommand);
            return new vscode.Hover({language: 'haskell', value: output});
        } catch (e) {
            return new vscode.Hover('Type not available.');
        }
    }

    public requestDefinition(filePath: String, position: vscode.Position, wordInfo: WordInfo): Promise<string> {
        const word = wordInfo['word'];
        const start = wordInfo['start'];
        const end = wordInfo['end'];

        const locateDefinitionCommand = `:loc-at "${this.normaliseFilePath(filePath)}" ${position.line + 1} ${start + 1} ${position.line + 1} ${end + 1} "${word}"`;

        return this.executeCommandOnIntero(locateDefinitionCommand);
    }

    private normaliseFilePath(filePath: String): string {
        return filePath.replace(/\\/g, "\\\\");
    }

    private async executeCommandOnIntero(command: string): Promise<string> {
        if (!this.shell || this.loading) return '';

        this.interoOutput = undefined;
        this.shell.stdin.write(`${command}\n`);

        await delay(50);

        if (this.interoOutput !== ' ' && this.interoOutput !== undefined) {
            return this.interoOutput.trim().replace(/\s+/g, ' ');
        } else {
            throw new Error('Command output not available');
        }
    }

    /**
     *  Intero output parser
     */
    private shellOutput() {
        const splitter = this.shell.stdout.pipe(StreamSplitter("lambda>"));
        splitter.encoding = 'utf8';

        splitter.on('token', (token) => {
            this.interoOutput = token;
        });

        splitter.on('done', () => {
            console.log("Intero spawn terminated.")
        });

        splitter.on('error', (e) => {
            console.log("error: ", e)
        });
    }
}
