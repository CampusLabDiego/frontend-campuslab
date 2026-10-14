import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MsalService } from '@azure/msal-angular';

@Component({
  selector:'app-page-header',
  imports:[RouterLink],
  templateUrl:'./page-header.html',
  styleUrl:'./page-header.css',
  standalone:true
})
export class PageHeader {

constructor(
private router:Router,
private msalService:MsalService
){}


logout(){

this.msalService.instance.clearCache();

this.msalService.instance.setActiveAccount(null);

this.router.navigate(['/login']);

}

}