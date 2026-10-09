// ================= FOLLOW TRA UTENTI =================
let currentlyFollowing = false;

async function toggleFollow(){
  if(!currentUser || !currentOtherProfile) return;
  const btn = document.getElementById("otherFollowBtn");
  try {
    if(currentlyFollowing){
      await supabaseClient.from("follows").delete().match({ follower_id: currentUser.id, following_id: currentOtherProfile.id });
      currentlyFollowing = false;
      if(btn) btn.textContent = "Segui";
    } else {
      await supabaseClient.from("follows").insert({ follower_id: currentUser.id, following_id: currentOtherProfile.id });
      currentlyFollowing = true;
      if(btn) btn.textContent = "Non seguire più";
    }
  } catch(e){ toast("Operazione non riuscita, riprova"); }
}

async function refreshFollowButton(otherId){
  const btn = document.getElementById("otherFollowBtn");
  const challengeBtn = document.getElementById("otherChallengeBtn");
  if(!btn || !currentUser) return;
  if(otherId === currentUser.id){
    btn.style.display = "none";
    if(challengeBtn) challengeBtn.style.display = "none";
    return;
  }
  btn.style.display = "block";
  if(challengeBtn) challengeBtn.style.display = "block";
  try {
    const { data } = await supabaseClient.from("follows").select("*").match({ follower_id: currentUser.id, following_id: otherId }).maybeSingle();
    currentlyFollowing = !!data;
    btn.textContent = currentlyFollowing ? "Non seguire più" : "Segui";
  } catch(e){
    currentlyFollowing = false;
    btn.textContent = "Segui";
  }
}

// ================= RICERCA UTENTI E GRUPPI =================
let searchDebounceTimer = null;

function runSearch(query){
  clearTimeout(searchDebounceTimer);
  const q = query.trim();
  const wrap = document.getElementById("searchResults");
  const pymkBox = document.getElementById("peopleYouMayKnow");
  if(!q){
    wrap.innerHTML = "";
    if(pymkBox) pymkBox.style.display = "block";
    return;
  }
  if(pymkBox) pymkBox.style.display = "none";
  searchDebounceTimer = setTimeout(function(){ performSearch(q); }, 350);
}

async function performSearch(q){
  const wrap = document.getElementById("searchResults");
  wrap.innerHTML = '<div class="live-row"><div class="txt">Ricerca in corso...</div></div>';
  try {
    const [{ data: people }, { data: groupsFound }] = await Promise.all([
      supabaseClient.from("profiles").select("id,name,city,avatar_url").ilike("name", "%" + q + "%").limit(15),
      supabaseClient.from("groups").select("*").ilike("name", "%" + q + "%").limit(15)
    ]);

    wrap.innerHTML = "";
    const results = [];
    (people || []).forEach(function(p){ results.push({ kind: "persona", data: p }); });
    (groupsFound || []).forEach(function(g){ results.push({ kind: "gruppo", data: g }); });

    if(results.length === 0){
      wrap.innerHTML = '<div class="live-row"><div class="txt">Nessun risultato per "' + q + '"</div></div>';
      return;
    }

    results.forEach(function(r){
      const row = document.createElement("div");
      row.className = "conv-row";
      const av = document.createElement("div");
      av.className = "avatar " + (r.kind === "persona" ? "a1" : "a4");
      setAvatarContent(av, r.data.name, r.kind === "persona" ? r.data.avatar_url : null);
      const ci = document.createElement("div"); ci.className = "ci";
      const cn = document.createElement("div"); cn.className = "cn"; cn.textContent = r.data.name;
      const cp = document.createElement("div"); cp.className = "cp";
      cp.textContent = r.kind === "persona" ? ("Persona" + (r.data.city ? " · " + r.data.city : "")) : ("Gruppo · " + (r.data.members_count || 1) + " iscritti");
      ci.appendChild(cn); ci.appendChild(cp);
      row.appendChild(av); row.appendChild(ci);
      row.onclick = function(){
        if(r.kind === "persona") viewProfile(r.data.id);
        else go("gruppi");
      };
      wrap.appendChild(row);
    });
  } catch(e){
    wrap.innerHTML = '<div class="live-row"><div class="txt">Ricerca non riuscita</div></div>';
  }
}

