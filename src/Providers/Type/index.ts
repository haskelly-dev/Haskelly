import * as vscode from 'vscode';
import InteroSpawn from '../InteroSpawn';
import { getWord } from '../../utils/other';

class TypeProvider implements vscode.HoverProvider {
    constructor() {
        console.log('init');
    }

    public provideHover(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): Thenable<vscode.Hover> {
        return new Promise((resolve, reject) => {
            const word = getWord(position, document.getText());

            // Request completions
            let filePathBeginning = document.uri.fsPath.slice(0,3)            
            if (filePathBeginning === 'c:\\') {
                filePathBeginning = 'C:\\';
            }
            const filepath = filePathBeginning + document.uri.fsPath.slice(3, document.uri.fsPath.length);

            console.log('type at ', position.line);

            InteroSpawn.getInstance().requestType(filepath, position, word)
            .then(hover => {
                resolve(hover);  
            });
        })


    }
}

export default TypeProvider;