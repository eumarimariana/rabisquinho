// Barra de formatação: botões que escrevem os símbolos no texto para a pessoa.

const esc = s => String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/"/g,"&quot;");

/* wrap = envolve a seleção; line = prefixo em cada linha; block = insere uma linha pronta */
const GROUPS = [
  [
    {icon:"bold",        title:"Negrito (Ctrl+B)",           wrap:["**","**"], ph:"negrito", key:"b"},
    {icon:"italic",      title:"Itálico (Ctrl+I)",           wrap:["*","*"],   ph:"itálico", key:"i"},
    {icon:"underline",   title:"Sublinhado (Ctrl+U)",        wrap:["__","__"], ph:"sublinhado", key:"u"},
    {icon:"highlighter", title:"Marca-texto amarelo",        wrap:["==","=="], ph:"importante"},
    {icon:"paintbrush",  title:"Marca-texto na cor do modelo", wrap:["++","++"], ph:"destaque"},
    {icon:"sparkle",     title:"Termo na cor principal",     wrap:["{{","}}"], ph:"termo"},
  ],
  [
    {icon:"heading-1",   title:"Tópico principal (1.0)",     line:"# ",   ph:"Novo tópico"},
    {icon:"heading-2",   title:"Subtópico (1.1)",            line:"## ",  ph:"Subtópico"},
    {icon:"heading-3",   title:"Sub-subtópico (1.1.1)",      line:"### ", ph:"Detalhe"},
    {icon:"circle-help", title:"Faixa de pergunta",          line:"? ",   ph:"Pergunta-chave"},
  ],
  [
    {icon:"list",         title:"Lista com marcador",        line:"- ",  ph:"item"},
    {icon:"list-ordered", title:"Lista numerada",            line:"1. ", ph:"item"},
    {icon:"star",         title:"Termo importante",          line:"! ",  ph:"termo importante"},
    {icon:"message-square-text", title:"Observação rápida",  line:"> ",  ph:"observação"},
    {icon:"indent-increase", title:"Mais para dentro",       indent:true},
  ],
  [
    {icon:"info",           title:"Bloco de observação importante", block:">> Importante | Escreva aqui a observação."},
    {icon:"triangle-alert", title:"Caixa de alerta",                block:"!!! Atenção | Escreva aqui o alerta."},
    {icon:"lightbulb",      title:"Você sabia?",                    block:"?! Tema | Pergunta? | Resposta curtinha."},
    {icon:"calendar-clock", title:"Linha do tempo",                 block:"@ 1500 | Acontecimento"},
    {icon:"image-plus",     title:"Imagem (ou cole com Ctrl+V)",    image:true},
    {icon:"table",          title:"Tabela",                         block:"Tabela: Título da tabela\n| Coluna 1 | Coluna 2 |\n| texto | texto |\n| texto | texto |"},
  ],
];

/** Troca o trecho [a,b) por `text`, mantendo o desfazer (Ctrl+Z) do navegador quando possível. */
function replace(ta, a, b, text, selA, selB){
  ta.focus();
  ta.setSelectionRange(a, b);
  let ok = false;
  try{ ok = document.execCommand("insertText", false, text); }catch(e){}
  if(!ok){ ta.setRangeText(text, a, b, "end"); ta.dispatchEvent(new Event("input", {bubbles:true})); }
  ta.setSelectionRange(selA ?? a + text.length, selB ?? a + text.length);
}

function applyWrap(ta, [open, close], ph){
  const {selectionStart:a, selectionEnd:b, value:v} = ta;
  const sel = v.slice(a, b);
  // já está envolvido? então tira
  if(v.slice(a - open.length, a) === open && v.slice(b, b + close.length) === close){
    replace(ta, a - open.length, b + close.length, sel, a - open.length, b - open.length); return;
  }
  const inner = sel || ph;
  replace(ta, a, b, open + inner + close, a + open.length, a + open.length + inner.length);
}

