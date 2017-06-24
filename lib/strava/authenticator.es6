import HTTP from 'http';
import QueryString from 'querystring';
import opn from 'opn';
import request from 'request';
import { URL } from 'url';

function handleAuthorizeRedirectRequest({ handleAuthorizeCode, request, response }) {
  const url = new URL(request.url, 'http://localhost');
  if (url.pathname !== '/code') {
    console.info(`Ignoring request to ${request.url}`);
    return;
  }

  const query = QueryString.parse(request.url);
  handleAuthorizeCode(query.code);
  response.end('OK.  Done now.  You can close this browser.');
}

function makeTokenExchangeRequest({ clientId, clientSecret, code, handleAccessToken }) {
  const url = 'https://www.strava.com/oauth/token';
  const form = {
    client_id: clientId,
    client_secret: clientSecret,
    code: code
  };

  const handleTokenExchangeResponse = (error, response, bodyJson) => {
    const body = JSON.parse(bodyJson);
    handleAccessToken(body.access_token);
  };

  request.post({ url, form }, handleTokenExchangeResponse);
}

function startWebserver(handleAuthorizeCode, port) {
  const culledHandleRequest = (request, response) =>
        handleAuthorizeRedirectRequest({ handleAuthorizeCode, request, response });
  const server = HTTP.createServer(culledHandleRequest);
  server.listen(port, (err) => {
    if (err) {
      throw Error(err);
    }
  })
}

export function doStravaAuthorization({ handleAccessToken, clientId, clientSecret, port }) {
  const handleAuthorizeCode = (code) =>
        makeTokenExchangeRequest({ clientId, clientSecret, code, handleAccessToken });
  startWebserver(handleAuthorizeCode, port)

  const redirectUrl = `http://localhost:${port}/code`;

  const authUrl = new URL('https://www.strava.com/oauth/authorize');
  authUrl.searchParams.append('client_id', clientId);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('redirect_uri', redirectUrl);
  authUrl.searchParams.append('scope', 'write');
  authUrl.searchParams.append('approval_prompt', 'auto');
  // There is also an optional 'state' param.

  opn(authUrl.href);
}