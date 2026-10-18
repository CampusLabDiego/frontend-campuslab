import { Routes } from '@angular/router';
import { MsalGuard } from '@azure/msal-angular';

import {
  roleGuard,
  ROLES_POR_MODULO
} from './core/auth/role.guard';

import { Login } from './pages/login/login';
import { Dashboard } from './pages/dashboard/dashboard';
import { Bookings } from './pages/bookings/bookings';
import { Catalog } from './pages/catalog/catalog';
import { Reports } from './pages/reports/reports';
import { Audit } from './pages/audit/audit';

export const routes: Routes = [
  {
    path: 'login',
    component: Login
  },
  {
    path: 'dashboard',
    component: Dashboard,
    canActivate: [MsalGuard]
  },
  {
    path: 'bookings',
    component: Bookings,
    canActivate: [MsalGuard, roleGuard],
    data: {
      roles: ROLES_POR_MODULO.bookings
    }
  },
  {
    path: 'catalog',
    component: Catalog,
    canActivate: [MsalGuard, roleGuard],
    data: {
      roles: ROLES_POR_MODULO.catalog
    }
  },
  {
    path: 'reports',
    component: Reports,
    canActivate: [MsalGuard, roleGuard],
    data: {
      roles: ROLES_POR_MODULO.reports
    }
  },
  {
    path: 'audit',
    component: Audit,
    canActivate: [MsalGuard, roleGuard],
    data: {
      roles: ROLES_POR_MODULO.audit
    }
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: 'login'
  }
];