import * as vscode from 'vscode';
import InteroSpawn from '../InteroSpawn';
import { getNearWord } from '../../utils/other';
import { normalizePath } from '../../utils/document';

export default class HaskellDefinitionProvider implements vscode.DefinitionProvider {
    private interoSpawn: InteroSpawn;

    public constructor(interoSpawn: InteroSpawn) {
        this.interoSpawn = interoSpawn;
    }

    public async provideDefinition(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): Promise<vscode.Location> {
        const wordInfo = getNearWord(position, document.getText());
        const filePath = normalizePath(document.uri.fsPath);

        const definitionLocation = await this.interoSpawn.requestDefinition(filePath, position, wordInfo);
        return this.buildLocation(definitionLocation);
    }

    private buildLocation(location) {
        const {filePath, rangeInFile} = this.splitPathAndRange(location);
        const uri = vscode.Uri.file(filePath);
        const range = this.extractRange(rangeInFile);
        return new vscode.Location(uri, range);
    }

    private splitPathAndRange(location) {
        const separatorIndex = location.lastIndexOf(':');
        return {
            filePath: location.slice(0, separatorIndex),
            rangeInFile: location.slice(separatorIndex + 1)
        };
    }

    private extractRange(symbolLoc) {
        const [line1, column1, line2, column2] = symbolLoc
            .match(/^\((\d+),(\d+)\)-\((\d+),(\d+)\)$/)
            .slice(1, 5)
            .map(num => parseInt(num, 10) - 1);
        return new vscode.Range(line1, column1, line2, column2);
    }
}
