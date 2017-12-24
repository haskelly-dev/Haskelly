import * as assert from 'assert';

import * as vscode from 'vscode';
import HaskellReferenceProvider from '../../../src/Providers/Reference';
import InteroSpawn from '../../../src/Providers/InteroSpawn';

suite("HaskellReferenceProvider", () => {

    test("it passes the path of the file that has the focused symbol when asking intero to locate all references", async () => {
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

    test("it receives all the locations of references from intero", async () => {
        const {locations} = await executeProvider();
        assert.equal('/ABSOLUTE_PATH_TO/FILE1', locations[0].uri.fsPath);
        assert.ok(locations[0].range.isEqual(new vscode.Range(9, 0, 9, 4)));
        assert.equal('/ABSOLUTE_PATH_TO/FILE2', locations[1].uri.fsPath);
        assert.ok(locations[1].range.isEqual(new vscode.Range(6, 6, 6, 10)));
    });

    async function executeProvider(): Promise<{locations, requestToIntero}> {
        const {interoSpawn, requestToIntero} = createFakeInteroSpawn();
        const haskellProvider = new HaskellReferenceProvider(interoSpawn);
        const document = {
            getText: () => 'THIS\nIS\nA\nTEST\n.',
            uri: {fsPath: 'FILE_PATH'}
        };
        const position = {line: 3, character: 2};
        const options = {includeDeclaration: true};
        const token = new vscode.CancellationTokenSource().token;
        const locations = await haskellProvider.provideReferences(
            document as vscode.TextDocument,
            position as vscode.Position,
            options,
            token
        );
        return {locations, requestToIntero};
    }

    function createFakeInteroSpawn() {
        const requestToIntero = {};
        const interoSpawn = Object.assign({}, InteroSpawn.getInstance(), {
            requestReferences(filePath: String, position: vscode.Position, wordInfo: Object): Promise<String> {
                Object.assign(requestToIntero, {filePath, position, wordInfo});
                return Promise.resolve([
                    '/ABSOLUTE_PATH_TO/FILE1:(10,1)-(10,5)',
                    '/ABSOLUTE_PATH_TO/FILE2:(7,7)-(7,11)'
                ].join(' '));
            }
        });
        return {interoSpawn, requestToIntero};
    }
});
