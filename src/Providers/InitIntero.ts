import { spawn } from 'child_process';
import { getWorkDir } from '../utils/workDir'
const StreamSplitter = require('stream-splitter');

export default class SyncSpawn {
    private shell;
    private callback;
    private spawnCallback;

    public constructor(commands:Array<string>, options, callback) {
        this.spawnCallback = callback;
        console.log("callback: " + typeof(this.spawnCallback))
        this.shell = spawn(commands[0], commands.slice(1, commands.length), options);

        this.runCommand(":set prompt  \"lambda> \"", null);
        this.runCommand(":type []", null);

        this.readOutput();
    }

    private killProcess() {
        this.shell.stdin.pause();
        this.shell.kill();
    }

    private readOutput() {
        const splitter = this.shell.stdout.pipe(StreamSplitter("\n"));
        splitter.encoding = 'utf8';
        let stackOutput = "";

        splitter.on('token', (line) => {
            if (line.indexOf('lambda>') > 0) {
                this.analyseInitOutput(stackOutput);
            } else {
                stackOutput += line;
            }
        });


        const errSplitter = this.shell.stderr.pipe(StreamSplitter("\n"));
        errSplitter.on('token', (line) => {
            stackOutput += line;
        });
    }

    private analyseInitOutput(output) {
        const regErrors = /([^\r\n]+):(\d+):(\d+):(?: error:)?\r?\n([\s\S]+?)(?:\r?\n\r?\n|\r?\n[\S]+|$)/gi;
        let matchErrors = this.removeDuplicates(this.allMatchs(output, regErrors));
        
        const regWarnings = /([^\r\n]+):(\d+):(\d+): Warning:(?: \[.*\])?\r?\n?([\s\S]+?)(?:\r?\n\r?\n|\r?\n[\S]+|$)/gi;
        let matchWarnings = this.removeDuplicates(this.allMatchs(output, regWarnings));

        //console.log(matchErrors, matchWarnings);

        // console.log(output);
        if (output.indexOf('Failed') > 0) {
             console.log(output);
             this.spawnCallback(true);
        } else {
            console.log("success")
            this.spawnCallback(false);
        }
    }

    private removeDuplicates(matches: RegExpExecArray[]): RegExpExecArray[] {
        const matchToKey = (m: RegExpExecArray) => m[0].trim();

        //List all matches and accumulate them in one object (hash key : match)
        let matchesSetObject = matches.reduce((accu, m) => { 
            accu[matchToKey(m)] = m; 
            return accu; 
        }, {});

        //Get all values
        return Object.keys(matchesSetObject).map(key => matchesSetObject[key]);
    }

     private allMatchs(text: string, regexp: RegExp): RegExpExecArray[] {
        const matches: RegExpExecArray[] = [];
        let match: RegExpExecArray;

        while ((match = regexp.exec(text)) != null) {
            matches.push(match);
        }

        return matches;
    }

    public runCommand(command, callback) {
        this.callback = callback;
        this.shell.stdin.write(command + '\n');
    }

    public getShell() {
        return this.shell;
    }    
}