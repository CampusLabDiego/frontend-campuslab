import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';

import {
  MsalService,
  MsalGuard,
  MsalBroadcastService,
  MSAL_INSTANCE
} from '@azure/msal-angular';

import {
  IPublicClientApplication,
  PublicClientApplication
} from '@azure/msal-browser';

import { msalConfig } from './core/auth/msal-config';


export function MSALInstanceFactory(): IPublicClientApplication {

  const instance =
    new PublicClientApplication(msalConfig);

  instance.initialize();

  return instance;

}


export const appConfig: ApplicationConfig = {

  providers: [

    provideRouter(routes),

    {
      provide: MSAL_INSTANCE,
      useFactory: MSALInstanceFactory
    },

    MsalService,
    MsalGuard,
    MsalBroadcastService

  ]

};