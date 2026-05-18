const { storeAction } = require('../database');
const { publishMessage } = require('../rabbitmq');

async function handleStoreAction(call, callback) {
    const { userId, actionId, sessionId, timestamp, actionData } = call.request;

    try {
        // Validate required fields
        if (!userId || !actionId || !timestamp) {
            return callback(null, {
                status: 'error',
                message: 'Missing required fields: userId, actionId, or timestamp',
                actionId: actionId || ''
            });
        }

        // Validate actionData is valid JSON
        if (actionData) {
            try {
                JSON.parse(actionData);
            } catch (e) {
                return callback(null, {
                    status: 'error',
                    message: 'actionData must be valid JSON string',
                    actionId: actionId
                });
            }
        }

        // Store the action in database
        const result = await storeAction(
            userId,
            actionId,
            sessionId || '',
            timestamp,
            actionData || '{}'
        );

        // Publish success event to RabbitMQ
        await publishMessage('storage-events', {
            eventType: 'STORAGE_SUCCESS',
            userId: userId,
            actionId: actionId,
            timestamp: new Date().toISOString()
        });

        // Return success response
        callback(null, {
            status: 'success',
            message: 'Action stored successfully',
            actionId: result.actionId
        });

    } catch (error) {
        console.error('Error in storeAction:', error);

        // Publish failure event to RabbitMQ
        try {
            await publishMessage('storage-events', {
                eventType: 'STORAGE_FAILURE',
                userId: userId,
                actionId: actionId,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        } catch (pubError) {
            console.error('Failed to publish error event:', pubError);
        }

        // Return error response
        callback(null, {
            status: 'error',
            message: error.message || 'Failed to store action',
            actionId: actionId || ''
        });
    }
}

module.exports = handleStoreAction;
