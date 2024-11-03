import http from 'http';
import { serverProcessable } from '../types';
import axios, { AxiosResponse } from 'axios';

const hostname = '127.0.0.1';
const port = 3000;

class HttpApiCall {
    private agent?: http.Agent;
    constructor() {
    }
    async startClient() {
        this.agent = new http.Agent({
            keepAlive: true,
            keepAliveMsecs: 1000,
            maxSockets: 20,
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
        const axiosResponse: AxiosResponse<V, V> = await axios({
            method: 'POST',
            url,
            data: request,
            httpAgent: this.agent,
        });
        const response = axiosResponse.data;
        return response;
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