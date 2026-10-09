// ================= LA MIA SCHEDA (piano settimanale editabile + progressione pesi) =================
// Due cose distinte che convivono nella stessa schermata:
// 1) "training_plans": un piano fisso che l'utente modifica liberamente a mano
//    (o importa da un PDF/dal Coach AI), salvato una riga per utente.
// 2) La progressione pesi: NON letta dal piano, ma calcolata dal vero storico
//    di "performance_logs", che viene alimentato automaticamente ogni volta
//    che l'utente pubblica un allenamento in Palestra (vedi publishWorkout
//    in app-core.js) oltre che dall'inserimento manuale in Coach AI Pro.

const PLAN_WEEK_DAYS = ["LUN", "MAR", "MER", "GIO", "VEN", "SAB", "DOM"];
let currentTrainingPlanDays = null;
let schedaExerciseRowSeq = 0;

function emptyTrainingDays(){
  return PLAN_WEEK_DAYS.map(function(d){ return { day: d, title: "", exercises: [] }; });
}

// Riporta un array di giorni (da Supabase, dal Coach AI o da un PDF importato)
// sempre a 7 voci, nell'ordine corretto LUN..DOM, qualunque sia l'input.
function normalizeWeekDays(rawDays, kind){
  const byDay = {};
  (Array.isArray(rawDays) ? rawDays : []).forEach(function(d){
    if(d && d.day) byDay[String(d.day).toUpperCase().slice(0,3)] = d;
  });
  return PLAN_WEEK_DAYS.map(function(label){
    const d = byDay[label];
    if(kind === "training"){
      return { day: label, title: (d && d.title) || "", exercises: (d && Array.isArray(d.exercises)) ? d.exercises : [] };
    }
    return {
      day: label,
      colazione: (d && d.colazione) || "",
      pranzo: (d && d.pranzo) || "",
      cena: (d && d.cena) || "",
      spuntini: (d && d.spuntini) || ""
    };
  });
}

function addSchedaExerciseRow(dayIndex, prefill){
  const list = document.getElementById("schedaDayExercises-" + dayIndex);
  if(!list) return;
  const rowId = "scheda-exrow-" + (++schedaExerciseRowSeq);
  const row = document.createElement("div");
  row.className = "exercise-row";
  row.id = rowId;

  const nameInput = document.createElement("input");
  nameInput.type = "text"; nameInput.className = "ex-name"; nameInput.placeholder = "Esercizio (es. Panca piana)";
  if(prefill && prefill.name) nameInput.value = prefill.name;

  const setsInput = document.createElement("input");
  setsInput.type = "text"; setsInput.className = "ex-sets"; setsInput.placeholder = "Serie"; setsInput.inputMode = "numeric";
  if(prefill && prefill.sets != null) setsInput.value = prefill.sets;

  const repsInput = document.createElement("input");
  repsInput.type = "text"; repsInput.className = "ex-reps"; repsInput.placeholder = "Rip."; repsInput.inputMode = "numeric";
  if(prefill && prefill.reps != null) repsInput.value = prefill.reps;

  const weightInput = document.createElement("input");
  weightInput.type = "text"; weightInput.className = "ex-weight"; weightInput.placeholder = "Kg"; weightInput.inputMode = "decimal";
  if(prefill && prefill.weight_kg != null) weightInput.value = prefill.weight_kg;

  const removeBtn = document.createElement("button");
  removeBtn.type = "button"; removeBtn.className = "ex-remove"; removeBtn.textContent = "✕";
  removeBtn.onclick = function(){ removeSchedaExerciseRow(rowId); };

  row.appendChild(nameInput); row.appendChild(setsInput); row.appendChild(repsInput); row.appendChild(weightInput); row.appendChild(removeBtn);
  list.appendChild(row);
}

function removeSchedaExerciseRow(rowId){
  const row = document.getElementById(rowId);
  if(row) row.remove();
}

