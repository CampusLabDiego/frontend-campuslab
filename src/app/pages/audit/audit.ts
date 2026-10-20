import {
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';

import { PageHeader } from '../../shared/page-header/page-header';
import { API_BASE_URL } from '../../core/auth/msal-config';

interface EventoAuditoria {
  eventId: string;
  bookingId: number;
  eventType: string;
  previousStatus: string | null;
  status: string;
  targetStatus: string | null;
  actorId: string;
  actorEmail: string | null;
  ownerId: string;
  resourceName: string;
  operationId: string | null;
  occurredAt: string;
  receivedAt: string;
}

@Component({
  selector: 'app-audit',
  imports: [CommonModule, FormsModule, PageHeader],
  templateUrl: './audit.html',
  styleUrl: './audit.css'
})
export class Audit implements OnInit {

  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);

  eventos = signal<EventoAuditoria[]>([]);
  cargando = signal(false);
  error = signal('');

  busqueda = signal('');
  paginaActual = signal(1);
  elementosPagina = signal(10);
  ultimaActualizacion = signal<Date | null>(null);

  eventosFiltrados = computed(() => {
    const texto = this.normalizar(this.busqueda().trim());

    return this.eventos().filter(evento => [
      evento.bookingId.toString(),
      `#${evento.bookingId}`,
      evento.resourceName,
      evento.actorId,
      evento.actorEmail,
      evento.ownerId,
      evento.eventType,
      this.nombreEvento(evento.eventType),
      evento.previousStatus,
      evento.status,
      evento.targetStatus,
      evento.operationId,
      evento.eventId
    ].some(valor =>
      valor != null && this.normalizar(valor).includes(texto)
    ));
  });

  totalPaginas = computed(() =>
    Math.max(
      1,
      Math.ceil(
        this.eventosFiltrados().length / this.elementosPagina()
      )
    )
  );

  eventosPagina = computed(() => {
    const pagina = Math.min(
      this.paginaActual(),
      this.totalPaginas()
    );

    const inicio = (pagina - 1) * this.elementosPagina();

    return this.eventosFiltrados().slice(
      inicio,
      inicio + this.elementosPagina()
    );
  });

  ngOnInit(): void {
    this.cargarEventos();
  }

  cargarEventos(): void {
    if (this.cargando()) {
      return;
    }

    this.cargando.set(true);
    this.error.set('');

    this.http.get<EventoAuditoria[]>(
      `${API_BASE_URL}/api/audit`
    ).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.cargando.set(false))
    ).subscribe({
      next: data => {
        if (!Array.isArray(data)) {
          this.error.set(
            'La API no devolvió un listado de auditoría. Revisa su ruta.'
          );
          return;
        }

        this.eventos.set(data);

        this.paginaActual.set(
          Math.min(this.paginaActual(), this.totalPaginas())
        );

        this.ultimaActualizacion.set(new Date());
      },

      error: (error: HttpErrorResponse) => {
        console.error('Error al consultar auditoría:', error);

        if (error.status === 401) {
          this.error.set(
            'No se pudo autorizar la consulta. Inicia sesión nuevamente.'
          );
        } else if (error.status === 403) {
          this.error.set(
            'La auditoría está disponible para Admin y Auditor.'
          );
        } else {
          this.error.set(
            'No se pudo cargar la auditoría. Intenta nuevamente.'
          );
        }
      }
    });
  }

  cambiarBusqueda(valor: string): void {
    this.busqueda.set(valor);
    this.paginaActual.set(1);
  }

  cambiarElementosPagina(valor: number): void {
    const cantidad = Number(valor);

    if ([5, 10, 20].includes(cantidad)) {
      this.elementosPagina.set(cantidad);
      this.paginaActual.set(1);
    }
  }

  cambiarPagina(pagina: number): void {
    if (
      Number.isInteger(pagina) &&
      pagina >= 1 &&
      pagina <= this.totalPaginas()
    ) {
      this.paginaActual.set(pagina);
    }
  }

  nombreEvento(tipo: string): string {
    switch (tipo) {
      case 'RESERVATION_CREATED':
        return 'Reserva creada';

      case 'STATUS_CHANGE_REQUESTED':
        return 'Cambio de estado solicitado';

      case 'STATUS_CHANGED':
        return 'Cambio de estado confirmado';

      case 'ARRIVAL_CONFIRMED':
        return 'Llegada confirmada';

      case 'STATUS_CHANGE_REJECTED':
        return 'Cambio de estado rechazado';

      default:
        return tipo.replaceAll('_', ' ');
    }
  }

  mostrarEstado(estado: string | null): string {
    return estado ? estado.replaceAll('_', ' ') : '—';
  }

  mostrarActor(evento: EventoAuditoria): string {
    if (evento.actorId === 'SYSTEM') {
      return 'Sistema automático';
    }

    return evento.actorEmail || evento.actorId;
  }

  private normalizar(valor: string): string {
    return valor
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }
}