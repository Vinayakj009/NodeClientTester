import varients from "../varients";

const input = process.argv[2];

const allowedInputs = Object.keys(varients);
if (!allowedInputs.includes(input)) {
    console.log(`Invalid input. Allowed inputs are: ${allowedInputs.join(', ')}`);
    process.exit(1);
}
varients[input].buildServer();