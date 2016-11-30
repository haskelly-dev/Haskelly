const spawn = require('child_process').spawn;
const path = require('path');

let shell;
let loadedGHCi;

function interactiveShell(command, args) {
    shell = spawn(command, args);
    return shell;
}

function interactiveGHCi(src) {
    interactiveShell('stack', ['ghci'])
    .stdout.on('data', (data) => {
        if (!loadedGHCi && data.toString().slice(0, 4) === 'GHCi') {
            loadedGHCi = true;
            shell.stdin.write(`:l ${src} \n`);
        };
    });
}

// Decide mode
if (process.argv[2] === 'ghci') {
    interactiveGHCi(process.argv[3]);
} else if (process.argv[2] === 'build') {
    interactiveShell('stack', ['build', process.argv[3]]);
}

// Shell output
shell.stdout.pipe(process.stdout);
shell.stderr.pipe(process.stderr);
shell.on('exit', (code) => {
    process.stdin.pause();
});

// Get user input
process.stdin.on('data', (text) => {
    shell.stdin.write(text + '\n');    
});

