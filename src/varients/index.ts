import * as fs from 'fs';
import * as path from 'path';

const varientsPath = path.join(__dirname, './');
const varientsFiles = fs.readdirSync(varientsPath).filter(file => file.endsWith('.ts') && file !== 'index.ts');
const varients: { [key: string]: varient } = {
}
varientsFiles.forEach(file => {
    const varientName = path.basename(file, '.ts');
    varients[varientName] = require(path.join(varientsPath, file)).default;
});
import { testBody } from '../types';

interface varient {
    getAPICallFunction(): (request: testBody) => Promise<testBody>;
    buildServer(): void;
};

export default varients;