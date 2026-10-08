// ================= STORIE (foto che durano 24 ore) =================
// File separato perché è un sottosistema a sé: caricamento, riga delle
// storie nel feed, e il visualizzatore a schermo intero con avanzamento
// automatico (stile Instagram).

let myActiveStories = [];
let storiesByAuthor = {};
let storyViewerState = null; // { authorIds, authorIndex, storyIndex, timer }

async function loadStories(){
  const row = document.getElementById("storiesRow");
  if(!row || !supabaseClient || !currentUser) return;
  try {
    const { data } = await supabaseClient.from("stories").select("*").gt("expires_at", new Date().toISOString()).order("created_at", { ascending: true });
    const all = data || [];

    const { data: myViews } = await supabaseClient.from("story_views").select("story_id").eq("viewer_id", currentUser.id);
    const seenIds = new Set((myViews || []).map(function(v){ return v.story_id; }));

    storiesByAuthor = {};
    all.forEach(function(s){
      if(!storiesByAuthor[s.author_id]){
        storiesByAuthor[s.author_id] = { id: s.author_id, name: s.author_name, avatar_url: s.author_avatar_url, stories: [] };
      }
      storiesByAuthor[s.author_id].stories.push(s);
    });

    myActiveStories = (storiesByAuthor[currentUser.id] && storiesByAuthor[currentUser.id].stories) || [];

    const otherAuthors = Object.values(storiesByAuthor).filter(function(a){ return a.id !== currentUser.id; });
    otherAuthors.forEach(function(a){ a._hasUnseen = a.stories.some(function(s){ return !seenIds.has(s.id); }); });
    otherAuthors.sort(function(a,b){ return (b._hasUnseen ? 1 : 0) - (a._hasUnseen ? 1 : 0); });

    row.innerHTML = "";

    // ---- la tua bolla: mostra "+" per aggiungere, o il tuo anello se hai già storie attive ----
    const myBubble = document.createElement("div"); myBubble.className = "story";
    const myRing = document.createElement("div"); myRing.className = "ring" + (myActiveStories.length ? " live" : " add-ring");
    const myAv = document.createElement("div"); myAv.className = "avatar a1"; myAv.style.width="100%"; myAv.style.height="100%";
    setAvatarContent(myAv, (currentProfile && currentProfile.name) || "Tu", currentProfile && currentProfile.avatar_url);
    myRing.appendChild(myAv);
    if(myActiveStories.length === 0){
      const plus = document.createElement("label"); plus.className = "add-plus";
      plus.innerHTML = "+";
      const input = document.createElement("input"); input.type = "file"; input.accept = "image/*,video/*"; input.style.display = "none";
      input.onchange = function(){ uploadStoryPhoto(input); };
      plus.appendChild(input);
      myRing.appendChild(plus);
      myRing.querySelector("label").onclick = function(e){ e.stopPropagation(); };
    }
    const myLabel = document.createElement("span"); myLabel.textContent = myActiveStories.length ? "Il tuo stato" : "Il tuo stato";
    myBubble.appendChild(myRing); myBubble.appendChild(myLabel);
    myBubble.onclick = function(){
      if(myActiveStories.length) openStoryViewer(currentUser.id, [currentUser.id].concat(otherAuthors.map(function(a){return a.id;})));
    };
    row.appendChild(myBubble);

    const orderedIds = otherAuthors.map(function(a){ return a.id; });
    otherAuthors.forEach(function(a){
      const bubble = document.createElement("div"); bubble.className = "story";
      const ring = document.createElement("div"); ring.className = "ring " + (a._hasUnseen ? "live" : "seen");
      const av = document.createElement("div"); av.className = "avatar a2"; av.style.width="100%"; av.style.height="100%";
      setAvatarContent(av, a.name, a.avatar_url);
      ring.appendChild(av);
      const label = document.createElement("span"); label.textContent = (a.name || "Utente").split(" ")[0];
      bubble.appendChild(ring); bubble.appendChild(label);
      bubble.onclick = function(){ openStoryViewer(a.id, orderedIds); };
      row.appendChild(bubble);
    });
  } catch(e){}
}

