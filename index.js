// index.js
const express = require('express');
const cors = require('cors');
const db = require('./models');
const userDeletionService = require('./userDeletionService');
const rabbitMQService = require('./rabbitMQService');

const app = express();
const port = 5002;

const userRouter = require('./routers/userRouter');

app.use(cors());
app.use(express.json());
app.use("/users", userRouter);

(async () => {
    try {
        // Initialize RabbitMQ and services
        await rabbitMQService.connect();
        await userDeletionService.initialize();
        
        // Sync the database and start the Express server
        await db.sequelize.sync();
        
        app.listen(port, () => {
            console.log(`Example app listening on port ${port}`);
        });
    } catch (error) {
        console.error("Error during setup:", error);
        process.exit(1);
    }
})();