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
import { FormsModule, NgForm } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { interval } from 'rxjs';

import { MsalService } from '@azure/msal-angular';

import { PageHeader } from '../../shared/page-header/page-header';
import { API_BASE_URL } from '../../core/auth/msal-config';
import { tieneAlgunRol } from '../../core/auth/role.guard';

interface Reserva {
  id: number;
  userId: string;
  userEmail: string;
  resourceName: string;
  startDateTime: string;
  endDateTime: string;
  purpose: string;
  quantity: number;
  status: string;
  pendingStatus?: string | null;
}

interface Recurso {
  id: number;
  name: string;
  type: string;
  active: boolean;
  capacity: number | null;
  availableStock: number | null;
  location: string | null;
}

interface FormularioReserva {
  resourceId: number | null;
  startDateTime: string;
  endDateTime: string;
  purpose: string;
  quantity: number | null;
}

interface ReservaRequest {
  resourceId: number;
  resourceName: string;
  startDateTime: string;
  endDateTime: string;
  purpose: string;
  quantity: number;
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
  private readonly destroyRef = inject(DestroyRef);

  private pausaAutomatica = false;

  reservas = signal<Reserva[]>([]);
  recursos = signal<Recurso[]>([]);

  cargando = signal(false);
  consultando = signal(false);
  cargandoRecursos = signal(false);
  guardando = signal(false);
  actualizando = signal<number | null>(null);

  error = signal('');
  errorFormulario = signal('');
  mensaje = signal('');
  busqueda = signal('');
  mostrarFormulario = signal(false);

  formulario: FormularioReserva = this.formularioVacio();

  ocupado = computed(() =>
    this.cargando()
    || this.consultando()
    || this.cargandoRecursos()
    || this.guardando()
    || this.actualizando() !== null
  );

