import * as vscode from 'vscode';
import InteroSpawn from '../InteroSpawn';
import { getNearWord } from '../../utils/other';
import { normalizePath } from '../../utils/document'; 

class TypeProvider implements vscode.HoverProvider {
    public provideHover(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): Thenable<vscode.Hover> {
        return new Promise((resolve, reject) => {
            const word = getNearWord(position, document.getText());
            let filePath = normalizePath(document.uri.fsPath);

            InteroSpawn.getInstance().requestType(filePath, position, word)
            .then(hover => {
                resolve(hover);  
            });
        })


    }
}

export default TypeProvider;