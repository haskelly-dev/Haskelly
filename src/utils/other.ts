import * as vscode from 'vscode';

export function getWord(position:vscode.Position, text:String) {
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