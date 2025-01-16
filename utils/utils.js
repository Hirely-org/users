const axios = require('axios');
const getUserDataFromAuth0 = async (userId) => {
  const token = await getManagementApiToken(); // Obtain a token for Auth0 Management API
  const response = await axios.get(`https://hirely-dev.eu.auth0.com/api/v2/users/${userId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  console.log('User Data:', response.data);
  return response.data;
};
