import { Component,OnInit } from '@angular/core';
import { MsalService } from '@azure/msal-angular';
import { Router,RouterLink } from '@angular/router';

@Component({
selector:'app-dashboard',
imports:[RouterLink],
templateUrl:'./dashboard.html',
styleUrl:'./dashboard.css'
})
export class Dashboard implements OnInit{

usuario:any;
rol:string='';

constructor(
private msalService:MsalService,
private router:Router
){}


ngOnInit(){

const accounts =
this.msalService.instance.getAllAccounts();


if(accounts.length>0){

this.usuario=accounts[0];

this.msalService.instance
.setActiveAccount(this.usuario);


this.rol =
this.usuario.idTokenClaims?.['roles']?.[0]
|| 'Sin rol';

}


console.log(
'Usuario dashboard:',
this.usuario
);

console.log(
'Rol:',
this.rol
);

}


logout(){

this.msalService.instance.clearCache();

this.msalService.instance
.setActiveAccount(null);

this.router.navigate(['/login']);

}

}