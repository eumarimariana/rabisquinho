// Pequenas ajudas de tela: seletor, ícones, avisos, trilha de navegação e datas.
import { esc } from "../engine/index.js";

export const $ = (sel, el=document) => el.querySelector(sel);
export const view = $("#view");
export const ic = (name, cls="") => `<i data-lucide="${name}" class="${cls}" aria-hidden="true"></i>`;
/** Troca os <i data-lucide> por desenhos SVG. */
export const paint = (root=document) => { try{ window.lucide?.createIcons({root}); }catch(e){} };

export function toast(msg){
  const t = $("#toast"); t.textContent = msg; t.classList.add("show");
  clearTimeout(toast.t); toast.t = setTimeout(()=>t.classList.remove("show"), 3200);
}
export function crumbs(items){
  $("#crumbs").innerHTML = items.map((it,i)=> (i ? `<span class="sep" aria-hidden="true">›</span>` : "") +
    (it.href ? `<a href="${it.href}">${esc(it.label)}</a>` : `<span class="here" aria-current="page">${esc(it.label)}</span>`)).join("");
}
export function when(ts){
  const d = Math.round((Date.now()-ts)/60000);
  if(d < 1) return "agora mesmo";
  if(d < 60) return `há ${d} min`;
  if(d < 60*24) return `há ${Math.round(d/60)} h`;
  return new Date(ts).toLocaleDateString("pt-BR", {day:"numeric", month:"short"});
}
export function saveFile(blob, name){
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href), 5000);
}
/** Texto sem acento e em minúsculas (para comparar na busca e nas etiquetas). */
export const norm = s => String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
