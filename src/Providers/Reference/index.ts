import * as vscode from 'vscode';
import InteroSpawn from '../InteroSpawn';
import { getNearWord } from '../../utils/other';
import { normalizePath } from '../../utils/document';
import InteroLocationDecoder from '../InteroLocationDecoder';

export default class HaskellReferenceProvider implements vscode.ReferenceProvider {
    private interoSpawn: InteroSpawn;
    private interoLocationDecoder: InteroLocationDecoder;

    public constructor(interoSpawn: InteroSpawn) {
        this.interoSpawn = interoSpawn;
        this.interoLocationDecoder = new InteroLocationDecoder();
    }

    public async provideReferences(
        document: vscode.TextDocument,
        position: vscode.Position,
        options: { includeDeclaration: boolean },
        token: vscode.CancellationToken
    ): Promise<vscode.Location[]> {
        const wordInfo = getNearWord(position, document.getText());
        const filePath = normalizePath(document.uri.fsPath);

        const definitionLocations = await this.interoSpawn.requestReferences(filePath, position, wordInfo);
        return definitionLocations.split(' ')
            .map(location => this.interoLocationDecoder.decode(location));
    }
}