// ================= PRESENZA "ONLINE ORA" =================
async function updateLastSeen(){
  if(!supabaseClient || !currentUser) return;
  try { await supabaseClient.from("profiles").update({ last_seen: new Date().toISOString() }).eq("id", currentUser.id); } catch(e){}
}

function isRecentlyOnline(lastSeen){
  if(!lastSeen) return false;
  const diffMs = Date.now() - new Date(lastSeen).getTime();
  return diffMs < 5 * 60 * 1000; // online se visto negli ultimi 5 minuti
}

if(typeof window !== "undefined"){
  window.addEventListener("load", function(){
    setTimeout(updateLastSeen, 2000);
    setInterval(updateLastSeen, 60000);
  });
}

// ================= MENU POST: pannello a comparsa con pulsanti veri =================
// Sostituisce il vecchio prompt() testuale "scrivi MODIFICA o ELIMINA": ora è
// un pannello dal basso con un pulsante per ogni azione, come il menu Condividi.
function handlePostMenu(postId, isOwn){
  document.querySelectorAll(".share-menu").forEach(function(m){ m.remove(); });
  if(typeof closeAllReactionPickers === "function") closeAllReactionPickers();

  const menu = document.createElement("div");
  menu.className = "share-menu";

  function addOpt(label, handler, danger){
    const opt = document.createElement("button");
    opt.className = "share-menu-opt" + (danger ? " danger" : "");
    opt.textContent = label;
    opt.onclick = function(e){ e.stopPropagation(); menu.remove(); handler(); };
    menu.appendChild(opt);
  }

  if(isOwn){
    addOpt("Modifica didascalia", function(){ editPostCaption(postId); });
    addOpt("Archivia", function(){ archivePost(postId); });
    addOpt("Elimina", function(){ deletePost(postId); }, true);
  } else {
    addOpt("Segnala", function(){ reportPost(postId); });
  }
  addOpt("Annulla", function(){});

  document.body.appendChild(menu);
  setTimeout(function(){ document.addEventListener("click", function closeIt(){ menu.remove(); document.removeEventListener("click", closeIt); }); }, 0);
}

async function editPostCaption(postId){
  const current = realPosts.find(function(p){ return p.id === postId; });
  const newCaption = window.prompt("Nuova didascalia:", current ? current.caption : "");
  if(newCaption === null) return;
  try {
    await supabaseClient.from("posts").update({ caption: newCaption }).eq("id", postId);
    if(current) current.caption = newCaption;
    renderDynamicPosts();
    toast("Post aggiornato");
  } catch(e){ toast("Modifica non riuscita"); }
}

async function deletePost(postId){
  if(!window.confirm("Eliminare definitivamente questo post?")) return;
  try {
    await supabaseClient.from("posts").delete().eq("id", postId);
    realPosts = realPosts.filter(function(p){ return p.id !== postId; });
    renderDynamicPosts();
    toast("Post eliminato");
  } catch(e){ toast("Eliminazione non riuscita"); }
}

// ================= ARCHIVIA / RIPRISTINA ALLENAMENTI =================
async function archivePost(postId){
  try {
    await supabaseClient.from("posts").update({ archived: true }).eq("id", postId);
    realPosts = realPosts.filter(function(p){ return p.id !== postId; });
    renderDynamicPosts();
    toast("Allenamento archiviato: lo trovi in Impostazioni → Archivio");
  } catch(e){ toast("Archiviazione non riuscita"); }
}

async function unarchivePost(postId){
  if(!window.confirm("Ripristinare questo allenamento nel feed e sul tuo profilo?")) return;
  try {
    await supabaseClient.from("posts").update({ archived: false }).eq("id", postId);
    toast("Allenamento ripristinato");
    loadArchivedPosts();
  } catch(e){ toast("Ripristino non riuscito"); }
}

