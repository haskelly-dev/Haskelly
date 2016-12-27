import { spawn } from 'child_process';
import { getWorkDir } from './workDir'
const StreamSplitter = require('stream-splitter');

export default class SyncSpawn {
    private shell;
    private positiveOutput:string;
    private negativeOutput:string;
    private callback;

    public constructor(commands:Array<string>, positiveOutput:string, options, callback) {
        this.positiveOutput = positiveOutput
        console.log(options.cwd === "C:\\Users\\marco\\vscode\\")
        this.shell = spawn(commands[0], commands.slice(1, commands.length), {cwd: "C:\\Users\\marco\\vscode\\"});
        this.callback = callback;
        this.readOutput();
    }

    private readOutput() {
        const splitter = this.shell.stdout.pipe(StreamSplitter("\n"));
        splitter.encoding = 'utf8';

        splitter.on('token', (line) => {
            console.log(line);
            if (line.indexOf(this.positiveOutput) !== -1) {
                this.callback(line);
            } else if (line.indexOf(this.negativeOutput) !== -1) { 
                this.callback(line, true);
            }
        });

        splitter.on('error', (error) => {
            console.log("ERRRRRRRRRRRRRRROR")
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