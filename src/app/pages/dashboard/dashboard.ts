import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MsalService } from '@azure/msal-angular';
import { AccountInfo } from '@azure/msal-browser';

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
    // Usa la cuenta seleccionada durante el login.
    // No la reemplaza por otra cuenta guardada.
    this.usuario =
      this.msalService.instance.getActiveAccount();

    if (!this.usuario) {
      void this.router.navigateByUrl('/login');
      return;
    }

    const roles = this.usuario.idTokenClaims?.['roles'];

    this.rol =
      Array.isArray(roles) && roles.length > 0
        ? roles.join(', ')
        : 'Sin rol';
  }

  logout(): void {
    this.msalService.logoutRedirect().subscribe({
      error: error => {
        console.error('Error al cerrar sesión:', error);
      }
    });
  }
}