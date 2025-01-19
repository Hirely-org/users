// services/userDeletionService.js
const db = require('./models');
const rabbitMQ = require('./rabbitMQService');
const MessageTypes = require('./constants/messageTypes');
const { deleteUserFromAuth0 } = require('./utils/utils');

class UserDeletionService {
    constructor() {
        this.deletedUsers = new Map(); // Store deleted user data for potential rollback
        this.auth0DeletedUsers = new Map(); // Store deleted user data for potential rollback
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
        await rabbitMQ.consumeQueue(rabbitMQ.queues.jobApplicationResponse, async (message) => {
            if (message.type === MessageTypes.JOB_APPLICATIONS_DELETION_FAILED) {
                await this.handleRollback(message.sagaId);
            }
        });
        
    }

    async handleDeleteUser(message) {
        const { userSub, sagaId } = message;
        
        try {
            try {
                await deleteUserFromAuth0(userSub);
                this.auth0DeletedUsers.set(sagaId, true); // Mark that we deleted from Auth0
            } catch (error) {
                console.error('Failed to delete user from Auth0:', error);
                throw new Error('Auth0 deletion failed');
            }
            // 1. Find the user
            const user = await db.Users.findOne({
                where: { sub: userSub }
            });
            
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

    async handleRollback(sagaId) {
        const userData = this.deletedUsers.get(sagaId);
        if (userData) {
            try {
                // Restore the user data
                await db.Users.create(userData);
                console.log(`Successfully restored user data for saga ${sagaId}`);
                this.deletedUsers.delete(sagaId);
            } catch (error) {
                console.error(`Failed to rollback user deletion: ${error}`);
            }
        }
    }
}

module.exports = new UserDeletionService();