// ================= GRIGLIE CONDIVISE: post salvati e archivio =================
const POST_TYPE_ICONS_GRID = { "Corsa":"🏃", "Palestra":"🏋️", "Ciclismo":"🚴", "Camminata":"🚶", "Trekking":"🥾" };
function renderGenericPostGrid(grid, posts, emptyText, onCellClick){
  grid.innerHTML = "";
  if(!posts || posts.length === 0){
    grid.innerHTML = '<div class="live-row" style="grid-column:1/-1;"><div class="txt">' + emptyText + '</div></div>';
    return;
  }
  posts.forEach(function(p){
    const cell = document.createElement("div");
    cell.className = "post-grid-cell";
    cell.onclick = function(){ onCellClick(p); };
    const photoUrls = Array.isArray(p.photo_urls) ? p.photo_urls.filter(Boolean) : [];
    if(photoUrls.length > 0){
      const img = document.createElement("img"); img.src = photoUrls[0]; img.loading = "lazy"; img.alt = "";
      cell.appendChild(img);
    } else {
      const ic = document.createElement("div"); ic.className = "pg-ic"; ic.textContent = POST_TYPE_ICONS_GRID[p.type] || "💪";
      cell.appendChild(ic);
      const type = document.createElement("div"); type.className = "pg-type"; type.textContent = p.type || "Allenamento";
      cell.appendChild(type);
    }
    grid.appendChild(cell);
  });
}

async function loadSavedPosts(){
  const grid = document.getElementById("savedPostsGrid");
  if(!grid || !supabaseClient || !currentUser) return;
  grid.innerHTML = '<div class="live-row" style="grid-column:1/-1;"><div class="txt">Caricamento...</div></div>';
  try {
    const { data, error } = await supabaseClient.from("saved_posts").select("post_id, created_at, posts(*)").eq("user_id", currentUser.id).order("created_at", { ascending: false });
    if(error) throw error;
    const posts = (data || []).map(function(row){ return row.posts; }).filter(Boolean);
    renderGenericPostGrid(grid, posts, "Non hai ancora salvato nessun post", function(p){ openComments(p.id); });
  } catch(e){
    grid.innerHTML = '<div class="live-row" style="grid-column:1/-1;"><div class="txt">Impossibile caricare i post salvati</div></div>';
  }
}

async function loadArchivedPosts(){
  const grid = document.getElementById("archivedPostsGrid");
  if(!grid || !supabaseClient || !currentUser) return;
  grid.innerHTML = '<div class="live-row" style="grid-column:1/-1;"><div class="txt">Caricamento...</div></div>';
  try {
    const { data, error } = await supabaseClient.from("posts").select("*").eq("author_id", currentUser.id).eq("archived", true).order("created_at", { ascending: false });
    if(error) throw error;
    renderGenericPostGrid(grid, data, "Nessun allenamento archiviato", function(p){ unarchivePost(p.id); });
  } catch(e){
    grid.innerHTML = '<div class="live-row" style="grid-column:1/-1;"><div class="txt">Impossibile caricare l\'archivio</div></div>';
  }
}

// ================= ELIMINA COMMENTO PROPRIO =================
async function deleteOwnComment(commentId, postId){
  if(!window.confirm("Eliminare questo commento?")) return;
  try {
    await supabaseClient.from("comments").delete().eq("id", commentId);
    await loadComments(postId);
    toast("Commento eliminato");
  } catch(e){ toast("Eliminazione non riuscita"); }
}

// ================= TRAGUARDI E RECORD PERSONALI REALI =================
async function loadAchievementsAndPRs(){
  if(!supabaseClient || !currentUser) return;
  try {
    const { data: myPosts } = await supabaseClient.from("posts").select("distance_km,duration_min,likes_count").eq("author_id", currentUser.id).eq("archived", false);
    const posts = myPosts || [];

    // ---- Record personali reali, per fascia di distanza ----
    const buckets = { "5km": [4.5, 5.5], "10km": [9, 11], "half": [20, 22] };
    const best = { "5km": null, "10km": null, "half": null };
    posts.forEach(function(p){
      if(!p.distance_km || !p.duration_min) return;
      const d = Number(p.distance_km);
      Object.keys(buckets).forEach(function(key){
        const range = buckets[key];
        if(d >= range[0] && d <= range[1]){
          if(best[key] === null || p.duration_min < best[key]) best[key] = p.duration_min;
        }
      });
    });

    function formatTime(min){
      if(min === null) return "—";
      const h = Math.floor(min / 60);
      const m = Math.floor(min % 60);
      const s = Math.round((min - Math.floor(min)) * 60);
      if(h > 0) return h + ":" + String(m).padStart(2,"0") + ":" + String(s).padStart(2,"0");
      return m + ":" + String(s).padStart(2,"0");
    }

    const prList = document.getElementById("prList");
    if(prList){
      prList.innerHTML = "";
      const rows = [["5 km","5km"],["10 km","10km"],["Mezza maratona","half"]];
      rows.forEach(function(r){
        const row = document.createElement("div"); row.className = "pr-row";
        const span = document.createElement("span"); span.textContent = r[0];
        const b = document.createElement("b"); b.textContent = formatTime(best[r[1]]);
        row.appendChild(span); row.appendChild(b);
        prList.appendChild(row);
      });
    }

    // ---- Traguardi reali ----
    const hasDistance = posts.some(function(p){ return !!p.distance_km; });
    const workoutsCount = (currentProfile && currentProfile.workouts) || 0;
    const inGroup = (typeof myGroupIds !== "undefined") && myGroupIds.size > 0;
    const hasLike = posts.some(function(p){ return (p.likes_count || 0) > 0; });

    const unlocked = {
      "prima-corsa": hasDistance,
      "dieci-allenamenti": workoutsCount >= 10,
      "gruppo": inGroup,
      "primo-like": hasLike
    };
    document.querySelectorAll("#badgeGrid .badge").forEach(function(el){
      const key = el.getAttribute("data-badge");
      el.classList.toggle("unlocked", !!unlocked[key]);
      el.classList.toggle("locked", !unlocked[key]);
    });
  } catch(e){}
}

