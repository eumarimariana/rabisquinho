// Modelos de caderno do Cadernim (criação própria).
//
// Cada modelo junta uma paleta (cores) e um estilo (jeito do cabeçalho, dos títulos e do rodapé).
// As opções de estilo estão explicadas em js/engine/model.js.

/** Monta todas as cores de um modelo a partir de uma paleta pequena. */
function palette(p){
  const onMain = p.onMain || "#ffffff", onDeep = p.onDeep || "#ffffff";
  return {
    subj:p.deep, hdrBg:p.main, hdrInk:onMain, hdrInk2:p.deep, rule:p.main, yearBg:p.soft, src:p.main,
    n1bg:p.main, n1ink:onMain, t1bg:p.soft, t1ink:p.deep, t1bd:p.main,
    n2bg:p.accent, n2ink:p.onAccent || "#ffffff", n2bd:p.accent, t2ink:p.deep, t2line:p.accent, key:p.key || p.main,
    q:p.deep, qInk:onDeep, q2bg:p.soft, q2ink:p.deep, q2line:p.main,
    imp:p.soft, impBd:p.main, impLabel:p.deep, impLabelInk:onDeep, alert:p.accent, alertInk:p.onAccent || "#ffffff", alertBd:p.accent,
    cur:p.main, curLabel:p.deep, curLabelInk:onDeep, hl1:p.hl1 || "#fff3a3", hl2:p.hl2 || p.soft,
    th:p.soft, thInk:p.deep, tf:null, tfInk:p.main, tbd:p.main,
    footInk:p.deep, footBox:p.main, footBoxInk:onMain, pageBg:p.deep, pageInk:onDeep,
    bulletInk:p.main,
    dots:[p.main, p.accent, p.soft, p.deep],
  };
}

const T = (o, p) => Object.assign({upper:false, bodySz:10, indent:0, bullets:["•","◦","–"], sep:false, font:"Nunito"}, palette(p), o);

export const TEMPLATES = [
  T({id:"morango", name:"Morango", desc:"Rosa, vermelho e creme",
     hdr:"band", h1:"box", h2:"box", foot:"band", headFont:"Pacifico", headLight:true, labelFont:"Nunito", titleSz:24, mark:"♥",
     bullets:["♥","•","–"], sepChar:"♥"},
    {main:"#e4576e", deep:"#9c2f45", soft:"#fde2e6", accent:"#f29aa9", key:"#d94660", hl2:"#ffd3dc"}),

  T({id:"lavanda", name:"Lavanda", desc:"Lilás, roxo e rosa clarinho",
     hdr:"center", h1:"ribbon", h2:"line", foot:"center", headFont:"Quicksand", labelFont:"Quicksand", font:"Quicksand", mark:"✿",
     bullets:["✿","◦","–"], sepChar:"✿"},
    {main:"#9b7bd1", deep:"#5b3f8c", soft:"#f1eafb", accent:"#e795b8", key:"#8a62c9", hl2:"#f9d9e7"}),

  T({id:"menta", name:"Menta", desc:"Verde menta, pêssego e branco",
     hdr:"line", h1:"tab", h2:"box", foot:"line", headFont:"Lora", labelFont:"Nunito", bodySz:9.5, indent:18, sep:true,
     bullets:["•","◦","➔"]},
    {main:"#3fa38a", deep:"#22604f", soft:"#e3f5ee", accent:"#f4a37f", key:"#2f8a73", hl2:"#ffe0cf"}),

  T({id:"pessego", name:"Pêssego & Mel", desc:"Pêssego, amarelo mel e marrom",
     hdr:"band", h1:"tab", h2:"line", foot:"band", headFont:"Lora", labelFont:"Lora", upper:false,
     bullets:["•","–","·"]},
    {main:"#ef8a5b", deep:"#7a4127", soft:"#fff0e4", accent:"#e9b33c", onAccent:"#4a2a14", key:"#d9683a", hl1:"#ffe58a", hl2:"#ffd6bf"}),

  T({id:"ceu", name:"Céu de Algodão", desc:"Azul bebê, azul marinho e rosa",
     hdr:"center", h1:"box", h2:"line", foot:"center", headFont:"Comfortaa", labelFont:"Comfortaa", mark:"✦",
     bullets:["✦","◦","–"], sepChar:"✦"},
    {main:"#5d9fd6", deep:"#28466f", soft:"#e8f2fb", accent:"#ef93b4", key:"#3d7fbf", hl2:"#fbdbe7"}),

  T({id:"rabisco", name:"Rabisco", desc:"Jeito de caderno escrito à mão",
     hdr:"line", h1:"ribbon", h2:"line", foot:"line", headFont:"Caveat", headLight:false, labelFont:"Caveat", titleSz:28, headScale:1.35, mark:"✎",
     bullets:["–","•","·"], sepChar:"~"},
    {main:"#3b5bdb", deep:"#1f3191", soft:"#fffbe0", accent:"#e03131", key:"#e03131", hl1:"#fff176", hl2:"#ffd8d8"}),

  T({id:"matcha", name:"Matcha Latte", desc:"Verde matcha, bege e rosa",
     hdr:"band", h1:"box", h2:"box", foot:"line", headFont:"Nunito", labelFont:"Nunito", upper:true, sep:true, indent:18,
     bullets:["•","◦","–"]},
    {main:"#86a85a", deep:"#45602c", soft:"#f2ecdf", accent:"#e9a3b4", onAccent:"#5a2534", key:"#6d8f43", hl2:"#f7dde3"}),
];

/** Cadernos antigos usavam outros modelos: cada um abre no novo mais parecido. */
export const TEMPLATE_ALIASES = {w2:"morango", w1:"pessego", cp:"lavanda", dropPop:"matcha", cotton:"morango", primary:"ceu", fruit:"pessego"};

/** Fontes do Google Fonts usadas pelos modelos (para a prévia). */
export const TEMPLATE_FONTS = ["Nunito:ital,wght@0,400;0,700;1,400;1,700","Quicksand:wght@400;700","Lora:ital,wght@0,400;0,700;1,400",
  "Comfortaa:wght@400;700","Pacifico","Caveat:wght@400;700"];
