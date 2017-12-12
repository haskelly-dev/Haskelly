import * as assert from 'assert';

import * as vscode from 'vscode';
import HaskellDefinitionProvider from '../../../src/Providers/Definition';
import InteroSpawn from '../../../src/Providers/InteroSpawn';

suite("HaskellDefinitionProvider", () => {

    test("it passes the path of the file that has the focused symbol when asking intero to locate the definition", async () => {
        const {requestToIntero} = await executeProvider();
        assert.equal('FILE_PATH', requestToIntero.filePath);
    });

    test("it passes the position of on a cursor to intero", async () => {
        const {requestToIntero} = await executeProvider();
        assert.deepEqual({line: 3, character: 2}, requestToIntero.position);
    });

    test("it passes the whole symbol to intero", async () => {
        const {requestToIntero} = await executeProvider();
        assert.deepEqual('TEST', requestToIntero.wordInfo.word);
    });

    test("it receives the location of the definition from intero", async () => {
        const {location} = await executeProvider();
        assert.equal('/ABSOLUTE_PATH_TO/FILE', location.uri.fsPath);
        assert.ok(location.range.isEqual(new vscode.Range(9, 0, 9, 4)));
    });

    async function executeProvider(): Promise<{location, requestToIntero}> {
        const {interoSpawn, requestToIntero} = createFakeInteroSpawn();
        const haskellProvider = new HaskellDefinitionProvider(interoSpawn);
        const document = {
            getText: () => 'THIS\nIS\nA\nTEST\n.',
            uri: {fsPath: 'FILE_PATH'}
        };
        const token = new vscode.CancellationTokenSource().token;
        const position = {line: 3, character: 2};
        const location = await haskellProvider.provideDefinition(
            document as vscode.TextDocument,
            position as vscode.Position,
            token
        );
        return {location, requestToIntero};
    }

    function createFakeInteroSpawn() {
        const requestToIntero = {};
        const interoSpawn = Object.assign({}, InteroSpawn.getInstance(), {
            requestDefinition(filePath: String, position: vscode.Position, wordInfo: Object): Promise<String> {
                Object.assign(requestToIntero, {filePath, position, wordInfo});
                return Promise.resolve('/ABSOLUTE_PATH_TO/FILE:(10,1)-(10,5)');
            }
        });
        return {interoSpawn, requestToIntero};
    }
});
