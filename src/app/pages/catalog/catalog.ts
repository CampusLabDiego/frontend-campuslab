import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

import { PageHeader } from '../../shared/page-header/page-header';
import { API_BASE_URL } from '../../core/auth/msal-config';

interface Recurso {
  id: number;
  name: string;
  type: string;
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

  recursos: Recurso[] = [];
  recursosFiltrados: Recurso[] = [];

  busqueda = '';
  paginaActual = 1;
  elementosPagina = 5;

  ngOnInit(): void {
    this.http.get<Recurso[]>(
      `${API_BASE_URL}/api/catalog/resources`
    ).subscribe({
      next: (data) => {
        this.recursos = data;
        this.filtrar();
        console.log('Consulta de catálogo completada:', data.length);
      },
      error: (error) => {
        console.error('Error al cargar catálogo:', error);
      }
    });
  }

  filtrar(): void {
    const texto = this.busqueda.trim().toLowerCase();

    this.recursosFiltrados = this.recursos.filter(
      recurso => recurso.name.toLowerCase().includes(texto)
    );

    this.paginaActual = 1;
  }

  get recursosPagina(): Recurso[] {
    const inicio = (this.paginaActual - 1) * this.elementosPagina;

    return this.recursosFiltrados.slice(
      inicio,
      inicio + this.elementosPagina
    );
  }

  cambiarPagina(pagina: number): void {
    this.paginaActual = pagina;
  }
}