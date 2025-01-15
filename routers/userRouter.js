const router = require('express').Router();
const RabbitMQService = require('../rabbitMQService');
const db = require('../models');
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

router.get('/', async (req, res) => {
    const users = "Hello World";
    return res.json(users);
});

// // add a new route that get job by id
// router.get('/:id', async (req, res) => {
//     let user;
//     try{
//         user = await db.Users.findByPk(req.params.id);
//     } catch(error){
//         console.error('Error getting job:', error);
//         return res.status(500).send('Error getting job');
//     }
//     console.log('Job:', user);
//     return res.json(user);
// });

const client = jwksClient({
  jwksUri: 'https://hirely-dev.eu.auth0.com/.well-known/jwks.json', // Replace with your Auth0 domain
});

// Function to get the signing key
const getKey = (header, callback) => {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      return callback(err, null);
    }
    const signingKey = key.publicKey || key.rsaPublicKey;
    callback(null, signingKey);
  });
};

router.get('/auth', (req, res) => {
  const token = req.headers['authorization']?.split(' ')[1]; // Extract token

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }
  console.log(token);
  // Verify the token using RS256 and the JWKS public key
  jwt.verify(token, getKey, { algorithms: ['RS256'] }, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid token' });
    }

    // If token is valid, forward user info in response headers
    console.log(decoded);
    res.setHeader('X-Forwarded-User', decoded.sub);
    return res.status(200).json({});
  });
});

module.exports = router;