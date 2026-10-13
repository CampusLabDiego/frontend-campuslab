import { Component, OnInit } from '@angular/core';
import { MsalService } from '@azure/msal-angular';


@Component({
  selector: 'app-login',
  imports: [],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login implements OnInit {


  usuario:any;


  constructor(
    private msalService: MsalService
  ){}


  ngOnInit(){


    this.msalService.handleRedirectObservable()
      .subscribe({

        next: (result)=>{

          if(result){

            this.msalService.instance
            .setActiveAccount(result.account);

          }


          const account =
          this.msalService.instance
          .getActiveAccount();


          this.usuario = account;


          console.log(
            "Usuario autenticado:",
            this.usuario
          );

        },

        error:(err)=>{
          console.error(err);
        }

      });


  }


  login(){

    this.msalService.loginRedirect();

  }


  logout(){

    this.msalService.logoutRedirect();

  }


}