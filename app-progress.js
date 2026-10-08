// ================= AGGIORNAMENTI DI PROGRESSO (MENSILI) =================
// Un posto dove registrare i miglioramenti fisici e in palestra nel tempo:
// foto, peso, percentuale di grasso corporeo e note, in una timeline
// personale separata dal feed pubblico degli allenamenti.

let selectedProgressPhotos = [];

function onProgressPhotosChosen(input){
  const files = Array.prototype.slice.call(input.files || []);
  files.forEach(function(f){
    if(selectedProgressPhotos.length >= 4) return;
    if(!f.type || f.type.indexOf("image/") !== 0) return;
    selectedProgressPhotos.push(f);
  });
  input.value = "";
  renderProgressPhotoPreviews();
}

function removeProgressPhoto(idx){
  selectedProgressPhotos.splice(idx, 1);
  renderProgressPhotoPreviews();
}

function renderProgressPhotoPreviews(){
  const row = document.getElementById("progressPhotoRow");
  if(!row) return;
  const addLabel = row.querySelector(".photo-picker-add");
  row.querySelectorAll(".photo-preview-thumb").forEach(function(el){ el.remove(); });
  selectedProgressPhotos.forEach(function(file, idx){
    const thumb = document.createElement("div");
    thumb.className = "photo-preview-thumb";
    const img = document.createElement("img");
    img.src = URL.createObjectURL(file);
    const removeBtn = document.createElement("button");
    removeBtn.className = "ppt-remove";
    removeBtn.textContent = "✕";
    removeBtn.onclick = function(){ removeProgressPhoto(idx); };
    thumb.appendChild(img); thumb.appendChild(removeBtn);
    row.insertBefore(thumb, addLabel);
  });
  if(addLabel) addLabel.style.display = selectedProgressPhotos.length >= 4 ? "none" : "flex";
}

function resetProgressPhotoPicker(){
  selectedProgressPhotos = [];
  renderProgressPhotoPreviews();
}

async function uploadSelectedProgressPhotos(){
  const urls = [];
  for(let i=0;i<selectedProgressPhotos.length;i++){
    try {
      const url = await uploadFileToBucket("progress-photos", selectedProgressPhotos[i]);
      if(url) urls.push(url);
    } catch(e){ /* una foto non caricata non blocca la pubblicazione dell'aggiornamento */ }
  }
  return urls;
}

async function publishProgressUpdate(){
  if(!supabaseClient || !currentUser){
    toast("Devi accedere per pubblicare un aggiornamento");
    return;
  }
  const weightRaw = (document.getElementById("progressWeight").value || "").replace(",", ".").trim();
  const weight = weightRaw ? parseFloat(weightRaw) : null;
  const fatRaw = (document.getElementById("progressBodyFat").value || "").replace(",", ".").trim();
  const bodyFat = fatRaw ? parseFloat(fatRaw) : null;
  const notesEl = document.getElementById("progressNotes");
  const notes = (notesEl.value || "").trim();

  try {
    const photoUrls = await uploadSelectedProgressPhotos();
    const { data, error } = await supabaseClient.from("progress_updates").insert({
      user_id: currentUser.id,
      author_name: (currentProfile && currentProfile.name) || currentUser.email,
      author_avatar_url: (currentProfile && currentProfile.avatar_url) || null,
      photo_urls: photoUrls.length ? photoUrls : null,
      weight_kg: (weight && !isNaN(weight)) ? weight : null,
      body_fat_percent: (bodyFat && !isNaN(bodyFat)) ? bodyFat : null,
      notes: notes || null
    }).select().single();
    if(error) throw error;

    document.getElementById("progressWeight").value = "";
    document.getElementById("progressBodyFat").value = "";
    notesEl.value = "";
    resetProgressPhotoPicker();
    toast("Aggiornamento pubblicato!");
    prependProgressTimelineItem(data);
  } catch(e){
    toast("Pubblicazione non riuscita, riprova");
  }
}

function formatProgressDate(iso){
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" });
  } catch(e){ return ""; }
}

function buildProgressTimelineCard(row){
  const card = document.createElement("div");
  card.className = "filter-card";
  card.style.marginBottom = "14px";

  const head = document.createElement("div");
  head.style.cssText = "display:flex; justify-content:space-between; align-items:baseline; margin-bottom:8px;";
  const dateEl = document.createElement("b"); dateEl.style.fontSize = "13px"; dateEl.textContent = formatProgressDate(row.created_at);
  head.appendChild(dateEl);
  if(row.weight_kg || row.body_fat_percent){
    const stats = document.createElement("span");
    stats.style.cssText = "font-size:12.5px; color:var(--fog);";
    const parts = [];
    if(row.weight_kg) parts.push(Number(row.weight_kg) + " kg");
    if(row.body_fat_percent) parts.push(Number(row.body_fat_percent) + "% grasso");
    stats.textContent = parts.join(" · ");
    head.appendChild(stats);
  }
  card.appendChild(head);

  const photoUrls = Array.isArray(row.photo_urls) ? row.photo_urls.filter(Boolean) : [];
  if(photoUrls.length){
    const row2 = document.createElement("div");
    row2.style.cssText = "display:flex; gap:6px; overflow-x:auto; margin-bottom:8px;";
    photoUrls.forEach(function(u){
      const img = document.createElement("img");
      img.src = u; img.loading = "lazy"; img.alt = "";
      img.style.cssText = "width:84px; height:84px; object-fit:cover; border-radius:10px; flex-shrink:0;";
      row2.appendChild(img);
    });
    card.appendChild(row2);
  }

  if(row.notes){
    const notesEl = document.createElement("p");
    notesEl.style.cssText = "font-size:13.5px; margin:0; white-space:pre-wrap;";
    notesEl.textContent = row.notes;
    card.appendChild(notesEl);
  }

  return card;
}

function prependProgressTimelineItem(row){
  const wrap = document.getElementById("progressTimeline");
  if(!wrap) return;
  const empty = wrap.querySelector(".live-row");
  if(empty) empty.remove();
  wrap.insertBefore(buildProgressTimelineCard(row), wrap.firstChild);
}

async function loadProgressUpdates(){
  const wrap = document.getElementById("progressTimeline");
  if(!wrap || !supabaseClient || !currentUser) return;
  wrap.innerHTML = '<div class="live-row"><div class="txt">Caricamento...</div></div>';
  try {
    const { data } = await supabaseClient.from("progress_updates").select("*").eq("user_id", currentUser.id).order("created_at", { ascending: false }).limit(24);
    wrap.innerHTML = "";
    if(!data || data.length === 0){
      wrap.innerHTML = '<div class="live-row"><div class="txt">Nessun aggiornamento ancora: pubblica il primo qui sopra</div></div>';
      return;
    }
    data.forEach(function(row){ wrap.appendChild(buildProgressTimelineCard(row)); });
  } catch(e){
    wrap.innerHTML = '<div class="live-row"><div class="txt">Impossibile caricare i tuoi aggiornamenti</div></div>';
  }
}
