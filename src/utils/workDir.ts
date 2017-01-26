import { execSync } from 'child_process';
import { dirname, resolve } from 'path'
export function getWorkDir(filepath) {
     try {
        const path = execSync("stack query", {cwd: dirname(filepath)}).toString();
        const re = /.*path:\s([^\n\s]*)\s.*/
        var extract = re.exec(path)[1];
        const reWindows = /C:(\\.*\\)*/
        if (reWindows.test(extract)){
            extract = extract.replace(/\\/g, "/");
            extract = extract.slice(2, extract.length)
        }
        return {cwd: extract};
    } catch (e) {
        return {};
    }
}