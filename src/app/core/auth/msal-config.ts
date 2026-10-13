import { BrowserCacheLocation, IPublicClientApplication, PublicClientApplication } from '@azure/msal-browser';

export const msalConfig = {
  auth: {
    clientId: '3bdd9813-1e51-4686-a89a-760ac0531de9',
    authority: 'https://login.microsoftonline.com/7d5727ec-99c0-4161-9e1a-194c51532c5b',
    redirectUri: 'http://localhost:4200'
  },
  cache: {
    cacheLocation: 'localStorage',
    storeAuthStateInCookie: false
  }
};

export const msalInstance: IPublicClientApplication =
  new PublicClientApplication(msalConfig);