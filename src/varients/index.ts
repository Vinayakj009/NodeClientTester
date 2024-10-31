import * as fs from 'fs';
import * as path from 'path';

import { serverProcessable } from '../types';
interface varient<V extends serverProcessable> {
    getAPICallFunction<R extends V>(): (request: R) => Promise<R>;
    buildServer(): void;
};

const varientsPath = path.join(__dirname, './');
const varientsFiles = fs.readdirSync(varientsPath).filter(file => file.endsWith('.ts') && file !== 'index.ts');
const varients: { [key: string]: varient<serverProcessable> } = {
}
varientsFiles.forEach(file => {
    const varientName = path.basename(file, '.ts');
    varients[varientName] = require(path.join(varientsPath, file)).default;
});



export default varients;