import {
  Component,
  OnInit,
  inject,
  ChangeDetectorRef
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import {
  HttpClient,
  HttpErrorResponse
} from '@angular/common/http';
import { MsalService } from '@azure/msal-angular';

import { PageHeader } from '../../shared/page-header/page-header';
import { API_BASE_URL } from '../../core/auth/msal-config';
import { tieneAlgunRol } from '../../core/auth/role.guard';

type TipoRecurso = 'LABORATORIO' | 'EQUIPO' | 'INSUMO';

interface Recurso {
  id: number;
  name: string;
  description: string | null;
  type: TipoRecurso;
  capacity: number | null;
  stock: number | null;
  availableStock: number | null;
  location: string | null;
  active: boolean;
}

interface FormularioRecurso {
  name: string;
  description: string;
  type: TipoRecurso;
  capacity: number | null;
  stock: number | null;
  availableStock: number | null;
  location: string;
  active: boolean;
}

interface RecursoRequest {
  name: string;
  description: string;
  type: TipoRecurso;
  capacity: number;
  stock: number;
  availableStock: number;
  location: string;
  active: boolean;
}

@Component({
  selector: 'app-catalog',
  imports: [PageHeader, CommonModule, FormsModule],
  templateUrl: './catalog.html',
  styleUrl: './catalog.css'
})
export class Catalog implements OnInit {

  private readonly http = inject(HttpClient);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly msal = inject(MsalService);

  private readonly endpoint =
    `${API_BASE_URL}/api/catalog/resources`;

  recursos: Recurso[] = [];
  recursosFiltrados: Recurso[] = [];

  busqueda = '';
  paginaActual = 1;
  elementosPagina = 5;

  cargando = false;
  guardando = false;
  eliminandoId: number | null = null;

  error = '';
  mensaje = '';

  mostrarFormulario = false;
  editandoId: number | null = null;

  formulario: FormularioRecurso = this.formularioVacio();

  readonly tipos: TipoRecurso[] = [
    'LABORATORIO',
    'EQUIPO',
    'INSUMO'
  ];

  get puedeGestionar(): boolean {
    return tieneAlgunRol(
      this.msal.instance.getActiveAccount(),
      ['Admin']
    );
  }

  get ocupado(): boolean {
    return this.cargando
      || this.guardando
      || this.eliminandoId !== null;
  }

  get totalPaginas(): number {
    return Math.max(
      1,
      Math.ceil(
        this.recursosFiltrados.length / this.elementosPagina
      )
    );
  }

  get recursosPagina(): Recurso[] {
    const inicio =
      (this.paginaActual - 1) * this.elementosPagina;

    return this.recursosFiltrados.slice(
      inicio,
      inicio + this.elementosPagina
    );
  }

  ngOnInit(): void {
    this.cargarRecursos();
  }

  cargarRecursos(): void {
    if (this.ocupado) {
      return;
    }

    this.cargando = true;
    this.error = '';
    this.mensaje = '';

    this.http.get<Recurso[]>(this.endpoint).subscribe({
      next: recursos => {
        this.recursos = recursos;
        this.aplicarFiltro();
        this.cargando = false;
        this.cdr.markForCheck();
      },
      error: (error: HttpErrorResponse) => {
        this.cargando = false;
        this.error = this.mensajeError(
          error,
          'No se pudo cargar el catálogo. Intenta nuevamente.'
        );
        this.cdr.markForCheck();
      }
    });
  }

  filtrar(): void {
    this.aplicarFiltro(true);
  }

  cambiarPagina(pagina: number): void {
    if (
      Number.isInteger(pagina)
      && pagina >= 1
      && pagina <= this.totalPaginas
    ) {
      this.paginaActual = pagina;
    }
  }

  nuevoRecurso(): void {
    if (!this.puedeGestionar || this.ocupado) {
      return;
    }

    this.editandoId = null;
    this.formulario = this.formularioVacio();
    this.mostrarFormulario = true;
    this.error = '';
    this.mensaje = '';
  }

  editarRecurso(recurso: Recurso): void {
    if (!this.puedeGestionar || this.ocupado) {
      return;
    }

    this.editandoId = recurso.id;

    this.formulario = {
      name: recurso.name,
      description: recurso.description ?? '',
      type: recurso.type,
      capacity: recurso.capacity,
      stock: recurso.stock,
      availableStock: recurso.availableStock,
      location: recurso.location ?? '',
      active: recurso.active
    };

    this.mostrarFormulario = true;
    this.error = '';
    this.mensaje = '';
  }

  cancelarFormulario(): void {
    if (this.guardando) {
      return;
    }

    this.cerrarFormulario();
    this.error = '';
  }

  guardarRecurso(form: NgForm): void {
    if (!this.puedeGestionar || this.ocupado) {
      return;
    }

    this.error = '';
    this.mensaje = '';

    if (form.invalid) {
      form.control.markAllAsTouched();
      this.error = 'Completa los campos obligatorios correctamente.';
      return;
    }

    const nombre = this.formulario.name.trim();
    const { capacity, stock, availableStock } = this.formulario;

    if (!nombre) {
      this.error = 'El nombre no puede contener solamente espacios.';
      return;
    }

    if (
      !this.esEnteroNoNegativo(capacity)
      || !this.esEnteroNoNegativo(stock)
      || !this.esEnteroNoNegativo(availableStock)
    ) {
      this.error =
        'La capacidad y los stocks deben ser números enteros desde cero.';
      return;
    }

    if (availableStock > stock) {
      this.error =
        'El stock disponible no puede superar el stock total.';
      return;
    }

    const payload: RecursoRequest = {
      name: nombre,
      description: this.formulario.description.trim(),
      type: this.formulario.type,
      capacity,
      stock,
      availableStock,
      location: this.formulario.location.trim(),
      active: this.formulario.active
    };

    const id = this.editandoId;
    const esEdicion = id !== null;

    const solicitud = esEdicion
      ? this.http.put<Recurso>(
          `${this.endpoint}/${id}`,
          payload
        )
      : this.http.post<Recurso>(
          this.endpoint,
          payload
        );

    this.guardando = true;

    solicitud.subscribe({
      next: recurso => {
        if (esEdicion) {
          this.recursos = this.recursos.map(actual =>
            actual.id === recurso.id ? recurso : actual
          );
        } else {
          this.recursos = [recurso, ...this.recursos];
        }

        this.aplicarFiltro(!esEdicion);
        this.guardando = false;
        this.cerrarFormulario();

        this.mensaje = esEdicion
          ? 'Recurso actualizado correctamente.'
          : 'Recurso creado correctamente.';

        this.cdr.markForCheck();
      },
      error: (error: HttpErrorResponse) => {
        this.guardando = false;

        this.error = this.mensajeError(
          error,
          'No se pudo guardar el recurso. Revisa los datos e intenta nuevamente.'
        );

        this.cdr.markForCheck();
      }
    });
  }

  eliminarRecurso(recurso: Recurso): void {
    if (!this.puedeGestionar || this.ocupado) {
      return;
    }

    const confirmado = window.confirm(
      `¿Eliminar definitivamente "${recurso.name}"?\n\n`
      + 'Esta operación no se puede deshacer. '
      + 'Para conservarlo, puedes editarlo y desmarcar Activo.'
    );

    if (!confirmado) {
      return;
    }

    this.eliminandoId = recurso.id;
    this.error = '';
    this.mensaje = '';

    this.http.delete<void>(
      `${this.endpoint}/${recurso.id}`
    ).subscribe({
      next: () => {
        this.recursos = this.recursos.filter(
          actual => actual.id !== recurso.id
        );

        if (this.editandoId === recurso.id) {
          this.cerrarFormulario();
        }

        this.aplicarFiltro();
        this.eliminandoId = null;
        this.mensaje = 'Recurso eliminado correctamente.';
        this.cdr.markForCheck();
      },
      error: (error: HttpErrorResponse) => {
        this.eliminandoId = null;

        this.error = this.mensajeError(
          error,
          'No se pudo eliminar el recurso. Actualiza el catálogo antes de reintentar.'
        );

        this.cdr.markForCheck();
      }
    });
  }

  private aplicarFiltro(reiniciarPagina = false): void {
    const texto = this.busqueda.trim().toLowerCase();

    this.recursosFiltrados = this.recursos.filter(recurso =>
      [
        recurso.name,
        recurso.type,
        recurso.location ?? ''
      ].some(valor => valor.toLowerCase().includes(texto))
    );

    this.paginaActual = reiniciarPagina
      ? 1
      : Math.min(this.paginaActual, this.totalPaginas);
  }

  private cerrarFormulario(): void {
    this.mostrarFormulario = false;
    this.editandoId = null;
    this.formulario = this.formularioVacio();
  }

  private formularioVacio(): FormularioRecurso {
    return {
      name: '',
      description: '',
      type: 'LABORATORIO',
      capacity: 0,
      stock: 0,
      availableStock: 0,
      location: '',
      active: true
    };
  }

  private esEnteroNoNegativo(
    valor: number | null
  ): valor is number {
    return typeof valor === 'number'
      && Number.isSafeInteger(valor)
      && valor >= 0;
  }

  private mensajeError(
    error: HttpErrorResponse,
    mensajePredeterminado: string
  ): string {
    if (error.status === 401) {
      return 'Tu sesión no pudo autorizarse. Inicia sesión nuevamente.';
    }

    if (error.status === 403) {
      return 'Tu cuenta no tiene permiso para realizar esta operación.';
    }

    if (error.status === 404) {
      return 'El recurso ya no está disponible. Actualiza el catálogo.';
    }

    if (error.status === 0) {
      return 'No se pudo conectar con la API. Revisa la conexión.';
    }

    return mensajePredeterminado;
  }
}