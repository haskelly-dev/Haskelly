const spawn = require('child_process').spawn;

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

function runHaskell(src) {
    interactiveShell('runHaskell', [src]);
}

if (process.argv[2] === 'run') {
    runHaskell(process.argv[3]);
}

// Get user input
process.stdin.on('data', (text) => {
    shell.stdin.write(text + '\n');    
});