import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MsalService } from '@azure/msal-angular';

@Component({
  selector: 'app-page-header',
  imports: [RouterLink],
  templateUrl: './page-header.html',
  styleUrl: './page-header.css',
  standalone: true
})
export class PageHeader {

  constructor(
    private msalService: MsalService
  ) {}

  logout(): void {
    this.msalService.logoutRedirect().subscribe({
      error: error => {
        console.error('Error al cerrar sesión:', error);
      }
    });
  }
}