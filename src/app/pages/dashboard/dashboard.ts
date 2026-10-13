import { Component, OnInit } from '@angular/core';
import { MsalService } from '@azure/msal-angular';
import { Router } from '@angular/router';
@Component({
  selector: 'app-dashboard',
  imports: [],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard implements OnInit {

  usuario: any;

  constructor(
    private msalService: MsalService,
    private router: Router
  ) {}

  ngOnInit() {

    const accounts = this.msalService.instance.getAllAccounts();

    if (accounts.length > 0) {

      this.usuario = accounts[0];

      this.msalService.instance.setActiveAccount(this.usuario);

    } else {

      window.location.href = '/login';

    }

    console.log(
      'Usuario dashboard:',
      this.usuario
    );

  }

logout() {

  this.msalService.instance.clearCache();

  this.msalService.instance.setActiveAccount(null);

  this.router.navigate(['/login']);

}

}