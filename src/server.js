require('dotenv').config();
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const { initializeDatabase } = require('./database');
const { connectRabbitMQ, consumeMessages } = require('./rabbitmq');
const handleStoreAction = require('./handlers/storeAction');
const handleGetUserHistory = require('./handlers/getUserHistory');
const handleRestoreState = require('./handlers/restoreState');
const { storeAction } = require('./database');

// Load proto file
const PROTO_PATH = path.join(__dirname, '../proto/storage.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
});

const storageProto = grpc.loadPackageDefinition(packageDefinition).storage;

// Create gRPC server
function createServer() {
    const server = new grpc.Server();

    // Add service implementation
    server.addService(storageProto.StorageService.service, {
        StoreAction: handleStoreAction,
        GetUserHistory: handleGetUserHistory,
        RestoreState: handleRestoreState
    });

    return server;
}

// Start the server
async function startServer() {
    try {
        // Initialize database
        console.log('Initializing database...');
        initializeDatabase();

        // Connect to RabbitMQ
        console.log('Connecting to RabbitMQ...');
        await connectRabbitMQ();

        // Set up RabbitMQ consumer for async storage requests
        await consumeMessages('storage-requests', async (message) => {
            console.log('Received async storage request:', message);
            
            try {
                const { userId, actionId, sessionId, timestamp, actionData } = message;
                
                await storeAction(
                    userId,
                    actionId || `async_${Date.now()}`,
                    sessionId || '',
                    timestamp || new Date().toISOString(),
                    JSON.stringify(actionData || {})
                );

                console.log(`Async action stored for user ${userId}`);
            } catch (error) {
                console.error('Error processing async storage request:', error);
            }
        });

        // Create and start gRPC server
        const server = createServer();
        const port = process.env.GRPC_PORT || 50051;
        const address = `0.0.0.0:${port}`;

        server.bindAsync(
            address,
            grpc.ServerCredentials.createInsecure(),
            (error, port) => {
                if (error) {
                    console.error('Failed to bind server:', error);
                    return;
                }
                
                console.log(`Storage microservice listening on ${address}`);
                server.start();
            }
        );

    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down gracefully...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\nShutting down gracefully...');
    process.exit(0);
});

// Start the server
startServer();
