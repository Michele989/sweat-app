  // ================= COACH AI (funzioni serverless /api/...) =================
  let aiPhotoFile = null;
  let aiAnalysisAnswer = null;

  function handleAiPhoto(e){
    const file = e.target.files[0];
    if(!file) return;
    aiPhotoFile = file;
    const reader = new FileReader();
    reader.onload = function(ev){
      document.getElementById('aiPreviewImg').src = ev.target.result;
      document.getElementById('aiUploadStep').style.display = 'none';
      document.getElementById('aiPreviewStep').style.display = 'block';
      document.getElementById('aiAnalyzing').style.display = 'flex';
      runPhotoAnalysis(ev.target.result);
    };
    reader.readAsDataURL(file);
  }

  async function runPhotoAnalysis(dataUrl){
    const fallback = function(){
      document.getElementById('aiAnalyzing').style.display = 'none';
      document.getElementById('aiResults').style.display = 'block';
    };
    try {
      const mediaType = dataUrl.substring(5, dataUrl.indexOf(";"));
      const base64 = dataUrl.substring(dataUrl.indexOf(",") + 1);
      const res = await fetch("/api/analyze-photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mediaType: mediaType })
      });
      if(!res.ok) throw new Error("request_failed");
      const data = await res.json();
      if(data.corporatura) document.getElementById("insightCorporatura").textContent = String(data.corporatura);
      if(data.focus) document.getElementById("insightFocus").textContent = String(data.focus);
      if(data.postura) document.getElementById("insightPostura").textContent = String(data.postura);
      if(data.livello) document.getElementById("insightLivello").textContent = String(data.livello);
    } catch(e){
      // nessun backend AI configurato o errore di rete -> resta il testo demo già nel markup
    }
    fallback();
  }

  function resetAi(){
    document.getElementById('aiUploadStep').style.display = 'block';
    document.getElementById('aiPreviewStep').style.display = 'none';
    document.getElementById('aiAnalyzing').style.display = 'none';
    document.getElementById('aiResults').style.display = 'none';
    document.getElementById('schedaResult').style.display = 'none';
    document.getElementById('dietResult').style.display = 'none';
    document.getElementById('aiPhotoInput').value = '';
    aiAnalysisAnswer = null;
    aiPhotoFile = null;
  }

  function switchAiTab(tab){
    document.getElementById('tabBtnScheda').classList.toggle('active', tab==='scheda');
    document.getElementById('tabBtnCibo').classList.toggle('active', tab==='cibo');
    document.getElementById('paneScheda').classList.toggle('active', tab==='scheda');
    document.getElementById('paneCibo').classList.toggle('active', tab==='cibo');
  }

  let medicalCautionAcknowledged = false;
  function confirmMedicalCautionIfNeeded(){
    if(currentProfile && currentProfile.medical_conditions && !medicalCautionAcknowledged){
      const ok = window.confirm("Hai indicato una condizione medica rilevante nel tuo profilo Pro. Scheda e piano alimentare generati automaticamente non la tengono in considerazione: parlane con il tuo medico prima di seguirli. Vuoi procedere comunque?");
      if(!ok) return false;
      medicalCautionAcknowledged = true;
    }
    return true;
  }

  function buildProContext(){
    if(!currentProfile || !currentProfile.is_premium) return null;
    const p = currentProfile;
    const cal = calcCalorieTarget(p);
    return {
      age: p.age || null, heightCm: p.height_cm || null, weightKg: p.weight_kg || null, sex: p.sex || null,
      primaryGoal: p.primary_goal || null, trainingTypes: p.training_types || [], equipmentAccess: p.equipment_access || null,
      experienceLevel: p.experience_level || null, trainingConstraints: p.training_constraints || null,
      foodLikes: p.food_likes || null, foodDislikes: p.food_dislikes || null, wantsVariety: p.wants_variety !== false,
      calorieTarget: cal ? cal.target : null
      // NB: medical_conditions e supplements NON vengono mai inclusi qui di proposito.
    };
  }

  async function generateScheda(){
    if(!confirmMedicalCautionIfNeeded()) return;
    const box = document.getElementById("schedaResultBox");
    document.getElementById("schedaResult").style.display = "block";

    const goalEl = document.querySelector("#schedaGoalChips .chip.active");
    const levelEl = document.querySelector("#schedaLevelChips .chip.active");
    const daysEl = document.querySelector("#schedaDaysChips .chip.active");
    const goal = goalEl ? goalEl.textContent.trim() : "Tonificazione";
    const level = levelEl ? levelEl.textContent.trim() : "Intermedio";
    const days = daysEl ? daysEl.textContent.trim() : "3";
    const pro = buildProContext();

    try {
      const res = await fetch("/api/generate-scheda", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal: goal, level: level, days: days, pro: pro })
      });
      if(!res.ok) throw new Error("request_failed");
      const plan = await res.json();
      if(Array.isArray(plan) && plan.length){
        box.innerHTML = "";
        plan.forEach(function(item){
          const row = document.createElement("div");
          row.className = "plan-day";
          const d = document.createElement("div"); d.className = "d"; d.textContent = item.day || "-";
          const info = document.createElement("div"); info.className = "info";
          const b = document.createElement("b"); b.textContent = item.title || "Allenamento";
          const span = document.createElement("span"); span.textContent = item.detail || "";
          info.appendChild(b); info.appendChild(span);
          row.appendChild(d); row.appendChild(info);
          box.appendChild(row);
        });
      }
    } catch(e){ /* resta il piano demo statico già nel markup */ }
  }

  function selectAnalysis(el, value){
    document.getElementById('analysisChips').querySelectorAll('.chip').forEach(c=>c.classList.remove('active'));
    el.classList.add('active');
    aiAnalysisAnswer = value;
    document.getElementById('analysisWarn').classList.toggle('show', value==='no');
  }

  function toggleAllergyChip(el){
    const group = document.getElementById('allergyChips');
    const isNone = el.textContent.trim()==='Nessuna';
    if(isNone){
      group.querySelectorAll('.chip').forEach(c=>c.classList.remove('active'));
      el.classList.add('active');
    } else {
      group.querySelector('.chip').classList.remove('active');
      el.classList.toggle('active');
      const anyActive = [...group.querySelectorAll('.chip')].some(c=>c.classList.contains('active'));
      if(!anyActive) group.querySelector('.chip').classList.add('active');
    }
  }

  function toggleMultiChip(el){
    el.classList.toggle('active');
  }

  // ================= COACH AI PRO =================

  function refreshProCards(){
    const isPremium = !!(currentProfile && currentProfile.is_premium);
    const promo = document.getElementById('proPromoCard');
    const active = document.getElementById('proActiveCard');
    if(promo) promo.style.display = isPremium ? 'none' : 'block';
    if(active) active.style.display = isPremium ? 'block' : 'none';
  }

  async function activatePro(){
    if(!currentUser){ toast('Devi accedere prima'); return; }
    try {
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id, email: currentUser.email })
      });
      if(!res.ok) throw new Error('checkout_unavailable');
      const data = await res.json();
      if(data.url){
        window.location.href = data.url;
        return;
      }
      throw new Error('no_url');
    } catch(e){
      // Stripe non ancora configurato: resta attivo il percorso demo, gratuito, per continuare a testare
      try {
        await supabaseClient.from('profiles').update({ is_premium: true }).eq('id', currentUser.id);
        if(currentProfile) currentProfile.is_premium = true;
        toast('Pagamento non configurato: attivato in modalità demo, gratuita');
        loadProScreen();
        refreshProCards();
      } catch(e2){ toast('Attivazione non riuscita, riprova'); }
    }
  }

  // Al ritorno da Stripe dopo un pagamento riuscito, il webhook ha già attivato Pro sul server:
  // qui ricarichiamo solo il profilo per mostrarlo aggiornato.
  function checkStripeReturn(){
    try {
      const params = new URLSearchParams(window.location.search);
      if(params.get('pro') === 'success'){
        toast('Pagamento completato! Attivazione in corso...');
        setTimeout(function(){ loadProfile(); }, 1500);
      } else if(params.get('pro') === 'cancel'){
        toast('Pagamento annullato');
      }
    } catch(e){}
  }
  if(typeof window !== 'undefined'){
    window.addEventListener('load', checkStripeReturn);
  }

  function loadProScreen(){
    const isPremium = !!(currentProfile && currentProfile.is_premium);
    document.getElementById('proLockedBox').style.display = isPremium ? 'none' : 'block';
    document.getElementById('proUnlockedBox').style.display = isPremium ? 'block' : 'none';
    if(!isPremium) return;

    const d = currentProfile || {};
    if(d.age) document.getElementById('proAge').value = d.age;
    if(d.height_cm) document.getElementById('proHeight').value = d.height_cm;
    if(d.weight_kg) document.getElementById('proWeight').value = d.weight_kg;
    setChipByVal('proSexChips', d.sex || 'uomo');
    setChipByVal('proGoalChips', d.primary_goal || 'massa');
    if(d.training_frequency) setChipByText('proFreqChips', d.training_frequency);
    if(Array.isArray(d.training_types) && d.training_types.length){
      document.querySelectorAll('#proTypeChips .chip').forEach(c => c.classList.toggle('active', d.training_types.includes(c.textContent.trim())));
    }
    setChipByVal('proEquipChips', d.equipment_access || 'palestra_completa');
    setChipByVal('proLevelChips', d.experience_level || 'intermedio');
    if(d.training_constraints) document.getElementById('proConstraints').value = d.training_constraints;
    if(d.food_likes) document.getElementById('proFoodLikes').value = d.food_likes;
    if(d.food_dislikes) document.getElementById('proFoodDislikes').value = d.food_dislikes;
    document.getElementById('proVarietySwitch').classList.toggle('on', d.wants_variety !== false);
    if(d.wake_time) document.getElementById('proWakeTime').value = d.wake_time;
    setChipByVal('proWorkChips', d.work_mode || 'ufficio');
    if(d.medical_conditions) document.getElementById('proMedical').value = d.medical_conditions;
    if(d.supplements) document.getElementById('proSupplements').value = d.supplements;

    loadWeightLogs();
    loadPerformanceLogs();
    showCalorieEstimate();
  }

  function setChipByVal(groupId, val){
    document.querySelectorAll('#'+groupId+' .chip').forEach(c => c.classList.toggle('active', c.getAttribute('data-val') === val));
  }
  function setChipByText(groupId, text){
    document.querySelectorAll('#'+groupId+' .chip').forEach(c => c.classList.toggle('active', c.textContent.trim() === text));
  }

  async function saveProProfile(){
    const trainingTypes = [...document.querySelectorAll('#proTypeChips .chip.active')].map(c => c.textContent.trim());
    const goalEl = document.querySelector('#proGoalChips .chip.active');
    const sexEl = document.querySelector('#proSexChips .chip.active');
    const freqEl = document.querySelector('#proFreqChips .chip.active');
    const equipEl = document.querySelector('#proEquipChips .chip.active');
    const levelEl = document.querySelector('#proLevelChips .chip.active');
    const workEl = document.querySelector('#proWorkChips .chip.active');

    const payload = {
      age: parseInt(document.getElementById('proAge').value) || null,
      height_cm: parseFloat((document.getElementById('proHeight').value || '').replace(',','.')) || null,
      weight_kg: parseFloat((document.getElementById('proWeight').value || '').replace(',','.')) || null,
      sex: sexEl ? sexEl.getAttribute('data-val') : 'uomo',
      primary_goal: goalEl ? goalEl.getAttribute('data-val') : 'massa',
      training_frequency: freqEl ? freqEl.textContent.trim() : '3',
      training_types: trainingTypes,
      equipment_access: equipEl ? equipEl.getAttribute('data-val') : 'palestra_completa',
      experience_level: levelEl ? levelEl.getAttribute('data-val') : 'intermedio',
      training_constraints: document.getElementById('proConstraints').value.trim() || null,
      food_likes: document.getElementById('proFoodLikes').value.trim() || null,
      food_dislikes: document.getElementById('proFoodDislikes').value.trim() || null,
      wants_variety: document.getElementById('proVarietySwitch').classList.contains('on'),
      wake_time: document.getElementById('proWakeTime').value || null,
      work_mode: workEl ? workEl.getAttribute('data-val') : 'ufficio',
      medical_conditions: document.getElementById('proMedical').value.trim() || null,
      supplements: document.getElementById('proSupplements').value.trim() || null
    };

    try {
      await supabaseClient.from('profiles').update(payload).eq('id', currentUser.id);
      Object.assign(currentProfile, payload);
      toast('Profilo Pro salvato!');
      showCalorieEstimate();
    } catch(e){ toast('Salvataggio non riuscito, riprova'); }
  }

  function showCalorieEstimate(){
    const box = document.getElementById('proCalorieResult');
    const cal = calcCalorieTarget(currentProfile);
    if(!cal){ box.style.display = 'none'; return; }
    box.innerHTML = '<b>Fabbisogno stimato</b><span>Mantenimento ~' + cal.tdee + ' kcal/giorno · target per il tuo obiettivo ~' + cal.target + ' kcal/giorno</span>';
    box.style.display = 'block';
  }

  // ---- Calcolo fabbisogno calorico (Mifflin-St Jeor), fatto in JS, mai dall'AI ----
  function calcCalorieTarget(profile){
    if(!profile.age || !profile.height_cm || !profile.weight_kg) return null;
    let bmr;
    if(profile.sex === 'donna'){
      bmr = 10*profile.weight_kg + 6.25*profile.height_cm - 5*profile.age - 161;
    } else {
      bmr = 10*profile.weight_kg + 6.25*profile.height_cm - 5*profile.age + 5;
    }
    const freqNum = parseInt((profile.training_frequency || '3').replace('+','')) || 3;
    let activityFactor = 1.2;
    if(freqNum <= 1) activityFactor = 1.2;
    else if(freqNum <= 3) activityFactor = 1.375;
    else if(freqNum <= 4) activityFactor = 1.55;
    else activityFactor = 1.725;
    const tdee = bmr * activityFactor;
    let target = tdee;
    if(profile.primary_goal === 'massa') target = tdee + 350;
    if(profile.primary_goal === 'definizione') target = tdee - 400;
    return { bmr: Math.round(bmr), tdee: Math.round(tdee), target: Math.round(target) };
  }

  // ---- Monitoraggio peso ----
  async function loadWeightLogs(){
    try {
      const { data } = await supabaseClient.from('weight_logs').select('*').eq('user_id', currentUser.id).order('log_date', { ascending: false }).limit(15);
      renderWeightLogs(data || []);
    } catch(e){}
  }
  function renderWeightLogs(rows){
    const wrap = document.getElementById('weightLogList');
    if(rows.length === 0){ wrap.innerHTML = '<div class="live-row"><div class="txt">Nessun peso registrato ancora</div></div>'; return; }
    wrap.innerHTML = '';
    rows.forEach(function(r){
      const row = document.createElement('div'); row.className = 'log-row';
      const left = document.createElement('div');
      const d = document.createElement('div'); d.className = 'ld'; d.textContent = r.log_date;
      const v = document.createElement('div'); v.className = 'lv'; v.textContent = r.weight_kg + ' kg';
      left.appendChild(d); left.appendChild(v);
      if(r.note){ const n = document.createElement('div'); n.className = 'ln'; n.textContent = r.note; left.appendChild(n); }
      const btn = document.createElement('button'); btn.textContent = 'Elimina';
      btn.onclick = function(){ deleteWeightLog(r.id); };
      row.appendChild(left); row.appendChild(btn);
      wrap.appendChild(row);
    });
  }
  async function addWeightLog(){
    const val = parseFloat((document.getElementById('weightLogValue').value || '').replace(',','.'));
    const note = document.getElementById('weightLogNote').value.trim();
    if(!val){ toast('Inserisci un peso valido'); return; }
    try {
      await supabaseClient.from('weight_logs').insert({ user_id: currentUser.id, weight_kg: val, note: note || null });
      document.getElementById('weightLogValue').value = '';
      document.getElementById('weightLogNote').value = '';
      await supabaseClient.from('profiles').update({ weight_kg: val }).eq('id', currentUser.id);
      if(currentProfile) currentProfile.weight_kg = val;
      toast('Peso registrato!');
      loadWeightLogs();
    } catch(e){ toast('Registrazione non riuscita'); }
  }
  async function deleteWeightLog(id){
    if(!window.confirm("Eliminare questa registrazione del peso?")) return;
    try { await supabaseClient.from('weight_logs').delete().eq('id', id); loadWeightLogs(); } catch(e){}
  }

  // ---- Monitoraggio performance ----
  async function loadPerformanceLogs(){
    try {
      const { data } = await supabaseClient.from('performance_logs').select('*').eq('user_id', currentUser.id).order('log_date', { ascending: false }).limit(15);
      renderPerformanceLogs(data || []);
    } catch(e){}
  }
  function renderPerformanceLogs(rows){
    const wrap = document.getElementById('performanceLogList');
    if(rows.length === 0){ wrap.innerHTML = '<div class="live-row"><div class="txt">Nessuna performance registrata ancora</div></div>'; return; }
    wrap.innerHTML = '';
    rows.forEach(function(r){
      const row = document.createElement('div'); row.className = 'log-row';
      const left = document.createElement('div');
      const d = document.createElement('div'); d.className = 'ld'; d.textContent = r.log_date + ' · ' + r.exercise;
      const v = document.createElement('div'); v.className = 'lv';
      v.textContent = (r.weight_kg ? r.weight_kg+'kg ' : '') + (r.sets ? r.sets+'x' : '') + (r.reps || '');
      left.appendChild(d); left.appendChild(v);
      const btn = document.createElement('button'); btn.textContent = 'Elimina';
      btn.onclick = function(){ deletePerformanceLog(r.id); };
      row.appendChild(left); row.appendChild(btn);
      wrap.appendChild(row);
    });
  }
  async function addPerformanceLog(){
    const exercise = document.getElementById('perfExercise').value.trim();
    const w = parseFloat((document.getElementById('perfWeight').value || '').replace(',','.')) || null;
    const reps = parseInt(document.getElementById('perfReps').value) || null;
    const sets = parseInt(document.getElementById('perfSets').value) || null;
    if(!exercise){ toast("Scrivi almeno il nome dell'esercizio"); return; }
    try {
      await supabaseClient.from('performance_logs').insert({ user_id: currentUser.id, exercise: exercise, weight_kg: w, reps: reps, sets: sets });
      document.getElementById('perfExercise').value = '';
      document.getElementById('perfWeight').value = '';
      document.getElementById('perfReps').value = '';
      document.getElementById('perfSets').value = '';
      toast('Performance registrata!');
      loadPerformanceLogs();
    } catch(e){ toast('Registrazione non riuscita'); }
  }
  async function deletePerformanceLog(id){
    if(!window.confirm("Eliminare questa registrazione?")) return;
    try { await supabaseClient.from('performance_logs').delete().eq('id', id); loadPerformanceLogs(); } catch(e){}
  }

  // ================= SUGGERIMENTI =================
  async function sendSuggestion(){
    const text = document.getElementById('suggestionText').value.trim();
    if(!text){ toast('Scrivi prima il tuo suggerimento'); return; }
    if(!currentUser){ toast('Devi accedere'); return; }
    try {
      await supabaseClient.from('suggestions').insert({
        user_id: currentUser.id,
        author_name: (currentProfile && currentProfile.name) || currentUser.email,
        content: text
      });
      document.getElementById('suggestionText').value = '';
      toast('Grazie! Suggerimento inviato.');
    } catch(e){ toast('Invio non riuscito, riprova'); }
  }

  async function loadAdminSuggestions(){
    try {
      const { data } = await supabaseClient.from('suggestions').select('*').order('created_at', { ascending: false }).limit(50);
      const wrap = document.getElementById('adminSuggestionsList');
      wrap.innerHTML = '';
      if(!data || data.length === 0){
        wrap.innerHTML = '<div class="live-row"><div class="txt">Nessun suggerimento ancora</div></div>';
        return;
      }
      data.forEach(function(s){
        const row = document.createElement('div'); row.className = 'suggestion-row';
        const p = document.createElement('div'); p.textContent = s.content;
        const meta = document.createElement('div'); meta.className = 'sr-meta';
        meta.textContent = (s.author_name || 'Utente') + (s.status === 'nuovo' ? ' · nuovo' : ' · letto');
        row.appendChild(p); row.appendChild(meta);
        if(s.status === 'nuovo'){
          const btn = document.createElement('button'); btn.className = 'propose-btn'; btn.style.marginTop = '8px'; btn.textContent = 'Segna come letto';
          btn.onclick = function(){ markSuggestionRead(s.id); };
          row.appendChild(btn);
        }
        wrap.appendChild(row);
      });
    } catch(e){}
  }
  async function markSuggestionRead(id){
    try { await supabaseClient.from('suggestions').update({ status: 'letto' }).eq('id', id); loadAdminSuggestions(); } catch(e){}
  }

  let lastDietPlan = null; // array di {day, colazione, pranzo, cena, spuntini} dopo una generazione riuscita

  function renderDietDays(days){
    const box = document.getElementById('dietResultBox');
    box.innerHTML = '';
    days.forEach(function(d){
      const wrap = document.createElement('div');
      wrap.className = 'meal-day';
      const label = document.createElement('div');
      label.className = 'meal-day-label';
      label.textContent = d.day || '';
      wrap.appendChild(label);
      [['Colazione','colazione'],['Pranzo','pranzo'],['Cena','cena'],['Spuntini','spuntini']].forEach(function(pair){
        const row = document.createElement('div');
        row.className = 'meal-row';
        const b = document.createElement('b');
        b.textContent = pair[0] + ': ';
        row.appendChild(b);
        row.appendChild(document.createTextNode(d[pair[1]] || ''));
        wrap.appendChild(row);
      });
      box.appendChild(wrap);
    });
  }

  function buildFallbackDietPlan(allergies){
    const noGlutine = allergies.includes('Glutine');
    const noLattosio = allergies.includes('Lattosio');
    const colazioni = [
      noLattosio ? "Porridge d'avena con bevanda vegetale, frutta fresca e semi" : "Yogurt greco, fiocchi d'avena e frutta fresca",
      "Pane integrale" + (noGlutine ? " senza glutine" : "") + " con marmellata e un frutto",
      noLattosio ? "Smoothie di frutta con bevanda vegetale e avena" : "Yogurt bianco con frutta secca e miele",
      "Uova strapazzate con verdure e una fetta di pane" + (noGlutine ? " senza glutine" : ""),
      noLattosio ? "Porridge di riso con frutta fresca" : "Yogurt greco con cereali e frutti di bosco"
    ];
    const pranzi = [
      (noGlutine ? "Riso" : "Pasta integrale") + " con verdure di stagione e legumi",
      "Petto di pollo alla griglia con" + (noGlutine ? " riso" : " cereali integrali") + " e insalata",
      "Insalata di legumi, verdure crude e" + (noGlutine ? " riso" : " orzo"),
      "Pesce al forno con patate e verdure grigliate",
      (noGlutine ? "Quinoa" : "Farro") + " con verdure saltate e fonte proteica magra"
    ];
    const cene = [
      "Proteine magre, verdure cotte o crude e un filo d'olio extravergine",
      "Minestrone di verdure con" + (noGlutine ? " riso" : " orzo") + " e una fonte proteica leggera",
      "Pesce alla griglia con verdure di stagione",
      "Frittata di verdure con insalata mista",
      "Zuppa di legumi e verdure" + (noGlutine ? " senza crostini" : " con crostini integrali")
    ];
    const spuntini = [
      "Frutta fresca o una manciata di frutta secca",
      noLattosio ? "Frutta fresca o gallette di riso" : "Yogurt naturale o un frutto di stagione",
      "Frutta secca o un frutto fresco",
      noLattosio ? "Un frutto o gallette di mais" : "Yogurt greco o un frutto",
      "Frutta fresca di stagione"
    ];
    const labels = ['LUN','MAR','MER','GIO','VEN'];
    return labels.map(function(day, i){
      return { day: day, colazione: colazioni[i], pranzo: pranzi[i], cena: cene[i], spuntini: spuntini[i] };
    });
  }

  async function generateDiet(){
    if(!aiAnalysisAnswer){
      toast('Rispondi prima alla domanda sulle analisi del sangue');
      return;
    }
    if(!confirmMedicalCautionIfNeeded()) return;
    const allergies = [...document.getElementById('allergyChips').querySelectorAll('.chip.active')].map(c=>c.textContent.trim());
    const pro = buildProContext();

    try {
      const res = await fetch("/api/generate-diet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hasAnalysis: aiAnalysisAnswer, allergies: allergies, pro: pro })
      });
      if(!res.ok) throw new Error("request_failed");
      const data = await res.json();
      if(data && Array.isArray(data.days) && data.days.length){
        lastDietPlan = data.days;
        renderDietDays(data.days);
      } else {
        throw new Error("formato_inatteso");
      }
    } catch(e){
      lastDietPlan = buildFallbackDietPlan(allergies);
      renderDietDays(lastDietPlan);
    }
    document.getElementById('dietResult').style.display = 'block';
  }

  function downloadPlan(kind){
    let filename, lines;
    if(kind === 'scheda'){
      filename = 'scheda-allenamento-sweat.txt';
      lines = ['SCHEDA DI ALLENAMENTO — Sweat', ''];
      document.querySelectorAll('#schedaResultBox .plan-day').forEach(function(row){
        const d = row.querySelector('.d').textContent;
        const t = row.querySelector('.info b').textContent;
        const s = row.querySelector('.info span').textContent;
        lines.push(d + ' — ' + t + ' (' + s + ')');
      });
      lines.push('', 'Generato automaticamente a scopo dimostrativo. Non sostituisce il parere di un personal trainer o medico dello sport.');
    } else {
      filename = 'piano-alimentare-sweat.txt';
      lines = ['PIANO ALIMENTARE SETTIMANALE — Sweat', ''];
      (lastDietPlan || []).forEach(function(d){
        lines.push('--- ' + d.day + ' ---');
        lines.push('Colazione: ' + d.colazione);
        lines.push('Pranzo: ' + d.pranzo);
        lines.push('Cena: ' + d.cena);
        lines.push('Spuntini: ' + d.spuntini);
        lines.push('');
      });
      lines.push('Generato automaticamente a scopo dimostrativo e informativo. Non sostituisce il parere di un medico o di un nutrizionista abilitato.');
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ================= HEATMAP PROFILO (decorativa) =================
  const heat = document.getElementById('heatGrid');
  const shades = ['#1B1F19','#233318','#3B5A1E','#4E9A2A','#57E13B'];
  for(let i=0;i<18*7;i++){
    const cell = document.createElement('div'); cell.className='heat-cell';
    const lvl = Math.random(); let color = shades[0];
    if(lvl>0.85) color = shades[4]; else if(lvl>0.65) color = shades[3]; else if(lvl>0.45) color = shades[2]; else if(lvl>0.25) color = shades[1];
    cell.style.background = color; heat.appendChild(cell);
  }

  // ================= AVVIO =================
  initApp();
