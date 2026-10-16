import {
  Component,
  OnInit,
  computed,
  inject,
  signal
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

import { PageHeader } from '../../shared/page-header/page-header';
import { API_BASE_URL } from '../../core/auth/msal-config';

interface Reserva {
  id: number;
  userEmail: string;
  resourceName: string;
  startDateTime: string;
  endDateTime: string;
  purpose: string;
  quantity: number;
  status: string;
}

@Component({
  selector: 'app-bookings',
  imports: [PageHeader, CommonModule, FormsModule],
  templateUrl: './bookings.html',
  styleUrl: './bookings.css'
})
export class Bookings implements OnInit {

  private readonly http = inject(HttpClient);

  reservas = signal<Reserva[]>([]);
  cargando = signal(false);
  error = signal('');
  busqueda = signal('');

  reservasFiltradas = computed(() => {
    const texto = this.busqueda().trim().toLowerCase();

    return this.reservas().filter(reserva =>
      [
        reserva.id.toString(),
        reserva.resourceName,
        reserva.userEmail,
        reserva.status
      ].some(valor => valor?.toLowerCase().includes(texto))
    );
  });

  ngOnInit(): void {
    this.cargarReservas();
  }

  cargarReservas(): void {
    this.cargando.set(true);
    this.error.set('');

    this.http.get<Reserva[]>(
      `${API_BASE_URL}/api/bookings`
    ).subscribe({
      next: (data) => {
        this.reservas.set(data);
        this.cargando.set(false);
      },
      error: (error) => {
        console.error('Error al cargar reservas:', error);

        this.error.set(
          'No se pudieron cargar las reservas. Intenta nuevamente.'
        );

        this.cargando.set(false);
      }
    });
  }

  mostrarEstado(estado: string): string {
    return estado.replaceAll('_', ' ');
  }
}