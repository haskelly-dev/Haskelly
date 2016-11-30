import { spawn } from 'child_process';
const StreamSplitter = require('stream-splitter');

export default class SyncSpawn {
    private shell;
    private positiveOutput:string;
    private negativeOutput:string;
    private callback;

    public constructor(commands:Array<string>, positiveOutput:string, callback) {
        this.positiveOutput = positiveOutput
        this.shell = spawn(commands[0], commands.slice(1, commands.length));
        this.callback = callback;

        this.readOutput();
    }

    private readOutput() {
        const splitter = this.shell.stdout.pipe(StreamSplitter("\n"));
        splitter.encoding = 'utf8';

        splitter.on('token', (line) => {
            if (line.indexOf(this.positiveOutput) !== -1) {
                this.callback(line);
            } else if (line.indexOf(this.negativeOutput) !== -1) { 
                this.callback(line, true);
            }
        });

        splitter.on('error', (error) => {
            this.callback(error, true);
        });
    }

    public runCommand(command, positiveOutput, negativeOutput, callback) {
        this.positiveOutput = positiveOutput;
        this.negativeOutput = negativeOutput;
        this.callback = callback;

        this.shell.stdin.write(command + '\n');
    }

    public getShell() {
        return this.shell;
    }
}