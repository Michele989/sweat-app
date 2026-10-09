// ================= FOTO VERE (post + profilo) =================
// File separato per non appesantire app-core.js: gestisce l'upload
// delle foto su Supabase Storage e il rendering degli avatar reali
// (qui e in app-core.js/app-social.js, tramite setAvatarContent).

let selectedCreaPhotos = [];

function fileExtension(file){
  const name = file.name || "";
  const dot = name.lastIndexOf(".");
  const ext = dot >= 0 ? name.slice(dot + 1).toLowerCase() : "";
  return /^[a-z0-9]{1,5}$/.test(ext) ? ext : "jpg";
}

async function uploadFileToBucket(bucket, file){
  if(!supabaseClient || !currentUser) throw new Error("non hai effettuato l'accesso");
  const path = currentUser.id + "/" + Date.now() + "-" + Math.random().toString(36).slice(2,8) + "." + fileExtension(file);
  const { error } = await supabaseClient.storage.from(bucket).upload(path, file, { cacheControl: "3600", upsert: false });
  if(error){ console.error("Upload su bucket '"+bucket+"' non riuscito:", error); throw error; }
  const { data } = supabaseClient.storage.from(bucket).getPublicUrl(path);
  return data && data.publicUrl;
}

// ---- Selettore foto nella creazione di un post (fino a 5) ----
function onCreaPhotosChosen(input){
  const files = Array.prototype.slice.call(input.files || []);
  if(files.length === 0){ return; } // utente ha annullato la selezione
  let addedAny = false;
  let rejectedForType = false;
  files.forEach(function(f){
    if(selectedCreaPhotos.length >= 5) return;
    if(!f.type || f.type.indexOf("image/") !== 0){ rejectedForType = true; return; }
    selectedCreaPhotos.push(f);
    addedAny = true;
  });
  input.value = "";
  renderCreaPhotoPreviews();
  if(!addedAny && rejectedForType){ toast("Scegli una o più immagini"); }
  else if(!addedAny){ toast("Hai già raggiunto il massimo di 5 foto"); }
}

function removeCreaPhoto(idx){
  selectedCreaPhotos.splice(idx, 1);
  renderCreaPhotoPreviews();
}

function renderCreaPhotoPreviews(){
  const row = document.getElementById("creaPhotoRow");
  if(!row) return;
  const addLabel = row.querySelector(".photo-picker-add");
  row.querySelectorAll(".photo-preview-thumb").forEach(function(el){ el.remove(); });
  selectedCreaPhotos.forEach(function(file, idx){
    const thumb = document.createElement("div");
    thumb.className = "photo-preview-thumb";
    const img = document.createElement("img");
    img.src = URL.createObjectURL(file);
    const removeBtn = document.createElement("button");
    removeBtn.className = "ppt-remove";
    removeBtn.textContent = "✕";
    removeBtn.onclick = function(){ removeCreaPhoto(idx); };
    thumb.appendChild(img); thumb.appendChild(removeBtn);
    row.insertBefore(thumb, addLabel);
  });
  if(addLabel) addLabel.style.display = selectedCreaPhotos.length >= 5 ? "none" : "flex";
}

function resetCreaPhotoPicker(){
  selectedCreaPhotos = [];
  renderCreaPhotoPreviews();
}

async function uploadSelectedCreaPhotos(){
  const urls = [];
  for(let i=0;i<selectedCreaPhotos.length;i++){
    try {
      const url = await uploadFileToBucket("post-photos", selectedCreaPhotos[i]);
      if(url) urls.push(url);
    } catch(e){ /* una foto non caricata non blocca la pubblicazione del post */ }
  }
  return urls;
}

// ---- Foto profilo ----
async function uploadAvatarPhoto(input){
  const file = input.files && input.files[0];
  input.value = "";
  if(!file){ return; } // utente ha annullato la selezione, nessun errore da mostrare
  if(!currentUser || !supabaseClient){ toast("Devi accedere per cambiare la foto profilo"); return; }
  if(file.type && file.type.indexOf("image/") !== 0){ toast("Scegli un'immagine"); return; }
  toast("Caricamento foto profilo...");
  try {
    const url = await uploadFileToBucket("avatars", file);
    if(!url) throw new Error("upload-failed: nessun url restituito");
    const { error: dbError } = await supabaseClient.from("profiles").update({ avatar_url: url }).eq("id", currentUser.id);
    if(dbError) throw dbError;
    if(currentProfile) currentProfile.avatar_url = url;
    const avEl = document.getElementById("profileAvatar");
    const displayName = (currentProfile && currentProfile.name) || (currentUser && currentUser.email) || "Utente Sweat";
    if(avEl) setAvatarContent(avEl, displayName, url);
    toast("Foto profilo aggiornata!");
  } catch(e){
    console.error("Caricamento foto profilo non riuscito:", e);
    toast("Caricamento non riuscito: " + (e && e.message ? e.message : "riprova"));
  }
}

