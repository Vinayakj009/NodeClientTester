import * as fs from 'fs';
import * as path from 'path';

import { serverProcessable } from '../types';
interface varient<V extends serverProcessable> {
    getAPICallFunction<R extends V>(): (request: R) => Promise<R>;
    buildServer(serverCallback: (request: V)=>Promise<V>): void;
};

const varientsPath = path.join(__dirname, './');
const varientsFiles = fs.readdirSync(varientsPath).filter(file => (file.endsWith('.ts') || file.endsWith('.js')) && !file.startsWith('index.'));
const varients: { [key: string]: varient<serverProcessable> } = {
}
varientsFiles.forEach(file => {
    const varientName = path.basename(file, path.extname(file));
    varients[varientName] = require(path.join(varientsPath, file)).default;
});



export default varients;