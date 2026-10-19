import {
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal
} from '@angular/core';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';

import { PageHeader } from '../../shared/page-header/page-header';
import { API_BASE_URL } from '../../core/auth/msal-config';

interface Tarea {
  taskId: string;
  bookingId: number;
  userEmail: string;
  taskType: 'EMAIL' | 'PREPARATION' | 'VOUCHER';
  eventType: string;
  state: 'PENDING' | 'COMPLETED' | 'FAILED';
  attempts: number;
  createdAt: string;
  completedAt: string | null;
  lastError: string | null;
  documentAvailable: boolean;
  downloadPath: string | null;
}

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeader],
  templateUrl: './notifications.html',
  styleUrl: './notifications.css'
})
export class Notifications implements OnInit {

  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);

  tareas = signal<Tarea[]>([]);
  cargando = signal(false);
  descargando = signal<string | null>(null);
  error = signal('');

  busqueda = signal('');
  paginaActual = signal(1);
  elementosPagina = signal(5);

  tareasFiltradas = computed(() => {
    const texto = this.normalizar(this.busqueda().trim());

    if (!texto) {
      return this.tareas();
    }

    return this.tareas().filter(tarea =>
      [
        tarea.bookingId.toString(),
        `#${tarea.bookingId}`,
        tarea.userEmail,
        tarea.taskId,
        tarea.taskType,
        this.nombreTipo(tarea.taskType),
        tarea.eventType,
        this.nombreEvento(tarea.eventType),
        tarea.state,
        this.nombreEstado(tarea.state)
      ].some(valor =>
        this.normalizar(valor).includes(texto)
      )
    );
  });

  totalPaginas = computed(() =>
    Math.max(
      1,
      Math.ceil(
        this.tareasFiltradas().length / this.elementosPagina()
      )
    )
  );

  tareasPagina = computed(() => {
    const pagina = Math.min(
      this.paginaActual(),
      this.totalPaginas()
    );

    const inicio = (pagina - 1) * this.elementosPagina();

    return this.tareasFiltradas().slice(
      inicio,
      inicio + this.elementosPagina()
    );
  });

  inicioMostrado = computed(() =>
    this.tareasFiltradas().length === 0
      ? 0
      : (this.paginaActual() - 1) * this.elementosPagina() + 1
  );

  finMostrado = computed(() =>
    Math.min(
      this.paginaActual() * this.elementosPagina(),
      this.tareasFiltradas().length
    )
  );

  ngOnInit(): void {
    this.cargarTareas();
  }

  cargarTareas(): void {
    if (this.cargando()) {
      return;
    }

    this.cargando.set(true);
    this.error.set('');

    this.http.get<Tarea[]>(
      `${API_BASE_URL}/api/notifications`
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: tareas => {
          this.tareas.set(tareas);

          this.paginaActual.set(
            Math.min(this.paginaActual(), this.totalPaginas())
          );

          this.cargando.set(false);
        },
        error: (error: HttpErrorResponse) => {
          this.cargando.set(false);
          this.error.set(this.mensajeError(error));
        }
      });
  }

  cambiarBusqueda(texto: string): void {
    this.busqueda.set(texto);
    this.paginaActual.set(1);
  }

  limpiarBusqueda(): void {
    this.cambiarBusqueda('');
  }

  cambiarElementosPagina(valor: number | string): void {
    const cantidad = Number(valor);

    if (![5, 10, 20].includes(cantidad)) {
      return;
    }

    this.elementosPagina.set(cantidad);
    this.paginaActual.set(1);
  }

  cambiarPagina(pagina: number): void {
    if (
      !Number.isInteger(pagina)
      || pagina < 1
      || pagina > this.totalPaginas()
    ) {
      return;
    }

    this.paginaActual.set(pagina);
  }

  descargar(tarea: Tarea): void {
    if (
      !tarea.documentAvailable
      || this.descargando() !== null
    ) {
      return;
    }

    this.descargando.set(tarea.taskId);
    this.error.set('');

    const taskId = encodeURIComponent(tarea.taskId);

    this.http.get(
      `${API_BASE_URL}/api/notifications/${taskId}/document`,
      { responseType: 'blob' }
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: documento => {
          const url = URL.createObjectURL(documento);
          const enlace = document.createElement('a');

          const nombre = tarea.taskType === 'PREPARATION'
            ? 'preparacion'
            : 'comprobante';

          enlace.href = url;
          enlace.download =
            `${nombre}-reserva-${tarea.bookingId}-${tarea.taskId}.pdf`;

          document.body.appendChild(enlace);
          enlace.click();
          enlace.remove();

          setTimeout(() => URL.revokeObjectURL(url), 1_000);

          this.descargando.set(null);
        },
        error: (error: HttpErrorResponse) => {
          this.descargando.set(null);
          this.error.set(this.mensajeError(error));
        }
      });
  }

  nombreTipo(tipo: string): string {
    switch (tipo) {
      case 'EMAIL':
        return 'Correo';
      case 'PREPARATION':
        return 'Ticket de preparación';
      case 'VOUCHER':
        return 'Comprobante PDF';
      default:
        return tipo;
    }
  }

  nombreEstado(estado: string): string {
    switch (estado) {
      case 'PENDING':
        return 'Pendiente';
      case 'COMPLETED':
        return 'Completada';
      case 'FAILED':
        return 'Fallida';
      default:
        return estado;
    }
  }

  nombreEvento(evento: string): string {
    const nombres: Record<string, string> = {
      REQUESTED: 'Solicitud registrada',
      APPROVED: 'Aprobación',
      PREPARATION_STARTED: 'Preparación',
      ARRIVAL_CONFIRMED: 'Uso registrado',
      RETURNED: 'Devolución',
      CANCELLED: 'Cancelación'
    };

    return nombres[evento] ?? evento;
  }

  private normalizar(texto: string): string {
    return texto
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  private mensajeError(error: HttpErrorResponse): string {
    switch (error.status) {
      case 0:
        return 'No se pudo conectar con la API.';
      case 401:
        return 'Tu sesión no pudo autorizarse. Inicia sesión nuevamente.';
      case 403:
        return 'Tu cuenta no tiene permiso para esta operación.';
      case 404:
        return 'La tarea o el documento no está disponible.';
      default:
        return 'No se pudo completar la operación. Intenta nuevamente.';
    }
  }
}