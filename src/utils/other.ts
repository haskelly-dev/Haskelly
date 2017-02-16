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
    const first = cleanWord[0];
    const last = cleanWord[cleanWord.length - 1];

    if (first === '"' || first === '(') {
        cleanWord = cleanWord.substring(1);
    }
    
    if (last === '"' || last === ')') {
        cleanWord = cleanWord.slice(0, cleanWord.length - 1);
    }

    if (first === '\'' || last === '\'') {
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