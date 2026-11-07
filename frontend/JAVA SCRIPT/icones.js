export function icone(nome, classe = 'icone') {
  return `<svg class="${classe}" aria-hidden="true" focusable="false" viewBox="0 0 24 24">
    <use href="../ASSETS/icones-dashboard.svg#${nome}"></use></svg>`;
}