function buildSchedaDayCard(dayObj, index){
  const card = document.createElement("div");
  card.className = "plan-day-edit";

  const head = document.createElement("div");
  head.className = "plan-day-edit-head";
  const label = document.createElement("b"); label.textContent = dayObj.day;
  const titleInput = document.createElement("input");
  titleInput.type = "text"; titleInput.id = "schedaDayTitle-" + index; titleInput.className = "plan-day-title";
  titleInput.placeholder = "Titolo giornata (es. Petto e tricipiti) o \"Riposo\"";
  titleInput.value = dayObj.title || "";
  head.appendChild(label); head.appendChild(titleInput);
  card.appendChild(head);

  const list = document.createElement("div");
  list.id = "schedaDayExercises-" + index;
  list.className = "plan-day-exercises";
  card.appendChild(list);

  const addBtn = document.createElement("button");
  addBtn.type = "button"; addBtn.className = "profile-btn"; addBtn.style.marginTop = "6px";
  addBtn.textContent = "+ Esercizio";
  addBtn.onclick = function(){ addSchedaExerciseRow(index); };
  card.appendChild(addBtn);

  return card;
}

function renderTrainingPlan(){
  const box = document.getElementById("schedaDaysBox");
  if(!box) return;
  box.innerHTML = "";
  schedaExerciseRowSeq = 0;
  (currentTrainingPlanDays || emptyTrainingDays()).forEach(function(dayObj, index){
    box.appendChild(buildSchedaDayCard(dayObj, index));
    (dayObj.exercises || []).forEach(function(ex){ addSchedaExerciseRow(index, ex); });
  });
}

function collectTrainingPlanDays(){
  return PLAN_WEEK_DAYS.map(function(label, i){
    const titleEl = document.getElementById("schedaDayTitle-" + i);
    const list = document.getElementById("schedaDayExercises-" + i);
    const exercises = [];
    if(list){
      Array.from(list.querySelectorAll(".exercise-row")).forEach(function(row){
        const name = (row.querySelector(".ex-name").value || "").trim();
        if(!name) return;
        const sets = (row.querySelector(".ex-sets").value || "").trim();
        const reps = (row.querySelector(".ex-reps").value || "").trim();
        const weight = (row.querySelector(".ex-weight").value || "").replace(",", ".").trim();
        exercises.push({
          name: name,
          sets: sets ? parseInt(sets, 10) : null,
          reps: reps ? parseInt(reps, 10) : null,
          weight_kg: weight ? parseFloat(weight) : null
        });
      });
    }
    return { day: label, title: titleEl ? (titleEl.value || "").trim() : "", exercises: exercises };
  });
}

async function loadTrainingPlan(){
  const box = document.getElementById("schedaDaysBox");
  if(!box) return;
  if(!supabaseClient || !currentUser){
    currentTrainingPlanDays = emptyTrainingDays();
    renderTrainingPlan();
    return;
  }
  try {
    const { data } = await supabaseClient.from("training_plans").select("days").eq("user_id", currentUser.id).maybeSingle();
    currentTrainingPlanDays = normalizeWeekDays(data && data.days, "training");
  } catch(e){
    currentTrainingPlanDays = emptyTrainingDays();
  }
  renderTrainingPlan();
  loadWeightProgression();
}

async function saveTrainingPlan(){
  if(!supabaseClient || !currentUser){ toast("Devi accedere per salvare la scheda"); return; }
  const days = collectTrainingPlanDays();
  try {
    const { error } = await supabaseClient.from("training_plans").upsert({ user_id: currentUser.id, days: days, updated_at: new Date().toISOString() });
    if(error) throw error;
    currentTrainingPlanDays = days;
    toast("Scheda salvata");
  } catch(e){
    console.error("Salvataggio scheda non riuscito:", e);
    toast("Salvataggio non riuscito: " + (e && e.message ? e.message : "riprova"));
  }
}

// Punto d'ingresso usato dal Coach AI ("Usa come base per La mia scheda").
function importTrainingPlanDays(rawDays){
  currentTrainingPlanDays = normalizeWeekDays(rawDays, "training");
  if(document.getElementById("schedaDaysBox")) renderTrainingPlan();
}
window.importTrainingPlanDays = importTrainingPlanDays;

