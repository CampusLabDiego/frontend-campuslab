import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { MsalService } from '@azure/msal-angular';
import { AccountInfo } from '@azure/msal-browser';

export const ROLES_POR_MODULO = {
  bookings: ['Admin', 'Operador', 'Cliente'],
  catalog: ['Admin', 'Operador', 'Cliente'],
  reports: ['Admin'],
  audit: ['Admin', 'Auditor']
} as const;

export function obtenerRoles(
  cuenta: AccountInfo | null
): string[] {
  const roles = cuenta?.idTokenClaims?.['roles'];

  if (!Array.isArray(roles)) {
    return [];
  }

  return roles.filter(
    (rol): rol is string => typeof rol === 'string'
  );
}

export function tieneAlgunRol(
  cuenta: AccountInfo | null,
  permitidos: readonly string[]
): boolean {
  const roles = obtenerRoles(cuenta);

  return permitidos.some(rol => roles.includes(rol));
}

export const roleGuard: CanActivateFn = route => {
  const msal = inject(MsalService);
  const router = inject(Router);

  const cuenta = msal.instance.getActiveAccount();

  if (!cuenta) {
    return router.createUrlTree(['/login']);
  }

  const permitidos: readonly string[] =
    route.data['roles'] ?? [];

  return tieneAlgunRol(cuenta, permitidos)
    ? true
    : router.createUrlTree(['/dashboard']);
};