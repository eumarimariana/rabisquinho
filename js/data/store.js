// Armazenamento das pastas e cadernos no navegador (IndexedDB).
// Tudo fica no aparelho de cada pessoa; o backup exporta/importa um arquivo .json.

// O nome interno continua "notas-fofas" (nome antigo do site) para não perder os cadernos já salvos.
const DB_NAME = "notas-fofas";
const DB_VERSION = 1;
let dbPromise = null;

function open(){
  if(dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject)=>{
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if(!db.objectStoreNames.contains("folders")) db.createObjectStore("folders", {keyPath:"id"});
      if(!db.objectStoreNames.contains("notebooks")){
        const s = db.createObjectStore("notebooks", {keyPath:"id"});
        s.createIndex("folderId", "folderId");
      }
    };
    req.onsuccess = () => {
      const db = req.result;
      // Se outra aba abrir uma versão mais nova do site, esta libera o banco e recarrega.
      db.onversionchange = () => { db.close(); location.reload(); };
      resolve(db);
    };
    req.onerror = () => {
      // Banco já numa versão mais nova (de um teste antigo): abre do jeito que está.
      if(req.error?.name==="VersionError"){ dbPromise = null; const r2 = indexedDB.open(DB_NAME); r2.onsuccess = () => resolve(r2.result); r2.onerror = () => reject(r2.error); }
      else reject(req.error);
    };
    req.onblocked = () => reject(new Error("blocked"));
  });
  return dbPromise;
}

/* As imagens ficam num banco à parte, para não precisar atualizar o banco principal. */
let imgPromise = null;
function openImages(){
  if(imgPromise) return imgPromise;
  imgPromise = new Promise((resolve, reject)=>{
    const req = indexedDB.open(DB_NAME+"-imagens", 1);
    req.onupgradeneeded = () => { req.result.createObjectStore("images", {keyPath:"id"}).createIndex("notebookId", "notebookId"); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return imgPromise;
}

async function tx(store, mode, fn){
  const db = await (store==="images" ? openImages() : open());
  return new Promise((resolve, reject)=>{
    const t = db.transaction(store, mode);
    const s = t.objectStore(store);
    let out;
    Promise.resolve(fn(s)).then(v => { out = v; });
    t.oncomplete = () => resolve(out);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}
const req2p = r => new Promise((res, rej)=>{ r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });

export const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36)+Math.random().toString(36).slice(2)).replace(/-/g,"").slice(0,16);

/* ---------- pastas ---------- */
export async function listFolders(){
  const all = await tx("folders", "readonly", s => req2p(s.getAll()));
  return all.sort((a,b)=> a.name.localeCompare(b.name, "pt-BR"));
}
export const getFolder = id => tx("folders", "readonly", s => req2p(s.get(id)));
export async function saveFolder(f){
  const now = Date.now();
  const doc = {createdAt:now, ...f, updatedAt:now};
  await tx("folders", "readwrite", s => s.put(doc));
  return doc;
}
export async function deleteFolder(id){
  const nbs = await listNotebooks(id);
  for(const n of nbs) await deleteNotebook(n.id);
  await tx("folders", "readwrite", s => s.delete(id));
}

/* ---------- cadernos ---------- */
export async function listNotebooks(folderId){
  const all = folderId
    ? await tx("notebooks", "readonly", s => req2p(s.index("folderId").getAll(folderId)))
    : await tx("notebooks", "readonly", s => req2p(s.getAll()));
  return all.sort((a,b)=> b.updatedAt - a.updatedAt);
}
export const getNotebook = id => tx("notebooks", "readonly", s => req2p(s.get(id)));
export async function saveNotebook(nb){
  const now = Date.now();
  const doc = {createdAt:now, ...nb, updatedAt:now};
  await tx("notebooks", "readwrite", s => s.put(doc));
  return doc;
}
/** Muda só alguns campos (favorito, etiquetas) sem mexer na data de edição. */
export async function patchNotebook(id, patch){
  const nb = await getNotebook(id); if(!nb) return null;
  const doc = {...nb, ...patch};
  await tx("notebooks", "readwrite", s => s.put(doc));
  return doc;
}
export async function deleteNotebook(id){
  const imgs = await listImages(id);
  await tx("images", "readwrite", s => imgs.forEach(im => s.delete(im.id)));
  await tx("notebooks", "readwrite", s => s.delete(id));
}

/* ---------- imagens de capa ---------- */
export const listImages = notebookId => tx("images", "readonly", s => req2p(s.index("notebookId").getAll(notebookId)));
export async function saveImage(img){ await tx("images", "readwrite", s => s.put({createdAt:Date.now(), ...img})); return img; }
export const deleteImage = id => tx("images", "readwrite", s => s.delete(id));

const blobToDataURL = b => new Promise((res, rej)=>{ const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(r.error); r.readAsDataURL(b); });
const dataURLToBlob = async u => (await fetch(u)).blob();

/* ---------- backup ---------- */
export async function exportAll(){
  return {app:"rabisquinho", version:1, exportedAt:new Date().toISOString(),
    folders: await listFolders(), notebooks: await listNotebooks(),
    images: await Promise.all((await tx("images", "readonly", s => req2p(s.getAll()))).map(async im => ({...im, blob:undefined, data: await blobToDataURL(im.blob)})))};
}
export async function importAll(data){
  if(!data || !["rabisquinho","cadernim","notas-fofas"].includes(data.app) || !Array.isArray(data.folders) || !Array.isArray(data.notebooks))
    throw new Error("Esse arquivo não é um backup do Rabisquinho.");
  await tx("folders", "readwrite", s => data.folders.forEach(f => s.put(f)));
  await tx("notebooks", "readwrite", s => data.notebooks.forEach(n => s.put(n)));
  const imgs = await Promise.all((data.images||[]).map(async im => { const {data:d, ...rest} = im; return {...rest, blob: await dataURLToBlob(d)}; }));
  await tx("images", "readwrite", s => imgs.forEach(im => s.put(im)));
  return {folders:data.folders.length, notebooks:data.notebooks.length};
}

/** Pede ao navegador para não apagar os dados quando faltar espaço. */
export function askPersist(){ try{ navigator.storage?.persist?.(); }catch(e){} }
