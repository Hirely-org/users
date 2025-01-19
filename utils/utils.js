// utils/auth0Utils.js
const axios = require('axios');

const getManagementApiToken = async () => {
  try {
    const response = await axios.post(
      'https://hirely-dev.eu.auth0.com/oauth/token',
      {
        client_id: process.env.AUTH0_CLIENT_ID,
        client_secret: process.env.AUTH0_CLIENT_SECRET,
        audience: 'https://hirely-dev.eu.auth0.com/api/v2/',
        grant_type: 'client_credentials'
      }
    );

    return response.data.access_token;
  } catch (error) {
    console.error('Error getting management API token:', error.response?.data || error.message);
    throw error;
  }
};

const deleteUserFromAuth0 = async (userId) => {
  try {
    const token = await getManagementApiToken();
    await axios.delete(`https://hirely-dev.eu.auth0.com/api/v2/users/${userId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    console.log('User successfully deleted from Auth0');
    return true;
  } catch (error) {
    console.error('Error deleting user from Auth0:', error.response?.data || error.message);
    throw error;
  }
};

module.exports = {
  getManagementApiToken,
  deleteUserFromAuth0
};