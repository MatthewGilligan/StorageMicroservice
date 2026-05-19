# Storage Microservice

**Authors:** Matthew Gilligan, Charles  
**Repository:** https://github.com/MatthewGilligan/StorageMicroservice

## Overview

This microservice provides persistent storage for user actions with support for action history and state restoration. It uses gRPC for communication, SQLite for data persistence, and RabbitMQ for event notifications.

**Core Functions:**
- Store user actions with metadata
- Retrieve chronological action history
- Restore to previous application states

## Setup

**Prerequisites:**
- Node.js (v14+)
- RabbitMQ running on `localhost:5672`

**Installation:**
```bash
npm install
npm start
```

Service runs on `localhost:50051`.

## Requesting Data

### Client Setup

```javascript
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
```

### 1. Store Action

```javascript
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
```

**Parameters:** `userId`, `actionId`, `timestamp` (required); `sessionId`, `actionData` (optional)

### 2. Get User History

```javascript
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
```

**Parameters:** `userId` (required); `limit` (optional)

### 3. Restore State

```javascript
const request = {
    userId: "user_123",
    actionId: "act_456"
};

client.RestoreState(request, (error, response) => {
    console.log(response.status);
    console.log(response.restoredActionId);
});
```

**Parameters:** `userId`, `actionId` (required)

## Receiving Data

### StoreAction Response

```json
{
    "status": "success",
    "message": "Action stored successfully",
    "actionId": "act_456"
}
```

### GetUserHistory Response

```json
{
    "actions": [
        {
            "actionId": "act_456",
            "timestamp": "2026-05-18T10:30:00Z",
            "actionType": "UPDATE_PROFILE",
            "actionData": "{...}"
        }
    ],
    "totalCount": 1
}
```

### RestoreState Response

```json
{
    "status": "success",
    "message": "Successfully restored state from action act_456",
    "restoredActionId": "restore_act_456_1716028200000"
}
```

## UML Sequence Diagram

<img width="4032" height="3024" alt="IMG_7187" src="https://github.com/user-attachments/assets/4322c986-ee35-4a31-b1dd-c8a0fd219777" />


## Testing

Run the test program:

```bash
npm test
```

Tests verify: storing actions, retrieving history, restoring states, and error handling.

## Technical Details

- **Protocol:** gRPC (Protocol Buffers)
- **Port:** 50051
- **Database:** SQLite
- **Message Queue:** RabbitMQ (localhost:5672)
- **Events Published:** STORAGE_SUCCESS, STORAGE_FAILURE, STATE_RESTORED

## Common Errors

| Error Message | Cause |
|---------------|-------|
| "Missing required fields" | Missing userId, actionId, or timestamp |
| "actionData must be valid JSON" | Invalid JSON in actionData field |
| "Action with ID X not found" | Action doesn't exist for user |
| "UNIQUE constraint failed" | Duplicate actionId |