// ================= PERSONE CHE POTRESTI CONOSCERE =================
async function loadPeopleYouMayKnow(){
  const box = document.getElementById("peopleYouMayKnow");
  if(!box || !supabaseClient || !currentUser) return;
  box.innerHTML = "";
  try {
    const { data: followingRows } = await supabaseClient.from("follows").select("following_id").eq("follower_id", currentUser.id);
    const alreadyFollowing = new Set((followingRows || []).map(function(r){ return r.following_id; }));
    alreadyFollowing.add(currentUser.id);

    let candidates = [];
    const myCity = currentProfile && currentProfile.city;
    if(myCity){
      const { data } = await supabaseClient.from("profiles").select("id,name,city,avatar_url").eq("city", myCity).limit(20);
      candidates = data || [];
    }
    if(candidates.length === 0){
      const { data } = await supabaseClient.from("profiles").select("id,name,city,avatar_url").order("created_at", { ascending: false }).limit(20);
      candidates = data || [];
    }
    const suggestions = candidates.filter(function(p){ return !alreadyFollowing.has(p.id); }).slice(0, 8);
    if(suggestions.length === 0) return;

    const label = document.createElement("div");
    label.className = "section-label";
    label.style.padding = "14px 20px 6px";
    label.textContent = "Persone che potresti conoscere";
    box.appendChild(label);

    suggestions.forEach(function(p){
      const row = document.createElement("div");
      row.className = "conv-row";
      const av = document.createElement("div"); av.className = "avatar a1";
      setAvatarContent(av, p.name, p.avatar_url);
      const ci = document.createElement("div"); ci.className = "ci";
      const cn = document.createElement("div"); cn.className = "cn"; cn.textContent = p.name || "Utente Sweat";
      const cp = document.createElement("div"); cp.className = "cp"; cp.textContent = myCity && p.city === myCity ? ("Vive a " + p.city) : "Atleta Sweat";
      ci.appendChild(cn); ci.appendChild(cp);
      const followBtn = document.createElement("button");
      followBtn.className = "profile-btn"; followBtn.style.width = "auto"; followBtn.style.padding = "8px 14px"; followBtn.style.flexShrink = "0";
      followBtn.textContent = "Segui";
      followBtn.onclick = function(e){
        e.stopPropagation();
        supabaseClient.from("follows").insert({ follower_id: currentUser.id, following_id: p.id }).then(function(){
          followBtn.textContent = "Seguito ✓"; followBtn.disabled = true;
        }).catch(function(){ toast("Operazione non riuscita, riprova"); });
      };
      row.appendChild(av); row.appendChild(ci); row.appendChild(followBtn);
      row.onclick = function(){ viewProfile(p.id); };
      box.appendChild(row);
    });
  } catch(e){}
}

// ================= CLASSIFICA: GLOBALE O SOLO AMICI =================
let leaderboardScope = "globale";

function setLeaderboardScope(scope){
  leaderboardScope = scope;
  const gBtn = document.getElementById("lbScopeGlobale");
  const aBtn = document.getElementById("lbScopeAmici");
  if(gBtn) gBtn.classList.toggle("active", scope === "globale");
  if(aBtn) aBtn.classList.toggle("active", scope === "amici");
  loadWeeklyChallenge();
}

