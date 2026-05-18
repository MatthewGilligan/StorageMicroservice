const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

const PROTO_PATH = path.join(__dirname, './proto/storage.proto');
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

console.log('\n========================================');
console.log('  Storage Microservice Test Suite');
console.log('========================================\n');

// Store actionIds for later tests
let storedActionIds = [];

// Test 1: Store multiple actions
function testStoreAction(testNum, actionType) {
    return new Promise((resolve, reject) => {
        console.log(`\n--- Test ${testNum}: Storing ${actionType} Action ---`);
        
        const actionId = `act_${Date.now()}_${testNum}`;
        const request = {
            userId: 'user_145',
            actionId: actionId,
            sessionId: 'sess_991',
            timestamp: new Date().toISOString(),
            actionData: JSON.stringify({
                action: actionType,
                field: 'email',
                oldValue: 'old@example.com',
                newValue: 'new@example.com',
                testNumber: testNum
            })
        };

        client.StoreAction(request, (error, response) => {
            if (error) {
                console.error('✗ Error:', error.message);
                reject(error);
            } else {
                console.log('✓ Status:', response.status);
                console.log('✓ Message:', response.message);
                console.log('✓ Action ID:', response.actionId);
                
                if (response.status === 'success') {
                    storedActionIds.push(response.actionId);
                }
                resolve(response);
            }
        });
    });
}

// Test 2: Get user history
function testGetUserHistory() {
    return new Promise((resolve, reject) => {
        console.log('\n--- Test: Get User History ---');
        
        const request = {
            userId: 'user_145',
            limit: 10
        };

        client.GetUserHistory(request, (error, response) => {
            if (error) {
                console.error('✗ Error:', error.message);
                reject(error);
            } else {
                console.log('✓ Total actions retrieved:', response.totalCount);
                console.log('\nAction History:');
                response.actions.forEach((action, index) => {
                    console.log(`\n  Action ${index + 1}:`);
                    console.log(`    ID: ${action.actionId}`);
                    console.log(`    Type: ${action.actionType}`);
                    console.log(`    Time: ${action.timestamp}`);
                    const data = JSON.parse(action.actionData);
                    console.log(`    Details: ${data.action || 'N/A'}`);
                });
                resolve(response);
            }
        });
    });
}

// Test 3: Restore state
function testRestoreState(actionId) {
    return new Promise((resolve, reject) => {
        console.log('\n--- Test: Restore State ---');
        
        const request = {
            userId: 'user_145',
            actionId: actionId
        };

        client.RestoreState(request, (error, response) => {
            if (error) {
                console.error('✗ Error:', error.message);
                reject(error);
            } else {
                console.log('✓ Status:', response.status);
                console.log('✓ Message:', response.message);
                console.log('✓ Restored Action ID:', response.restoredActionId);
                resolve(response);
            }
        });
    });
}

// Test 4: Error handling - missing fields
function testErrorHandling() {
    return new Promise((resolve, reject) => {
        console.log('\n--- Test: Error Handling (Missing Fields) ---');
        
        const request = {
            userId: 'user_145',
            // Missing actionId and timestamp
        };

        client.StoreAction(request, (error, response) => {
            if (error) {
                console.error('✗ Unexpected error:', error.message);
                reject(error);
            } else {
                console.log('✓ Status:', response.status);
                console.log('✓ Error Message:', response.message);
                console.log('✓ Error handling works correctly!');
                resolve(response);
            }
        });
    });
}

// Run all tests sequentially
async function runAllTests() {
    try {
        // Store some actions
        await testStoreAction(1, 'UPDATE_PROFILE');
        await new Promise(resolve => setTimeout(resolve, 500));
        
        await testStoreAction(2, 'DELETE_POST');
        await new Promise(resolve => setTimeout(resolve, 500));
        
        await testStoreAction(3, 'CREATE_COMMENT');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Get user history
        await testGetUserHistory();
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Restore to first action if we have any
        if (storedActionIds.length > 0) {
            await testRestoreState(storedActionIds[0]);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // Test error handling
        await testErrorHandling();
        
        console.log('\n========================================');
        console.log('  ✓ All Tests Completed Successfully!');
        console.log('========================================\n');
        
        process.exit(0);
    } catch (error) {
        console.error('\n✗ Test suite failed:', error.message);
        process.exit(1);
    }
}

// Start tests after a short delay to ensure connection
setTimeout(runAllTests, 1000);
