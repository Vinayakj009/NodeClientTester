import http from 'http';
import { testBody } from '../types';
import axios from 'axios';

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
                    const request = JSON.parse(bodyString) as testBody;
                    request.processedByServer = true;
                    res.end(JSON.stringify(request));
                });
            });
        server.listen(port, hostname, () => {
            console.log(`Server running at http://${hostname}:${port}/`);
        });
    }

    async sendRequest(request: testBody) {
        const url = `http://${hostname}:${port}/`;
        const axiosResponse = await axios.post(url, request);
        const response = axiosResponse.data as testBody;
        return response;
    }
}

const getAPICallFunction = (): (request: testBody) => Promise<testBody> => {
    const apiCaller = new HttpApiCall();
    return apiCaller.sendRequest.bind(apiCaller);
}

const buildServer = () => {
    new HttpApiCall().startServer();
}

export default { getAPICallFunction, buildServer };