// ================= CHECKLIST COMPLETAMENTO PROFILO =================
async function loadProfileChecklist(){
  const box = document.getElementById("profileChecklistBox");
  if(!box || !currentProfile || !currentUser) return;
  try {
    const { data: myPosts } = await supabaseClient.from("posts").select("id").eq("author_id", currentUser.id).limit(1);
    const { data: myFollows } = await supabaseClient.from("follows").select("following_id").eq("follower_id", currentUser.id).limit(1);

    const items = [
      { key: "avatar", label: "Aggiungi una foto profilo", done: !!currentProfile.avatar_url },
      { key: "bio", label: "Racconta qualcosa di te e la tua città", done: !!(currentProfile.city) },
      { key: "post", label: "Pubblica il tuo primo allenamento", done: (myPosts || []).length > 0 },
      { key: "follow", label: "Segui almeno un'altra persona", done: (myFollows || []).length > 0 }
    ];
    const doneCount = items.filter(function(i){ return i.done; }).length;
    if(doneCount === items.length){ box.innerHTML = ""; return; }

    box.innerHTML = "";
    const card = document.createElement("div"); card.className = "checklist-card";
    const title = document.createElement("div"); title.className = "cl-title"; title.textContent = "Completa il tuo profilo";
    const sub = document.createElement("div"); sub.className = "cl-sub"; sub.textContent = doneCount + " di " + items.length + " completati";
    card.appendChild(title); card.appendChild(sub);
    items.forEach(function(i){
      const row = document.createElement("div"); row.className = "checklist-item" + (i.done ? " done" : "");
      const dot = document.createElement("div"); dot.className = "cl-dot"; dot.textContent = i.done ? "✓" : "";
      const txt = document.createElement("span"); txt.textContent = i.label;
      row.appendChild(dot); row.appendChild(txt);
      row.onclick = function(){
        if(i.key === "avatar"){ const input = document.getElementById("avatarInput"); if(input) input.click(); }
        else if(i.key === "bio"){ toast("Completa città e descrizione dalle impostazioni profilo"); }
        else if(i.key === "post"){ go("crea"); }
        else if(i.key === "follow"){ go("ricerca"); }
      };
      card.appendChild(row);
    });
    box.appendChild(card);
  } catch(e){}
}

// ================= SFIDE 1 CONTRO 1 =================
async function proposeChallengeToOther(){
  if(!currentUser || !currentOtherProfile) return;
  const kmInput = window.prompt("Quanti km in 7 giorni? (es. 15)", "15");
  if(kmInput === null) return;
  const goalKm = parseFloat(kmInput.replace(",", "."));
  if(!goalKm || isNaN(goalKm) || goalKm <= 0){ toast("Inserisci un numero di km valido"); return; }
  try {
    await supabaseClient.from("challenges_1v1").insert({
      challenger_id: currentUser.id,
      challenger_name: (currentProfile && currentProfile.name) || currentUser.email,
      opponent_id: currentOtherProfile.id,
      opponent_name: currentOtherProfile.name,
      goal_km: goalKm,
      status: "pending"
    });
    toast("Sfida inviata a " + currentOtherProfile.name + "!");
  } catch(e){ toast("Sfida non inviata, riprova"); }
}

