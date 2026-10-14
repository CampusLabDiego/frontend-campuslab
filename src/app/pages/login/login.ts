import { Component,OnInit } from '@angular/core';
import { MsalService } from '@azure/msal-angular';
import { Router } from '@angular/router';

@Component({
selector:'app-login',
imports:[],
templateUrl:'./login.html',
styleUrl:'./login.css'
})
export class Login implements OnInit{


constructor(
private msalService:MsalService,
private router:Router
){}


ngOnInit(){

this.msalService.handleRedirectObservable()
.subscribe({

next:(result)=>{

if(result?.account){

this.msalService.instance
.setActiveAccount(result.account);


this.router.navigate(['/dashboard']);

}

},

error:(err)=>console.error(err)

});


}


login(){

this.msalService.loginRedirect({

scopes:['User.Read'],

prompt:'select_account'

});

}


}