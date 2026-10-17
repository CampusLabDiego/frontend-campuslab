import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MsalService } from '@azure/msal-angular';
import { lastValueFrom } from 'rxjs';

import { API_SCOPE } from '../../core/auth/msal-config';

@Component({
  selector: 'app-login',
  imports: [],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login implements OnInit {

  procesando = true;

  constructor(
    private msalService: MsalService,
    private router: Router
  ) {}

  async ngOnInit(): Promise<void> {
    try {
      const result = await lastValueFrom(
        this.msalService.handleRedirectObservable()
      );

      const instance = this.msalService.instance;

      // Prioriza la cuenta que acaba de iniciar sesión.
      let account =
        result?.account ?? instance.getActiveAccount();

      // Solo recupera una cuenta guardada si no hay ambigüedad.
      if (!account) {
        const accounts = instance.getAllAccounts();

        if (accounts.length === 1) {
          account = accounts[0];
        }
      }

      if (account) {
        instance.setActiveAccount(account);
        await this.router.navigateByUrl('/dashboard');
      }
    } catch (error) {
      console.error(
        'Error al procesar el inicio de sesión:',
        error
      );
    } finally {
      this.procesando = false;
    }
  }

  login(): void {
    if (this.procesando) {
      return;
    }

    this.procesando = true;

    this.msalService.loginRedirect({
      scopes: [API_SCOPE],
      prompt: 'select_account'
    }).subscribe({
      error: error => {
        this.procesando = false;
        console.error('Error al iniciar sesión:', error);
      }
    });
  }
}