require('dotenv').config();
const express = require('express');
const request = require('request');
const querystring = require('querystring');
const app = express();

const client_id = process.env.CLIENT_ID;
const client_secret = process.env.CLIENT_SECRET;
const redirect_uri = process.env.REDIRECT_URI;

const generateRandomString = function (length) {
  let text = '';
  const possible =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

const stateKey = 'spotify_auth_state';

app.use(express.static(__dirname + '/public'));

app.get('/login', (req, res) => {
  const state = generateRandomString(16);
  res.cookie(stateKey, state);

  const scope = 'user-read-currently-playing';
  const auth_query_parameters = querystring.stringify({
    response_type: 'code',
    client_id: client_id,
    scope: scope,
    redirect_uri: redirect_uri,
    state: state,
  });

  res.redirect(
    'https://accounts.spotify.com/authorize?' + auth_query_parameters
  );
});

app.get('/callback', (req, res) => {
    const code = req.query.code || null;
  
    const authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      form: {
        code: code,
        redirect_uri: redirect_uri,
        grant_type: 'authorization_code',
      },
      headers: {
        Authorization:
          'Basic ' +
          Buffer.from(client_id + ':' + client_secret).toString('base64'),
      },
      json: true,
    };
  
    request.post(authOptions, function (error, response, body) {
      const access_token = body.access_token;
      const refresh_token = body.refresh_token;
  
      // Pass the tokens to the browser
      res.redirect(
        '/#' +
          querystring.stringify({
            access_token: access_token,
            refresh_token: refresh_token,
          })
      );
    });
  });
app.get('/refresh_token', function (req, res) {
  const refresh_token = req.query.refresh_token;
  const authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    headers: {
      Authorization:
        'Basic ' +
        Buffer.from(client_id + ':' + client_secret).toString('base64'),
    },
    form: {
      grant_type: 'refresh_token',
      refresh_token: refresh_token,
    },
    json: true,
  };

  request.post(authOptions, function (error, response, body) {
    const access_token = body.access_token;
    res.send({ access_token: access_token });
  });
});

app.listen(8888, () => {
  console.log('Server is running on http://localhost:8888');
});
