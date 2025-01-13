const amqplib = require('amqplib');
const rabbitMQURI = require('./config');

class RabbitMQService {
    constructor() {
        this.connection = null;
        this.channel = null;
        this.queue = "q_a";
    }

    async connect() {
        console.log(rabbitMQURI);
        if (!this.connection) {
            this.connection = await amqplib.connect(rabbitMQURI);
            this.channel = await this.connection.createChannel();
            await this.channel.assertQueue(this.queue, { durable: false });
            console.log(` [*] Connected to RabbitMQ, queue: ${this.queue}`);
        }
        return this;
    }

    async consumeQueue(queue, callback) {
        await this.channel.assertQueue(queue, { durable: false });
        this.channel.consume(queue, callback, { noAck: true });
        console.log(` [*] Waiting for messages in ${queue}`);
    }

    async sendToQueue(queue, message) {
        await this.channel.assertQueue(queue, { durable: false });
        this.channel.sendToQueue(queue, Buffer.from(message));
        console.log(` [x] Sent "${message}" to queue ${queue}`);
    }
}

// Export a singleton instance
module.exports = new RabbitMQService();
