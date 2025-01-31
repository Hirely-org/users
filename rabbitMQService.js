const amqplib = require('amqplib');
const rabbitMQURI = require('./config');

class RabbitMQService {
    constructor() {
        this.connection = null;
        this.channel = null;
        // Define our SAGA queues
        this.queues = {
            userDeletion: 'user_deletion_queue',
            userDeletionResponse: 'user_deletion_response_queue',
            jobApplicationResponse: 'job_application_response_queue'
        };
    }

    async connect() {
        if (!this.connection) {
            this.connection = await amqplib.connect(rabbitMQURI);
            this.channel = await this.connection.createChannel();
            
            // Setup all required queues
            for (const queueName of Object.values(this.queues)) {
                await this.channel.assertQueue(queueName, { durable: true });
            }
            
            console.log('[*] Connected to RabbitMQ and setup queues');
        }
        return this;
    }

    async consumeQueue(queue, callback) {
        await this.channel.assertQueue(queue, { durable: true });
        this.channel.consume(queue, async (msg) => {
            if (msg) {
                try {
                    const message = JSON.parse(msg.content.toString());
                    console.log(`Received message in ${queue}:`, message);  // Add this log
                    await callback(message);
                    this.channel.ack(msg);
                } catch (error) {
                    console.error('Error processing message:', error);
                    this.channel.nack(msg);
                }
            }
        });
        console.log(`[*] Waiting for messages in ${queue}`);
    }

    async sendToQueue(queue, message) {
        await this.channel.assertQueue(queue, { durable: true });
        const success = this.channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), {
            persistent: true
        });
        console.log(`[x] Sent message to ${queue}:`, message);  // Add this log
        return success;
    }
}

module.exports = new RabbitMQService();