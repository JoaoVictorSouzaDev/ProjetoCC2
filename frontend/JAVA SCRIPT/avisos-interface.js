import { obterAlerta, obterDicaAmbiental } from './leituras.js?v=20261108c';

export function mostrarAvisoMedicao(elemento, campo, valor) {
  const area = elemento.closest('[data-medicao], .metrica');
  const aviso = area.querySelector('.aviso-medicao');
  const alerta = obterAlerta(campo, valor);
  aviso.hidden = !alerta;
  aviso.textContent = alerta ? `${alerta.severidade}: ${alerta.mensagem}` : '';
  if (alerta) area.dataset.severidade = alerta.severidade;
  else delete area.dataset.severidade;
}

export function mostrarDicaMedicao(elemento, campo, valor) {
  const dicaElement = elemento.closest('.metrica').querySelector('.dica-medicao');
  const dica = obterDicaAmbiental(campo, valor);
  dicaElement.hidden = !dica;
  dicaElement.textContent = dica?.mensagem || '';
  if (dica) dicaElement.dataset.tom = dica.tom;
  else delete dicaElement.dataset.tom;
}
