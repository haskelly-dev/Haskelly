import * as vscode from 'vscode';

export default class InteroLocationDecoder {
    public decode(interoLocation: string): vscode.Location {
        return this.buildLocation(interoLocation);
    }

    private buildLocation(interoLocation) {
        const {filePath, rangeInFile} = this.splitPathAndRange(interoLocation);
        const uri = vscode.Uri.file(filePath);
        const range = this.extractRange(rangeInFile);
        return new vscode.Location(uri, range);
    }

    private splitPathAndRange(interoLocation) {
        const separatorIndex = interoLocation.lastIndexOf(':');
        return {
            filePath: interoLocation.slice(0, separatorIndex),
            rangeInFile: interoLocation.slice(separatorIndex + 1)
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
