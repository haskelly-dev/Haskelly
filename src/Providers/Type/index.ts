import * as vscode from 'vscode';
import InteroSpawn from '../InteroSpawn';
import { getNearWord } from '../../utils/other';
import { normalizePath } from '../../utils/document'; 

class TypeProvider implements vscode.HoverProvider {
    public provideHover(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): Thenable<vscode.Hover> {
        return new Promise((resolve, reject) => {
            // current editor
            const editor = vscode.window.activeTextEditor;
            let filePath = normalizePath(document.uri.fsPath);
            
            // check if there is no selection
            if (editor.selection.isEmpty || !editor.selection.contains(position)) {
                const wordInfo = getNearWord(position, document.getText());
                InteroSpawn.getInstance().requestType(filePath, position, wordInfo)
                .then(hover => {
                    resolve(hover);  
                });
            } else {
                InteroSpawn.getInstance().requestType(filePath, position, { word: "", start: editor.selection.start.character, end: editor.selection.end.character })
                .then(hover => {
                    resolve(hover);  
                });
            }
        })
    }
}

export default TypeProvider;
