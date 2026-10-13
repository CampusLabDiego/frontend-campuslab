import { Injectable } from '@angular/core';
import { MsalService } from '@azure/msal-angular';

@Injectable({
  providedIn: 'root'
})
export class Auth {

  constructor(
    private msalService: MsalService
  ) {}

  login() {
    this.msalService.loginRedirect();
  }

  logout() {
    this.msalService.logoutRedirect();
  }

  getAccount() {
    return this.msalService.instance.getAllAccounts()[0];
  }

  handleRedirect() {
    return this.msalService.handleRedirectObservable();
  }

}