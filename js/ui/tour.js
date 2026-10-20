// Tour de boas-vindas: aparece na primeira visita e pode ser aberto de novo pelo botão "?" no topo.
import { ic, paint } from "./dom.js";

const SEEN_KEY = "rabisquinho-tour-visto";

const STEPS = [
  {
    title: "Bem-vinda ao Rabisquinho!",
    text: `Um caderno digital fofinho para estudar. Você escreve suas anotações e elas viram páginas de caderno lindas, prontas para baixar em <b>Word</b> ou <b>PDF</b>.`,
    art: `<div class="tour-art logo-art"><img src="img/logo.svg" alt=""></div>`,
  },
  {
    title: "Pastas e cadernos",
    text: `Crie uma <b>pasta</b> para cada matéria e, dentro dela, um <b>caderno</b> para cada aula. Escolha a cor e o ícone, marque favoritos com a estrela e use etiquetas como "prova".`,
    art: `<div class="tour-art row-art">
      <span class="mini-folder" style="--fc:#d3f0e3">${ic("flask-conical")}</span>
      <span class="mini-folder" style="--fc:#ffdcc8">${ic("landmark")}</span>
      <span class="mini-nb" style="--cc:#f9cfe0"></span><span class="mini-nb" style="--cc:#e3d3f7"></span></div>`,
  },
  {
    title: "Escrever é fácil",
    text: `Cada linha vira um pedaço do caderno. Use os botões da barra de formatação ou digite os atalhos, sem precisar decorar nada.`,
    art: `<div class="tour-art syntax-art">
      <div><code># Fotossíntese</code><span>tópico 1.0</span></div>
      <div><code>- Usa luz e água</code><span>marcador</span></div>
      <div><code>! Produz oxigênio</code><span>termo importante</span></div>
      <div><code>==cloroplasto==</code><span>marca-texto</span></div></div>`,
  },
  {
    title: "Modelos, Word e PDF",
    text: `Troque o <b>modelo</b> com um clique e veja a prévia na hora. Quando o texto fica grande, ele vira várias folhas sozinho. Depois é só baixar em <b>.docx</b> ou <b>PDF</b>.`,
    art: `<div class="tour-art row-art">${["#e4576e","#9b7bd1","#3fa38a","#ef8a5b","#5d9fd6","#3b5bdb","#86a33a"].map(c=>`<span class="mini-sheet" style="--tc:${c}"><i></i><i></i><i></i></span>`).join("")}</div>`,
  },
  {
    title: "Uma ajudinha da IA",
    text: `Na aba <b>IA</b> do editor, ela <b>resume</b> páginas, <b>organiza</b> um texto colado, cria <b>perguntas de revisão</b> e <b>explica</b> termos. Para usar, coloque a sua chave em Configurações (tem opção grátis com o OpenRouter).`,
    art: `<div class="tour-art row-art icons-art">${["sparkles","wand-sparkles","list-checks","lightbulb"].map(i=>`<span>${ic(i)}</span>`).join("")}</div>`,
  },
  {
    title: "Seus cadernos ficam com você",
    text: `Tudo fica salvo <b>neste navegador</b>, sem login. Use <b>Fazer backup</b> de vez em quando para guardar uma cópia ou levar seus cadernos para outro computador.`,
    art: `<div class="tour-art row-art icons-art">${["shield-check","download","upload"].map(i=>`<span>${ic(i)}</span>`).join("")}</div>`,
  },
];

let dlg = null, step = 0;

function draw(){
  const s = STEPS[step], last = step === STEPS.length - 1;
  dlg.innerHTML = `
    <div class="tour">
      <button type="button" class="tour-skip" data-act="close">Pular</button>
      ${s.art}
      <p class="tour-count">${step + 1} de ${STEPS.length}</p>
      <h2 id="tour-title">${s.title}</h2>
      <p class="tour-text">${s.text}</p>
      <div class="tour-dots" aria-hidden="true">${STEPS.map((_, i) => `<i class="${i === step ? "on" : ""}"></i>`).join("")}</div>
      <div class="tour-nav">
        <button type="button" class="btn" data-act="back" ${step === 0 ? "hidden" : ""}>${ic("arrow-left")}Voltar</button>
        <button type="button" class="btn primary" data-act="${last ? "close" : "next"}" id="tour-next">${last ? "Começar a usar" : "Próximo"}${last ? ic("check") : ic("arrow-right")}</button>
      </div>
    </div>`;
  paint(dlg);
  dlg.querySelector("#tour-next").focus();
}

function close(){
  try{ localStorage.setItem(SEEN_KEY, "1"); }catch(e){}
  dlg.close();
}

export function openTour(){
  if(!dlg){
    dlg = document.createElement("dialog");
    dlg.className = "tour-dialog";
    dlg.setAttribute("aria-labelledby", "tour-title");
    document.body.appendChild(dlg);
    dlg.addEventListener("click", e => {
      const b = e.target.closest("[data-act]"); if(!b) return;
      if(b.dataset.act === "next" && step < STEPS.length - 1){ step++; draw(); }
      else if(b.dataset.act === "back" && step > 0){ step--; draw(); }
      else if(b.dataset.act === "close") close();
    });
    dlg.addEventListener("keydown", e => {
      if(e.key === "ArrowRight" && step < STEPS.length - 1){ step++; draw(); }
      if(e.key === "ArrowLeft" && step > 0){ step--; draw(); }
    });
    dlg.addEventListener("cancel", () => { try{ localStorage.setItem(SEEN_KEY, "1"); }catch(e){} });   // Esc também conta como visto
  }
  step = 0; draw();
  if(!dlg.open) dlg.showModal();
}

/** Abre o tour só na primeira visita. */
export function maybeShowTour(){
  let seen = false;
  try{ seen = !!localStorage.getItem(SEEN_KEY); }catch(e){ seen = true; }
  if(!seen) openTour();
}
