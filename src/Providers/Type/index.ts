import * as vscode from 'vscode';
import InteroSpawn from '../InteroSpawn';
import { getNearWord } from '../../utils/other';

class TypeProvider implements vscode.HoverProvider {
    public provideHover(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): Thenable<vscode.Hover> {
        return new Promise((resolve, reject) => {
            const word = getNearWord(position, document.getText());

            let filePath = document.uri.fsPath;
            if (process.platform === 'win32') {
                filePath = filePath.charAt(0).toUpperCase() + filePath.substr(1);
            }

            InteroSpawn.getInstance().requestType(filePath, position, word)
            .then(hover => {
                resolve(hover);  
            });
        })


    }
}

export default TypeProvider;