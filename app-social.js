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
  if(!btn || !currentUser) return;
  if(otherId === currentUser.id){ btn.style.display = "none"; return; }
  btn.style.display = "block";
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
  if(!q){ wrap.innerHTML = ""; return; }
  searchDebounceTimer = setTimeout(function(){ performSearch(q); }, 350);
}

async function performSearch(q){
  const wrap = document.getElementById("searchResults");
  wrap.innerHTML = '<div class="live-row"><div class="txt">Ricerca in corso...</div></div>';
  try {
    const [{ data: people }, { data: groupsFound }] = await Promise.all([
      supabaseClient.from("profiles").select("id,name,city").ilike("name", "%" + q + "%").limit(15),
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
      av.textContent = (r.data.name || "??").slice(0,2).toUpperCase();
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

// ================= ELIMINA / MODIFICA POST PROPRI =================
async function handlePostMenu(postId, isOwn){
  if(!isOwn){ reportPost(postId); return; }
  const choice = window.prompt("Scrivi MODIFICA per cambiare la didascalia, o ELIMINA per cancellare il post:");
  if(!choice) return;
  const normalized = choice.trim().toUpperCase();
  if(normalized === "ELIMINA"){
    if(!window.confirm("Eliminare definitivamente questo post?")) return;
    try {
      await supabaseClient.from("posts").delete().eq("id", postId);
      realPosts = realPosts.filter(function(p){ return p.id !== postId; });
      renderDynamicPosts();
      toast("Post eliminato");
    } catch(e){ toast("Eliminazione non riuscita"); }
  } else if(normalized === "MODIFICA"){
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
    const { data: myPosts } = await supabaseClient.from("posts").select("distance_km,duration_min,likes_count").eq("author_id", currentUser.id);
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
