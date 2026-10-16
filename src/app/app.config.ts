import {
  ApplicationConfig,
  inject,
  provideAppInitializer
} from '@angular/core';

import { provideRouter } from '@angular/router';

import {
  HTTP_INTERCEPTORS,
  provideHttpClient,
  withInterceptorsFromDi
} from '@angular/common/http';

import {
  MSAL_INSTANCE,
  MSAL_GUARD_CONFIG,
  MSAL_INTERCEPTOR_CONFIG,
  MsalService,
  MsalGuard,
  MsalInterceptor,
  MsalBroadcastService,
  MsalGuardConfiguration,
  MsalInterceptorConfiguration
} from '@azure/msal-angular';

import {
  InteractionType,
  PublicClientApplication
} from '@azure/msal-browser';

import { routes } from './app.routes';

import {
  msalConfig,
  API_BASE_URL,
  API_SCOPE
} from './core/auth/msal-config';

export function msalInstanceFactory() {
  return new PublicClientApplication(msalConfig);
}

export function msalGuardConfigFactory(): MsalGuardConfiguration {
  return {
    interactionType: InteractionType.Redirect,
    authRequest: {
      scopes: [API_SCOPE]
    },
    loginFailedRoute: '/login'
  };
}

export function msalInterceptorConfigFactory():
  MsalInterceptorConfiguration {
  return {
    interactionType: InteractionType.Redirect,
    protectedResourceMap: new Map([
      [`${API_BASE_URL}/api/*`, [API_SCOPE]]
    ])
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),

    provideHttpClient(withInterceptorsFromDi()),

    {
      provide: MSAL_INSTANCE,
      useFactory: msalInstanceFactory
    },
    {
      provide: MSAL_GUARD_CONFIG,
      useFactory: msalGuardConfigFactory
    },
    {
      provide: MSAL_INTERCEPTOR_CONFIG,
      useFactory: msalInterceptorConfigFactory
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: MsalInterceptor,
      multi: true
    },

    MsalService,
    MsalGuard,
    MsalBroadcastService,

    provideAppInitializer(() => {
      const instance = inject(MSAL_INSTANCE);
      return instance.initialize();
    })
  ]
};