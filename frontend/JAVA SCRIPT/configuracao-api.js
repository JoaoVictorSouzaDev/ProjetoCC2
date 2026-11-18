// Configurações globais da aplicação
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://projetocc2-production.up.railway.app';
export const TIMEOUT_API_MS = Number(import.meta.env.VITE_TIMEOUT_API_MS) || 10000;
export const INTERVALO_ATUALIZACAO_MS = Number(import.meta.env.VITE_INTERVALO_ATUALIZACAO_MS) || 60000;
export const LIMITE_DESATUALIZACAO_MS = Number(import.meta.env.VITE_LIMITE_DESATUALIZACAO_MS) || (15 * 60000);
export const FUSO_LEITURAS = import.meta.env.VITE_FUSO_LEITURAS || '-03:00';