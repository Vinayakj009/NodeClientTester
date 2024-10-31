import http from 'http';
import { serverProcessable } from '../types';
import axios, { AxiosResponse } from 'axios';

const hostname = '127.0.0.1';
const port = 3000;

class HttpApiCall {
    constructor() {
    }

    async startServer() {
        const server = http.createServer(
            (req, res) => {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'text/plain');
                const body: string[] = [];
                req.on('data', (chunk: string) => {
                    body.push(chunk);
                });
                req.on('end', () => {
                    const bodyString = body.join('');
                    if (bodyString === '') {
                        res.end('No data');
                        return;
                    }
                    const request = JSON.parse(bodyString) as serverProcessable;
                    request.processedByServer = true;
                    res.end(JSON.stringify(request));
                });
            });
        server.listen(port, hostname, () => {
            console.log(`Server running at http://${hostname}:${port}/`);
        });
    }

    async sendRequest<V extends serverProcessable>(request: V) {
        const url = `http://${hostname}:${port}/`;
        const axiosResponse: AxiosResponse<V, V> = await axios.post(url, request);
        const response = axiosResponse.data;
        return response;
    }
}

function getAPICallFunction<V extends serverProcessable>(): (request: V) => Promise<V> {
    const apiCaller = new HttpApiCall();
    return apiCaller.sendRequest.bind(apiCaller);
}

const buildServer = () => {
    new HttpApiCall().startServer();
}

export default { getAPICallFunction, buildServer };