const { getUserHistory } = require('../database');

async function handleGetUserHistory(call, callback) {
    const { userId, limit } = call.request;

    try {
        // Validate required fields
        if (!userId) {
            return callback(null, {
                actions: [],
                totalCount: 0
            });
        }

        // Get user history from database
        const historyLimit = limit && limit > 0 ? limit : 100;
        const actions = await getUserHistory(userId, historyLimit);

        // Format the response
        const formattedActions = actions.map(row => ({
            actionId: row.action_id,
            timestamp: row.timestamp,
            actionType: row.action_type,
            actionData: row.action_data
        }));

        // Return success response
        callback(null, {
            actions: formattedActions,
            totalCount: formattedActions.length
        });

    } catch (error) {
        console.error('Error in getUserHistory:', error);

        // Return empty response on error
        callback(null, {
            actions: [],
            totalCount: 0
        });
    }
}

module.exports = handleGetUserHistory;