function importSchedaFromPdf(inputEl){
  const file = inputEl.files && inputEl.files[0];
  if(!file) return;
  const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name || "");
  if(!isPdf){ toast("Carica un file PDF"); inputEl.value = ""; return; }
  const reader = new FileReader();
  reader.onload = async function(ev){
    const result = ev.target.result || "";
    const base64 = result.indexOf(",") >= 0 ? result.split(",")[1] : "";
    if(!base64){ toast("Non sono riuscito a leggere il file"); inputEl.value = ""; return; }
    toast("Leggo il PDF…");
    try {
      const res = await fetch("/api/parse-plan-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdfBase64: base64, kind: "scheda" })
      });
      if(!res.ok) throw new Error("import_failed");
      const data = await res.json();
      if(!data || !Array.isArray(data.days)) throw new Error("formato_inatteso");
      importTrainingPlanDays(data.days);
      toast("PDF importato: controlla la scheda e premi \"Salva scheda\"");
    } catch(e){
      console.error("Import PDF scheda non riuscito:", e);
      toast("Non sono riuscito a leggere questo PDF: " + (e && e.message ? e.message : "riprova"));
    }
    inputEl.value = "";
  };
  reader.onerror = function(){ toast("Non sono riuscito a leggere il file"); inputEl.value = ""; };
  reader.readAsDataURL(file);
}

// ---- Progressione pesi: calcolata dallo storico reale, non dal piano ----
async function loadWeightProgression(){
  const box = document.getElementById("weightProgressionBox");
  if(!box) return;
  if(!supabaseClient || !currentUser){
    box.innerHTML = "";
    const p = document.createElement("p");
    p.style.cssText = "font-size:13px; color:var(--fog); margin:0;";
    p.textContent = "Accedi per vedere la progressione.";
    box.appendChild(p);
    return;
  }
  try {
    const { data } = await supabaseClient.from("performance_logs").select("exercise,weight_kg,log_date").eq("user_id", currentUser.id).order("log_date", { ascending: true });
    const rows = data || [];
    box.innerHTML = "";
    if(!rows.length){
      const p = document.createElement("p");
      p.style.cssText = "font-size:13px; color:var(--fog); margin:0;";
      p.textContent = "Nessun dato ancora: i pesi che inserisci quando pubblichi un allenamento in Palestra finiscono qui automaticamente.";
      box.appendChild(p);
      return;
    }
    const byExercise = {};
    rows.forEach(function(r){
      const key = (r.exercise || "").trim().toLowerCase();
      if(!key || r.weight_kg == null) return;
      if(!byExercise[key]) byExercise[key] = { name: r.exercise, history: [] };
      byExercise[key].history.push(r.weight_kg);
    });
    const names = Object.keys(byExercise);
    if(!names.length){
      const p = document.createElement("p");
      p.style.cssText = "font-size:13px; color:var(--fog); margin:0;";
      p.textContent = "Nessun dato ancora: i pesi che inserisci quando pubblichi un allenamento in Palestra finiscono qui automaticamente.";
      box.appendChild(p);
      return;
    }
    names.forEach(function(key){
      const ex = byExercise[key];
      const first = ex.history[0];
      const last = ex.history[ex.history.length - 1];
      const delta = last - first;
      const card = document.createElement("div");
      card.className = "filter-card";
      card.style.marginBottom = "10px";
      const title = document.createElement("b");
      title.style.fontSize = "14px";
      title.textContent = ex.name;
      const sub = document.createElement("p");
      sub.style.cssText = "font-size:12.5px; color:var(--fog); margin:4px 0 0;";
      const trend = delta > 0 ? ("📈 +" + delta.toFixed(1) + "kg") : (delta < 0 ? ("📉 " + delta.toFixed(1) + "kg") : "➡️ stabile");
      sub.textContent = first + "kg → " + last + "kg · " + trend + " su " + ex.history.length + " registrazioni";
      card.appendChild(title); card.appendChild(sub);
      box.appendChild(card);
    });
  } catch(e){
    box.innerHTML = "";
    const p = document.createElement("p");
    p.style.cssText = "font-size:13px; color:var(--fog); margin:0;";
    p.textContent = "Impossibile caricare la progressione in questo momento.";
    box.appendChild(p);
  }
}
