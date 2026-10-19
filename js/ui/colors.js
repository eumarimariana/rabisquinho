// Cores pastel das capas e pastas, e o seletor de cor.
// Tons pastel para capas de cadernos e pastas
export const COLORS = ["#f9cfe0","#f5b8cf","#e3d3f7","#cdb4ee","#d5d9fb","#d4e9f9","#d3f0e3","#fbf1c2","#ffdcc8","#efe3ea"];
export const COLOR_NAMES = ["rosa","rosa forte","lilás","roxo","lavanda","azul bebê","menta","baunilha","pêssego","névoa"];
export const FOLDER_COLORS = COLORS;
export const randomColor = () => COLORS[Math.floor(Math.random()*COLORS.length)];
export const colorOf = (obj) => obj.color || COLORS[[...String(obj.id)].reduce((a,c)=>a+c.charCodeAt(0),0) % COLORS.length];

/** Bolinhas de cor + "outra cor" (seletor livre). */
export function colorPicker(name, current, small){
  const known = COLORS.includes(current);
  return `<div class="colors">${COLORS.map((c,i)=>`<button type="button" class="swatch${small?" sm":""}" data-pick="${name}" data-value="${c}" aria-pressed="${c===current}" style="background:${c}" aria-label="Cor ${COLOR_NAMES[i]}" title="${COLOR_NAMES[i]}"></button>`).join("")}
    <label class="swatch custom${small?" sm":""}" data-pick="${name}" data-value="${known?"":current}" aria-pressed="${!known}" title="Outra cor" ${!known?`style="background:${current}"`:""}>
      <input type="color" data-custom="${name}" value="${known?"#f9cfe0":current}" aria-label="Escolher outra cor"></label></div>`;
}
export function wireColorPicker(root, name, onPick){
  root.addEventListener("click", e=>{
    const b = e.target.closest(`[data-pick="${name}"]`); if(!b || b.tagName==="LABEL") return;
    root.querySelectorAll(`[data-pick="${name}"]`).forEach(x=>x.setAttribute("aria-pressed", x===b));
    onPick?.(b.dataset.value);
  });
  const inp = root.querySelector(`[data-custom="${name}"]`);
  inp?.addEventListener("input", ()=>{
    const lab = inp.parentElement; lab.dataset.value = inp.value; lab.style.background = inp.value;
    root.querySelectorAll(`[data-pick="${name}"]`).forEach(x=>x.setAttribute("aria-pressed", x===lab));
    onPick?.(inp.value);
  });
}
