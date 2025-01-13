const router = require('express').Router();
const RabbitMQService = require('../rabbitMQService');
const db = require('../models');

router.get('/', async (req, res) => {
    let users;
    try{
        users = await db.Users.findAll();
    } catch(error){
        console.error('Error getting users:', error);
        return res.status(500).send('Error getting users');
    }
    // console.log('users:', users);
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

module.exports = router;