async function uploadStoryPhoto(input){
  const file = input.files && input.files[0];
  if(!file || !currentUser || !supabaseClient) return;
  const isVideo = file.type && file.type.indexOf("video/") === 0;
  const isImage = file.type && file.type.indexOf("image/") === 0;
  if(!isVideo && !isImage){ toast("Scegli una foto o un video"); return; }
  if(isVideo && file.size > 60 * 1024 * 1024){ toast("Il video è troppo grande (max 60MB)"); return; }
  toast(isVideo ? "Caricamento video..." : "Caricamento storia...");
  try {
    const url = await uploadFileToBucket("stories", file);
    if(!url) throw new Error("upload-failed");
    await supabaseClient.from("stories").insert({
      author_id: currentUser.id,
      author_name: (currentProfile && currentProfile.name) || currentUser.email,
      author_avatar_url: (currentProfile && currentProfile.avatar_url) || null,
      media_url: url,
      media_type: isVideo ? "video" : "photo"
    });
    toast("Storia pubblicata, scompare dopo 24 ore!");
    loadStories();
  } catch(e){
    toast("Pubblicazione storia non riuscita, riprova");
  }
}

// ---- Condividi un post esistente (con foto) nelle tue storie ----
async function shareExistingPostToStory(post){
  if(!post || !currentUser || !supabaseClient) return;
  const url = post.photo_urls && post.photo_urls[0];
  if(!url){ toast("Questo post non ha una foto da condividere"); return; }
  try {
    await supabaseClient.from("stories").insert({
      author_id: currentUser.id,
      author_name: (currentProfile && currentProfile.name) || currentUser.email,
      author_avatar_url: (currentProfile && currentProfile.avatar_url) || null,
      media_url: url,
      media_type: "photo"
    });
    toast("Condiviso nelle tue storie!");
    loadStories();
  } catch(e){ toast("Condivisione non riuscita, riprova"); }
}

// ---- Visualizzatore a schermo intero ----
function openStoryViewer(startAuthorId, authorIdsInOrder){
  closeStoryViewer();
  const allIds = Array.from(new Set(authorIdsInOrder));
  const startIndex = Math.max(0, allIds.indexOf(startAuthorId));
  storyViewerState = { authorIds: allIds, authorIndex: startIndex, storyIndex: 0, timer: null };
  renderStoryViewer();
}

function closeStoryViewer(){
  if(storyViewerState && storyViewerState.timer) clearTimeout(storyViewerState.timer);
  storyViewerState = null;
  const existing = document.querySelector(".story-viewer");
  if(existing) existing.remove();
}

function currentViewerAuthor(){
  if(!storyViewerState) return null;
  const authorId = storyViewerState.authorIds[storyViewerState.authorIndex];
  return storiesByAuthor[authorId] || null;
}

