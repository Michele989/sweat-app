// ================= ESPLORA: SCOPERTA OLTRE CHI SEGUI =================
// Due modalità nella tab Ricerca: "Persone" (quella già esistente) e
// "Popolari" (post più apprezzati di recente + ricerca per hashtag).

const EXPLORE_TYPE_ICONS = { "Corsa":"🏃", "Palestra":"🏋️", "Ciclismo":"🚴", "Camminata":"🚶", "Trekking":"🥾" };

function setSearchMode(mode){
  const personeBtn = document.getElementById("searchModePersone");
  const popolariBtn = document.getElementById("searchModePopolari");
  const panePersone = document.getElementById("paneSearchPersone");
  const panePopolari = document.getElementById("paneSearchPopolari");
  const isPopolari = mode === "popolari";
  if(personeBtn) personeBtn.classList.toggle("active", !isPopolari);
  if(popolariBtn) popolariBtn.classList.toggle("active", isPopolari);
  if(panePersone) panePersone.style.display = isPopolari ? "none" : "";
  if(panePopolari) panePopolari.style.display = isPopolari ? "" : "none";
  if(isPopolari) loadPopularPosts();
}

function renderExploreGrid(posts){
  const grid = document.getElementById("exploreGrid");
  if(!grid) return;
  grid.innerHTML = "";
  if(!posts || posts.length === 0){
    grid.innerHTML = '<div class="live-row" style="grid-column:1/-1;"><div class="txt">Nessun post trovato</div></div>';
    return;
  }
  posts.forEach(function(p){
    const cell = document.createElement("div");
    cell.className = "post-grid-cell";
    cell.onclick = function(){ openComments(p.id); };
    const photoUrls = Array.isArray(p.photo_urls) ? p.photo_urls.filter(Boolean) : [];
    if(photoUrls.length > 0){
      const img = document.createElement("img"); img.src = photoUrls[0]; img.loading = "lazy"; img.alt = "";
      cell.appendChild(img);
    } else {
      const ic = document.createElement("div"); ic.className = "pg-ic"; ic.textContent = EXPLORE_TYPE_ICONS[p.type] || "💪";
      cell.appendChild(ic);
      const typeLabel = document.createElement("div"); typeLabel.className = "pg-type"; typeLabel.textContent = p.type || "";
      cell.appendChild(typeLabel);
    }
    const val = document.createElement("div"); val.className = "pg-val"; val.style.position = "absolute"; val.style.bottom = "5px"; val.style.left = "6px"; val.style.color = "#fff"; val.style.textShadow = "0 1px 3px rgba(0,0,0,0.7)";
    val.textContent = "❤️ " + (p.likes_count || 0);
    cell.appendChild(val);
    grid.appendChild(cell);
  });
}

async function loadPopularPosts(){
  const grid = document.getElementById("exploreGrid");
  if(!grid || !supabaseClient) return;
  grid.innerHTML = '<div class="live-row" style="grid-column:1/-1;"><div class="txt">Caricamento...</div></div>';
  try {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data } = await supabaseClient.from("posts").select("*").gte("created_at", since).order("likes_count", { ascending: false }).limit(30);
    renderExploreGrid(data || []);
  } catch(e){
    grid.innerHTML = '<div class="live-row" style="grid-column:1/-1;"><div class="txt">Impossibile caricare i post popolari</div></div>';
  }
}

let hashtagSearchDebounce = null;
function runHashtagSearch(query){
  if(hashtagSearchDebounce) clearTimeout(hashtagSearchDebounce);
  hashtagSearchDebounce = setTimeout(function(){ executeHashtagSearch(query); }, 300);
}

async function executeHashtagSearch(query){
  const grid = document.getElementById("exploreGrid");
  if(!grid || !supabaseClient) return;
  const clean = (query || "").trim().replace(/^#/, "").toLowerCase();
  if(!clean){ loadPopularPosts(); return; }
  grid.innerHTML = '<div class="live-row" style="grid-column:1/-1;"><div class="txt">Ricerca...</div></div>';
  try {
    const { data } = await supabaseClient.from("posts").select("*").contains("hashtags", [clean]).order("created_at", { ascending: false }).limit(30);
    renderExploreGrid(data || []);
  } catch(e){
    grid.innerHTML = '<div class="live-row" style="grid-column:1/-1;"><div class="txt">Nessun risultato</div></div>';
  }
}
