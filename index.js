const express = require('express');
const cors = require('cors');
const db = require('./models');

const app = express();
const port = 5002;

const userRouter = require('./routers/userRouter');

app.use(cors({
    origin: true, // Allow all origins
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: '*',
    credentials: true,
    preflightContinue: false
  }));
  
  // Explicitly handle OPTIONS
  app.options('*', cors());
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