// ---- Rendering condiviso avatar (iniziali di default, foto se presente) ----
function setAvatarContent(el, name, url){
  if(!el) return;
  if(url){
    el.textContent = "";
    el.style.background = "none";
    let img = el.querySelector("img");
    if(!img){
      img = document.createElement("img");
      img.loading = "lazy";
      el.appendChild(img);
    }
    img.src = url;
    img.alt = name || "";
  } else {
    el.innerHTML = "";
    el.textContent = (name || "??").slice(0,2).toUpperCase();
  }
}

// ---- Carosello foto + doppio tap per il like (dentro ai post del feed) ----
function buildPostPhotoBlock(post){
  const urls = Array.isArray(post.photo_urls) ? post.photo_urls.filter(Boolean) : [];
  if(urls.length === 0) return null;

  const likeFn = function(){
    const art = wrapper.closest ? wrapper.closest(".post") : null;
    if(art){
      const kudosBtn = art.querySelector(".kudos");
      if(kudosBtn && !kudosBtn.classList.contains("active")) toggleKudos(kudosBtn);
    }
  };

  let wrapper;
  if(urls.length === 1){
    wrapper = document.createElement("div");
    wrapper.className = "post-photo";
    const img = document.createElement("img");
    img.src = urls[0]; img.loading = "lazy"; img.alt = "";
    wrapper.appendChild(img);
    attachDoubleTapLike(wrapper, likeFn);
  } else {
    wrapper = document.createElement("div");
    wrapper.className = "photo-carousel";
    const track = document.createElement("div"); track.className = "carousel-track";
    const dots = document.createElement("div"); dots.className = "carousel-dots";
    urls.forEach(function(u, i){
      const slide = document.createElement("div"); slide.className = "carousel-slide";
      const img = document.createElement("img"); img.src = u; img.loading = "lazy"; img.alt = "";
      slide.appendChild(img);
      track.appendChild(slide);
      const dot = document.createElement("div"); dot.className = "cdot" + (i === 0 ? " on" : "");
      dots.appendChild(dot);
    });
    const countChip = document.createElement("div"); countChip.className = "carousel-count-chip"; countChip.textContent = "1/" + urls.length;
    track.addEventListener("scroll", function(){
      const idx = Math.round(track.scrollLeft / track.clientWidth);
      dots.querySelectorAll(".cdot").forEach(function(d, i){ d.classList.toggle("on", i === idx); });
      countChip.textContent = (idx + 1) + "/" + urls.length;
    }, { passive: true });
    wrapper.appendChild(track); wrapper.appendChild(dots); wrapper.appendChild(countChip);
    attachDoubleTapLike(wrapper, likeFn);
  }
  return wrapper;
}

function attachDoubleTapLike(el, onLike){
  let lastTap = 0;
  function showHeart(x, y){
    const heart = document.createElement("div");
    heart.className = "double-tap-heart show";
    heart.style.left = x + "px"; heart.style.top = y + "px"; heart.style.margin = "0";
    heart.style.position = "absolute"; heart.style.transform = "translate(-50%,-50%)";
    heart.appendChild(svgIcon("M12 21s-7-4.6-9.5-9C0.7 8.4 2 4.5 6 4c2.1-.3 3.7.8 6 3 2.3-2.2 3.9-3.3 6-3 4 .5 5.3 4.4 3.5 8-2.5 4.4-9.5 9-9.5 9z"));
    heart.querySelector("svg").setAttribute("fill", "currentColor");
    el.appendChild(heart);
    setTimeout(function(){ heart.remove(); }, 850);
  }
  el.style.position = el.style.position || "relative";
  el.addEventListener("click", function(e){
    const now = Date.now();
    if(now - lastTap < 350){
      const rect = el.getBoundingClientRect();
      showHeart(e.clientX - rect.left, e.clientY - rect.top);
      if(onLike) onLike();
    }
    lastTap = now;
  });
}
