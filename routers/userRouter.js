const router = require('express').Router();
const RabbitMQService = require('../rabbitMQService');
const db = require('../models');
const jwt = require('jsonwebtoken');

router.get('/', async (req, res) => {
    const users = "Hello World";
    return res.json(users);
});

// add a new route that get job by id
router.get('/:id', async (req, res) => {
    let user;
    try{
        user = await db.Users.findByPk(req.params.id);
    } catch(error){
        console.error('Error getting job:', error);
        return res.status(500).send('Error getting job');
    }
    console.log('Job:', user);
    return res.json(user);
});

app.post('/auth', (req, res) => {
    const token = req.headers['authorization'];
  
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }
  
    // Validate the token
    jwt.verify(token, 'your-secret-key', (err, decoded) => {
      if (err) {
        return res.status(403).json({ message: 'Invalid token' });
      }
  
      // If token is valid, forward user info in response headers
      res.setHeader('X-Forwarded-User', decoded.user);
      return res.status(200).json({ message: 'Token valid' });
    });
  });

module.exports = router;