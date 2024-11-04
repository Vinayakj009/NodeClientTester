import varients from "../varients";
import { serverProcessable, testBody as testBody } from "../types";
import { Mutex } from 'async-mutex';
import crypto from 'crypto';

const MAX_CALLS_PER_SECOND = +(process.env.MAX_CALLS_PER_SECOND || 1000);
const RAMP_UP_TIME = +(process.env.RAMP_UP_TIME || 1000);
const RAMP_START_CALLS = +(process.env.RAMP_START_CALLS || 1000);
const RAMP_UP_CALLS = +(process.env.RAMP_UP_CALLS || 50);
const RUN_SERIAL = process.env.RUN_SERIAL !== undefined;

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
            stats.failures++;
            throw new Error('Failed request');
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
        console.log(`Quality Average time: ${stats.timeAggregate / stats.success}ms`);
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
            if (RUN_SERIAL) {
                promises.push(requestMutex.runExclusive(makeCall)); // Runs in serial
            } else {
                promises.push(makeCall()); // Run in parallel
            }
        }
        rampEndTime += 1000 / scale;
        promises.push(new Promise((resolve) => setTimeout(resolve, rampEndTime - Date.now())));
        await Promise.all(promises);
    }
    const expectedCallCount = calls * (endTime - startTime) / 1000;
    return {
        callsMade,
        expectedCallCount
    }
}


async function main() {
    const localStats = {
        maxRPS: 0,
        endDelay: 0,
        systemCapacity: 0,
        expectedCalls: 0,
        callsMade: 0,
        overallAverageResponseTime: 0,
        runTime: 0,
    }
    try {
        for (let calls = RAMP_START_CALLS; calls <= MAX_CALLS_PER_SECOND; calls += RAMP_UP_CALLS) {
            console.log(`Ramping up to ${calls} cps with ${RAMP_UP_TIME}ms ramp up time and serial calls: ${RUN_SERIAL} max ramp calls: ${MAX_CALLS_PER_SECOND}`);
            await resetStats();
            try {
                const startTime = Date.now();
                const targetEndTime = startTime + RAMP_UP_TIME;
                const data = await runCallsPerSecond(calls, targetEndTime);
                const actualEndTime = Date.now();
                const runTime = actualEndTime - startTime;
                const testEndDelay = actualEndTime - targetEndTime;
                const averageResponseTime = runTime / data.callsMade;
                const systemCapacity = 1000 / averageResponseTime;
                localStats.maxRPS = calls;
                localStats.endDelay = testEndDelay;
                localStats.systemCapacity = systemCapacity;
                localStats.expectedCalls = data.expectedCallCount;
                localStats.callsMade = data.callsMade;
                localStats.overallAverageResponseTime = averageResponseTime;
                localStats.runTime = runTime;

                if (data.callsMade < data.expectedCallCount) {
                    console.log(`Breaking due to insufficient calls made. Actual: ${data.callsMade}, Expected: ${data.expectedCallCount}`);
                    break;
                }
                if (testEndDelay > 100) {
                    console.log(`Breaking due to test end delay. Actual: ${testEndDelay}ms, Limit: 100ms`);
                    break;
                }
                if (stats.failures > 0) {
                    console.log(`Breaking due to failures. Failures: ${stats.failures}`);
                    break;
                }

            } catch (e) {
                console.log('Error in main loop');
                console.error(e);
                break;
            }
        }
    } finally {
        console.log(`Req Exceeded: ${localStats.maxRPS} cps`);
        console.log(`Ended delay : ${localStats.endDelay}ms`);
        console.log(`Expected calls: ${localStats.expectedCalls}`);
        console.log(`Actual: ${localStats.callsMade} calls`);
        console.log(`System Average response time: ${localStats.overallAverageResponseTime}ms`);
        console.log(`System capacity: ${localStats.systemCapacity} cps`);
        await printStats();
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