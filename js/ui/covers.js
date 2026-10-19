// Capas dos capítulos: recorta fotos no formato de faixa e desenha estampas nas cores do modelo.
import { COVER_RATIO } from "../engine/index.js";

const W = 1200, H = Math.round(W / COVER_RATIO);

const canvas = () => { const c = document.createElement("canvas"); c.width = W; c.height = H; return c; };
const toBlob = (c, type="image/png", q) => new Promise(res => c.toBlob(res, type, q));

/** Recorta a foto no meio, no formato da faixa, e salva como JPEG. */
export async function cropToBanner(file){
  const bmp = await createImageBitmap(file);
  const c = canvas(), g = c.getContext("2d");
  const scale = Math.max(W / bmp.width, H / bmp.height);
  const w = bmp.width * scale, h = bmp.height * scale;
  g.fillStyle = "#ffffff"; g.fillRect(0, 0, W, H);
  g.drawImage(bmp, (W - w) / 2, (H - h) / 2, w, h);
  bmp.close?.();
  return {blob: await toBlob(c, "image/jpeg", 0.86), type:"image/jpeg"};
}

/** Diminui a imagem (no máximo 1400 px de largura) para o arquivo não ficar pesado. */
export async function shrinkImage(file, max=1400){
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, max / bmp.width);
  const w = Math.round(bmp.width * k), h = Math.round(bmp.height * k);
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const g = c.getContext("2d");
  const png = file.type === "image/png";
  if(!png){ g.fillStyle = "#ffffff"; g.fillRect(0, 0, w, h); }
  g.drawImage(bmp, 0, 0, w, h); bmp.close?.();
  const type = png ? "image/png" : "image/jpeg";
  return {blob: await toBlob(c, type, 0.88), type, w, h};
}

/* ---------- estampas ---------- */
function heart(g, x, y, s){
  g.beginPath();
  g.moveTo(x, y + s*0.3);
  g.bezierCurveTo(x, y, x - s*0.5, y, x - s*0.5, y + s*0.3);
  g.bezierCurveTo(x - s*0.5, y + s*0.6, x, y + s*0.8, x, y + s);
  g.bezierCurveTo(x, y + s*0.8, x + s*0.5, y + s*0.6, x + s*0.5, y + s*0.3);
  g.bezierCurveTo(x + s*0.5, y, x, y, x, y + s*0.3);
  g.fill();
}
function star(g, x, y, r){
  g.beginPath();
  for(let i=0; i<10; i++){
    const a = -Math.PI/2 + i*Math.PI/5, rr = i%2 ? r*0.45 : r;
    g.lineTo(x + Math.cos(a)*rr, y + Math.sin(a)*rr);
  }
  g.closePath(); g.fill();
}

const DRAW = {
  dots(g, [bg, a, b]){
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    for(let y=0, row=0; y<H+60; y+=60, row++)
      for(let x=(row%2)*30; x<W+60; x+=60){ g.fillStyle = (row+x/60)%3<1 ? b : a; g.beginPath(); g.arc(x, y, 11, 0, Math.PI*2); g.fill(); }
  },
  stripes(g, [bg, a, b]){
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    g.save(); g.translate(W/2, H/2); g.rotate(-Math.PI/4);
    for(let x=-W, i=0; x<W; x+=70, i++){ g.fillStyle = i%2 ? a : b; g.fillRect(x, -W, 28, 2*W); }
    g.restore();
  },
  gingham(g, [bg, a]){
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    g.globalAlpha = 0.45; g.fillStyle = a;
    for(let x=0; x<W; x+=80) g.fillRect(x, 0, 40, H);
    for(let y=0; y<H; y+=80) g.fillRect(0, y, W, 40);
    g.globalAlpha = 1;
  },
  hearts(g, [bg, a, b]){
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    for(let y=-10, row=0; y<H; y+=80, row++)
      for(let x=(row%2)*45; x<W+60; x+=90){ g.fillStyle = row%2 ? a : b; heart(g, x, y, 34); }
  },
  waves(g, [bg, a, b]){
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    g.lineWidth = 14; g.lineCap = "round";
    for(let y=30, i=0; y<H+40; y+=56, i++){
      g.strokeStyle = i%2 ? a : b; g.beginPath();
      for(let x=0; x<=W; x+=10) g.lineTo(x, y + Math.sin(x/38 + i)*12);
      g.stroke();
    }
  },
  stars(g, [bg, a, b]){
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    let seed = 7; const rnd = () => (seed = (seed*9301 + 49297) % 233280) / 233280;
    for(let i=0; i<70; i++){ g.fillStyle = i%3 ? a : b; star(g, rnd()*W, rnd()*H, 10 + rnd()*16); }
  },
};
export const PATTERNS = [
  {id:"dots", name:"Bolinhas"}, {id:"stripes", name:"Listras"}, {id:"gingham", name:"Xadrez"},
  {id:"hearts", name:"Corações"}, {id:"waves", name:"Ondas"}, {id:"stars", name:"Estrelas"},
];

/** Cores da estampa a partir do modelo: fundo claro + duas cores de destaque. */
export const patternColors = R => [R.t1bg || "#fde4ef", R.n1bg || "#d4588f", R.n2bg || "#8e5fc0"];

export function patternCanvas(id, colors){
  const c = canvas(); DRAW[id](c.getContext("2d"), colors); return c;
}
export async function patternBlob(id, colors){
  return {blob: await toBlob(patternCanvas(id, colors), "image/png"), type:"image/png"};
}
