import {
  Component,
  DestroyRef,
  inject,
  signal
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  HttpClient,
  HttpErrorResponse,
  HttpResponse
} from '@angular/common/http';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, finalize } from 'rxjs';

import { PageHeader } from '../../shared/page-header/page-header';
import { API_BASE_URL } from '../../core/auth/msal-config';

@Component({
  selector: 'app-rabbit-admin',
  imports: [CommonModule, FormsModule, PageHeader],
  templateUrl: './rabbit-admin.html',
  styleUrl: './rabbit-admin.css'
})
export class RabbitAdmin {

  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);

  private readonly baseUrl = `${API_BASE_URL}/api/admin`;

  ocupado = signal(false);
  mensaje = signal('');
  error = signal('');
  resultado = signal('');
  codigoHttp = signal<number | null>(null);

  cola = {
    name: 'demo.campuslab.cola',
    ttlMs: 60000,
    maxLength: 100
  };

  exchange = {
    name: 'demo.campuslab.direct',
    type: 'DIRECT' as 'DIRECT' | 'TOPIC'
  };

  binding = {
    queue: 'demo.campuslab.cola',
    exchange: 'demo.campuslab.direct',
    routingKey: 'demo.prueba'
  };

  nombreCola = 'demo.campuslab.cola';
  nombreExchange = 'demo.campuslab.direct';

  crearCola(): void {
    this.ejecutar(
      this.http.post(
        `${this.baseUrl}/queues`,
        { ...this.cola },
        { observe: 'response' }
      ),
      'Cola declarada correctamente.'
    );
  }

  consultarCola(): void {
    const nombre = encodeURIComponent(this.nombreCola);

    this.ejecutar(
      this.http.get(
        `${this.baseUrl}/queues/${nombre}`,
        { observe: 'response' }
      ),
      'Consulta de la cola completada.'
    );
  }

  eliminarCola(): void {
    if (this.ocupado()) {
      return;
    }

    const confirmado = window.confirm(
      `¿Eliminar la cola "${this.nombreCola}"? ` +
      'Debe estar vacía y sin consumidores.'
    );

    if (!confirmado) {
      return;
    }

    const nombre = encodeURIComponent(this.nombreCola);

    this.ejecutar(
      this.http.delete(
        `${this.baseUrl}/queues/${nombre}`,
        { observe: 'response' }
      ),
      'Eliminación de la cola completada.'
    );
  }

  crearExchange(): void {
    this.ejecutar(
      this.http.post(
        `${this.baseUrl}/exchanges`,
        { ...this.exchange },
        { observe: 'response' }
      ),
      'Exchange declarado correctamente.'
    );
  }

  eliminarExchange(): void {
    if (this.ocupado()) {
      return;
    }

    const confirmado = window.confirm(
      `¿Eliminar el exchange "${this.nombreExchange}"? ` +
      'También se eliminarán sus bindings.'
    );

    if (!confirmado) {
      return;
    }

    const nombre = encodeURIComponent(this.nombreExchange);

    this.ejecutar(
      this.http.delete(
        `${this.baseUrl}/exchanges/${nombre}`,
        { observe: 'response' }
      ),
      'Eliminación del exchange completada.'
    );
  }

  crearBinding(): void {
    this.ejecutar(
      this.http.post(
        `${this.baseUrl}/bindings`,
        { ...this.binding },
        { observe: 'response' }
      ),
      'Binding declarado correctamente.'
    );
  }

  eliminarBinding(): void {
    if (this.ocupado()) {
      return;
    }

    const confirmado = window.confirm(
      `¿Eliminar el binding de "${this.binding.exchange}" ` +
      `hacia "${this.binding.queue}" ` +
      `con routing key "${this.binding.routingKey}"?`
    );

    if (!confirmado) {
      return;
    }

    this.ejecutar(
      this.http.delete(
        `${this.baseUrl}/bindings`,
        {
          body: { ...this.binding },
          observe: 'response'
        }
      ),
      'Eliminación del binding completada.'
    );
  }

  limpiarResultado(): void {
    this.mensaje.set('');
    this.error.set('');
    this.resultado.set('');
    this.codigoHttp.set(null);
  }

  private ejecutar(
    solicitud: Observable<HttpResponse<unknown>>,
    mensajeExito: string
  ): void {
    if (this.ocupado()) {
      return;
    }

    this.limpiarResultado();
    this.ocupado.set(true);

    solicitud.pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.ocupado.set(false))
    ).subscribe({
      next: respuesta => {
        this.codigoHttp.set(respuesta.status);
        this.mensaje.set(mensajeExito);

        if (respuesta.body !== null) {
          this.resultado.set(
            JSON.stringify(respuesta.body, null, 2) ?? ''
          );
        }
      },

      error: (error: HttpErrorResponse) => {
        this.codigoHttp.set(error.status);

        switch (error.status) {
          case 0:
            this.error.set(
              'No se pudo conectar con la API. Revisa la conexión y CORS.'
            );
            break;

          case 400:
            this.error.set(
              'Los datos no son válidos. Revisa los campos enviados.'
            );
            break;

          case 401:
            this.error.set(
              'La sesión no pudo autorizarse. Inicia sesión nuevamente.'
            );
            break;

          case 403:
            this.error.set(
              'Acceso denegado. Se necesita el rol Admin y permisos en RabbitMQ.'
            );
            break;

          case 404:
            this.error.set(
              'No se encontró el recurso o la ruta solicitada.'
            );
            break;

          case 409:
            this.error.set(
              'Hay un conflicto: el recurso tiene otra configuración, ' +
              'está en uso o contiene mensajes.'
            );
            break;

          case 503:
            this.error.set(
              'El servicio no pudo completar la operación con RabbitMQ.'
            );
            break;

          default:
            this.error.set(
              'No se pudo completar la operación. Revisa la respuesta.'
            );
        }

        if (error.error != null) {
          this.resultado.set(
            typeof error.error === 'string'
              ? error.error
              : JSON.stringify(error.error, null, 2) ?? ''
          );
        }

        console.error('Error al administrar RabbitMQ:', error);
      }
    });
  }
}