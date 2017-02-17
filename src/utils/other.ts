import * as vscode from 'vscode';

export function getWord(position: vscode.Position, text: String) {
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

function cleanWord(word: String) {
    let cleanWord = word;
    let first = cleanWord[0];
    let last = cleanWord[cleanWord.length - 1];

    // Helps fix situations like: (Implication a c))) when hovering on c
    while (1) {
        if (first === '"' || first === '(') {
            cleanWord = cleanWord.substring(1);

            first = cleanWord[0];
            last = cleanWord[cleanWord.length - 1];

            continue;
        }
    
        if (last === '"' || last === ')') {
            cleanWord = cleanWord.slice(0, cleanWord.length - 1);

            first = cleanWord[0];
            last = cleanWord[cleanWord.length - 1];

            continue;
        }

        break;
    }


    if (first === '\'' && last === '\'') {
        cleanWord = cleanWord.slice(0, cleanWord.length - 1);
        cleanWord = cleanWord.substring(1);
    }

    return cleanWord;
}

export function getNearWord(position: vscode.Position, text: String) {
    const lines = text.split('\n');
    const line = lines[position.line];
    let word = '';

    // Charaters before
    for (let i = position.character - 1; i >= 0; i--) {
        if (line[i] === ' ') {
            break;
        }
        word = `${line[i]}${word}`;
    }

    // Characters after
    for (let i = position.character; i >= 0; i++) {
        if (line[i] === ' ' || i > line.length || line[i] === undefined) {
            break;
        }
        word = `${word}${line[i]}`;
    }
    
    return cleanWord(word);
}
