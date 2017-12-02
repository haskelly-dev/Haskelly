import * as assert from 'assert';

import {delay} from '../../src/utils/promise';

suite("PromiseUtils", () => {

    test("`delay` postpones the execution of following lines", async () => {
        const timeStart = new Date().getTime();
        await delay(50);
        const timeEnd = new Date().getTime();
        assert.ok(timeEnd - timeStart >= 50);
    });

});
