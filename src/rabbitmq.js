const amqp = require('amqplib');

let channel = null;
let connection = null;

// Connect to RabbitMQ
async function connectRabbitMQ() {
    try {
        const rabbitURL = process.env.RABBITMQ_URL || 'amqp://localhost';
        connection = await amqp.connect(rabbitURL);
        channel = await connection.createChannel();
        
        // Declare queues
        await channel.assertQueue('storage-events', { durable: true });
        await channel.assertQueue('storage-requests', { durable: true });
        
        console.log('Connected to RabbitMQ');
        return channel;
    } catch (error) {
        console.error('Failed to connect to RabbitMQ:', error);
        throw error;
    }
}

// Publish a message to a queue
async function publishMessage(queueName, message) {
    try {
        if (!channel) {
            await connectRabbitMQ();
        }
        
        const messageBuffer = Buffer.from(JSON.stringify(message));
        channel.sendToQueue(queueName, messageBuffer, { persistent: true });
        
        console.log(`Published message to ${queueName}:`, message);
    } catch (error) {
        console.error('Error publishing message:', error);
        throw error;
    }
}

// Consume messages from a queue
async function consumeMessages(queueName, callback) {
    try {
        if (!channel) {
            await connectRabbitMQ();
        }
        
        channel.consume(queueName, async (msg) => {
            if (msg !== null) {
                const content = JSON.parse(msg.content.toString());
                await callback(content);
                channel.ack(msg);
            }
        });
        
        console.log(`Consuming messages from ${queueName}`);
    } catch (error) {
        console.error('Error consuming messages:', error);
        throw error;
    }
}

// Close connection
async function closeRabbitMQ() {
    try {
        if (channel) await channel.close();
        if (connection) await connection.close();
        console.log('RabbitMQ connection closed');
    } catch (error) {
        console.error('Error closing RabbitMQ:', error);
    }
}

module.exports = {
    connectRabbitMQ,
    publishMessage,
    consumeMessages,
    closeRabbitMQ
};
