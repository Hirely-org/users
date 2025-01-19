// services/userDeletionService.js
const db = require('./models');
const rabbitMQ = require('./rabbitMQService');
const MessageTypes = require('./constants/messageTypes');

class UserDeletionService {
    constructor() {
        this.deletedUsers = new Map(); // Store deleted user data for potential rollback
    }

    async initialize() {
        await rabbitMQ.connect();
        
        console.log('Initializing user deletion service...'); // Add this log
        
        // Listen for deletion commands
        await rabbitMQ.consumeQueue(rabbitMQ.queues.userDeletion, async (message) => {
            console.log('Received delete user message:', message); // Add this log
            if (message.type === MessageTypes.DELETE_USER_START) {
                await this.handleDeleteUser(message);
            }
        });

        // Listen for rollback commands
        await rabbitMQ.consumeQueue(rabbitMQ.queues.rollback, async (message) => {
            console.log('Received rollback message:', message); // Add this log
            if (message.type === MessageTypes.ROLLBACK_DELETE_USER) {
                await this.handleRollback(message);
            }
        });
    }

    async handleDeleteUser(message) {
        const { userSub, sagaId } = message;
        
        try {
            // 1. Find the user
            const user = await db.Users.findByPk(userSub);
            if (!user) {
                throw new Error('User not found');
            }

            // 2. Store user data for potential rollback
            this.deletedUsers.set(sagaId, user.toJSON());

            // 3. Delete the user
            await user.destroy();

            // 4. Send success response
            await rabbitMQ.sendToQueue(rabbitMQ.queues.userDeletionResponse, {
                type: MessageTypes.DELETE_USER_SUCCESS,
                sagaId,
                userSub
            });

        } catch (error) {
            // Send failure response
            await rabbitMQ.sendToQueue(rabbitMQ.queues.userDeletionResponse, {
                type: MessageTypes.DELETE_USER_FAILED,
                sagaId,
                userSub,
                error: error.message
            });
        }
    }

    async handleRollback(message) {
        const { sagaId } = message;
        const userData = this.deletedUsers.get(sagaId);
        
        if (userData) {
            try {
                await db.Users.create(userData);
                this.deletedUsers.delete(sagaId);
                console.log(`Successfully rolled back user deletion for saga ${sagaId}`);
            } catch (error) {
                console.error(`Rollback failed for saga ${sagaId}:`, error);
            }
        }
    }
}

module.exports = new UserDeletionService();