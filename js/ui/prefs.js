// Preferências de aparência do início (ficam neste navegador).

const KEY = "cadernim-aparencia";

/** Cores do site: cada uma troca a cor principal (botões, títulos) e a de destaque. */
export const ACCENTS = [
  {id:"lilas",   name:"Lilás",   dot:"#8e5fc0"},
  {id:"rosa",    name:"Rosa",    dot:"#d4588f"},
  {id:"menta",   name:"Menta",   dot:"#2f8a73"},
  {id:"pessego", name:"Pêssego", dot:"#d9683a"},
  {id:"ceu",     name:"Céu",     dot:"#3d7fbf"},
];
/** Desenhos que flutuam no topo do início. */
export const DOODLES = [
  {id:"misto",    name:"Um pouco de tudo", icons:["star","heart","pencil","sparkle","book-open","cloud"]},
  {id:"coracoes", name:"Corações",         icons:["heart"]},
  {id:"estrelas", name:"Estrelas",         icons:["star","sparkle"]},
  {id:"escola",   name:"Material escolar", icons:["pencil","ruler","book-open","paperclip","highlighter"]},
  {id:"nenhum",   name:"Sem desenhos",     icons:[]},
];
/** Seções do início, na ordem padrão. */
export const SECTIONS = [
  {id:"resumo",    name:"Resumo (números)"},
  {id:"favoritos", name:"Favoritos"},
  {id:"recentes",  name:"Continue de onde parou"},
  {id:"pastas",    name:"Minhas pastas"},
  {id:"etiquetas", name:"Etiquetas"},
  {id:"dica",      name:"Dica do dia"},
];

const DEFAULTS = {name:"", accent:"lilas", doodles:"misto", motion:true, sections:SECTIONS.map(s=>({id:s.id, on:true}))};

export function getPrefs(){
  let p = {};
  try{ p = JSON.parse(localStorage.getItem(KEY) || "{}"); }catch(e){}
  const out = {...DEFAULTS, ...p};
  // garante que toda seção aparece na lista (inclusive seções novas)
  const known = new Set(out.sections.map(s=>s.id));
  out.sections = out.sections.filter(s => SECTIONS.some(x=>x.id===s.id)).concat(SECTIONS.filter(s=>!known.has(s.id)).map(s=>({id:s.id, on:true})));
  return out;
}
export function savePrefs(patch){
  const p = {...getPrefs(), ...patch};
  try{ localStorage.setItem(KEY, JSON.stringify(p)); }catch(e){}
  applyPrefs(p);
  return p;
}
/** Aplica a cor escolhida e a preferência de animação no site todo. */
export function applyPrefs(p = getPrefs()){
  document.documentElement.dataset.accent = p.accent;
  document.documentElement.dataset.motion = p.motion ? "on" : "off";
}
