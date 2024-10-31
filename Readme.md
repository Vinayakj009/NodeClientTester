# Node Client Tester

This repository contains the codebase for the node client tester.
The purpose of this repository is to load test the communication techniques between 2 microservices running in node or typescript.

The project aims to identify bottlenecks in both server and client implementation.

The inspiration comes from the fact that we faced DNS resolution issues in prod, which were not caught because we had only tested the server, and never the clients. This project aims to close that gap.

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher) or bun (v0.1 or higher)

## Installation

To install the node dependencies, run:

```bash
npm install
```

or if you are using bun:

```bash
bun install
```

## Extensibility
### Adding Your Own Variant

You can add your own variant file to customize the behavior of the server or client. To do this, follow these steps:

1. Create a new JavaScript file in the `variants` directory. For example, `myVariant.ts`.

2. Implement your custom logic in the new file. Ensure it exports the necessary functions or objects required by the server or client, as per the interface defined in `variants/index.ts`.

3. The `index.ts` file will import your code automatically and allow you to run the server or client by passing the file name as follows:
```bash
npm run server myVariant
```

## Running the Server and Client Code
Here we assume you are using the default fetch variant.
Replace "fetch" with the variant name you want to use.

### Using npm

To run the server using the default fetch variant in dev mode:

```bash
npm run dev:js:server fetch
```

To run the client:

```bash
npm run dev:js:client fetch
```

### Using bun

To run the server:

```bash
npm run dev:bun:server fetch
```

To run the client:

```bash
npm run dev:bun:client fetch
```

## Compiling and Running the Compiled Code

### Using npm

To compile the code:

```bash
npm run build:js
```

To run the compiled server code:

```bash
npm run run:js:server fetch
```

To run the compiled client code:

```bash
npm run run:js:client fetch
```

### Using bun

To compile the code:

```bash
npm run build:bun
```

To run the compiled server code:

```bash
npm run run:bun:server fetch
```

To run the compiled client code:

```bash
npm run run:bun:client fetch
```

## License

This project is licensed under the MIT License.