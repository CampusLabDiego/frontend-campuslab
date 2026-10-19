import {
  BrowserCacheLocation,
  Configuration
} from '@azure/msal-browser';

export const API_BASE_URL =
  'https://wktaaga6j4.execute-api.us-east-1.amazonaws.com';

export const API_SCOPE =
  'api://3bdd9813-1e51-4686-a89a-760ac0531de9/access_as_user';

const APP_ORIGIN =
  typeof window !== 'undefined'
    ? window.location.origin
    : 'http://localhost:4200';

export const msalConfig: Configuration = {
  auth: {
    clientId: '3bdd9813-1e51-4686-a89a-760ac0531de9',

    authority:
      'https://login.microsoftonline.com/7d5727ec-99c0-4161-9e1a-194c51532c5b',

    redirectUri: APP_ORIGIN,

    postLogoutRedirectUri: APP_ORIGIN
  },

  cache: {
    cacheLocation: BrowserCacheLocation.SessionStorage
  }
};