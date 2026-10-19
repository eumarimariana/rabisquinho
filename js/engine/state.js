// Estado compartilhado do motor: modelo escolhido, imagens e medidas da página.
// "export let" é uma ligação viva: quem importa R/IMAGES sempre vê o valor atual.
export let R = null;
export function setTemplate(t){ R = t; }

/** Imagens do caderno: id → {url (prévia), blob, type, w, h}. */
export let IMAGES = {};
export function setImages(map){ IMAGES = map || {}; }

export const PAGE = { letter:{w:612,h:792,tw:12240,th:15840}, a4:{w:595.3,h:841.9,tw:11906,th:16838} };
export const MARGIN = 72, GAP = 36;
export const fullW = () => PAGE[R.page].w - 2*MARGIN;
export const colW  = () => (fullW() - GAP)/2;
