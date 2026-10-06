import { describe, it, expect } from 'vitest';
import { bloquearScrollPagina } from './bloqueoScroll';

const docFalso = ({ ancho = 1000, util = 992 } = {}) => ({
  body: { style: { overflow: '', paddingRight: '' } },
  documentElement: { clientWidth: util },
  defaultView: { innerWidth: ancho },
});

describe('bloquearScrollPagina', () => {
  it('bloquea la página, compensa la barra y la deja como estaba al liberar', () => {
    const doc = docFalso();
    const liberar = bloquearScrollPagina(doc);
    expect(doc.body.style.overflow).toBe('hidden');
    expect(doc.body.style.paddingRight).toBe('8px');
    liberar();
    expect(doc.body.style.overflow).toBe('');
    expect(doc.body.style.paddingRight).toBe('');
  });

  it('sin barra de página no añade relleno', () => {
    const doc = docFalso({ ancho: 1000, util: 1000 });
    const liberar = bloquearScrollPagina(doc);
    expect(doc.body.style.paddingRight).toBe('');
    liberar();
  });

  it('con dos ventanas encadenadas la página sigue quieta hasta cerrar la última, cierren en el orden que cierren', () => {
    const doc = docFalso();
    const primera = bloquearScrollPagina(doc);
    const segunda = bloquearScrollPagina(doc);
    primera();
    expect(doc.body.style.overflow).toBe('hidden');
    segunda();
    expect(doc.body.style.overflow).toBe('');
  });

  it('liberar dos veces no descuadra el recuento', () => {
    const doc = docFalso();
    const primera = bloquearScrollPagina(doc);
    primera();
    primera();
    const segunda = bloquearScrollPagina(doc);
    expect(doc.body.style.overflow).toBe('hidden');
    segunda();
    expect(doc.body.style.overflow).toBe('');
  });

  it('respeta un estilo previo del body', () => {
    const doc = docFalso();
    doc.body.style.overflow = 'auto';
    const liberar = bloquearScrollPagina(doc);
    liberar();
    expect(doc.body.style.overflow).toBe('auto');
  });
});
