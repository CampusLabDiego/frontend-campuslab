import { Routes } from '@angular/router';

import { Login } from './pages/login/login';
import { Dashboard } from './pages/dashboard/dashboard';

import { Bookings } from './pages/bookings/bookings';
import { Catalog } from './pages/catalog/catalog';
import { Reports } from './pages/reports/reports';
import { Audit } from './pages/audit/audit';


export const routes:Routes=[

{
path:'login',
component:Login
},

{
path:'dashboard',
component:Dashboard
},

{
path:'bookings',
component:Bookings
},

{
path:'catalog',
component:Catalog
},

{
path:'reports',
component:Reports
},

{
path:'audit',
component:Audit
},

{
path:'',
redirectTo:'login',
pathMatch:'full'
}

];