async function loadMyChallenges(){
  const box = document.getElementById("challenge1v1Box");
  if(!box || !supabaseClient || !currentUser) return;
  box.innerHTML = '<div class="live-row"><div class="txt">Caricamento sfide...</div></div>';
  try {
    const { data } = await supabaseClient.from("challenges_1v1")
      .or("challenger_id.eq." + currentUser.id + ",opponent_id.eq." + currentUser.id)
      .in("status", ["pending", "active"])
      .order("created_at", { ascending: false })
      .limit(10);
    const challenges = data || [];
    if(challenges.length === 0){
      box.innerHTML = '<p style="font-size:12.5px;color:var(--fog);margin:0;">Nessuna sfida attiva. Vai sul profilo di un amico e sfidalo!</p>';
      return;
    }
    const authorIds = Array.from(new Set(challenges.map(function(c){ return c.challenger_id === currentUser.id ? c.opponent_id : c.challenger_id; })));
    const since = challenges.reduce(function(min, c){ return c.starts_at && c.starts_at < min ? c.starts_at : min; }, new Date().toISOString());
    const allIds = authorIds.concat([currentUser.id]);
    const { data: postsForChallenge } = await supabaseClient.from("posts").select("author_id,distance_km,created_at").eq("archived", false).in("author_id", allIds).gte("created_at", since);
    const kmByUser = {};
    (postsForChallenge || []).forEach(function(p){
      if(!p.distance_km) return;
      kmByUser[p.author_id] = (kmByUser[p.author_id] || 0) + Number(p.distance_km);
    });

    box.innerHTML = "";
    challenges.forEach(function(c){
      const iAmChallenger = c.challenger_id === currentUser.id;
      const otherName = iAmChallenger ? c.opponent_name : c.challenger_name;
      const otherId = iAmChallenger ? c.opponent_id : c.challenger_id;
      const myKm = Math.round(kmByUser[currentUser.id] || 0);
      const theirKm = Math.round(kmByUser[otherId] || 0);
      const row = document.createElement("div"); row.className = "challenge1v1-row";
      const names = document.createElement("div"); names.className = "c1v1-names";
      names.innerHTML = "";
      const b1 = document.createElement("b"); b1.textContent = "Tu " + myKm + " km";
      names.appendChild(b1);
      names.appendChild(document.createTextNode(" vs " + (otherName || "Utente") + " " + theirKm + " km · obiettivo " + c.goal_km + " km"));
      row.appendChild(names);
      if(c.status === "pending" && !iAmChallenger){
        const actions = document.createElement("div");
        const acceptBtn = document.createElement("button"); acceptBtn.textContent = "Accetta"; acceptBtn.className = "propose-btn"; acceptBtn.style.marginRight = "6px";
        acceptBtn.onclick = function(){ respondChallenge(c.id, "active"); };
        const declineBtn = document.createElement("button"); declineBtn.textContent = "Rifiuta"; declineBtn.className = "profile-btn"; declineBtn.style.width = "auto"; declineBtn.style.padding = "6px 10px";
        declineBtn.onclick = function(){ respondChallenge(c.id, "declined"); };
        actions.appendChild(acceptBtn); actions.appendChild(declineBtn);
        row.appendChild(actions);
      } else {
        const status = document.createElement("div"); status.className = "c1v1-status";
        status.textContent = c.status === "pending" ? "In attesa" : "In corso";
        row.appendChild(status);
      }
      box.appendChild(row);
    });
  } catch(e){
    box.innerHTML = '<p style="font-size:12.5px;color:var(--fog);margin:0;">Impossibile caricare le sfide</p>';
  }
}

async function respondChallenge(challengeId, status){
  try {
    await supabaseClient.from("challenges_1v1").update({ status: status }).eq("id", challengeId);
    toast(status === "active" ? "Sfida accettata, in bocca al lupo!" : "Sfida rifiutata");
    loadMyChallenges();
  } catch(e){ toast("Operazione non riuscita, riprova"); }
}

// ================= RIEPILOGO SETTIMANALE =================
async function checkWeeklyRecap(){
  if(!supabaseClient || !currentUser || !currentProfile) return;
  try {
    const lastSent = currentProfile.last_recap_sent ? new Date(currentProfile.last_recap_sent) : null;
    const now = new Date();
    if(lastSent && (now - lastSent) < 6 * 24 * 60 * 60 * 1000) return; // già inviato questa settimana

    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const { data: lastWeekPosts } = await supabaseClient.from("posts").select("distance_km").eq("author_id", currentUser.id).eq("archived", false).gte("created_at", weekAgo.toISOString());
    const posts = lastWeekPosts || [];
    if(posts.length === 0) return; // nessuna attività, nessun riepilogo da mandare

    const totalKm = posts.reduce(function(sum, p){ return sum + (Number(p.distance_km) || 0); }, 0);
    const content = "Il tuo riepilogo settimanale: " + posts.length + " allenamenti, " + Math.round(totalKm) + " km totali. Continua così! 💪";

    await supabaseClient.from("notifications").insert({ user_id: currentUser.id, type: "recap", content: content });
    await supabaseClient.from("profiles").update({ last_recap_sent: now.toISOString() }).eq("id", currentUser.id);
    currentProfile.last_recap_sent = now.toISOString();
  } catch(e){}
}
