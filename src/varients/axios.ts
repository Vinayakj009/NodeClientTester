import { serverProcessable } from '../types';
import axios, { AxiosResponse } from 'axios';
import { HttpApiCall } from './http';

class AxiosApiCall extends HttpApiCall {
    async sendRequest<V extends serverProcessable>(request: V) {
        const url = `http://${HttpApiCall.hostname}:${HttpApiCall.port}/`;
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
    const apiCaller = new AxiosApiCall();
    apiCaller.startClient();
    return apiCaller.sendRequest.bind(apiCaller);
}

function buildServer<V extends serverProcessable> (serverCallback: (request: V) => Promise<V>) {
    new AxiosApiCall().startServer(serverCallback);
}

export default { getAPICallFunction, buildServer };