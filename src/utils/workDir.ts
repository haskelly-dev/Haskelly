import { execSync } from 'child_process';
import { dirname, resolve } from 'path'
export function getWorkDir(filepath) {
    try {
        const path = execSync("stack query", {cwd: dirname(filepath)}).toString();
        const re = /.*path: ([^\n]*)\n.*/
        return {cwd: re.exec(path)[1]};
    } catch (e) {
        return {};
    }
}