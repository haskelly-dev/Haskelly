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

function cleanWord(word: String, start: number, end: number) {
    let cleanWord = word;
    let first = cleanWord[0];
    let last = cleanWord[cleanWord.length - 1];
    let newStart = start;
    let newEnd = end;

    // Helps fix situations like: (Implication a c))) when hovering on c
    while (1) {
        if (first === '"' || first === '(' || first === '[') {
            cleanWord = cleanWord.substring(1);

            first = cleanWord[0];
            last = cleanWord[cleanWord.length - 1];
            newStart++;

            continue;
        }
    
        if (last === '"' || last === ')' || last === ']') {
            cleanWord = cleanWord.slice(0, cleanWord.length - 1);

            first = cleanWord[0];
            last = cleanWord[cleanWord.length - 1];
            newEnd--;

            continue;
        }

        break;
    }


    if (first === '\'' && last === '\'') {
        cleanWord = cleanWord.slice(0, cleanWord.length - 1);
        cleanWord = cleanWord.substring(1);
        newStart++;
        newEnd--;
    }

    return { word:cleanWord, start: newStart, end: newEnd };
}

export function getNearWord(position: vscode.Position, text: String) {
    const lines = text.split('\n');
    const line = lines[position.line];
    let word = '';
    let start = position.character;
    let end = position.character;

    // Charaters before
    for (let i = position.character - 1; i >= 0; i--) {
        if (line[i] === ' ') {
            break;
        }
        word = `${line[i]}${word}`;
        start--;
    }

    // Characters after
    for (let i = position.character; i >= 0; i++) {
        if (line[i] === ' ' || i > line.length || line[i] === undefined) {
            break;
        }
        word = `${word}${line[i]}`;
        end++;
    }
    
    return cleanWord(word, start, end);
}