  hayPendientes = computed(() =>
    this.reservas().some(reserva => !!reserva.pendingStatus)
  );

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
    return tieneAlgunRol(
      this.msal.instance.getActiveAccount(),
      ['Admin', 'Operador']
    );
  }

  get puedeCrear(): boolean {
    return tieneAlgunRol(
      this.msal.instance.getActiveAccount(),
      ['Admin', 'Operador', 'Cliente']
    );
  }

  get esCliente(): boolean {
    return tieneAlgunRol(
      this.msal.instance.getActiveAccount(),
      ['Cliente']
    );
  }

  get mostrarAcciones(): boolean {
    return this.puedeGestionar || this.esCliente;
  }

  get recursoSeleccionado(): Recurso | undefined {
    return this.recursos().find(
      recurso => recurso.id === this.formulario.resourceId
    );
  }

  get cantidadMaxima(): number | null {
    const recurso = this.recursoSeleccionado;

    if (!recurso) {
      return null;
    }

    if (
      recurso.availableStock !== null
      && recurso.availableStock <= 0
    ) {
      return 0;
    }

    if (
      recurso.type === 'LABORATORIO'
      || recurso.type === 'LABORATORY'
    ) {
      return 1;
    }

    return recurso.availableStock;
  }

  get fechaMinima(): string {
    const ahora = new Date();

    const fechaLocal = new Date(
      ahora.getTime() - ahora.getTimezoneOffset() * 60_000
    );

    return fechaLocal.toISOString().slice(0, 16);
  }

  ngOnInit(): void {
    this.cargarReservas();

    interval(3_000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (
          this.hayPendientes()
          && !this.ocupado()
          && !this.pausaAutomatica
        ) {
          this.consultarReservas(true);
        }
      });
  }

  cargarReservas(): void {
    if (this.ocupado()) {
      return;
    }

    this.pausaAutomatica = false;
    this.consultarReservas(false);
  }

  private consultarReservas(automatica: boolean): void {
    if (this.ocupado()) {
      return;
    }

    this.consultando.set(true);

    if (!automatica) {
      this.cargando.set(true);
      this.error.set('');
    }

    this.http.get<Reserva[]>(
      `${API_BASE_URL}/api/bookings`
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: data => {
          const anteriores = this.reservas();

          this.reservas.set(data);
          this.consultando.set(false);
          this.cargando.set(false);
          this.error.set('');

          this.informarOperacionesFinalizadas(anteriores, data);
        },
        error: (error: HttpErrorResponse) => {
          this.consultando.set(false);
          this.cargando.set(false);

          if (error.status === 401 || error.status === 403) {
            this.pausaAutomatica = true;
          }

          this.error.set(
            this.mensajeError(
              error,
              automatica
                ? 'No se pudo consultar el avance. Se volverá a intentar automáticamente.'
                : 'No se pudieron cargar las reservas. Intenta nuevamente.'
            )
          );
        }
      });
  }

  abrirFormulario(): void {
    if (!this.puedeCrear || this.ocupado()) {
      return;
    }

    this.formulario = this.formularioVacio();
    this.recursos.set([]);
    this.errorFormulario.set('');
    this.error.set('');
    this.mensaje.set('');
    this.mostrarFormulario.set(true);

    this.cargarRecursos();
  }

  cargarRecursos(): void {
    if (
      !this.puedeCrear
      || !this.mostrarFormulario()
      || this.cargandoRecursos()
      || this.guardando()
    ) {
      return;
    }

    this.cargandoRecursos.set(true);
    this.errorFormulario.set('');

    this.http.get<Recurso[]>(
      `${API_BASE_URL}/api/catalog/resources`
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: data => {
          this.recursos.set(
            data.filter(recurso => recurso.active)
          );

          const seleccionadoExiste = this.recursos().some(
            recurso => recurso.id === this.formulario.resourceId
          );

          if (!seleccionadoExiste) {
            this.formulario.resourceId = null;
          }

          this.cargandoRecursos.set(false);
        },
        error: (error: HttpErrorResponse) => {
          this.recursos.set([]);
          this.cargandoRecursos.set(false);

          this.errorFormulario.set(
            this.mensajeError(
              error,
              'No se pudieron cargar los recursos del catálogo.'
            )
          );
        }
      });
  }

  cancelarFormulario(): void {
    if (this.guardando() || this.cargandoRecursos()) {
      return;
    }

    this.mostrarFormulario.set(false);
    this.errorFormulario.set('');
    this.formulario = this.formularioVacio();
  }

  seleccionarRecurso(): void {
    this.formulario.quantity = 1;
    this.errorFormulario.set('');
  }

  crearReserva(form: NgForm): void {
    if (!this.puedeCrear || this.ocupado()) {
      return;
    }

    this.errorFormulario.set('');

    if (form.invalid) {
      form.control.markAllAsTouched();

      this.errorFormulario.set(
        'Completa los campos obligatorios correctamente.'
      );
      return;
    }

    const recurso = this.recursoSeleccionado;
    const cantidad = this.formulario.quantity;
    const motivo = this.formulario.purpose.trim();

    if (!recurso || !recurso.active) {
      this.errorFormulario.set(
        'Selecciona un recurso activo del catálogo.'
      );
      return;
    }

    if (
      cantidad === null
      || !Number.isSafeInteger(cantidad)
      || cantidad < 1
    ) {
      this.errorFormulario.set(
        'La cantidad debe ser un número entero mayor que cero.'
      );
      return;
    }

    const maximo = this.cantidadMaxima;

    if (maximo !== null && cantidad > maximo) {
      this.errorFormulario.set(
        'La cantidad supera la disponibilidad mostrada del recurso.'
      );
      return;
    }

    if (!motivo) {
      this.errorFormulario.set(
        'Escribe el motivo de la reserva.'
      );
      return;
    }

    const inicio = new Date(this.formulario.startDateTime);
    const termino = new Date(this.formulario.endDateTime);

    if (
      !Number.isFinite(inicio.getTime())
      || !Number.isFinite(termino.getTime())
    ) {
      this.errorFormulario.set(
        'Selecciona fechas y horas válidas.'
      );
      return;
    }

    if (inicio.getTime() <= Date.now()) {
      this.errorFormulario.set(
        'La fecha de inicio debe estar en el futuro.'
      );
      return;
    }

    if (termino.getTime() <= inicio.getTime()) {
      this.errorFormulario.set(
        'La fecha de término debe ser posterior al inicio.'
      );
      return;
    }

    const payload: ReservaRequest = {
      resourceId: recurso.id,
      resourceName: recurso.name,
      startDateTime: inicio.toISOString().slice(0, 19),
      endDateTime: termino.toISOString().slice(0, 19),
      purpose: motivo,
      quantity: cantidad
    };

    this.guardando.set(true);
    this.error.set('');
    this.mensaje.set('');

    this.http.post<Reserva>(
      `${API_BASE_URL}/api/bookings`,
      payload
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: creada => {
          this.reservas.update(reservas => [
            creada,
            ...reservas
          ]);

          this.busqueda.set('');
          this.guardando.set(false);
          this.mostrarFormulario.set(false);
          this.formulario = this.formularioVacio();

          this.mensaje.set(
            `Reserva #${creada.id} registrada como `
            + `${this.mostrarEstado(creada.status)}.`
          );
        },
        error: (error: HttpErrorResponse) => {
          this.guardando.set(false);

          this.errorFormulario.set(
            this.mensajeError(
              error,
              'No se pudo registrar la reserva. Revisa los datos antes de reintentar.'
            )
          );
        }
      });
  }

  puedeConfirmarLlegada(reserva: Reserva): boolean {
    const cuenta = this.msal.instance.getActiveAccount();
    const propietario = cuenta?.idTokenClaims?.['oid'];

    return this.esCliente
      && typeof propietario === 'string'
      && reserva.userId === propietario
      && reserva.status === 'EN_PREPARACION'
      && !reserva.pendingStatus;
  }

  confirmarLlegada(reserva: Reserva): void {
    if (
      !this.puedeConfirmarLlegada(reserva)
      || this.ocupado()
    ) {
      return;
    }

    if (!window.confirm(
      `¿Confirmar tu llegada para la reserva #${reserva.id}?`
    )) {
      return;
    }

    this.iniciarOperacion(reserva.id);

    this.http.post<Reserva>(
      `${API_BASE_URL}/api/bookings/${reserva.id}/arrival`,
      null
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: actualizada => {
          this.actualizarReservaEnLista(actualizada);
          this.actualizando.set(null);

          this.mensaje.set(
            `Llegada confirmada. La reserva #${actualizada.id} está EN USO.`
          );
        },
        error: (error: HttpErrorResponse) => {
          this.finalizarConError(
            error,
            'No se pudo confirmar la llegada. Actualiza la reserva antes de reintentar.'
          );
        }
      });
  }

  sincronizarStock(reserva: Reserva): void {
    if (
      !this.puedeGestionar
      || this.ocupado()
      || !!reserva.pendingStatus
      || !['APROBADA', 'EN_PREPARACION', 'EN_USO']
        .includes(reserva.status)
    ) {
      return;
    }

    const confirmado = window.confirm(
      `¿Sincronizar el stock de la reserva #${reserva.id}?\n\n`
      + 'Si nunca tuvo un descuento registrado, '
      + 'se comprometerán sus unidades. '
      + 'Si ya está sincronizada, el saldo se conservará.'
    );

    if (!confirmado) {
      return;
    }

    this.iniciarOperacion(reserva.id);

    this.http.post<Reserva>(
      `${API_BASE_URL}/api/bookings/${reserva.id}/stock/reconcile`,
      null
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: actualizada => {
          this.registrarRespuestaOperacion(actualizada);
        },
        error: (error: HttpErrorResponse) => {
          this.finalizarConError(
            error,
            'No se pudo solicitar la sincronización del stock.'
          );
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
      !this.puedeGestionar
      || this.ocupado()
      || !!reserva.pendingStatus
      || !this.estadosDisponibles(reserva.status).includes(estado)
    ) {
      return;
    }

    const confirmado = window.confirm(
      `¿Cambiar la reserva #${reserva.id} `
      + `a ${this.mostrarEstado(estado)}?`
    );

    if (!confirmado) {
      return;
    }

    this.iniciarOperacion(reserva.id);

    this.http.patch<Reserva>(
      `${API_BASE_URL}/api/bookings/${reserva.id}/status`,
      null,
      { params: { status: estado } }
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: actualizada => {
          this.registrarRespuestaOperacion(actualizada);
        },
        error: (error: HttpErrorResponse) => {
          this.finalizarConError(
            error,
            'No se pudo solicitar el cambio de estado. Actualiza las reservas antes de reintentar.'
          );
        }
      });
  }

  fechaParaVista(fecha: string): string {
    if (/(Z|[+-]\d{2}:\d{2})$/i.test(fecha)) {
      return fecha;
    }

    return `${fecha}Z`;
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

  private iniciarOperacion(id: number): void {
    this.actualizando.set(id);
    this.error.set('');
    this.mensaje.set('');
    this.pausaAutomatica = false;
  }

  private registrarRespuestaOperacion(actualizada: Reserva): void {
    this.actualizarReservaEnLista(actualizada);
    this.actualizando.set(null);

    if (actualizada.pendingStatus) {
      this.mensaje.set(
        `Procesando la operación de la reserva #${actualizada.id}. `
        + 'El listado se actualizará automáticamente.'
      );
    } else {
      this.mensaje.set(
        `Estado actual de la reserva #${actualizada.id}: `
        + `${this.mostrarEstado(actualizada.status)}.`
      );
    }
  }

  private finalizarConError(
    error: HttpErrorResponse,
    predeterminado: string
  ): void {
    this.actualizando.set(null);
    this.error.set(this.mensajeError(error, predeterminado));
  }

  private informarOperacionesFinalizadas(
    anteriores: Reserva[],
    actuales: Reserva[]
  ): void {
    const previas = new Map(
      anteriores.map(reserva => [reserva.id, reserva])
    );

    const mensajes: string[] = [];
    const avisos: string[] = [];

    for (const actual of actuales) {
      const anterior = previas.get(actual.id);

      if (!anterior?.pendingStatus || actual.pendingStatus) {
        continue;
      }

      if (anterior.pendingStatus === anterior.status) {
        mensajes.push(
          `El proceso de sincronización de la reserva #${actual.id} `
          + 'finalizó. Revisa el saldo en catálogo.'
        );
      } else if (actual.status === anterior.pendingStatus) {
        mensajes.push(
          `Reserva #${actual.id} actualizada a `
          + `${this.mostrarEstado(actual.status)}.`
        );
      } else {
        avisos.push(
          `La reserva #${actual.id} terminó de procesarse, `
          + `pero sigue en ${this.mostrarEstado(actual.status)}. `
          + 'Revisa la disponibilidad antes de reintentar.'
        );
      }
    }

    if (mensajes.length > 0 || avisos.length > 0) {
      this.mensaje.set(mensajes.join(' '));
      this.error.set(avisos.join(' '));
    }
  }

  private actualizarReservaEnLista(actualizada: Reserva): void {
    this.reservas.update(reservas =>
      reservas.map(actual =>
        actual.id === actualizada.id ? actualizada : actual
      )
    );
  }

  private formularioVacio(): FormularioReserva {
    return {
      resourceId: null,
      startDateTime: '',
      endDateTime: '',
      purpose: '',
      quantity: 1
    };
  }

  private mensajeError(
    error: HttpErrorResponse,
    predeterminado: string
  ): string {
    if (
      [400, 409, 503].includes(error.status)
      && typeof error.error?.message === 'string'
    ) {
      return error.error.message;
    }

    switch (error.status) {
      case 0:
        return 'No se pudo conectar con la API. Revisa la conexión.';
      case 401:
        return 'No se pudo autorizar la operación. Inicia sesión nuevamente.';
      case 403:
        return 'Tu cuenta no tiene permiso para realizar esta operación.';
      case 404:
        return 'El registro ya no está disponible. Actualiza los datos.';
      case 409:
        return 'La solicitud entra en conflicto con los datos actuales. Actualiza y revisa la disponibilidad.';
      default:
        return predeterminado;
    }
  }
}