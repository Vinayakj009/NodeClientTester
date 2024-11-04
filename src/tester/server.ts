import varients from "../varients";

const input = process.argv[2];

const API_RESPONSE_DELAY = +(process.env.API_RESPONSE_DELAY || 0);

const allowedInputs = Object.keys(varients);
if (!allowedInputs.includes(input)) {
    console.log(`Invalid input. Allowed inputs are: ${allowedInputs.join(', ')}`);
    process.exit(1);
}
varients[input].buildServer(async (request: any) => {
    if (API_RESPONSE_DELAY > 0) {
        await new Promise(resolve => setTimeout(resolve, API_RESPONSE_DELAY));
    }
    return request;
 });