function renderStoryViewer(){
  if(!storyViewerState) return;
  const author = currentViewerAuthor();
  if(!author || !author.stories.length){ advanceToNextAuthor(); return; }
  if(storyViewerState.storyIndex >= author.stories.length){ advanceToNextAuthor(); return; }

  let el = document.querySelector(".story-viewer");
  if(!el){
    el = document.createElement("div"); el.className = "story-viewer";
    document.body.appendChild(el);
  }
  el.innerHTML = "";

  const progressRow = document.createElement("div"); progressRow.className = "sv-progress-row";
  author.stories.forEach(function(s, i){
    const bar = document.createElement("div"); bar.className = "sv-bar" + (i < storyViewerState.storyIndex ? " done" : "");
    const fill = document.createElement("div"); fill.className = "sv-fill";
    bar.appendChild(fill);
    progressRow.appendChild(bar);
  });
  el.appendChild(progressRow);

  const head = document.createElement("div"); head.className = "sv-head";
  const av = document.createElement("div"); av.className = "avatar a1";
  setAvatarContent(av, author.name, author.avatar_url);
  const name = document.createElement("div"); name.className = "sv-name"; name.textContent = author.id === currentUser.id ? "Tu" : (author.name || "Utente Sweat");
  const closeBtn = document.createElement("button"); closeBtn.className = "sv-close"; closeBtn.textContent = "✕";
  closeBtn.onclick = closeStoryViewer;
  head.appendChild(av); head.appendChild(name); head.appendChild(closeBtn);
  el.appendChild(head);

  const mediaWrap = document.createElement("div"); mediaWrap.className = "sv-media-wrap";
  const story = author.stories[storyViewerState.storyIndex];
  const isVideo = story.media_type === "video";
  let videoEl = null;
  if(isVideo){
    videoEl = document.createElement("video");
    videoEl.src = story.media_url; videoEl.autoplay = true; videoEl.muted = true; videoEl.playsInline = true;
    mediaWrap.appendChild(videoEl);
  } else {
    const img = document.createElement("img"); img.src = story.media_url; img.alt = "";
    mediaWrap.appendChild(img);
  }

  const leftZone = document.createElement("div"); leftZone.className = "sv-tap-zone left";
  leftZone.onclick = function(){ goToPrevStory(); };
  const rightZone = document.createElement("div"); rightZone.className = "sv-tap-zone right";
  rightZone.onclick = function(){ goToNextStory(); };
  mediaWrap.appendChild(leftZone); mediaWrap.appendChild(rightZone);
  el.appendChild(mediaWrap);

  // segna come vista (se non è la mia)
  if(currentUser && author.id !== currentUser.id && supabaseClient){
    supabaseClient.from("story_views").upsert({ story_id: story.id, viewer_id: currentUser.id }, { onConflict: "story_id,viewer_id" }).then(()=>{}).catch(()=>{});
  }

  // animazione della barra corrente e avanzamento automatico
  const currentBar = progressRow.children[storyViewerState.storyIndex];
  const currentFill = currentBar ? currentBar.querySelector(".sv-fill") : null;
  if(storyViewerState.timer) clearTimeout(storyViewerState.timer);

  if(isVideo && videoEl){
    videoEl.addEventListener("ended", function(){ goToNextStory(); });
    videoEl.addEventListener("loadedmetadata", function(){
      const dur = videoEl.duration && isFinite(videoEl.duration) ? videoEl.duration : 15;
      if(currentFill) requestAnimationFrame(function(){ currentFill.style.transition = "width " + dur + "s linear"; currentFill.style.width = "100%"; });
    });
    // rete lenta imprevista: avanza comunque dopo al massimo 20s
    storyViewerState.timer = setTimeout(function(){ goToNextStory(); }, 20000);
  } else {
    if(currentFill){
      requestAnimationFrame(function(){ currentFill.style.transition = "width 4.5s linear"; currentFill.style.width = "100%"; });
    }
    storyViewerState.timer = setTimeout(function(){ goToNextStory(); }, 4500);
  }
}

function goToNextStory(){
  if(!storyViewerState) return;
  const author = currentViewerAuthor();
  if(!author) return;
  if(storyViewerState.storyIndex < author.stories.length - 1){
    storyViewerState.storyIndex++;
    renderStoryViewer();
  } else {
    advanceToNextAuthor();
  }
}

function goToPrevStory(){
  if(!storyViewerState) return;
  if(storyViewerState.storyIndex > 0){
    storyViewerState.storyIndex--;
    renderStoryViewer();
  } else if(storyViewerState.authorIndex > 0){
    storyViewerState.authorIndex--;
    const prevAuthor = currentViewerAuthor();
    storyViewerState.storyIndex = prevAuthor ? Math.max(0, prevAuthor.stories.length - 1) : 0;
    renderStoryViewer();
  }
}

function advanceToNextAuthor(){
  if(!storyViewerState) return;
  if(storyViewerState.authorIndex < storyViewerState.authorIds.length - 1){
    storyViewerState.authorIndex++;
    storyViewerState.storyIndex = 0;
    renderStoryViewer();
  } else {
    closeStoryViewer();
    loadStories();
  }
}
