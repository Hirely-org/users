const router = require('express').Router();
const RabbitMQService = require('../rabbitMQService');
const db = require('../models');
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');
const MessageTypes = require('../constants/messageTypes');

router.get('/', async (req, res) => {
  try{  
    const users = await db.Users.findAll();
    return res.json(users);
  } catch(error){
    console.error('Error getting user:', error);
    return res.status(500).send('Error getting user');
  }
});

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
    const authHeader = req.headers['authorization'];
    const token = authHeader?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = await new Promise((resolve, reject) =>
      jwt.verify(token, getKey, { algorithms: ['RS256'] }, (err, decoded) => {
        if (err) return reject(err);
        resolve(decoded);
      })
    );

    if (!decoded?.sub) {
      return res.status(403).json({ message: 'Invalid token: Missing sub' });
    }

    // Find user with role association to avoid extra query
    let user = await db.Users.findOne({ 
      where: { sub: decoded.sub },
      include: [{
        model: db.Roles,
        as: 'role'  // Make sure this matches your association alias
      }]
    });

    if (!user) {
      // Create user with roleId: 2 for new users
      user = await db.Users.create({
        name: decoded.given_name,
        lastName: decoded.family_name,
        email: decoded.email,
        sub: decoded.sub,
        roleId: 2, // Make sure this matches your column name
        picture: decoded.picture,
        createdAt: new Date()
      });
      
      // After creation, fetch the user with role information
      user = await db.Users.findOne({
        where: { sub: decoded.sub },
        include: [{
          model: db.Roles,
          as: 'role'
        }]
      });
    }

    // Set headers
    res.setHeader('X-Forwarded-User', decoded.sub);
    res.setHeader('Access-Control-Expose-Headers', 'X-Forwarded-Role, X-Forwarded-User');
    
    // Set role header - now we can always use the role association
    const roleName = user.role?.name || 'user'; // Default to 'user' if role not found
    res.setHeader('X-Forwarded-Role', roleName);

    return res.status(200).json({ 
      message: 'Authentication successful',
      user: {
        id: user.id,
        email: user.email,
        role: roleName
      }
    });

  } catch (error) {
    console.error('Authentication error:', error);
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
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

router.get('/me', async (req, res) => {
  try {
    const userSub = req.headers['x-forwarded-user'];
    console.log('Attempting to find user with sub:', userSub);
    console.log('Type of sub:', typeof userSub);
    console.log('Length of sub:', userSub?.length);
    console.log('Raw headers:', req.headers);

    if (!userSub) {
      return res.status(401).json({ message: 'No user sub provided in header' });
    }

    // Let's try to find with exact string comparison
    const user = await db.Users.findOne({
      where: { 
        sub: {
          [db.Sequelize.Op.eq]: userSub
        }
      },
      attributes: ['id', 'name', 'lastName', 'email', 'picture', 'createdAt'],
      include: [
        {
          model: db.Roles,
          as: 'role',
          attributes: ['name']
        }
      ],
      logging: console.log // This will log the exact SQL query
    });

    console.log('Found user:', user);

    if (!user) {
      // Return more debug info
      return res.status(404).json({ 
        message: 'User not found', 
        debug: {
          providedSub: userSub,
          subLength: userSub?.length,
          subType: typeof userSub
        }
      });
    }

    return res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    return res.status(500).json({ message: 'Error fetching user' });
  }
});

router.delete('/', async (req, res) => {
  const userSub = req.headers['x-forwarded-user'];

  if (!userSub) {
      return res.status(401).json({ message: 'No user sub provided in header' });
  }

  try {
      const sagaId = `delete_${userSub}_${Date.now()}`;
      
      // Initiate the deletion saga
      await rabbitMQ.sendToQueue(rabbitMQ.queues.userDeletion, {
          type: MessageTypes.DELETE_USER_START,
          sagaId,
          userSub
      });

      // Return accepted response with saga ID
      return res.status(202).json({
          message: 'User deletion process started',
          sagaId
      });

  } catch (error) {
      console.error('Error initiating user deletion:', error);
      return res.status(500).json({
          message: 'Error starting user deletion process',
          error: error.message
      });
  }
});

module.exports = router;