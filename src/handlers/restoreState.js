const { getActionById, storeAction } = require('../database');
const { publishMessage } = require('../rabbitmq');

async function handleRestoreState(call, callback) {
    const { userId, actionId } = call.request;

    try {
        // Validate required fields
        if (!userId || !actionId) {
            return callback(null, {
                status: 'error',
                message: 'Missing required fields: userId or actionId',
                restoredActionId: ''
            });
        }

        // Get the action to restore
        const action = await getActionById(userId, actionId);

        if (!action) {
            return callback(null, {
                status: 'error',
                message: `Action with ID ${actionId} not found for user ${userId}`,
                restoredActionId: ''
            });
        }

        // Create a new action representing the restore operation
        const restoreActionId = `restore_${actionId}_${Date.now()}`;
        const restoreActionData = JSON.stringify({
            action: 'RESTORE_STATE',
            restoredFromActionId: actionId,
            restoredData: JSON.parse(action.action_data)
        });

        await storeAction(
            userId,
            restoreActionId,
            '', // No session ID for restore operations
            new Date().toISOString(),
            restoreActionData
        );

        // Publish restore event to RabbitMQ
        await publishMessage('storage-events', {
            eventType: 'STATE_RESTORED',
            userId: userId,
            actionId: restoreActionId,
            restoredFromActionId: actionId,
            timestamp: new Date().toISOString()
        });

        // Return success response
        callback(null, {
            status: 'success',
            message: `Successfully restored state from action ${actionId}`,
            restoredActionId: restoreActionId
        });

    } catch (error) {
        console.error('Error in restoreState:', error);

        // Publish failure event
        try {
            await publishMessage('storage-events', {
                eventType: 'RESTORE_FAILURE',
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
            message: error.message || 'Failed to restore state',
            restoredActionId: ''
        });
    }
}

module.exports = handleRestoreState;
