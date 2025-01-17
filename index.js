const express = require('express');
const cors = require('cors');
const db = require('./models');

const app = express();
const port = 5002;

const userRouter = require('./routers/userRouter');

const corsOptions = {
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400 // CORS preflight cache time
  };
  
app.use(cors(corsOptions));
app.use(express.json());
app.use("/users", userRouter);

(async () => {
    try {
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
