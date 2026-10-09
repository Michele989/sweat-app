
  const titles = {gruppi:"Gruppi", esplora:"Marketplace", crea:"Nuovo allenamento", profilo:"Profilo", ai:"Coach AI", messaggi:"Messaggi", chat:"Messaggio", altroprofilo:"Profilo", admin:"Pannello Admin", aipro:"Coach AI Pro", commenti:"Commenti", ricerca:"Cerca", gruppochat:"Chat di gruppo", scopri:"Scopri", progresso:"Aggiornamento di progresso", impostazioni:"Impostazioni", salvati:"Post salvati", archivio:"Archivio allenamenti"};

  function setVerifiedBadge(nameEl, verified){
    if(!nameEl) return;
    let badge = nameEl.querySelector(".verified-badge");
    if(verified){
      if(!badge){
        badge = document.createElement("span");
        badge.className = "verified-badge";
        badge.title = "Account professionale";
        badge.innerHTML = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="var(--signal)"/><path d="M8 12.5l2.5 2.5 5-5.5" stroke="#06210A" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>';
        nameEl.appendChild(badge);
      }
    } else if(badge){
      badge.remove();
    }
  }

  const LOGO_MARK_SVG ='<svg class="logo-mark" viewBox="0 0 100 100" aria-hidden="true"><defs><linearGradient id="lgGradTop" x1="20" y1="10" x2="80" y2="92" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="#7CF0A8"/><stop offset="55%" stop-color="#3FCB7E"/><stop offset="100%" stop-color="#1B9A56"/></linearGradient></defs><path fill="url(#lgGradTop)" d="M50 9C50 9 23 46 23 66C23 83.6 35 92.5 50 92.5C65 92.5 77 83.6 77 66C77 46 50 9 50 9Z"/><path d="M28 63L41 63L47.5 46L57 82L64.5 63L73 63" fill="none" stroke="#0B130D" stroke-width="5.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  // ================= NAVIGAZIONE =================
  let previousScreen = "feed";

  function goBack(){
    go(previousScreen || "feed");
  }

  function go(name){
    const currentActive = document.querySelector('.screen.active');
    const currentName = currentActive ? currentActive.id.replace('screen-','') : null;
    if(currentName && currentName !== name && currentName !== 'auth' && currentName !== 'onboarding'){
      previousScreen = currentName;
    }
    if(currentName === 'chat' && name !== 'chat' && typeof unsubscribeChatRealtime === 'function'){ unsubscribeChatRealtime(); }
    if(currentName === 'gruppochat' && name !== 'gruppochat' && typeof unsubscribeGroupChatRealtime === 'function'){ unsubscribeGroupChatRealtime(); }

    document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
    document.getElementById('screen-'+name).classList.add('active');

    const topbar = document.getElementById('topbar');
    const tabbar = document.getElementById('tabbar');
    const mainArea = document.getElementById('mainArea');

    if(name==='home' || name==='auth' || name==='onboarding'){
      topbar.classList.add('hidden'); tabbar.classList.add('hidden'); mainArea.classList.add('no-nav');
    } else {
      topbar.classList.remove('hidden'); mainArea.classList.remove('no-nav');
      if(name==='chat' || name==='commenti' || name==='gruppochat' || name==='progresso' || name==='impostazioni' || name==='salvati' || name==='archivio'){ tabbar.classList.add('hidden'); } else { tabbar.classList.remove('hidden'); }
      document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
      const btn = document.querySelector('.tab[data-tab="'+name+'"]');
      if(btn) btn.classList.add('active');
      const shareIcon = `<div class="icon-btn" onclick="shareApp()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 10.5 15.4 6.5M8.6 13.5 15.4 17.5"/></svg></div>`;
      const addIcon = `<div class="icon-btn" onclick="go('crea')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 5v14M5 12h14"/></svg></div>`;
      const dmIcon = `<div class="icon-btn" onclick="go('messaggi')" aria-label="Messaggi"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4 20-7z"/></svg></div>`;
      const searchIcon = `<div class="icon-btn" onclick="go('ricerca')" aria-label="Cerca"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg></div>`;
      if(name==='feed'){
        topbar.innerHTML = `<div class="wordmark brand-wordmark" onclick="go('home')">${LOGO_MARK_SVG}<span class="wm-text">SWEAT</span></div><div class="head-actions"><div class="icon-btn has-dot" id="notifBellBtn" onclick="toggleNotif(event)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg></div>${searchIcon}${addIcon}${dmIcon}${shareIcon}<div class="notif-panel" id="notifPanel"></div></div>`;
        renderNotifPanel();
        loadFeedSponsor();
        checkWeeklyRecap();
        loadStories();
      } else {
        let customTitle = titles[name] || "";
        if(name==='chat' && currentChatPartner) customTitle = currentChatPartner.name;
        if(name==='gruppochat' && currentGroupChat) customTitle = currentGroupChat.name;
        if(name==='altroprofilo' && currentOtherProfile) customTitle = currentOtherProfile.name;
        const settingsIcon = `<div class="icon-btn" onclick="go('impostazioni')" aria-label="Impostazioni"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.04 1.56V21a2 2 0 0 1-4 0v-.09A1.7 1.7 0 0 0 9 19.37a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.04H3a2 2 0 0 1 0-4h.09A1.7 1.7 0 0 0 4.63 9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H9a1.7 1.7 0 0 0 1.04-1.56V3a2 2 0 0 1 4 0v.09a1.7 1.7 0 0 0 1.04 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V9a1.7 1.7 0 0 0 1.56 1.04H21a2 2 0 0 1 0 4h-.09a1.7 1.7 0 0 0-1.56 1.04z"/></svg></div>`;
        if(name==='chat' || name==='commenti' || name==='gruppochat' || name==='progresso' || name==='impostazioni' || name==='salvati' || name==='archivio'){
          const backBtn = `<button class="icon-btn" onclick="goBack()" aria-label="Indietro"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg></button>`;
          topbar.innerHTML = `<div style="display:flex;align-items:center;gap:10px;">${backBtn}<div class="screen-title">${customTitle}</div></div><div class="head-actions">${shareIcon}</div>`;
        } else if(name==='profilo'){
          topbar.innerHTML = `<div class="screen-title">${customTitle}</div><div class="head-actions">${settingsIcon}</div>`;
        } else {
          topbar.innerHTML = `<div class="screen-title">${customTitle}</div><div class="head-actions">${shareIcon}</div>`;
        }
      }
    }
    if(name==='gruppi') loadGroups();
    if(name==='esplora') loadMarketplace();
    if(name==='messaggi') loadConversations();
    if(name==='admin') loadAdminData();
    if(name==='ai') refreshProCards();
    if(name==='aipro') loadProScreen();
    if(name==='ricerca') loadPeopleYouMayKnow();
    if(name==='profilo'){ loadProfileChecklist(); loadMyChallenges(); if(typeof loadActivityHeatmap === 'function') loadActivityHeatmap(); }
    if(name==='impostazioni') renderBlockedUsersList();
    if(name==='salvati' && typeof loadSavedPosts === 'function') loadSavedPosts();
    if(name==='archivio' && typeof loadArchivedPosts === 'function') loadArchivedPosts();
    if(name==='progresso' && typeof loadProgressUpdates === 'function') loadProgressUpdates();
    mainArea.scrollTo(0,0);
  }

  function shareApp(){
    const shareData = {
      title: 'Sweat',
      text: 'Guarda la demo di Sweat, il social per chi si allena 💪',
      url: window.location.href
    };
    if(navigator.share){
      navigator.share(shareData).catch(()=>{});
    } else if(navigator.clipboard){
      navigator.clipboard.writeText(window.location.href).then(()=>toast('Link copiato negli appunti!'));
    } else {
      toast('Copia il link dalla barra degli indirizzi per condividerlo');
    }
  }

  function buildPostShareLink(postId){
    return window.location.origin + window.location.pathname + "?post=" + postId;
  }

  function sharePost(postId){
    const post = realPosts.find(function(p){ return p.id === postId; });
    const link = buildPostShareLink(postId);
    const canShareToStory = !!(post && Array.isArray(post.photo_urls) && post.photo_urls.length);

    closeAllReactionPickers();
    document.querySelectorAll(".share-menu").forEach(function(m){ m.remove(); });
    const menu = document.createElement("div");
    menu.className = "share-menu";
    const opt1 = document.createElement("button");
    opt1.className = "share-menu-opt";
    opt1.textContent = "Condividi fuori dall'app";
    opt1.onclick = function(e){
      e.stopPropagation();
      menu.remove();
      const shareData = { title: "Sweat", text: (post && post.caption) || "Guarda questo allenamento su Sweat", url: link };
      if(navigator.share){ navigator.share(shareData).catch(()=>{}); }
      else if(navigator.clipboard){ navigator.clipboard.writeText(link).then(()=>toast("Link del post copiato!")); }
      else { toast("Copia il link dalla barra degli indirizzi"); }
    };
    menu.appendChild(opt1);
    if(canShareToStory){
      const opt2 = document.createElement("button");
      opt2.className = "share-menu-opt";
      opt2.textContent = "Condividi nelle tue storie";
      opt2.onclick = function(e){
        e.stopPropagation();
        menu.remove();
        if(typeof shareExistingPostToStory === "function") shareExistingPostToStory(post);
      };
      menu.appendChild(opt2);
    }
    document.body.appendChild(menu);
    setTimeout(function(){ document.addEventListener("click", function closeIt(){ menu.remove(); document.removeEventListener("click", closeIt); }); }, 0);
  }

  // Se la pagina si apre con ?post=ID (link condiviso), apri subito i commenti/dettaglio di quel post
  function openSharedPostFromUrl(){
    try {
      const params = new URLSearchParams(window.location.search);
      const postId = params.get("post");
      if(postId) openComments(postId);
    } catch(e){}
  }

  function toggleNotif(e){
    e.stopPropagation();
    const panel = document.getElementById('notifPanel');
    const wasShown = panel.classList.contains('show');
    panel.classList.toggle('show');
    if(!wasShown) markNotificationsRead();
  }
  document.addEventListener('click', function(){
    const p = document.getElementById('notifPanel');
    if(p) p.classList.remove('show');
  });

  function toast(msg){
    const t = document.getElementById('toast');
    t.textContent = msg; t.classList.add('show');
    setTimeout(()=>t.classList.remove('show'), 2200);
  }

  // ================= AUTENTICAZIONE (Supabase) =================
  let currentUser = null;      // { id, email }
  let currentProfile = null;   // riga della tabella "profiles"
  let authMode = "login";

  let signupAccountType = "persona";
  let pendingReferralCode = null;
  let currentChatPartner = null;
  let currentOtherProfile = null;

  async function initApp(){
    try {
      const params = new URLSearchParams(window.location.search);
      if(params.get("ref")) pendingReferralCode = params.get("ref");
    } catch(e){}

    if(!supabaseClient){
      const errBox = document.getElementById("authError");
      errBox.textContent = "Configura prima SUPABASE_URL e SUPABASE_ANON_KEY in cima al file HTML.";
      errBox.classList.add("show");
      return;
    }

    supabaseClient.auth.onAuthStateChange(function(event, session){
      if(event === "PASSWORD_RECOVERY"){
        const pw = window.prompt("Imposta la tua nuova password (almeno 6 caratteri):");
        if(pw && pw.length >= 6){
          supabaseClient.auth.updateUser({ password: pw }).then(function(res){
            if(!res.error) toast("Password aggiornata! Ora puoi accedere normalmente.");
          });
        }
      }
    });

    try {
      const { data } = await supabaseClient.auth.getSession();
      if(data && data.session){
        await onAuthed(data.session.user);
      }
    } catch(e){}

    applyLanguage(localStorage.getItem("sweatLang") || "it");
  }

  function switchAuthTab(mode){
    authMode = mode;
    document.getElementById("authTabLogin").classList.toggle("active", mode==="login");
    document.getElementById("authTabRegister").classList.toggle("active", mode==="register");
    document.getElementById("authNameRow").style.display = mode==="register" ? "block" : "none";
    document.getElementById("authTypeRow").style.display = mode==="register" ? "block" : "none";
    document.getElementById("forgotRow").style.display = mode==="register" ? "none" : "block";
    document.getElementById("consentRow").style.display = mode==="register" ? "block" : "none";
    document.getElementById("authSubmitBtn").textContent = mode==="register" ? "Crea account" : "Accedi";
    document.getElementById("authError").classList.remove("show");
  }

  function selectAccountType(el, type){
    el.parentElement.querySelectorAll(".chip").forEach(c=>c.classList.remove("active"));
    el.classList.add("active");
    signupAccountType = type;
    document.getElementById("authBizNote").style.display = (type === "persona") ? "none" : "block";
  }

  async function handleForgotPassword(){
    const errBox = document.getElementById("authError");
    const email = document.getElementById("authEmail").value.trim();
    if(!email){
      errBox.textContent = "Scrivi prima la tua email qui sopra, poi premi di nuovo questo link.";
      errBox.classList.add("show");
      return;
    }
    try {
      const { error } = await supabaseClient.auth.resetPasswordForEmail(email, { redirectTo: window.location.href });
      if(error) throw error;
      errBox.textContent = "Ti abbiamo inviato un'email per reimpostare la password.";
      errBox.classList.add("show");
    } catch(e){
      errBox.textContent = e.message || "Impossibile inviare l'email, riprova.";
      errBox.classList.add("show");
    }
  }

  async function handleAuthSubmit(){
    const errBox = document.getElementById("authError");
    errBox.classList.remove("show"); errBox.textContent = "";

    if(!supabaseClient){
      errBox.textContent = "Configura prima SUPABASE_URL e SUPABASE_ANON_KEY in cima al file HTML.";
      errBox.classList.add("show");
      return;
    }
    const email = document.getElementById("authEmail").value.trim();
    const password = document.getElementById("authPassword").value;
    const name = document.getElementById("authName").value.trim();
    if(!email || !password){
      errBox.textContent = "Inserisci email e password.";
      errBox.classList.add("show");
      return;
    }
    if(authMode === "register" && !document.getElementById("authConsent").checked){
      errBox.textContent = "Devi accettare Termini di Servizio e Privacy Policy per registrarti.";
      errBox.classList.add("show");
      return;
    }

    const btn = document.getElementById("authSubmitBtn");
    btn.disabled = true;
    try {
      if(authMode === "register"){
        const { data, error } = await supabaseClient.auth.signUp({
          email: email,
          password: password,
          options: { data: { full_name: name || email.split("@")[0], account_type: signupAccountType } }
        });
        if(error) throw error;
        if(data.session){
          await onAuthed(data.user);
        } else {
          errBox.textContent = "Account creato! Controlla la tua email per confermarlo, poi accedi.";
          errBox.classList.add("show");
          switchAuthTab("login");
        }
      } else {
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email: email, password: password });
        if(error) throw error;
        await onAuthed(data.user);
      }
    } catch(e){
      errBox.textContent = e.message || "Si è verificato un errore, riprova.";
      errBox.classList.add("show");
    } finally {
      btn.disabled = false;
    }
  }

  async function handleLogout(){
    if(supabaseClient) await supabaseClient.auth.signOut().catch(()=>{});
    currentUser = null; currentProfile = null;
    const emailEl = document.getElementById("authEmail");
    const pwEl = document.getElementById("authPassword");
    if(emailEl) emailEl.value = "";
    if(pwEl) pwEl.value = "";
    go("auth");
  }

  async function onAuthed(user){
    currentUser = { id: user.id, email: user.email };
    await loadProfile();
    await applyReferralIfAny();
    await loadBlockLists();
    await loadRealPosts();
    await loadNotifications();
    subscribeNotifRealtime();
    openSharedPostFromUrl();
    if(currentProfile && !currentProfile.onboarded){
      go("onboarding");
    } else {
      go("feed");
    }
  }

  async function applyReferralIfAny(){
    if(!pendingReferralCode || !currentProfile || currentProfile.referred_by) return;
    try {
      const { data: refProfile } = await supabaseClient.from("profiles").select("id,points").eq("referral_code", pendingReferralCode).single();
      if(refProfile && refProfile.id !== currentUser.id){
        await supabaseClient.from("profiles").update({ referred_by: refProfile.id }).eq("id", currentUser.id);
        await supabaseClient.from("profiles").update({ points: (refProfile.points || 0) + 50 }).eq("id", refProfile.id);
        currentProfile.referred_by = refProfile.id;
      }
    } catch(e){}
    pendingReferralCode = null;
  }

  async function completeOnboarding(){
    const city = document.getElementById("onboardCity").value.trim();
    try {
      await supabaseClient.from("profiles").update({
        city: city || null,
        onboarded: true
      }).eq("id", currentUser.id);
      if(currentProfile){ currentProfile.onboarded = true; currentProfile.city = city || null; }
    } catch(e){}
    go("feed");
  }

  async function loadProfile(){
    if(!currentUser || !supabaseClient) return;
    try {
      const { data } = await supabaseClient.from("profiles").select("*").eq("id", currentUser.id).single();
      if(data){
        currentProfile = data;
        const nameEl = document.getElementById("profileName");
        const emailEl = document.getElementById("profileEmail");
        const avEl = document.getElementById("profileAvatar");
        const wEl = document.getElementById("statWorkouts");
        const pointsEl = document.getElementById("statPoints");
        const pointsNumEl = document.getElementById("pointsNum");
        const refEl = document.getElementById("referralCodeBox");
        const displayName = data.name || currentUser.email;
        if(nameEl) nameEl.textContent = displayName;
        if(emailEl) emailEl.textContent = currentUser.email + (data.city ? " · " + data.city : "");
        if(avEl) setAvatarContent(avEl, displayName, data.avatar_url);
        if(wEl && typeof data.workouts === "number") wEl.textContent = data.workouts;
        if(pointsEl) pointsEl.textContent = data.points || 0;
        if(pointsNumEl) pointsNumEl.textContent = data.points || 0;
        if(refEl) refEl.textContent = data.referral_code || "——";
        document.getElementById("adminLinkBtn").style.display = data.is_admin ? "inline-block" : "none";

        const isBusiness = data.account_type && data.account_type !== "persona";
        setVerifiedBadge(nameEl, isBusiness);
        document.getElementById("accountSection").style.display = isBusiness ? "block" : "none";
        if(isBusiness){
          document.getElementById("accountTypeLabel").textContent = data.account_type === "palestra" ? "Palestra" : "Personal trainer";
          if(data.business_name) document.getElementById("profileBizName").value = data.business_name;
          if(data.business_bio) document.getElementById("profileBizBio").value = data.business_bio;
          if(data.business_price) document.getElementById("profileBizPrice").value = data.business_price;
          document.getElementById("profileAccessSwitch").classList.toggle("on", !!data.accessible_disability);
        }

        loadWeeklyChallenge();
        refreshProCards();
        loadMyPostsGrid();
        loadAchievementsAndPRs();
      }
    } catch(e){}
  }

  async function loadMyPostsGrid(){
    const grid = document.getElementById("myPostsGrid");
    if(!grid || !currentUser) return;
    try {
      const { data } = await supabaseClient.from("posts").select("*").eq("author_id", currentUser.id).eq("archived", false).order("created_at", { ascending: false }).limit(30);
      grid.innerHTML = "";
      if(!data || data.length === 0){
        grid.innerHTML = '<div class="live-row" style="grid-column:1/-1;"><div class="txt">Non hai ancora pubblicato allenamenti</div></div>';
        return;
      }
      const icons = { "Corsa":"🏃", "Palestra":"🏋️", "Ciclismo":"🚴", "Camminata":"🚶", "Trekking":"🥾" };
      data.forEach(function(p){
        const cell = document.createElement("div");
        cell.className = "post-grid-cell";
        cell.onclick = function(){ openComments(p.id); };
        const photoUrls = Array.isArray(p.photo_urls) ? p.photo_urls.filter(Boolean) : [];
        if(photoUrls.length > 0){
          const img = document.createElement("img"); img.src = photoUrls[0]; img.loading = "lazy"; img.alt = "";
          cell.appendChild(img);
          if(photoUrls.length > 1){
            const multi = svgIcon("M4 6h12v12H4z M8 2h12v12", "0 0 24 24");
            multi.classList.add("pg-multi"); multi.setAttribute("fill","currentColor"); multi.removeAttribute("stroke");
            cell.appendChild(multi);
          }
        } else {
          const ic = document.createElement("div"); ic.className = "pg-ic"; ic.textContent = icons[p.type] || "💪";
          cell.appendChild(ic);
          if(p.distance_km){
            const val = document.createElement("div"); val.className = "pg-val"; val.textContent = Number(p.distance_km) + " km";
            cell.appendChild(val);
          }
          const type = document.createElement("div"); type.className = "pg-type"; type.textContent = p.type || "Allenamento";
          cell.appendChild(type);
        }
        grid.appendChild(cell);
      });
    } catch(e){}
  }

  // ================= MAPPA ATTIVITÀ REALE ("Ultime 18 settimane") =================
  // Calcola quante volte ti sei allenato in ciascuno degli ultimi 126 giorni
  // (18 blocchi da 7 giorni) a partire dai post reali, invece di colori casuali.
  const HEAT_SHADES = ['#1B1F19','#233318','#3B5A1E','#4E9A2A','#57E13B'];
  function heatShadeFor(count){
    if(!count) return HEAT_SHADES[0];
    if(count === 1) return HEAT_SHADES[2];
    if(count === 2) return HEAT_SHADES[3];
    return HEAT_SHADES[4];
  }
  function renderEmptyHeatmap(heat){
    heat.innerHTML = "";
    for(let i=0;i<18*7;i++){
      const cell = document.createElement("div"); cell.className = "heat-cell"; cell.style.background = HEAT_SHADES[0];
      heat.appendChild(cell);
    }
  }
  async function loadActivityHeatmap(){
    const heat = document.getElementById("heatGrid");
    if(!heat) return;
    if(!supabaseClient || !currentUser){ renderEmptyHeatmap(heat); return; }
    try {
      const totalDays = 18 * 7;
      const since = new Date(); since.setHours(0,0,0,0); since.setDate(since.getDate() - (totalDays - 1));
      const { data } = await supabaseClient.from("posts").select("created_at").eq("author_id", currentUser.id).eq("archived", false).gte("created_at", since.toISOString());
      const counts = {};
      (data || []).forEach(function(p){
        const d = new Date(p.created_at);
        const key = d.getFullYear() + "-" + (d.getMonth()+1) + "-" + d.getDate();
        counts[key] = (counts[key] || 0) + 1;
      });
      heat.innerHTML = "";
      // 7 righe (giorno all'interno del blocco settimanale) x 18 colonne (blocco, dal più vecchio al più recente)
      for(let row=0; row<7; row++){
        for(let week=0; week<18; week++){
          const dayIndex = week * 7 + row;
          const cellDate = new Date(since);
          cellDate.setDate(since.getDate() + dayIndex);
          const key = cellDate.getFullYear() + "-" + (cellDate.getMonth()+1) + "-" + cellDate.getDate();
          const cell = document.createElement("div"); cell.className = "heat-cell"; cell.style.background = heatShadeFor(counts[key]);
          cell.title = cellDate.toLocaleDateString("it-IT") + (counts[key] ? (": " + counts[key] + " allenamento/i") : "");
          heat.appendChild(cell);
        }
      }
    } catch(e){
      renderEmptyHeatmap(heat);
    }
  }

  async function saveProfileSettings(){
    // Il tipo di account si decide solo in fase di registrazione: qui si aggiornano
    // solo i dati del servizio (tariffario, descrizione, accessibilità).
    const accessible = document.getElementById("profileAccessSwitch").classList.contains("on");
    try {
      await supabaseClient.from("profiles").update({
        business_name: document.getElementById("profileBizName").value.trim() || null,
        business_bio: document.getElementById("profileBizBio").value.trim() || null,
        business_price: document.getElementById("profileBizPrice").value.trim() || null,
        accessible_disability: accessible
      }).eq("id", currentUser.id);
      toast("Dati attività aggiornati!");
    } catch(e){
      toast("Salvataggio non riuscito, riprova");
    }
  }

  function shareReferral(){
    const code = (currentProfile && currentProfile.referral_code) || "";
    const url = window.location.origin + window.location.pathname + "?ref=" + code;
    const shareData = { title: "Sweat", text: "Unisciti a me su Sweat! Usa il mio codice invito.", url: url };
    if(navigator.share){ navigator.share(shareData).catch(()=>{}); }
    else if(navigator.clipboard){ navigator.clipboard.writeText(url).then(()=>toast("Link invito copiato!")); }
  }

  // ================= LINGUA (prima versione) =================
  const LANG = {
    it: { feed:"Feed", gruppi:"Gruppi", market:"Market", profilo:"Profilo", ai:"AI", entra:"Entra nell'app", condividi:"Condividi demo", accedi:"Accedi", registrati:"Registrati", messaggi:"Messaggi", admin:"Pannello Admin", esci:"Esci dall'account" },
    en: { feed:"Feed", gruppi:"Groups", market:"Market", profilo:"Profile", ai:"AI", entra:"Enter the app", condividi:"Share demo", accedi:"Log in", registrati:"Sign up", messaggi:"Messages", admin:"Admin panel", esci:"Log out" }
  };

  function setLanguage(lang){
    localStorage.setItem("sweatLang", lang);
    applyLanguage(lang);
  }

  function applyLanguage(lang){
    const dict = LANG[lang] || LANG.it;
    document.getElementById("langChipIt").classList.toggle("active", lang==="it");
    document.getElementById("langChipEn").classList.toggle("active", lang==="en");
    document.querySelectorAll('[data-i18n]').forEach(function(el){
      const key = el.getAttribute("data-i18n");
      if(dict[key]) el.textContent = dict[key];
    });
  }

  // ================= FEED REALE =================
  let realPosts = [];

  function showFeedSkeleton(){
    const wrap = document.getElementById("dynamicPosts");
    if(!wrap) return;
    let html = "";
    for(let i=0;i<2;i++){
      html += '<div class="skeleton-post">'
        + '<div class="skeleton-row"><div class="skeleton-box skeleton-avatar"></div><div class="skeleton-box skeleton-line" style="width:120px;"></div></div>'
        + '<div class="skeleton-box skeleton-line" style="width:90%;height:13px;margin-bottom:8px;"></div>'
        + '<div class="skeleton-box skeleton-line" style="width:55%;height:13px;"></div>'
        + '</div>';
    }
    wrap.innerHTML = html;
  }

  const FEED_PAGE_SIZE = 15;
  let feedQueryAuthorIds = null; // null = tutti, array = solo chi segui (o scoperta)
  let feedOffset = 0;
  let feedHasMore = true;
  let feedLoadingMore = false;

  let mySavedPostIds = new Set();

  function applyMyReactionsToPosts(posts, cb){
    if(!currentUser){ cb(); return; }
    Promise.all([
      supabaseClient.from("likes").select("post_id,reaction_type").eq("user_id", currentUser.id),
      supabaseClient.from("saved_posts").select("post_id").eq("user_id", currentUser.id)
    ]).then(function(results){
      const likeRes = results[0], savedRes = results[1];
      const reactionByPost = {};
      (likeRes.data||[]).forEach(r => { reactionByPost[r.post_id] = r.reaction_type || "like"; });
      mySavedPostIds = new Set((savedRes.data||[]).map(function(r){ return r.post_id; }));
      posts.forEach(p => {
        p._likedByMe = Object.prototype.hasOwnProperty.call(reactionByPost, p.id);
        p._myReaction = reactionByPost[p.id] || null;
        p._savedByMe = mySavedPostIds.has(p.id);
      });
      cb();
    }).catch(cb);
  }

  async function loadRealPosts(){
    if(!supabaseClient) return;
    showFeedSkeleton();
    feedOffset = 0;
    feedHasMore = true;
    try {
      let authorIds = null;
      if(currentUser){
        const { data: followingRows } = await supabaseClient.from("follows").select("following_id").eq("follower_id", currentUser.id);
        authorIds = (followingRows || []).map(function(r){ return r.following_id; });
        authorIds.push(currentUser.id);
      }
      let query = supabaseClient.from("posts").select("*").eq("archived", false).order("created_at", { ascending: false }).range(0, FEED_PAGE_SIZE - 1);
      if(authorIds && authorIds.length){ query = query.in("author_id", authorIds); }
      const { data, error } = await query;
      if(error) throw error;
      let posts = data || [];
      if(authorIds && posts.length === 0){
        // Non segui ancora nessuno (o chi segui non ha post): mostriamo gli ultimi post pubblici per scoprire persone
        authorIds = null;
        const { data: discover } = await supabaseClient.from("posts").select("*").eq("archived", false).order("created_at", { ascending: false }).range(0, FEED_PAGE_SIZE - 1);
        posts = discover || [];
      }
      feedQueryAuthorIds = authorIds;
      if(typeof myBlockedIds !== "undefined"){ posts = posts.filter(function(p){ return !myBlockedIds.has(p.author_id); }); }
      realPosts = posts;
      feedOffset = posts.length;
      if(posts.length < FEED_PAGE_SIZE) feedHasMore = false;
      applyMyReactionsToPosts(realPosts, renderDynamicPosts);
    } catch(e){
      const wrap = document.getElementById("dynamicPosts");
      if(wrap) wrap.innerHTML = "";
    }
  }

  async function loadMoreFeedPosts(){
    if(!supabaseClient || !feedHasMore || feedLoadingMore) return;
    feedLoadingMore = true;
    try {
      let query = supabaseClient.from("posts").select("*").eq("archived", false).order("created_at", { ascending: false }).range(feedOffset, feedOffset + FEED_PAGE_SIZE - 1);
      if(feedQueryAuthorIds && feedQueryAuthorIds.length){ query = query.in("author_id", feedQueryAuthorIds); }
      const { data, error } = await query;
      if(error) throw error;
      let more = data || [];
      if(typeof myBlockedIds !== "undefined"){ more = more.filter(function(p){ return !myBlockedIds.has(p.author_id); }); }
      feedOffset += (data || []).length;
      if((data || []).length < FEED_PAGE_SIZE) feedHasMore = false;
      if(more.length === 0){ feedLoadingMore = false; return; }
      realPosts = realPosts.concat(more);
      applyMyReactionsToPosts(more, function(){
        renderDynamicPosts();
        feedLoadingMore = false;
      });
    } catch(e){ feedLoadingMore = false; }
  }

  // ---- Pull-to-refresh sul Feed ----
  (function setupPullToRefresh(){
    let startY = 0, pulling = false;
    const threshold = 70;

    function onTouchStart(e){
      const feedScreen = document.getElementById("screen-feed");
      if(!feedScreen || !feedScreen.classList.contains("active")) return;
      if(document.getElementById("mainArea").scrollTop > 0) return;
      startY = e.touches[0].clientY;
      pulling = true;
    }
    function onTouchMove(e){
      if(!pulling) return;
      const dy = e.touches[0].clientY - startY;
      const indicator = document.getElementById("ptrIndicator");
      if(dy > 10 && indicator){
        indicator.classList.add("show");
        indicator.textContent = dy > threshold ? "Rilascia per aggiornare" : "Tira per aggiornare";
      }
    }
    function onTouchEnd(e){
      if(!pulling) return;
      pulling = false;
      const indicator = document.getElementById("ptrIndicator");
      const dy = (e.changedTouches && e.changedTouches[0] ? e.changedTouches[0].clientY : startY) - startY;
      if(indicator) indicator.classList.remove("show");
      if(dy > threshold){
        if(indicator){ indicator.classList.add("show"); indicator.textContent = "Aggiornamento..."; }
        loadRealPosts().then(function(){ if(indicator) indicator.classList.remove("show"); });
      }
    }

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: true });
    document.addEventListener("touchend", onTouchEnd, { passive: true });
  })();

  // ---- Scroll infinito: carica altri post quando ci si avvicina al fondo del Feed ----
  (function setupInfiniteScroll(){
    document.addEventListener("DOMContentLoaded", attachScrollListener);
    if(document.readyState !== "loading") attachScrollListener();
    function attachScrollListener(){
      const mainArea = document.getElementById("mainArea");
      if(!mainArea) return;
      mainArea.addEventListener("scroll", function(){
        const feedScreen = document.getElementById("screen-feed");
        if(!feedScreen || !feedScreen.classList.contains("active")) return;
        const nearBottom = mainArea.scrollTop + mainArea.clientHeight > mainArea.scrollHeight - 400;
        if(nearBottom) loadMoreFeedPosts();
      }, { passive: true });
    }
  })();

  function formatRelativeTime(dateStr){
    if(!dateStr) return "";
    const then = new Date(dateStr).getTime();
    const diffMin = Math.round((Date.now() - then) / 60000);
    if(diffMin < 1) return "adesso";
    if(diffMin < 60) return diffMin + " min fa";
    const diffH = Math.round(diffMin / 60);
    if(diffH < 24) return diffH + " h fa";
    const diffD = Math.round(diffH / 24);
    return diffD + " g fa";
  }

  function svgIcon(pathD, viewBox){
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS,"svg");
    svg.setAttribute("viewBox", viewBox || "0 0 24 24");
    svg.setAttribute("fill","none"); svg.setAttribute("stroke","currentColor"); svg.setAttribute("stroke-width","2");
    const path = document.createElementNS(svgNS,"path");
    path.setAttribute("d", pathD);
    svg.appendChild(path);
    return svg;
  }

  function renderDynamicPosts(){
    const wrap = document.getElementById("dynamicPosts");
    if(!wrap) return;
    wrap.innerHTML = "";
    realPosts.forEach(function(p){
      const art = document.createElement("article");
      art.className = "post";
      art.dataset.postId = p.id;

      // ---- header ----
      const head = document.createElement("div");
      head.className = "post-head";
      const av = document.createElement("div");
      av.className = "avatar a1";
      av.style.width = "34px"; av.style.height = "34px"; av.style.fontSize = "13px"; av.style.cursor = "pointer";
      av.textContent = (p.author_name || "??").slice(0,2).toUpperCase();
      av.onclick = function(){ viewProfile(p.author_id); };
      const who = document.createElement("div");
      who.className = "who";
      who.style.cursor = "pointer";
      who.onclick = function(){ viewProfile(p.author_id); };
      const nm = document.createElement("div"); nm.className = "name"; nm.textContent = p.author_name || "Utente Sweat";
      const metaLine = [p.type || "Allenamento"];
      if(p.distance_km) metaLine.push(Number(p.distance_km) + " km");
      metaLine.push(formatRelativeTime(p.created_at));
      const meta = document.createElement("div"); meta.className = "meta"; meta.textContent = metaLine.join(" · ");
      who.appendChild(nm); who.appendChild(meta);
      const menuBtn = document.createElement("button");
      menuBtn.className = "post-menu-btn";
      menuBtn.setAttribute("aria-label", "Altre opzioni");
      const dotsNS = "http://www.w3.org/2000/svg";
      const dotsSvg = document.createElementNS(dotsNS, "svg");
      dotsSvg.setAttribute("viewBox","0 0 24 24"); dotsSvg.setAttribute("fill","currentColor");
      [5,12,19].forEach(function(cy){
        const c = document.createElementNS(dotsNS,"circle");
        c.setAttribute("cx","12"); c.setAttribute("cy", cy); c.setAttribute("r","1.6");
        dotsSvg.appendChild(c);
      });
      menuBtn.appendChild(dotsSvg);
      menuBtn.onclick = function(){ handlePostMenu(p.id, currentUser && p.author_id === currentUser.id); };
      head.appendChild(av); head.appendChild(who); head.appendChild(menuBtn);
      setAvatarContent(av, p.author_name, p.author_avatar_url);

      // ---- foto del post (singola o carosello, con doppio tap per il like) ----
      const photoBlock = buildPostPhotoBlock(p);

      // ---- azioni (cuore / commento / condividi / salva) ----
      const actions = document.createElement("div");
      actions.className = "post-actions";
      const kudos = document.createElement("button");
      kudos.className = "kudos";
      if(p._likedByMe) kudos.classList.add("active");
      kudos.dataset.reaction = p._myReaction || "like";
      kudos.appendChild(svgIcon("M12 21s-7-4.6-9.5-9C0.7 8.4 2 4.5 6 4c2.1-.3 3.7.8 6 3 2.3-2.2 3.9-3.3 6-3 4 .5 5.3 4.4 3.5 8-2.5 4.4-9.5 9-9.5 9z"));
      setupReactionLongPress(kudos, p.id);
      const commentBtn = document.createElement("button");
      commentBtn.setAttribute("aria-label","Commenta");
      commentBtn.onclick = function(){ openComments(p.id); };
      commentBtn.appendChild(svgIcon("M21 11.5a8.5 8.5 0 1 1-3.8-7.1L21 3l-1 4.5"));
      const shareBtn = document.createElement("button");
      shareBtn.setAttribute("aria-label","Condividi");
      shareBtn.onclick = function(e){ e.stopPropagation(); sharePost(p.id); };
      shareBtn.appendChild(svgIcon("M22 2 11 13M22 2 15 22l-4-9-9-4 20-7z"));
      const spacer = document.createElement("div"); spacer.className = "spacer";
      const saveBtn = document.createElement("button");
      saveBtn.className = "save-btn" + (p._savedByMe ? " saved" : "");
      saveBtn.setAttribute("aria-label","Salva");
      saveBtn.onclick = function(){ toggleSave(saveBtn, p.id); };
      saveBtn.appendChild(svgIcon("M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z"));
      actions.appendChild(kudos); actions.appendChild(commentBtn); actions.appendChild(shareBtn);
      actions.appendChild(spacer); actions.appendChild(saveBtn);

      // ---- like / didascalia / orario ----
      const likes = document.createElement("div");
      likes.className = "post-likes";
      if(p._likedByMe && p._myReaction && p._myReaction !== "like"){
        const emojiSpan = document.createElement("span"); emojiSpan.className = "reaction-emoji"; emojiSpan.textContent = REACTION_EMOJI[p._myReaction] || "";
        likes.appendChild(emojiSpan);
      }
      const countSpan = document.createElement("span"); countSpan.className = "count"; countSpan.textContent = p.likes_count || 0;
      likes.appendChild(countSpan);
      likes.appendChild(document.createTextNode(" Mi piace"));

      const capLine = document.createElement("div");
      capLine.className = "post-caption-line";
      const capName = document.createElement("b"); capName.textContent = p.author_name || "Utente Sweat";
      capLine.appendChild(capName);
      capLine.appendChild(document.createTextNode(p.caption || ""));

      const commentsCount = p.comments_count || 0;
      let commentsLink = null;
      if(commentsCount > 0){
        commentsLink = document.createElement("div");
        commentsLink.className = "post-comments-link";
        commentsLink.onclick = function(){ openComments(p.id); };
        const ccount = document.createElement("span"); ccount.className = "ccount"; ccount.textContent = commentsCount;
        commentsLink.appendChild(document.createTextNode("Visualizza tutti i "));
        commentsLink.appendChild(ccount);
        commentsLink.appendChild(document.createTextNode(" commenti"));
      }

      const timeLine = document.createElement("div");
      timeLine.className = "post-time";
      timeLine.textContent = formatRelativeTime(p.created_at);

      art.appendChild(head);
      if(photoBlock) art.appendChild(photoBlock);
      art.appendChild(actions); art.appendChild(likes); art.appendChild(capLine);
      if(commentsLink) art.appendChild(commentsLink);
      art.appendChild(timeLine);
      wrap.appendChild(art);
    });
  }

  async function publishWorkout(){
    const activeType = document.querySelector("#screen-crea .type-pill.active span:last-child");
    const type = activeType ? activeType.textContent : "Allenamento";
    const captionEl = document.getElementById("creaCaption");
    const caption = (captionEl.value || "").trim() || "Allenamento completato 💪";
    const distRaw = (document.getElementById("creaDistance").value || "").replace(",", ".").trim();
    const distance = distRaw ? parseFloat(distRaw) : null;
    const durRaw = (document.getElementById("creaDuration").value || "").replace(",", ".").trim();
    const duration = durRaw ? parseFloat(durRaw) : null;

    const elevEl = document.getElementById("creaElevation");
    const elevRaw = elevEl ? (elevEl.value || "").replace(",", ".").trim() : "";
    const elevation = elevRaw ? parseFloat(elevRaw) : null;
    const hrEl = document.getElementById("creaHeartRate");
    const hrRaw = hrEl ? (hrEl.value || "").replace(",", ".").trim() : "";
    const heartRate = hrRaw ? parseInt(hrRaw, 10) : null;
    const effortEl = document.getElementById("creaEffort");
    const effortRaw = effortEl ? effortEl.value : "";
    const effort = effortRaw ? parseInt(effortRaw, 10) : null;
    const exercises = (type === "Palestra" && typeof collectExerciseRows === "function") ? collectExerciseRows() : null;
    const hashtags = (typeof parseHashtags === "function") ? parseHashtags(caption) : null;

    if(!supabaseClient || !currentUser){
      toast("Devi accedere per pubblicare");
      return;
    }
    try {
      const photoUrls = await uploadSelectedCreaPhotos();
      const { data, error } = await supabaseClient.from("posts").insert({
        author_id: currentUser.id,
        author_name: (currentProfile && currentProfile.name) || currentUser.email,
        author_avatar_url: (currentProfile && currentProfile.avatar_url) || null,
        type: type,
        caption: caption,
        distance_km: (distance && !isNaN(distance)) ? distance : null,
        duration_min: (duration && !isNaN(duration)) ? duration : null,
        photo_urls: photoUrls.length ? photoUrls : null,
        elevation_gain_m: (elevation && !isNaN(elevation)) ? elevation : null,
        avg_heart_rate: (heartRate && !isNaN(heartRate)) ? heartRate : null,
        perceived_effort: (effort && !isNaN(effort)) ? effort : null,
        exercises: (exercises && exercises.length) ? exercises : null,
        hashtags: (hashtags && hashtags.length) ? hashtags : null
      }).select().single();
      if(error) throw error;
      data._likedByMe = false;
      realPosts.unshift(data);
      renderDynamicPosts();
      bumpWorkoutCount();
      captionEl.value = "";
      document.getElementById("creaDistance").value = "";
      document.getElementById("creaDuration").value = "";
      if(elevEl) elevEl.value = "";
      if(hrEl) hrEl.value = "";
      if(effortEl) effortEl.value = "";
      if(typeof resetExerciseRows === "function") resetExerciseRows();
      resetCreaPhotoPicker();
      toast("Pubblicato nel feed di tutti!");
      go("feed");
    } catch(e){
      console.error("Pubblicazione allenamento non riuscita:", e);
      toast("Pubblicazione non riuscita: " + (e && e.message ? e.message : "riprova"));
    }
  }

  async function bumpWorkoutCount(){
    if(!supabaseClient || !currentUser) return;
    try {
      const nextWorkouts = ((currentProfile && currentProfile.workouts) || 0) + 1;
      const nextPoints = ((currentProfile && currentProfile.points) || 0) + 10;
      const { error } = await supabaseClient.from("profiles").update({ workouts: nextWorkouts, points: nextPoints }).eq("id", currentUser.id);
      if(!error){
        if(currentProfile){ currentProfile.workouts = nextWorkouts; currentProfile.points = nextPoints; }
        const el = document.getElementById("statWorkouts");
        if(el) el.textContent = nextWorkouts;
        const pEl = document.getElementById("statPoints");
        if(pEl) pEl.textContent = nextPoints;
        const pnEl = document.getElementById("pointsNum");
        if(pnEl) pnEl.textContent = nextPoints;
      }
      loadWeeklyChallenge();
    } catch(e){}
  }

  // ================= SFIDA SETTIMANALE E CLASSIFICA REALI =================
  async function loadWeeklyChallenge(){
    if(!supabaseClient || !currentUser) return;
    try {
      const now = new Date();
      const day = now.getDay() === 0 ? 7 : now.getDay();
      const monday = new Date(now); monday.setDate(now.getDate() - day + 1); monday.setHours(0,0,0,0);

      let query = supabaseClient.from("posts").select("author_id,author_name,distance_km,created_at").eq("archived", false).gte("created_at", monday.toISOString());
      if(typeof leaderboardScope !== "undefined" && leaderboardScope === "amici"){
        const { data: followingRows } = await supabaseClient.from("follows").select("following_id").eq("follower_id", currentUser.id);
        const friendIds = (followingRows || []).map(function(r){ return r.following_id; });
        friendIds.push(currentUser.id);
        query = query.in("author_id", friendIds);
      }
      const { data } = await query;
      const totals = {};
      (data || []).forEach(function(row){
        if(!row.distance_km) return;
        const key = row.author_id || row.author_name;
        if(!totals[key]) totals[key] = { name: row.author_name, km: 0, id: row.author_id };
        totals[key].km += Number(row.distance_km);
      });
      const ranking = Object.values(totals).sort(function(a,b){ return b.km - a.km; }).slice(0,5);

      const myTotal = totals[currentUser.id] ? totals[currentUser.id].km : 0;
      const goalKm = 50;
      document.getElementById("challengeProgress").textContent = Math.round(myTotal) + "/" + goalKm + " km";
      document.getElementById("challengeBar").style.width = Math.min(100, Math.round(myTotal/goalKm*100)) + "%";

      const list = document.getElementById("leaderboardList");
      if(ranking.length === 0){
        list.innerHTML = '<div class="rank-row"><span>Pubblica un allenamento con la distanza per entrare in classifica</span></div>';
      } else {
        list.innerHTML = "";
        ranking.forEach(function(r, i){
          const row = document.createElement("div");
          row.className = "rank-row" + (r.id === currentUser.id ? " me" : "");
          const span = document.createElement("span"); span.textContent = (i+1) + ". " + (r.id === currentUser.id ? "Tu" : (r.name || "Utente"));
          const b = document.createElement("b"); b.textContent = Math.round(r.km) + " km";
          row.appendChild(span); row.appendChild(b);
          list.appendChild(row);
        });
      }

      // Km del mese per la card statistiche in alto
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const { data: monthData } = await supabaseClient.from("posts").select("distance_km").eq("author_id", currentUser.id).eq("archived", false).gte("created_at", monthStart.toISOString());
      const monthKm = (monthData || []).reduce(function(sum, r){ return sum + (Number(r.distance_km) || 0); }, 0);
      const kmEl = document.getElementById("statKm");
      if(kmEl) kmEl.textContent = Math.round(monthKm);
    } catch(e){}
  }

  // ================= GRUPPI / CLUB ================= 
  let realGroups = [];
  let myGroupIds = new Set();

  async function loadGroups(){
    if(!supabaseClient) return;
    try {
      const { data } = await supabaseClient.from("groups").select("*").order("created_at", { ascending: false }).limit(30);
      realGroups = data || [];
      if(currentUser){
        const { data: mine } = await supabaseClient.from("group_members").select("group_id").eq("user_id", currentUser.id);
        myGroupIds = new Set((mine || []).map(r => r.group_id));
      }
      renderGroupsList();
    } catch(e){}
  }

  function renderGroupsList(){
    const wrap = document.getElementById("groupsList");
    document.getElementById("groupsCount").textContent = realGroups.length + " gruppi";
    wrap.innerHTML = "";
    realGroups.forEach(function(g){
      const card = document.createElement("div");
      card.className = "group-card";
      const title = document.createElement("div"); title.className = "g-title"; title.textContent = g.name;
      const sub = document.createElement("div"); sub.className = "g-sub"; sub.textContent = (g.members_count || 1) + " iscritti" + (g.city ? " · " + g.city : "") + (g.description ? " · " + g.description : "");
      const btn = document.createElement("button");
      const joined = myGroupIds.has(g.id);
      btn.className = "primary-btn"; btn.style.padding = "11px";
      btn.textContent = joined ? "Esci dal gruppo" : "Unisciti al gruppo";
      btn.onclick = function(){ joined ? leaveGroup(g.id) : joinGroup(g.id); };
      card.appendChild(title); card.appendChild(sub); card.appendChild(btn);
      if(joined){
        const chatBtn = document.createElement("button");
        chatBtn.className = "profile-btn"; chatBtn.style.width = "100%"; chatBtn.style.marginTop = "8px";
        chatBtn.textContent = "💬 Chat del gruppo";
        chatBtn.onclick = function(){ openGroupChat(g.id, g.name); go("gruppochat"); };
        card.appendChild(chatBtn);
      }
      wrap.appendChild(card);
    });
  }

  async function createGroup(){
    const name = document.getElementById("newGroupName").value.trim();
    const city = document.getElementById("newGroupCity").value.trim();
    const desc = document.getElementById("newGroupDesc").value.trim();
    if(!name){ toast("Dai un nome al gruppo"); return; }
    if(!currentUser){ toast("Devi accedere per creare un gruppo"); return; }
    try {
      const { data, error } = await supabaseClient.from("groups").insert({ name: name, city: city || null, description: desc || null, creator_id: currentUser.id }).select().single();
      if(error) throw error;
      await supabaseClient.from("group_members").insert({ group_id: data.id, user_id: currentUser.id });
      document.getElementById("newGroupName").value = "";
      document.getElementById("newGroupCity").value = "";
      document.getElementById("newGroupDesc").value = "";
      toast("Gruppo creato!");
      loadGroups();
    } catch(e){
      toast("Creazione non riuscita, riprova");
    }
  }

  async function joinGroup(groupId){
    if(!currentUser){ toast("Devi accedere"); return; }
    try {
      await supabaseClient.from("group_members").insert({ group_id: groupId, user_id: currentUser.id });
      myGroupIds.add(groupId);
      toast("Ti sei unito al gruppo!");
      loadGroups();
    } catch(e){ toast("Operazione non riuscita"); }
  }

  async function leaveGroup(groupId){
    if(!window.confirm("Vuoi davvero lasciare questo gruppo?")) return;
    try {
      await supabaseClient.from("group_members").delete().match({ group_id: groupId, user_id: currentUser.id });
      myGroupIds.delete(groupId);
      toast("Hai lasciato il gruppo");
      loadGroups();
    } catch(e){ toast("Operazione non riuscita"); }
  }

  // ================= MARKETPLACE (PALESTRE / PERSONAL TRAINER) =================
  let accessOnlyFilter = false;
  let realBusinesses = [];

  function toggleAccessFilter(){
    accessOnlyFilter = !accessOnlyFilter;
    document.getElementById("accessFilterSwitch").classList.toggle("on", accessOnlyFilter);
    renderMarketplaceList();
  }

  async function loadMarketplace(){
    if(!supabaseClient) return;
    try {
      const { data } = await supabaseClient.from("profiles").select("*").in("account_type", ["palestra","personal_trainer"]).limit(50);
      realBusinesses = data || [];
      renderMarketplaceList();
    } catch(e){}
  }

  function renderMarketplaceList(){
    const wrap = document.getElementById("marketplaceList");
    wrap.innerHTML = "";
    const list = accessOnlyFilter ? realBusinesses.filter(b => b.accessible_disability) : realBusinesses;
    if(list.length === 0){
      wrap.innerHTML = '<div class="live-row"><div class="txt">Nessuna attività registrata ancora. Sii il primo!</div></div>';
      return;
    }
    list.forEach(function(b){
      const card = document.createElement("div");
      card.className = "coach-card";
      const av = document.createElement("div"); av.className = "avatar a1";
      av.textContent = (b.business_name || b.name || "??").slice(0,2).toUpperCase();
      av.style.cursor = "pointer";
      av.onclick = function(){ viewProfile(b.id); };
      const info = document.createElement("div"); info.className = "coach-info";
      const nm = document.createElement("div"); nm.className = "name"; nm.textContent = b.business_name || b.name;
      const role = document.createElement("div"); role.className = "role";
      role.textContent = b.account_type === "palestra" ? "Palestra" : "Personal trainer";
      const sub = document.createElement("div"); sub.className = "sub";
      sub.textContent = b.business_price || (b.city || "");
      info.appendChild(nm); info.appendChild(role); info.appendChild(sub);
      if(b.accessible_disability){
        const badge = document.createElement("span"); badge.className = "badge-access"; badge.textContent = "♿ Accessibile";
        info.appendChild(badge);
      }
      const btn = document.createElement("button"); btn.className = "book-btn"; btn.textContent = "Scrivi";
      btn.onclick = function(){ openChat(b.id, b.business_name || b.name); go("chat"); };
      card.appendChild(av); card.appendChild(info); card.appendChild(btn);
      wrap.appendChild(card);
    });
  }

  // ================= PROFILO DI UN ALTRO UTENTE =================
  async function viewProfile(userId){
    if(!userId || !supabaseClient) return;
    try {
      const { data } = await supabaseClient.from("profiles").select("*").eq("id", userId).single();
      if(!data) return;
      currentOtherProfile = { id: data.id, name: data.name || "Utente Sweat" };
      setAvatarContent(document.getElementById("otherAvatar"), currentOtherProfile.name, data.avatar_url);
      const otherNameEl = document.getElementById("otherName");
      otherNameEl.textContent = currentOtherProfile.name;
      setVerifiedBadge(otherNameEl, !!(data.account_type && data.account_type !== "persona"));
      let meta = data.city || "";
      if(data.level) meta += (meta ? " · " : "") + data.level;
      document.getElementById("otherMeta").textContent = meta || "Atleta Sweat";
      const onlineDot = document.getElementById("otherOnlineDot");
      if(onlineDot) onlineDot.style.display = isRecentlyOnline(data.last_seen) ? "block" : "none";
      refreshFollowButton(data.id);
      refreshBlockButton(data.id);
      const bizWrap = document.getElementById("otherBizInfo");
      bizWrap.innerHTML = "";
      if(data.account_type && data.account_type !== "persona"){
        const card = document.createElement("div");
        card.className = "filter-card";
        card.style.margin = "0 20px 18px";
        const role = document.createElement("p"); role.style.cssText = "font-size:13px;color:var(--signal);font-weight:700;margin:0 0 8px;";
        role.textContent = data.account_type === "palestra" ? "Palestra" : "Personal trainer";
        card.appendChild(role);
        if(data.business_bio){ const p = document.createElement("p"); p.style.cssText="font-size:13px;color:var(--fog);margin:0 0 8px;"; p.textContent = data.business_bio; card.appendChild(p); }
        if(data.business_price){ const p2 = document.createElement("p"); p2.style.cssText="font-size:14px;font-weight:600;margin:0;"; p2.textContent = data.business_price; card.appendChild(p2); }
        if(data.accessible_disability){ const badge = document.createElement("span"); badge.className="badge-access"; badge.textContent="♿ Accessibile a persone con disabilità"; card.appendChild(badge); }
        bizWrap.appendChild(card);
      }
      go("altroprofilo");
    } catch(e){}
  }

  function startChatWithOther(){
    if(!currentOtherProfile) return;
    openChat(currentOtherProfile.id, currentOtherProfile.name);
    go("chat");
  }

  // ================= MESSAGGISTICA DIRETTA =================
  async function loadConversations(){
    if(!supabaseClient || !currentUser) return;
    try {
      const { data } = await supabaseClient.from("messages").select("*").or("sender_id.eq." + currentUser.id + ",receiver_id.eq." + currentUser.id).order("created_at", { ascending: false }).limit(200);
      const byPartner = {};
      (data || []).forEach(function(m){
        const otherId = m.sender_id === currentUser.id ? m.receiver_id : m.sender_id;
        if(!byPartner[otherId]) byPartner[otherId] = m;
      });
      const partnerIds = Object.keys(byPartner);
      let profilesById = {};
      let lastSeenById = {};
      let avatarById = {};
      if(partnerIds.length){
        const { data: profs } = await supabaseClient.from("profiles").select("id,name,last_seen,avatar_url").in("id", partnerIds);
        (profs || []).forEach(function(p){ profilesById[p.id] = p.name; lastSeenById[p.id] = p.last_seen; avatarById[p.id] = p.avatar_url; });
      }
      const wrap = document.getElementById("conversationsList");
      wrap.innerHTML = "";
      if(partnerIds.length === 0){
        wrap.innerHTML = '<div class="live-row"><div class="txt">Nessuna conversazione ancora. Scrivi a qualcuno dal Marketplace o da un profilo.</div></div>';
        return;
      }
      partnerIds.forEach(function(pid){
        const m = byPartner[pid];
        const row = document.createElement("div");
        row.className = "conv-row";
        row.onclick = function(){ openChat(pid, profilesById[pid] || "Utente Sweat"); go("chat"); };
        const avWrap = document.createElement("div"); avWrap.style.position = "relative"; avWrap.style.flexShrink = "0";
        const av = document.createElement("div"); av.className = "avatar a3";
        setAvatarContent(av, profilesById[pid], avatarById[pid]);
        av.onclick = function(e){ e.stopPropagation(); viewProfile(pid); };
        avWrap.appendChild(av);
        if(isRecentlyOnline(lastSeenById[pid])){
          const dot = document.createElement("div"); dot.className = "online-dot";
          avWrap.appendChild(dot);
        }
        const ci = document.createElement("div"); ci.className = "ci";
        const cn = document.createElement("div"); cn.className = "cn"; cn.textContent = profilesById[pid] || "Utente Sweat";
        const cp = document.createElement("div"); cp.className = "cp"; cp.textContent = m.content;
        ci.appendChild(cn); ci.appendChild(cp);

        const right = document.createElement("div"); right.className = "cr-right";
        const time = document.createElement("div"); time.className = "cr-time"; time.textContent = formatRelativeTime(m.created_at);
        right.appendChild(time);
        const unread = m.receiver_id === currentUser.id && m.read === false;
        if(unread){
          const dot = document.createElement("div"); dot.className = "cr-dot";
          right.appendChild(dot);
        }

        row.appendChild(av); row.appendChild(ci); row.appendChild(right);
        wrap.appendChild(row);
      });
    } catch(e){}
  }

  function hideChatTypingIndicator(){
    const el = document.getElementById("chatTypingIndicator");
    if(el) el.style.display = "none";
    if(partnerTypingTimeout){ clearTimeout(partnerTypingTimeout); partnerTypingTimeout = null; }
  }

  function appendChatBubble(m, fromMe){
    const thread = document.getElementById("chatThread");
    if(!thread) return;
    const b = document.createElement("div");
    b.className = "msg-bubble " + (fromMe ? "me" : "them");
    if(m.id) b.dataset.messageId = m.id;
    if(m.media_url){
      const img = document.createElement("img");
      img.src = m.media_url; img.className = "msg-image"; img.loading = "lazy"; img.alt = "";
      b.appendChild(img);
    }
    if(m.content){
      const txt = document.createElement("div"); txt.textContent = m.content;
      b.appendChild(txt);
    }
    if(fromMe){
      const status = document.createElement("div");
      status.className = "msg-status" + (m.read ? " read" : "");
      status.textContent = m.read ? "✓✓ Letto" : "✓ Inviato";
      b.appendChild(status);
    }
    thread.appendChild(b);
    thread.scrollTop = thread.scrollHeight;
    if(!fromMe) hideChatTypingIndicator();
  }

  function markChatBubbleRead(messageId){
    const thread = document.getElementById("chatThread");
    if(!thread) return;
    const bubble = thread.querySelector('[data-message-id="' + messageId + '"]');
    if(!bubble) return;
    const status = bubble.querySelector(".msg-status");
    if(status){ status.textContent = "✓✓ Letto"; status.classList.add("read"); }
  }

  let chatRealtimeChannel = null;
  let chatTypingChannel = null;
  let chatTypingSendTimeout = null;
  let partnerTypingTimeout = null;

  function chatPairChannelName(idA, idB){
    return "typing-" + [idA, idB].sort().join("-");
  }

  function subscribeChatRealtime(otherId){
    unsubscribeChatRealtime();
    if(!supabaseClient || !currentUser || !supabaseClient.channel) return;
    try {
      chatRealtimeChannel = supabaseClient.channel("chat-" + currentUser.id)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: "receiver_id=eq." + currentUser.id }, function(payload){
          const m = payload.new;
          if(currentChatPartner && m.sender_id === currentChatPartner.id){
            appendChatBubble(m, false);
            supabaseClient.from("messages").update({ read: true }).eq("id", m.id).then(()=>{}).catch(()=>{});
          } else {
            toast("Nuovo messaggio ricevuto");
            loadConversations();
          }
        })
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages", filter: "sender_id=eq." + currentUser.id }, function(payload){
          const m = payload.new;
          if(m.read) markChatBubbleRead(m.id);
        })
        .subscribe();
    } catch(e){}
    try {
      chatTypingChannel = supabaseClient.channel(chatPairChannelName(currentUser.id, otherId))
        .on("broadcast", { event: "typing" }, function(payload){
          if(payload && payload.payload && payload.payload.from === otherId){
            const el = document.getElementById("chatTypingIndicator");
            if(el){
              el.style.display = "block";
              if(partnerTypingTimeout) clearTimeout(partnerTypingTimeout);
              partnerTypingTimeout = setTimeout(hideChatTypingIndicator, 3000);
            }
          }
        })
        .subscribe();
    } catch(e){}
  }

  function unsubscribeChatRealtime(){
    if(chatRealtimeChannel && supabaseClient && supabaseClient.removeChannel){
      supabaseClient.removeChannel(chatRealtimeChannel);
    }
    chatRealtimeChannel = null;
    if(chatTypingChannel && supabaseClient && supabaseClient.removeChannel){
      supabaseClient.removeChannel(chatTypingChannel);
    }
    chatTypingChannel = null;
    hideChatTypingIndicator();
  }

  // Chiamata da oninput sul campo di testo della chat: avvisa l'altra persona
  // che stai scrivendo, al massimo una volta ogni 2 secondi (throttle).
  function handleChatTyping(){
    if(!chatTypingChannel || !currentUser || chatTypingSendTimeout) return;
    chatTypingChannel.send({ type: "broadcast", event: "typing", payload: { from: currentUser.id } });
    chatTypingSendTimeout = setTimeout(function(){ chatTypingSendTimeout = null; }, 2000);
  }

  async function openChat(otherId, otherName){
    if(typeof isBlockedEitherWay === "function" && isBlockedEitherWay(otherId)){
      toast("Hai bloccato questa persona: sbloccala dal suo profilo per scriverle");
      return;
    }
    currentChatPartner = { id: otherId, name: otherName || "Utente Sweat" };
    try {
      const { data } = await supabaseClient.from("messages").select("*")
        .or("and(sender_id.eq." + currentUser.id + ",receiver_id.eq." + otherId + "),and(sender_id.eq." + otherId + ",receiver_id.eq." + currentUser.id + ")")
        .order("created_at", { ascending: true });
      const thread = document.getElementById("chatThread");
      thread.innerHTML = "";
      (data || []).forEach(function(m){ appendChatBubble(m, m.sender_id === currentUser.id); });
      // segna come letti i messaggi ricevuti
      await supabaseClient.from("messages").update({ read: true }).match({ sender_id: otherId, receiver_id: currentUser.id, read: false });
      subscribeChatRealtime(otherId);
    } catch(e){}
  }

  async function sendChatMessage(){
    const input = document.getElementById("chatInput");
    const content = input.value.trim();
    if(!content || !currentChatPartner || !currentUser) return;
    if(typeof isBlockedEitherWay === "function" && isBlockedEitherWay(currentChatPartner.id)){ toast("Hai bloccato questa persona"); return; }
    try {
      const { data, error } = await supabaseClient.from("messages").insert({
        sender_id: currentUser.id, receiver_id: currentChatPartner.id, content: content
      }).select().single();
      if(error) throw error;
      appendChatBubble(data, true);
      input.value = "";
    } catch(e){ toast("Messaggio non inviato, riprova"); }
  }

  async function sendChatImage(input){
    const file = input.files && input.files[0];
    input.value = "";
    if(!file || !currentChatPartner || !currentUser || !supabaseClient) return;
    if(file.type && file.type.indexOf("image/") !== 0){ toast("Scegli un'immagine"); return; }
    toast("Invio foto...");
    try {
      const url = await uploadFileToBucket("dm-media", file);
      if(!url) throw new Error("upload-failed");
      const { data, error } = await supabaseClient.from("messages").insert({
        sender_id: currentUser.id, receiver_id: currentChatPartner.id, content: "", media_url: url, media_type: "image"
      }).select().single();
      if(error) throw error;
      appendChatBubble(data, true);
    } catch(e){ toast("Invio foto non riuscito, riprova"); }
  }

  // ================= COMMENTI REALI =================
  let currentCommentsPostId = null;

  async function openComments(postId){
    if(!postId){ toast("È un post di esempio, non ha commenti reali"); return; }
    if(!currentUser){ toast("Devi accedere per commentare"); return; }
    currentCommentsPostId = postId;
    go("commenti");
    await loadComments(postId);
  }

  async function loadComments(postId){
    const thread = document.getElementById("commentsThread");
    thread.innerHTML = '<div class="live-row"><div class="txt">Caricamento...</div></div>';
    try {
      const { data } = await supabaseClient.from("comments").select("*").eq("post_id", postId).order("created_at", { ascending: true });
      renderComments(data || []);
    } catch(e){
      thread.innerHTML = '<div class="live-row"><div class="txt">Impossibile caricare i commenti</div></div>';
    }
  }

  function renderComments(rows){
    const thread = document.getElementById("commentsThread");
    thread.innerHTML = "";
    if(rows.length === 0){
      thread.innerHTML = '<div class="live-row"><div class="txt">Nessun commento ancora. Scrivi il primo!</div></div>';
      return;
    }
    rows.forEach(function(c){
      const row = document.createElement("div"); row.className = "comment-row";
      const av = document.createElement("div"); av.className = "avatar a1";
      av.style.cursor = "pointer";
      av.onclick = function(){ viewProfile(c.author_id); };
      setAvatarContent(av, c.author_name, c.author_avatar_url);
      const body = document.createElement("div"); body.className = "cbody";
      const line = document.createElement("div");
      const name = document.createElement("span"); name.className = "cname"; name.textContent = c.author_name || "Utente Sweat";
      const text = document.createElement("span"); text.className = "ctext"; text.textContent = c.content;
      line.appendChild(name); line.appendChild(text);
      const time = document.createElement("div"); time.className = "ctime"; time.textContent = formatRelativeTime(c.created_at);
      body.appendChild(line); body.appendChild(time);
      if(currentUser && c.author_id === currentUser.id){
        const delBtn = document.createElement("span");
        delBtn.textContent = " · Elimina";
        delBtn.style.cssText = "color:var(--fog-dim); cursor:pointer; font-size:10.5px;";
        delBtn.onclick = function(){ deleteOwnComment(c.id, currentCommentsPostId); };
        time.appendChild(delBtn);
      }
      row.appendChild(av); row.appendChild(body);
      thread.appendChild(row);
    });
  }

  async function sendComment(){
    const input = document.getElementById("commentInput");
    const content = input.value.trim();
    if(!content || !currentCommentsPostId || !currentUser) return;
    try {
      await supabaseClient.from("comments").insert({
        post_id: currentCommentsPostId, author_id: currentUser.id,
        author_name: (currentProfile && currentProfile.name) || currentUser.email,
        author_avatar_url: (currentProfile && currentProfile.avatar_url) || null,
        content: content
      });
      input.value = "";
      await loadComments(currentCommentsPostId);
      const countEl = document.querySelector('.post[data-post-id="' + currentCommentsPostId + '"] .post-comments-link .ccount');
      if(countEl) countEl.textContent = (parseInt(countEl.textContent) || 0) + 1;
    } catch(e){ toast("Commento non inviato, riprova"); }
  }

  // ================= NOTIFICHE REALI =================
  let myNotifications = [];

  async function loadNotifications(){
    if(!supabaseClient || !currentUser) return;
    try {
      const { data } = await supabaseClient.from("notifications").select("*").eq("user_id", currentUser.id).order("created_at", { ascending: false }).limit(20);
      myNotifications = data || [];
      renderNotifPanel();
    } catch(e){}
  }

  let notifRealtimeChannel = null;

  function subscribeNotifRealtime(){
    if(!supabaseClient || !currentUser || !supabaseClient.channel) return;
    try {
      notifRealtimeChannel = supabaseClient.channel("notif-" + currentUser.id)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: "user_id=eq." + currentUser.id }, function(payload){
          myNotifications.unshift(payload.new);
          renderNotifPanel();
        })
        .subscribe();
    } catch(e){}
  }

  function renderNotifPanel(){
    const panel = document.getElementById("notifPanel");
    const bellBtn = document.getElementById("notifBellBtn");
    if(!panel) return;
    panel.innerHTML = "";
    if(myNotifications.length === 0){
      panel.innerHTML = '<div class="notif-item">Nessuna notifica, per ora</div>';
    } else {
      myNotifications.forEach(function(n){
        const item = document.createElement("div");
        item.className = "notif-item";
        item.textContent = n.content;
        panel.appendChild(item);
      });
    }
    const hasUnread = myNotifications.some(function(n){ return !n.read; });
    if(bellBtn) bellBtn.classList.toggle("has-dot", hasUnread);
  }

  async function markNotificationsRead(){
    if(!supabaseClient || !currentUser) return;
    try {
      await supabaseClient.from("notifications").update({ read: true }).eq("user_id", currentUser.id).eq("read", false);
      myNotifications.forEach(function(n){ n.read = true; });
      const bellBtn = document.getElementById("notifBellBtn");
      if(bellBtn) bellBtn.classList.remove("has-dot");
    } catch(e){}
  }

  // ================= SPONSOR NEL FEED =================
  async function loadFeedSponsor(){
    if(!supabaseClient) return;
    try {
      const { data } = await supabaseClient.from("sponsors").select("*").eq("active", true).order("created_at", { ascending: false }).limit(1);
      const wrap = document.getElementById("feedSponsorBanner");
      if(!wrap) return;
      if(data && data.length){
        const s = data[0];
        wrap.innerHTML = "";

        const art = document.createElement("article");
        art.className = "post sponsor-post";

        const head = document.createElement("div");
        head.className = "post-head";
        const av = document.createElement("div");
        av.className = "avatar a4";
        av.style.width = "34px"; av.style.height = "34px"; av.style.fontSize = "13px";
        av.textContent = (s.title || "SP").slice(0,2).toUpperCase();
        const who = document.createElement("div"); who.className = "who";
        const nm = document.createElement("div"); nm.className = "name"; nm.textContent = s.title;
        const meta = document.createElement("div"); meta.className = "meta sp-label"; meta.textContent = "Sponsorizzato";
        who.appendChild(nm); who.appendChild(meta);
        head.appendChild(av); head.appendChild(who);

        const body = document.createElement("div");
        body.className = "sponsor-body";
        body.textContent = s.description || "";

        art.appendChild(head); art.appendChild(body);

        if(s.link){
          const cta = document.createElement("a");
          cta.className = "sponsor-cta"; cta.href = s.link; cta.target = "_blank";
          cta.innerHTML = "";
          const ctaText = document.createElement("span"); ctaText.textContent = "Scopri di più";
          cta.appendChild(ctaText);
          cta.appendChild(svgIcon("M9 18l6-6-6-6"));
          art.appendChild(cta);
        }

        wrap.appendChild(art);
      } else {
        wrap.innerHTML = "";
      }
    } catch(e){}
  }

  // ================= PANNELLO ADMIN =================
  async function loadAdminData(){
    if(!supabaseClient || !currentProfile || !currentProfile.is_admin) return;
    try {
      const { count: userCount } = await supabaseClient.from("profiles").select("*", { count: "exact", head: true });
      const { count: postCount } = await supabaseClient.from("posts").select("*", { count: "exact", head: true });
      const { data: reports } = await supabaseClient.from("reports").select("*").eq("status", "in_attesa").order("created_at", { ascending: false });

      document.getElementById("adminUserCount").textContent = userCount || 0;
      document.getElementById("adminPostCount").textContent = postCount || 0;
      document.getElementById("adminReportCount").textContent = (reports || []).length;

      const repWrap = document.getElementById("adminReportsList");
      repWrap.innerHTML = "";
      if(!reports || reports.length === 0){
        repWrap.innerHTML = '<div class="live-row"><div class="txt">Nessuna segnalazione in attesa</div></div>';
      } else {
        reports.forEach(function(r){
          const row = document.createElement("div"); row.className = "admin-report-row";
          const p = document.createElement("div"); p.textContent = "Motivo: " + (r.reason || "non specificato");
          const btn = document.createElement("button"); btn.textContent = "Segna come risolta";
          btn.onclick = function(){ resolveReport(r.id); };
          row.appendChild(p); row.appendChild(btn);
          repWrap.appendChild(row);
        });
      }

      loadAdminSponsors();
      loadAdminSuggestions();
      loadAdminCharts();
    } catch(e){}
  }

  async function resolveReport(reportId){
    try {
      await supabaseClient.from("reports").update({ status: "risolto" }).eq("id", reportId);
      toast("Segnalazione risolta");
      loadAdminData();
    } catch(e){}
  }

  async function loadAdminSponsors(){
    try {
      const { data } = await supabaseClient.from("sponsors").select("*").order("created_at", { ascending: false });
      const wrap = document.getElementById("adminSponsorsList");
      wrap.innerHTML = "";
      (data || []).forEach(function(s){
        const row = document.createElement("div"); row.className = "sponsor-admin-row";
        const info = document.createElement("div"); info.className = "flex1";
        info.innerHTML = "";
        const b = document.createElement("b"); b.style.display = "block"; b.style.fontSize = "13.5px"; b.textContent = s.title;
        const span = document.createElement("span"); span.style.color = "var(--fog)"; span.style.fontSize = "11.5px"; span.textContent = s.active ? "Attivo" : "Disattivato";
        info.appendChild(b); info.appendChild(span);
        const btn = document.createElement("button"); btn.className = "propose-btn"; btn.textContent = s.active ? "Disattiva" : "Attiva";
        btn.onclick = function(){ toggleSponsor(s.id, !s.active); };
        row.appendChild(info); row.appendChild(btn);
        wrap.appendChild(row);
      });
    } catch(e){}
  }

  async function createSponsor(){
    const title = document.getElementById("sponsorTitle").value.trim();
    const desc = document.getElementById("sponsorDesc").value.trim();
    const link = document.getElementById("sponsorLink").value.trim();
    if(!title){ toast("Scrivi almeno un titolo"); return; }
    try {
      await supabaseClient.from("sponsors").insert({ title: title, description: desc || null, link: link || null, active: true });
      document.getElementById("sponsorTitle").value = "";
      document.getElementById("sponsorDesc").value = "";
      document.getElementById("sponsorLink").value = "";
      toast("Sponsor pubblicato!");
      loadAdminSponsors();
    } catch(e){ toast("Pubblicazione non riuscita"); }
  }

  async function toggleSponsor(id, newState){
    try {
      await supabaseClient.from("sponsors").update({ active: newState }).eq("id", id);
      loadAdminSponsors();
    } catch(e){}
  }

  // ================= SEGNALAZIONE CONTENUTI =================
  async function reportPost(postId){
    if(!currentUser){ toast("Devi accedere per segnalare"); return; }
    const reason = window.prompt("Perché segnali questo post? (facoltativo)") || "non specificato";
    try {
      await supabaseClient.from("reports").insert({ post_id: postId, reporter_id: currentUser.id, reason: reason });
      toast("Segnalazione inviata, grazie");
    } catch(e){ toast("Segnalazione non riuscita"); }
  }

  const REACTION_EMOJI = { like:"❤️", fire:"🔥", clap:"👏", wow:"😮", strong:"💪" };

  function updateReactionEmojiDisplay(art, reactionType){
    const likesLine = art ? art.querySelector(".post-likes") : null;
    if(!likesLine) return;
    let emojiSpan = likesLine.querySelector(".reaction-emoji");
    if(reactionType && reactionType !== "like"){
      if(!emojiSpan){
        emojiSpan = document.createElement("span"); emojiSpan.className = "reaction-emoji";
        likesLine.insertBefore(emojiSpan, likesLine.firstChild);
      }
      emojiSpan.textContent = REACTION_EMOJI[reactionType] || "";
    } else if(emojiSpan){
      emojiSpan.remove();
    }
  }

  function toggleKudos(btn, reactionType){
    const type = reactionType || "like";
    const wasActive = btn.classList.contains("active");
    const sameReaction = wasActive && btn.dataset.reaction === type;
    const art = btn.closest(".post");
    const c = art ? art.querySelector(".post-likes .count") : null;

    if(sameReaction){
      // tocco di nuovo la stessa reazione: la rimuovo
      btn.classList.remove("active");
      btn.dataset.reaction = "like";
      if(c){ let n = parseInt(c.textContent) || 0; c.textContent = Math.max(0, n-1); }
      updateReactionEmojiDisplay(art, null);
    } else {
      const wasAlreadyLiked = wasActive;
      btn.classList.add("active");
      btn.dataset.reaction = type;
      if(c && !wasAlreadyLiked){ let n = parseInt(c.textContent) || 0; c.textContent = n+1; }
      updateReactionEmojiDisplay(art, type);
    }
    const nowActive = btn.classList.contains("active");

    const postId = art ? art.dataset.postId : null;
    if(!postId || !supabaseClient || !currentUser) return;
    if(nowActive){
      supabaseClient.from("likes").upsert({ post_id: postId, user_id: currentUser.id, reaction_type: type }, { onConflict: "post_id,user_id" }).then(()=>{}).catch(()=>{});
    } else {
      supabaseClient.from("likes").delete().match({ post_id: postId, user_id: currentUser.id }).then(()=>{}).catch(()=>{});
    }
  }

  // ---- Tenendo premuto il cuore: scegli la reazione (fuoco, applauso, wow, muscolo) ----
  function setupReactionLongPress(kudosBtn, postId){
    let pressTimer = null;
    let longPressFired = false;
    function openPicker(){
      longPressFired = true;
      closeAllReactionPickers();
      const picker = document.createElement("div");
      picker.className = "reaction-picker";
      Object.keys(REACTION_EMOJI).forEach(function(key){
        const opt = document.createElement("button");
        opt.className = "reaction-opt"; opt.type = "button"; opt.textContent = REACTION_EMOJI[key];
        opt.onclick = function(e){
          e.preventDefault(); e.stopPropagation();
          toggleKudos(kudosBtn, key);
          picker.remove();
        };
        picker.appendChild(opt);
      });
      kudosBtn.style.position = "relative";
      kudosBtn.appendChild(picker);
      setTimeout(function(){
        document.addEventListener("click", closeAllReactionPickers, { once: true });
      }, 0);
    }
    function start(){
      longPressFired = false;
      pressTimer = setTimeout(openPicker, 450);
    }
    function cancel(){
      if(pressTimer){ clearTimeout(pressTimer); pressTimer = null; }
    }
    kudosBtn.addEventListener("touchstart", start, { passive: true });
    kudosBtn.addEventListener("touchend", cancel, { passive: true });
    kudosBtn.addEventListener("touchmove", cancel, { passive: true });
    kudosBtn.addEventListener("mousedown", start);
    kudosBtn.addEventListener("mouseup", cancel);
    kudosBtn.addEventListener("mouseleave", cancel);
    kudosBtn.addEventListener("click", function(e){
      if(longPressFired){ longPressFired = false; e.preventDefault(); e.stopPropagation(); return; }
      toggleKudos(kudosBtn);
    });
  }

  function closeAllReactionPickers(){
    document.querySelectorAll(".reaction-picker").forEach(function(p){ p.remove(); });
  }

  async function toggleSave(btn, postId){
    if(!postId){ btn.classList.toggle("saved"); return; } // post di esempio, nessun salvataggio reale
    if(!currentUser || !supabaseClient){ toast("Devi accedere per salvare"); return; }
    const willSave = !btn.classList.contains("saved");
    btn.classList.toggle("saved", willSave); // feedback immediato, prima della risposta del server
    try {
      if(willSave){
        await supabaseClient.from("saved_posts").insert({ user_id: currentUser.id, post_id: postId });
        mySavedPostIds.add(postId);
      } else {
        await supabaseClient.from("saved_posts").delete().match({ user_id: currentUser.id, post_id: postId });
        mySavedPostIds.delete(postId);
      }
      const p = realPosts.find(function(x){ return x.id === postId; });
      if(p) p._savedByMe = willSave;
    } catch(e){
      btn.classList.toggle("saved", !willSave); // ripristina se il salvataggio non è riuscito
      toast("Operazione non riuscita, riprova");
    }
  }

  // ================= RICERCA "CORRI CON ME" (demo, invariata) =================
  function chipSelect(el){
    const parent = el.parentElement;
    parent.querySelectorAll('.chip').forEach(c=>c.classList.remove('active'));
    el.classList.add('active');
  }
  function typeSelect(el){
    const parent = el.parentElement;
    parent.querySelectorAll('.type-pill').forEach(c=>c.classList.remove('active'));
    el.classList.add('active');
    const label = el.querySelector('span:last-child');
    const typeText = label ? label.textContent.trim() : '';
    const isGym = typeText === 'Palestra';
    const runFields = document.getElementById('creaRunFields');
    const gymFields = document.getElementById('creaGymFields');
    if(runFields) runFields.style.display = isGym ? 'none' : '';
    if(gymFields) gymFields.style.display = isGym ? '' : 'none';
  }

  // ================= GESTO SWIPE NEL FEED: apre la fotocamera (stile Instagram) =================
  // Uno swipe orizzontale deciso, fatto sullo sfondo del feed (non sulle
  // foto/caroselli dei post, né su bottoni o altri controlli), apre la
  // scelta foto/video che pubblica direttamente come storia.
  function openFeedCamera(){
    const input = document.getElementById('feedSwipeCameraInput');
    if(input) input.click();
  }

  (function(){
    let swipeStartX = 0, swipeStartY = 0, swipeStartTime = 0, swipeTracking = false;
    function isExcludedFromSwipe(target){
      return !!(target.closest && target.closest('.photo-carousel, .post-photo, .stories-row, button, a, input, textarea, select, .reaction-picker, .share-menu'));
    }
    document.addEventListener('touchstart', function(e){
      const feedScreen = document.getElementById('screen-feed');
      if(!feedScreen || !feedScreen.classList.contains('active')){ swipeTracking = false; return; }
      if(isExcludedFromSwipe(e.target)){ swipeTracking = false; return; }
      const t = e.touches[0];
      swipeStartX = t.clientX; swipeStartY = t.clientY; swipeStartTime = Date.now();
      swipeTracking = true;
    }, { passive: true });
    document.addEventListener('touchend', function(e){
      if(!swipeTracking) return;
      swipeTracking = false;
      const t = e.changedTouches[0];
      const dx = t.clientX - swipeStartX;
      const dy = t.clientY - swipeStartY;
      const dt = Date.now() - swipeStartTime;
      if(dt < 600 && Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.6){
        openFeedCamera();
      }
    }, { passive: true });
  })();
