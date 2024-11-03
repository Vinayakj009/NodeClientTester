import http2 from 'http2';
import { serverProcessable } from '../types';
import { Mutex } from 'async-mutex';

const hostname = '127.0.0.1';
const port = 3000;

class Http2ApiCall {
    private clients: http2.ClientHttp2Session[] = [];
    private currentClientIndex: number = 0;

    constructor() {
    }

    async startClient() {
        for (let i = 0; i < 10; i++) {
            const currentIndex = i;
            const client = http2.connect(`http://${hostname}:${port}`);
            client.on('error', (err) => console.error(err));
            client.on('close', () => {
                console.log('Client closed');
                this.clients[currentIndex] = http2.connect(`http://${hostname}:${port}`);
            });
            this.clients.push(client);
        }
    }

    async startServer<V extends serverProcessable>(serverCallback: (request: V) => Promise<V>) {
        const server = http2.createServer();
        server.on('stream', (stream, headers) => {
            let body: string[] = [];
            stream.on('data', (chunk: Buffer) => {
                body.push(chunk.toString());
            });
            stream.on('end', async () => {
                const bodyString = body.join('');
                if (bodyString === '') {
                    stream.respond({ ':status': 200, 'content-type': 'text/plain' });
                    stream.end('No data');
                    return;
                }
                const request = JSON.parse(bodyString) as V;
                request.processedByServer = true;
                const response = await serverCallback(request);
                stream.end(JSON.stringify(response));
            });
            stream.on('error', (err) => {
                console.error(err);
            });
        });
        server.listen(port, hostname, () => {
            console.log(`Server running at http://${hostname}:${port}/`);
        });
    }

    async sendRequest<V extends serverProcessable>(request: V): Promise<V> {
        if (this.clients.length === 0) {
            throw new Error('Clients not initialized');
        }
        const client = this.clients[this.currentClientIndex];
        this.currentClientIndex = (this.currentClientIndex + 1) % this.clients.length;
        return new Promise<V>((resolve, reject) => {

            const req = client.request({
                ':method': 'POST',
                ':path': '/',
                'content-type': 'application/json'
            });

            // req.setEncoding('utf8');
            req.on('response', (headers, flags) => {
                let data = '';
                req.on('data', (chunk) => {
                    data += chunk;
                });
                req.on('end', () => {
                    resolve(JSON.parse(data) as V);
                });
            });

            req.on('error', (err) => {
                request.processedByServer = false;
                resolve(request);
            });

            req.write(JSON.stringify(request));
            req.end();
        });
    }
}

function getAPICallFunction<V extends serverProcessable>(): (request: V) => Promise<V> {
    const apiCaller = new Http2ApiCall();
    apiCaller.startClient();
    return apiCaller.sendRequest.bind(apiCaller);
}

function buildServer<V extends serverProcessable>(serverCallback: (request: V) => Promise<V>) {
    new Http2ApiCall().startServer(serverCallback);
}

export default { getAPICallFunction, buildServer };
