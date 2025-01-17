const router = require('express').Router();
const RabbitMQService = require('../rabbitMQService');
const db = require('../models');
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

router.get('/', async (req, res) => {
    const users = "Hello World";
    console.log(req.headers);
    return res.json(users);
});

// router.get('/:id', async (req, res) => {
//     let user;
//     try{
//         user = await db.Users.findByPk(req.params.id);
//     } catch(error){
//         console.error('Error getting user:', error);
//         return res.status(500).send('Error getting user');
//     }
//     console.log('User:', user);
//     return res.json(user);
// });

const client = jwksClient({
  jwksUri: 'https://hirely-dev.eu.auth0.com/.well-known/jwks.json',
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

router.get('/auth', async (req, res) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers['authorization'];
    const token = authHeader?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    console.log('Received Token:', token);

    // Verify the token using RS256 and JWKS public key
    const decoded = await new Promise((resolve, reject) =>
      jwt.verify(token, getKey, { algorithms: ['RS256'] }, (err, decoded) => {
        if (err) return reject(err);
        resolve(decoded);
      })
    );

    console.log('Decoded Token:', decoded);

    // Ensure token contains required fields
    if (!decoded?.sub) {
      return res.status(403).json({ message: 'Invalid token: Missing sub' });
    }

    // Check if the user already exists in the database
    let user = await db.Users.findOne({ where: { sub: decoded.sub } });
    let userRole;
    if (!user) {
      // Create user if not found
      user = await db.Users.create({
        name: decoded.given_name,
        lastName: decoded.family_name,
        email: decoded.email,
        sub: decoded.sub,
        role: 2,
        picture: decoded.picture,
        createdAt: new Date(),
      });
      console.log('User created:', user);
    } else {
      userRole = await db.Roles.findOne({ where: { id: user.role } });
      console.log('User Role:', userRole.dataValues.name);
      console.log('User already exists:', user.sub);
    }

    // Set response headers and return success
    res.setHeader('X-Forwarded-User', decoded.sub);
    if(!user){
      res.setHeader('X-Forwarded-Role', user.role);
    }else {
      res.setHeader('X-Forwarded-Role', userRole.dataValues.name);
    }
    return res.status(200).json({ message: 'Authentication successful' });

  } catch (error) {
    console.error('Authentication error:', error);

    // Handle token errors and database errors separately
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }

    return res.status(500).json({ message: 'Internal server error' });
  }
});

router.delete('/:id', async (req, res) => {
    let user;
    try{
        user = await db.Users.findByPk(req.params.id);
        if(!user){
            return res.status(404).send('User not found');
        }
        await user.destroy();
    } catch(error){Users
        console.error('Error deleting user:', error);
        return res.status(500).send('Error deleting user');
    }
    console.log('Deleted user:', user.name);
    return res.send('User deleted');
});

router.get('/user/data', async (req, res) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  jwt.verify(token, getKey, { algorithms: ['RS256'] }, async (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid token' });
    }

    try {
      const userData = await db.Users.findOne({ where: { sub: decoded.sub } });
      if (!userData) {
        return res.status(404).json({ message: 'User not found' });
      }


      return res.status(200).json({ userData });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Error retrieving user data' });
    }
  });
});

router.delete('/user/delete', async (req, res) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  jwt.verify(token, getKey, { algorithms: ['RS256'] }, async (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid token' });
    }

    try {
      await db.Users.destroy({ where: { sub: decoded.sub } });
      await deleteUserFromAuth0(decoded.sub);
      return res.status(200).json({ message: 'User data deleted successfully' });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Error deleting user data' });
    }
  });
});



module.exports = router;