# StorageMicroservice
This microservice provides persistent storage for user actions with support for action history and state restoration. It uses gRPC for communication, SQLite for data persistence, and RabbitMQ for event notifications.

# Core Functions
-Store user actions with metadata
-Retrieve chronological action history
-Restore to previous application states

# Setup
-Node.js v14+
-RabbitMQ running on localhost:5672
-Run:
  npm install
  npm start

# Requesting Data

# Client Setup:

const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

const PROTO_PATH = './proto/storage.proto';
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
});

const storageProto = grpc.loadPackageDefinition(packageDefinition).storage;
const client = new storageProto.StorageService(
    'localhost:50051',
    grpc.credentials.createInsecure()
);

# 1. Store Action 

const request = {
    userId: "user_123",
    actionId: "act_456",
    sessionId: "sess_789",
    timestamp: "2026-05-18T10:30:00Z",
    actionData: JSON.stringify({
        action: "UPDATE_PROFILE",
        field: "email"
    })
};

client.StoreAction(request, (error, response) => {
    console.log(response.status);  // "success" or "error"
    console.log(response.message);
});

# 2. Get User History

const request = {
    userId: "user_123",
    limit: 50  // optional, default 100
};

client.GetUserHistory(request, (error, response) => {
    console.log(response.totalCount);
    response.actions.forEach(action => {
        console.log(action.actionId, action.actionType);
    });
});

# 3. Restore State

const request = {
    userId: "user_123",
    actionId: "act_456"
};

client.RestoreState(request, (error, response) => {
    console.log(response.status);
    console.log(response.restoredActionId);
});

# Receiving Data

# StoreAction Response

{
    status: "success",
    message: "Action stored successfully",
    actionId: "act_456"
}

# GetUserHistory Response

{
    actions: [
        {
            actionId: "act_456",
            timestamp: "2026-05-18T10:30:00Z",
            actionType: "UPDATE_PROFILE",
            actionData: "{...}"
        }
    ],
    totalCount: 1
}

# RestoreState Response

{
    status: "success",
    message: "Successfully restored state from action act_456",
    restoredActionId: "restore_act_456_1716028200000"
}



