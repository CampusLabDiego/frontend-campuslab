import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PageHeader } from '../../shared/page-header/page-header';

@Component({
  selector:'app-bookings',
  imports:[PageHeader],
  templateUrl:'./bookings.html',
  styleUrl:'./bookings.css'
})
export class Bookings {}