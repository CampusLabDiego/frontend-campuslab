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
import { MsalService } from '@azure/msal-angular';

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
  private readonly msal = inject(MsalService);

  reservas = signal<Reserva[]>([]);
  cargando = signal(false);
  actualizando = signal<number | null>(null);

  error = signal('');
  mensaje = signal('');
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

  get puedeGestionar(): boolean {
    const cuenta = this.msal.instance.getActiveAccount();
    const roles = cuenta?.idTokenClaims?.['roles'];

    return Array.isArray(roles) &&
      roles.some(rol => rol === 'Admin' || rol === 'Operador');
  }

  ngOnInit(): void {
    this.cargarReservas();
  }

  cargarReservas(): void {
    if (this.cargando() || this.actualizando() !== null) {
      return;
    }

    this.cargando.set(true);
    this.error.set('');
    this.mensaje.set('');

    this.http.get<Reserva[]>(
      `${API_BASE_URL}/api/bookings`
    ).subscribe({
      next: data => {
        this.reservas.set(data);
        this.cargando.set(false);
      },
      error: error => {
        console.error('Error al cargar reservas:', error);

        this.error.set(
          'No se pudieron cargar las reservas. Intenta nuevamente.'
        );

        this.cargando.set(false);
      }
    });
  }

  estadosDisponibles(estado: string): string[] {
    switch (estado) {
      case 'SOLICITADA':
        return ['APROBADA', 'CANCELADA'];

      case 'APROBADA':
        return ['EN_PREPARACION', 'CANCELADA'];

      case 'EN_PREPARACION':
        return ['EN_USO'];

      case 'EN_USO':
        return ['DEVUELTA'];

      default:
        return [];
    }
  }

  cambiarEstado(reserva: Reserva, estado: string): void {
    if (
      !this.puedeGestionar ||
      this.cargando() ||
      this.actualizando() !== null ||
      !this.estadosDisponibles(reserva.status).includes(estado)
    ) {
      return;
    }

    const confirmado = window.confirm(
      `¿Cambiar la reserva #${reserva.id} a ${this.mostrarEstado(estado)}?`
    );

    if (!confirmado) {
      return;
    }

    this.actualizando.set(reserva.id);
    this.error.set('');
    this.mensaje.set('');

    this.http.patch<Reserva>(
      `${API_BASE_URL}/api/bookings/${reserva.id}/status`,
      null,
      { params: { status: estado } }
    ).subscribe({
      next: actualizada => {
        this.reservas.update(reservas =>
          reservas.map(actual =>
            actual.id === actualizada.id ? actualizada : actual
          )
        );

        this.actualizando.set(null);

        this.mensaje.set(
          `Reserva #${actualizada.id} actualizada a ${this.mostrarEstado(actualizada.status)}.`
        );
      },
      error: error => {
        console.error('Error al cambiar estado:', error);
        this.actualizando.set(null);

        if (error.status === 403) {
          this.error.set(
            'Tu cuenta no tiene permiso para cambiar estados.'
          );
        } else if (error.status === 401) {
          this.error.set(
            'No se pudo autorizar la operación. Inicia sesión nuevamente.'
          );
        } else {
          this.error.set(
            'No se pudo cambiar el estado. Actualiza las reservas y revisa su estado antes de intentar nuevamente.'
          );
        }
      }
    });
  }

  mostrarEstado(estado: string): string {
    return estado.replaceAll('_', ' ');
  }

  nombreAccion(estado: string): string {
    switch (estado) {
      case 'APROBADA':
        return 'Aprobar';
      case 'CANCELADA':
        return 'Cancelar';
      case 'EN_PREPARACION':
        return 'Preparar';
      case 'EN_USO':
        return 'Registrar uso';
      case 'DEVUELTA':
        return 'Registrar devolución';
      default:
        return this.mostrarEstado(estado);
    }
  }
}