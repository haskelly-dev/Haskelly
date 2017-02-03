import { spawn } from 'child_process';
import { getWorkDir } from '../utils/workDir'
const StreamSplitter = require('stream-splitter');

export default class SyncSpawn {
    private shell;
    private callback;
    private spawnCallback;
    private isStack;

    public constructor(commands:Array<string>, options, isStack, callback) {
        this.spawnCallback = callback;
        this.isStack = isStack;
        this.shell = spawn(commands[0], commands.slice(1, commands.length), options);

        this.runSyncCommand(":set prompt  \"lambda> \"");

        this.readOutput();
    }

    public killProcess() {
        this.shell.stdin.pause();
        this.shell.kill();
    }

    private readOutput() {
        const splitter = this.shell.stdout.pipe(StreamSplitter("\n"));
        splitter.encoding = 'utf8';
        let stackOutput = "";
        let intent = 0;

        splitter.on('token', (line) => {
            stackOutput += line;
        });

        const endSplitter = this.shell.stdout.pipe(StreamSplitter("lambda>"));
        endSplitter.on('token', (line) => {
            this.analyseInitOutput(stackOutput, intent);
            intent++;
        });
 
        const errSplitter = this.shell.stderr.pipe(StreamSplitter("\n"));
        errSplitter.on('token', (line) => {
            stackOutput += line;
        });
    }

    private analyseInitOutput(output, intent) {
        if (output.indexOf('Failed') > 0) {
            this.killProcess();
            if (this.isStack) {
                this.spawnCallback(true);
            } else {
                if (intent === 0) {
                    this.spawnCallback(true);
                } else {
                    this.callback(true);
                }
            }
        } else {
            if (this.isStack) {
                this.spawnCallback(false);
            } else {
                if (intent === 0) {
                    this.spawnCallback(false);
                } else {
                    this.callback(false);
                }
            }
        }
    }

    public runCommand(command, callback) {
        this.callback = callback;
        this.shell.stdin.write(command + '\n');
    }

    public runSyncCommand(command) {
        this.shell.stdin.write(command + '\n');
    }

    public getShell() {
        return this.shell;
    }    
}