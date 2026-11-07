import { estados } from './estados.js?v=20261105v';
import { icone } from './icones.js?v=20261105u';
export function mostrarEstado(referencia, estado) {
  const dados = { ...estados[estado.tipo], ...estado };
  document.getElementById('estado-dashboard')?.remove();
  if (estado.tipo === 'empty' || estado.tipo === 'success') return dados;
  const container = document.createElement('div');
  container.id = 'estado-dashboard';
  container.className = 'estado-dados';
  container.dataset.estado = estado.tipo;
  container.innerHTML = `${icone(dados.icone)}<div><strong></strong><p></p></div>`;
  container.querySelector('strong').textContent = dados.titulo;
  container.querySelector('p').textContent = dados.texto;
  referencia.before(container);
  return dados;
}
