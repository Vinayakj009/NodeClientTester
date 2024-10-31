import varients from "../varients";
import { serverProcessable, testBody as testBody } from "../types";
import { Mutex } from 'async-mutex';
import crypto from 'crypto';


const serializeCalls = process.argv[3] === 'serial';

const MAX_CALLS_PER_SECOND = +(process.env.MAX_CALLS_PER_SECOND || 500);
const RAMP_UP_TIME = +(process.env.RAMP_UP_TIME || 5000);
const RAMP_UP_CALLS = +(process.env.RAMP_UP_CALLS || 50);

type processable<V extends serverProcessable> = (sr: V) => Promise<V>;
let apiCall: processable<testBody>;


const stats = {
    success: 0,
    failures: 0,
    timeAggregate: 0,
    timeMax: 0,
    timeMin: Number.MAX_SAFE_INTEGER,
    timeSquared: 0
}

const mutex = new Mutex();
const requestMutex = new Mutex();

const processMessage = (response:testBody, requestId: string) => {
    return mutex.runExclusive(async () => {
        if (!response.processedByServer || response.requestId !== requestId) {
            console.log(`Failed request: ${JSON.stringify(response)} expected ${requestId}`);
            process.exit(1);
            stats.failures++;
            return;
        }
        const difference = response.receivedAt - response.sentAt;
        // console.log(`The request was sent at ${}`)
        stats.success++;
        stats.timeAggregate += difference;
        stats.timeMax = Math.max(stats.timeMax, difference);
        stats.timeMin = Math.min(stats.timeMin, difference);
        stats.timeSquared += difference * difference;
    });
}

const printStats = () => {
    return mutex.runExclusive(() => {
        console.log(`Failed ${stats.failures} messages`);
        console.log(`Processed ${stats.success} messages`);
        if (stats.success == 0) {
            return;
        }
        console.log(`Average time: ${stats.timeAggregate / stats.success}ms`);
        console.log(`Max time: ${stats.timeMax}ms`);
        console.log(`Min time: ${stats.timeMin}ms`);
        console.log(`Standard deviation: ${Math.sqrt(stats.timeSquared / stats.success)}ms`);
    });
}

const resetStats =  () => {
    return mutex.runExclusive(() => {
        stats.failures = 0;
        stats.success = 0;
        stats.timeAggregate = 0;
        stats.timeMax = 0;
        stats.timeMin = Number.MAX_SAFE_INTEGER;
        stats.timeSquared = 0;
    });
}


const makeCall = async () => {
    const requestId = crypto.randomUUID();
    const response = await apiCall({
        receivedAt: -1,
        processedByServer: false,
        sentAt : Date.now(),
        requestId,
    });
    response.receivedAt = Date.now();
    return processMessage(response, requestId);
}

async function runCallsPerSecond(calls: number, endTime: number) {
    const scale = 1;
    const startTime = Date.now();
    let rampEndTime = startTime;
    let callsMade = 0;
    while (Date.now() < endTime) {
        const promises: Promise<void>[] = [];
        callsMade+=calls / scale;
        for (let i = 0; i < calls / scale; i++) {
            if (serializeCalls) {
                promises.push(requestMutex.runExclusive(makeCall)); // Runs in serial
            } else {
                promises.push(makeCall()); // Run in parallel
            }
        }
        rampEndTime += 1000 / scale;
        promises.push(new Promise((resolve) => setTimeout(resolve, rampEndTime - Date.now())));
        await Promise.all(promises);
    }
    const testEndDelay = Date.now() - endTime;
    const expectedCallCount = calls * (endTime - startTime) / 1000;
    return {
        callsMade,
        testEndDelay,
        expectedCallCount
    }
}


async function main() {
    for(let calls = RAMP_UP_CALLS; calls <= MAX_CALLS_PER_SECOND; calls += RAMP_UP_CALLS) {
        console.log(`Ramping up to ${calls} cps`);
        await resetStats();
        const endTime = Date.now() + RAMP_UP_TIME;
        const data = await runCallsPerSecond(calls, endTime);
        const averageResponseTime = stats.timeAggregate / stats.success;
        if (data.callsMade < data.expectedCallCount || data.testEndDelay > 100 || averageResponseTime > 100) {
            console.log(`Req Exceeded: ${calls} cps`);
            console.log(`Ended delay : ${data.testEndDelay}ms`);
            console.log(`System capacity: ${data.callsMade * 1000 / (RAMP_UP_TIME + data.testEndDelay) } cps`);
            console.log(`Expected calls: ${data.expectedCallCount}`);
            console.log(`Actual: ${ data.callsMade }`);
            await printStats();
            break;
        }
    }
    process.exit(0);
}

const input = process.argv[2];

const allowedInputs = Object.keys(varients);
if (!allowedInputs.includes(input)) {
    throw new Error(`Invalid input. Please specify one of ${allowedInputs.join(', ')}`);
}

apiCall = varients[input].getAPICallFunction();


main();