export type serverProcessable = {
    processedByServer: boolean,   
}

type identifiable = {
    requestId: string
}

type processingTimeTrackable = {
    receivedAt: number,
    sentAt: number
}

export type testBody = processingTimeTrackable & serverProcessable & identifiable;