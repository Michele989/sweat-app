
  const titles = {gruppi:"Gruppi", esplora:"Marketplace", crea:"Nuovo allenamento", profilo:"Profilo", ai:"Coach AI", messaggi:"Messaggi", chat:"Messaggio", altroprofilo:"Profilo", admin:"Pannello Admin", aipro:"Coach AI Pro"};

  // ================= NAVIGAZIONE =================
  function go(name){
    document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
    document.getElementById('screen-'+name).classList.add('active');

    const topbar = document.getElementById('topbar');
    const tabbar = document.getElementById('tabbar');
    const mainArea = document.getElementById('mainArea');

    if(name==='home' || name==='auth' || name==='onboarding'){
      topbar.classList.add('hidden'); tabbar.classList.add('hidden'); mainArea.classList.add('no-nav');
    } else {
      topbar.classList.remove('hidden'); mainArea.classList.remove('no-nav');
      if(name==='chat'){ tabbar.classList.add('hidden'); } else { tabbar.classList.remove('hidden'); }
      document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
      const btn = document.querySelector('.tab[data-tab="'+name+'"]');
      if(btn) btn.classList.add('active');
      const shareIcon = `<div class="icon-btn" onclick="shareApp()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 10.5 15.4 6.5M8.6 13.5 15.4 17.5"/></svg></div>`;
      const addIcon = `<div class="icon-btn" onclick="go('crea')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 5v14M5 12h14"/></svg></div>`;
      if(name==='feed'){
        topbar.innerHTML = `<div class="wordmark" onclick="go('home')"><span class="dot"></span>SWEAT</div><div class="head-actions"><div class="icon-btn has-dot" id="notifBellBtn" onclick="toggleNotif(event)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg></div>${addIcon}${shareIcon}<div class="notif-panel" id="notifPanel"></div></div>`;
        renderNotifPanel();
        loadFeedSponsor();
      } else {
        let customTitle = titles[name] || "";
        if(name==='chat' && currentChatPartner) customTitle = currentChatPartner.name;
        if(name==='altroprofilo' && currentOtherProfile) customTitle = currentOtherProfile.name;
        topbar.innerHTML = `<div class="screen-title">${customTitle}</div><div class="head-actions">${shareIcon}</div>`;
      }
    }
    if(name==='gruppi') loadGroups();
    if(name==='esplora') loadMarketplace();
    if(name==='messaggi') loadConversations();
    if(name==='admin') loadAdminData();
    if(name==='ai') refreshProCards();
    if(name==='aipro') loadProScreen();
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
    await loadRealPosts();
    await loadNotifications();
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
        if(avEl) avEl.textContent = displayName.slice(0,2).toUpperCase();
        if(wEl && typeof data.workouts === "number") wEl.textContent = data.workouts;
        if(pointsEl) pointsEl.textContent = data.points || 0;
        if(pointsNumEl) pointsNumEl.textContent = data.points || 0;
        if(refEl) refEl.textContent = data.referral_code || "——";
        document.getElementById("adminLinkBtn").style.display = data.is_admin ? "inline-block" : "none";

        const isBusiness = data.account_type && data.account_type !== "persona";
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
      }
    } catch(e){}
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

  async function loadRealPosts(){
    if(!supabaseClient) return;
    try {
      const { data, error } = await supabaseClient
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if(error) throw error;
      realPosts = data || [];
      if(currentUser){
        const { data: myLikes } = await supabaseClient.from("likes").select("post_id").eq("user_id", currentUser.id);
        const likedIds = new Set((myLikes||[]).map(r=>r.post_id));
        realPosts.forEach(p => { p._likedByMe = likedIds.has(p.id); });
      }
      renderDynamicPosts();
    } catch(e){ /* nessun post ancora, o tabelle non create: va bene */ }
  }

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
      menuBtn.onclick = function(){ reportPost(p.id); };
      head.appendChild(av); head.appendChild(who); head.appendChild(menuBtn);

      // ---- azioni (cuore / commento / condividi / salva) ----
      const actions = document.createElement("div");
      actions.className = "post-actions";
      const kudos = document.createElement("button");
      kudos.className = "kudos";
      if(p._likedByMe) kudos.classList.add("active");
      kudos.setAttribute("onclick", "toggleKudos(this)");
      kudos.appendChild(svgIcon("M12 21s-7-4.6-9.5-9C0.7 8.4 2 4.5 6 4c2.1-.3 3.7.8 6 3 2.3-2.2 3.9-3.3 6-3 4 .5 5.3 4.4 3.5 8-2.5 4.4-9.5 9-9.5 9z"));
      const commentBtn = document.createElement("button");
      commentBtn.setAttribute("aria-label","Commenta");
      commentBtn.appendChild(svgIcon("M21 11.5a8.5 8.5 0 1 1-3.8-7.1L21 3l-1 4.5"));
      const shareBtn = document.createElement("button");
      shareBtn.setAttribute("aria-label","Condividi");
      shareBtn.appendChild(svgIcon("M22 2 11 13M22 2 15 22l-4-9-9-4 20-7z"));
      const spacer = document.createElement("div"); spacer.className = "spacer";
      const saveBtn = document.createElement("button");
      saveBtn.className = "save-btn";
      saveBtn.setAttribute("aria-label","Salva");
      saveBtn.onclick = function(){ toggleSave(saveBtn); };
      saveBtn.appendChild(svgIcon("M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z"));
      actions.appendChild(kudos); actions.appendChild(commentBtn); actions.appendChild(shareBtn);
      actions.appendChild(spacer); actions.appendChild(saveBtn);

      // ---- like / didascalia / orario ----
      const likes = document.createElement("div");
      likes.className = "post-likes";
      const countSpan = document.createElement("span"); countSpan.className = "count"; countSpan.textContent = p.likes_count || 0;
      likes.appendChild(countSpan);
      likes.appendChild(document.createTextNode(" Mi piace"));

      const capLine = document.createElement("div");
      capLine.className = "post-caption-line";
      const capName = document.createElement("b"); capName.textContent = p.author_name || "Utente Sweat";
      capLine.appendChild(capName);
      capLine.appendChild(document.createTextNode(p.caption || ""));

      const timeLine = document.createElement("div");
      timeLine.className = "post-time";
      timeLine.textContent = formatRelativeTime(p.created_at);

      art.appendChild(head); art.appendChild(actions); art.appendChild(likes); art.appendChild(capLine); art.appendChild(timeLine);
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

    if(!supabaseClient || !currentUser){
      toast("Devi accedere per pubblicare");
      return;
    }
    try {
      const { data, error } = await supabaseClient.from("posts").insert({
        author_id: currentUser.id,
        author_name: (currentProfile && currentProfile.name) || currentUser.email,
        type: type,
        caption: caption,
        distance_km: (distance && !isNaN(distance)) ? distance : null
      }).select().single();
      if(error) throw error;
      data._likedByMe = false;
      realPosts.unshift(data);
      renderDynamicPosts();
      bumpWorkoutCount();
      captionEl.value = "";
      document.getElementById("creaDistance").value = "";
      toast("Pubblicato nel feed di tutti!");
      go("feed");
    } catch(e){
      toast("Pubblicazione non riuscita, riprova");
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

      const { data } = await supabaseClient.from("posts").select("author_id,author_name,distance_km,created_at").gte("created_at", monday.toISOString());
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
      const { data: monthData } = await supabaseClient.from("posts").select("distance_km").eq("author_id", currentUser.id).gte("created_at", monthStart.toISOString());
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
      document.getElementById("otherAvatar").textContent = currentOtherProfile.name.slice(0,2).toUpperCase();
      document.getElementById("otherName").textContent = currentOtherProfile.name;
      let meta = data.city || "";
      if(data.level) meta += (meta ? " · " : "") + data.level;
      document.getElementById("otherMeta").textContent = meta || "Atleta Sweat";
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
      if(partnerIds.length){
        const { data: profs } = await supabaseClient.from("profiles").select("id,name").in("id", partnerIds);
        (profs || []).forEach(function(p){ profilesById[p.id] = p.name; });
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
        const av = document.createElement("div"); av.className = "avatar a3";
        av.textContent = (profilesById[pid] || "??").slice(0,2).toUpperCase();
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

  async function openChat(otherId, otherName){
    currentChatPartner = { id: otherId, name: otherName || "Utente Sweat" };
    try {
      const { data } = await supabaseClient.from("messages").select("*")
        .or("and(sender_id.eq." + currentUser.id + ",receiver_id.eq." + otherId + "),and(sender_id.eq." + otherId + ",receiver_id.eq." + currentUser.id + ")")
        .order("created_at", { ascending: true });
      const thread = document.getElementById("chatThread");
      thread.innerHTML = "";
      (data || []).forEach(function(m){
        const b = document.createElement("div");
        b.className = "msg-bubble " + (m.sender_id === currentUser.id ? "me" : "them");
        b.textContent = m.content;
        thread.appendChild(b);
      });
      // segna come letti i messaggi ricevuti
      await supabaseClient.from("messages").update({ read: true }).match({ sender_id: otherId, receiver_id: currentUser.id, read: false });
    } catch(e){}
  }

  async function sendChatMessage(){
    const input = document.getElementById("chatInput");
    const content = input.value.trim();
    if(!content || !currentChatPartner || !currentUser) return;
    try {
      const { data, error } = await supabaseClient.from("messages").insert({
        sender_id: currentUser.id, receiver_id: currentChatPartner.id, content: content
      }).select().single();
      if(error) throw error;
      const thread = document.getElementById("chatThread");
      const b = document.createElement("div"); b.className = "msg-bubble me"; b.textContent = content;
      thread.appendChild(b);
      input.value = "";
    } catch(e){ toast("Messaggio non inviato, riprova"); }
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

  function toggleKudos(btn){
    btn.classList.toggle("active");
    const art = btn.closest(".post");
    const c = art ? art.querySelector(".post-likes .count") : null;
    const liked = btn.classList.contains("active");
    if(c){
      let n = parseInt(c.textContent) || 0;
      c.textContent = liked ? n+1 : n-1;
    }

    const postId = art ? art.dataset.postId : null;
    if(!postId || !supabaseClient || !currentUser) return;
    if(liked){
      supabaseClient.from("likes").insert({ post_id: postId, user_id: currentUser.id }).then(()=>{}).catch(()=>{});
    } else {
      supabaseClient.from("likes").delete().match({ post_id: postId, user_id: currentUser.id }).then(()=>{}).catch(()=>{});
    }
  }

  function toggleSave(btn){
    btn.classList.toggle("saved");
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
  }
