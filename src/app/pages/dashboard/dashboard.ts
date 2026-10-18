import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MsalService } from '@azure/msal-angular';
import { AccountInfo } from '@azure/msal-browser';

import {
  obtenerRoles,
  tieneAlgunRol,
  ROLES_POR_MODULO
} from '../../core/auth/role.guard';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard implements OnInit {

  usuario: AccountInfo | null = null;
  rol = '';

  constructor(
    private msalService: MsalService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.usuario =
      this.msalService.instance.getActiveAccount();

    if (!this.usuario) {
      void this.router.navigateByUrl('/login');
      return;
    }

    const roles = obtenerRoles(this.usuario);

    this.rol = roles.length > 0
      ? roles.join(', ')
      : 'Sin rol';
  }

  get puedeVerReservas(): boolean {
    return tieneAlgunRol(
      this.usuario,
      ROLES_POR_MODULO.bookings
    );
  }

  get puedeVerCatalogo(): boolean {
    return tieneAlgunRol(
      this.usuario,
      ROLES_POR_MODULO.catalog
    );
  }

  get puedeVerReporteria(): boolean {
    return tieneAlgunRol(
      this.usuario,
      ROLES_POR_MODULO.reports
    );
  }

  get puedeVerAuditoria(): boolean {
    return tieneAlgunRol(
      this.usuario,
      ROLES_POR_MODULO.audit
    );
  }

  logout(): void {
    this.msalService.logoutRedirect().subscribe({
      error: error => {
        console.error('Error al cerrar sesión:', error);
      }
    });
  }
}