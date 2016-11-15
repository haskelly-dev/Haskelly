const spawn = require('child_process').spawn;
const path = require('path');
let shell;

function interactiveShell(command, args) {
    shell = spawn(command, args);

    shell.stdout.pipe(process.stdout);

    shell.stderr.on('data', (data) => {
        console.log(data.toString());
    });

    shell.on('exit', (code) => {
        process.stdin.pause();
    });
}

function interactiveGHCi(src) {
    shell = spawn('ghci', []);

    shell.stdout.pipe(process.stdout);

    shell.stdout.on('data', (data) => {
        if (data.toString().slice(0, 4) === 'GHCi') {
            setTimeout(() => {
                shell.stdin.write(`:l ${src} \n`);
            }, 100);
        };
    });

    shell.on('exit', (code) => {
        process.stdin.pause();
    });
}

// Decide mode
if (process.argv[2] === 'run') {
    interactiveShell('runHaskell', [process.argv[3]]);
} else if (process.argv[2] === 'ghci') {
    interactiveGHCi(process.argv[3]);
}

// Get user input
process.stdin.on('data', (text) => {
    shell.stdin.write(text + '\n');    
});