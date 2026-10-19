// Tela de busca: procura em pastas, títulos, etiquetas e no texto de todas as páginas.
import * as store from "../data/store.js";
import { esc, plainText } from "../engine/index.js";
import { $, view, crumbs, norm } from "../ui/dom.js";
import { colorOf } from "../ui/colors.js";
import { nbTitle, folderCard } from "../ui/cards.js";

function snippet(line, q){
  const t = plainText(line), i = norm(t).indexOf(norm(q));
  const a = Math.max(0, i - 50), b = Math.min(t.length, i + q.length + 70);
  return (a ? "…" : "") + esc(t.slice(a, i)) + `<mark>${esc(t.slice(i, i + q.length))}</mark>` + esc(t.slice(i + q.length, b)) + (b < t.length ? "…" : "");
}
export async function searchView(q){
  q = q.trim();
  crumbs([{label:"Início", href:"#/"}, {label:`Busca: ${q}`}]);
  $("#q").value = q;
  const [folders, notebooks] = await Promise.all([store.listFolders(), store.listNotebooks()]);
  const byId = Object.fromEntries(folders.map(f=>[f.id,f]));
  const nq = norm(q), results = [];
  const matchFolders = folders.filter(f => norm(f.name).includes(nq));
  for(const nb of notebooks){
    const pages = Array.isArray(nb.pages) && nb.pages.length ? nb.pages : [{text:nb.text||""}];
    const hits = [];
    pages.forEach((p, pi) => (p.text||"").split("\n").forEach(line => {
      if(hits.length < 4 && norm(plainText(line)).includes(nq)) hits.push({pi, html:snippet(line, q)});
    }));
    const inTitle = [nb.lesson, nb.subject, nb.prof, ...(nb.tags||[])].some(v => norm(v||"").includes(nq));
    if(hits.length || inTitle) results.push({nb, hits, score: (inTitle ? 100 : 0) + hits.length});
  }
  results.sort((a,b) => b.score - a.score || b.nb.updatedAt - a.nb.updatedAt);
  const total = results.length + matchFolders.length;
  view.innerHTML = `
    <div class="hello"><div><h1>${total ? `${total} ${total===1?"resultado":"resultados"}` : "Nada encontrado"}</h1>
      <p>${total ? `para "${esc(q)}"` : `Não achamos "${esc(q)}" em nenhum caderno. Tente outra palavra.`}</p></div></div>
    ${matchFolders.length ? `<h2 class="section-title">Pastas</h2><div class="grid">${matchFolders.map(f=>folderCard(f)).join("")}</div>` : ""}
    ${results.length ? `<h2 class="section-title">Cadernos</h2><div class="results">${results.map(({nb, hits})=>{
      const f = byId[nb.folderId];
      return `<article class="result">
        <a class="result-head" href="#/caderno/${nb.id}"><span class="chip" style="background:${colorOf(nb)}"></span>
          <b>${esc(nbTitle(nb))}</b><small>${esc(f ? f.name : "")}</small></a>
        ${hits.map(h=>`<a class="hit" href="#/caderno/${nb.id}/${h.pi}" data-q="${esc(q)}"><span class="hit-page">Pág. ${h.pi+1}</span><span>${h.html}</span></a>`).join("")}
      </article>`;}).join("")}</div>` : ""}`;
}
