import http from 'http';
import { serverProcessable } from '../types';

const hostname = '127.0.0.1';
const port = 3000;

export class HttpApiCall {
    protected agent?: http.Agent;
    protected static hostname = '127.0.0.1';
    protected static port = 3000;
    constructor() {
    }
    async startClient() {
        this.agent = new http.Agent({
            keepAlive: true,
            keepAliveMsecs: 1000,
            maxSockets: 10,
            maxFreeSockets: 75,
        });
    }

    async startServer<V extends serverProcessable>(serverCallback: (request: V) => Promise<V>) {
        const server = http.createServer(
            (req, res) => {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'text/plain');
                const body: string[] = [];
                req.on('data', (chunk: string) => {
                    body.push(chunk);
                });
                req.on('end', async () => {
                    const bodyString = body.join('');
                    if (bodyString === '') {
                        res.end('No data');
                        return;
                    }
                    const request = JSON.parse(bodyString) as V;
                    request.processedByServer = true;
                    const response = await serverCallback(request);
                    res.end(JSON.stringify(response));
                });
            });
        server.listen(port, hostname, () => {
            console.log(`Server running at http://${hostname}:${port}/`);
        });
    }

    async sendRequest<V extends serverProcessable>(request: V) {
        const url = `http://${hostname}:${port}/`;
        return new Promise<V>((resolve, reject) => {
            const req = http.request(url, {
                method: 'POST',
                agent: this.agent,
                headers: {
                    'Content-Type': 'application/json',
                },
            }, (res) => {
                let data = '';
                res.on('data', (chunk) => {
                    data += chunk;
                });
                res.on('end', () => {
                    resolve(JSON.parse(data) as V);
                });
            });

            req.on('error', (e) => {
                reject(e);
            });

            req.write(JSON.stringify(request));
            req.end();
        });
    }
}

function getAPICallFunction<V extends serverProcessable>(): (request: V) => Promise<V> {
    const apiCaller = new HttpApiCall();
    apiCaller.startClient();
    return apiCaller.sendRequest.bind(apiCaller);
}

function buildServer<V extends serverProcessable> (serverCallback: (request: V) => Promise<V>) {
    new HttpApiCall().startServer(serverCallback);
}

export default { getAPICallFunction, buildServer };