function lineRange(v, a, b){
  const start = v.lastIndexOf("\n", a - 1) + 1;
  let end = v.indexOf("\n", b > a && v[b-1] === "\n" ? b - 1 : b);
  if(end < 0) end = v.length;
  return [start, end];
}
const PREFIX_RE = /^(\s*)(#{1,3} |\?\?? |- |\d+\. |! |> )/;

function applyLine(ta, prefix, ph){
  const {selectionStart:a, selectionEnd:b, value:v} = ta;
  const [s, e] = lineRange(v, a, b);
  const lines = v.slice(s, e).split("\n");
  const all = lines.every(l => l.trimStart().startsWith(prefix) || !l.trim());
  let n = 0;
  const out = lines.map(l => {
    if(!l.trim() && lines.length > 1) return l;
    const [, ind] = l.match(/^(\s*)/);
    const body = l.slice(ind.length).replace(PREFIX_RE, "");
    if(all) return ind + body;                       // clicou de novo: tira o símbolo
    n++;
    const p = prefix === "1. " ? `${n}. ` : prefix;
    return ind + p + (body || ph);
  });
  const text = out.join("\n");
  if(lines.length === 1 && !lines[0].trim()){
    const p = prefix;
    replace(ta, s, e, p + ph, s + p.length, s + p.length + ph.length); return;
  }
  replace(ta, s, e, text, s, s + text.length);
}

function applyIndent(ta, back){
  const {selectionStart:a, selectionEnd:b, value:v} = ta;
  const [s, e] = lineRange(v, a, b);
  const text = v.slice(s, e).split("\n").map(l => back ? l.replace(/^ {1,2}/, "") : "  " + l).join("\n");
  replace(ta, s, e, text, s, s + text.length);
}

function applyBlock(ta, block){
  const {selectionStart:a, value:v} = ta;
  const [s, e] = lineRange(v, a, a);
  const cur = v.slice(s, e);
  // fica numa linha própria, com linha em branco antes e depois
  const before = cur.trim() ? "\n\n" : (s > 0 && v[s-2] !== "\n" ? "\n" : "");
  const at = cur.trim() ? e : s;
  const text = before + block + "\n";
  const first = block.indexOf("|") > 0 ? block.indexOf("|") + 2 : 0;
  const lineEnd = block.indexOf("\n") > 0 ? block.indexOf("\n") : block.length;
  replace(ta, at, cur.trim() ? e : e, text, at + before.length + first, at + before.length + lineEnd);
}

export function attachToolbar(bar, ta, paint, {onImage}={}){
  const items = GROUPS.flat();
  bar.innerHTML = GROUPS.map(g => `<span class="tb-group">${g.map(it => {
    const i = items.indexOf(it);
    return `<button type="button" class="tb-btn" data-i="${i}" title="${esc(it.title)}" aria-label="${esc(it.title)}"><i data-lucide="${it.icon}" aria-hidden="true"></i></button>`;
  }).join("")}</span>`).join("");
  paint?.(bar);
  const run = it => {
    if(it.wrap) applyWrap(ta, it.wrap, it.ph);
    else if(it.line) applyLine(ta, it.line, it.ph);
    else if(it.indent) applyIndent(ta, false);
    else if(it.block) applyBlock(ta, it.block);
    else if(it.image) onImage?.();
  };
  bar.addEventListener("mousedown", e => { if(e.target.closest(".tb-btn")) e.preventDefault(); }); // não perde a seleção
  bar.addEventListener("click", e => { const b = e.target.closest(".tb-btn"); if(b) run(items[+b.dataset.i]); });
  ta.addEventListener("keydown", e => {
    if(e.key === "Tab" && !e.ctrlKey && !e.altKey){
      // Tab só recua itens de lista; fora disso, o Tab continua mudando de campo.
      const v = ta.value, [ls, le] = lineRange(v, ta.selectionStart, ta.selectionEnd);
      if(/^\s*([-*•]|!|\d+[.)])\s/.test(v.slice(ls, le))){ e.preventDefault(); applyIndent(ta, e.shiftKey); }
      return;
    }
    if(!(e.ctrlKey || e.metaKey) || e.altKey) return;
    const it = items.find(x => x.key === e.key.toLowerCase());
    if(it){ e.preventDefault(); run(it); }
  });
}

/** Coloca uma linha pronta (ex.: imagem) numa linha própria, onde está o cursor. */
export function insertBlock(ta, block){ applyBlock(ta, block); }
