// ================= ALIMENTAZIONE (piano editabile + diario pasti) =================
let currentDietPlanDays = null;
const MEAL_FIELDS = [["Colazione", "colazione"], ["Pranzo", "pranzo"], ["Cena", "cena"], ["Spuntini", "spuntini"]];

function emptyDietDays(){
  return PLAN_WEEK_DAYS.map(function(d){ return { day: d, colazione: "", pranzo: "", cena: "", spuntini: "" }; });
}

function buildDietDayCard(dayObj, index){
  const card = document.createElement("div");
  card.className = "plan-day-edit";

  const head = document.createElement("div");
  head.className = "plan-day-edit-head";
  const label = document.createElement("b"); label.textContent = dayObj.day;
  head.appendChild(label);
  card.appendChild(head);

  MEAL_FIELDS.forEach(function(pair){
    const row = document.createElement("div");
    row.className = "field-row";
    const fieldLabel = document.createElement("span");
    fieldLabel.className = "field-label";
    fieldLabel.textContent = pair[0];
    const textarea = document.createElement("textarea");
    textarea.id = "dietDay-" + index + "-" + pair[1];
    textarea.style.minHeight = "44px";
    textarea.value = dayObj[pair[1]] || "";
    row.appendChild(fieldLabel); row.appendChild(textarea);
    card.appendChild(row);
  });

  return card;
}

function renderDietPlan(){
  const box = document.getElementById("dietDaysBox");
  if(!box) return;
  box.innerHTML = "";
  (currentDietPlanDays || emptyDietDays()).forEach(function(dayObj, index){
    box.appendChild(buildDietDayCard(dayObj, index));
  });
}

function collectDietPlanDays(){
  return PLAN_WEEK_DAYS.map(function(label, i){
    const out = { day: label };
    MEAL_FIELDS.forEach(function(pair){
      const el = document.getElementById("dietDay-" + i + "-" + pair[1]);
      out[pair[1]] = el ? (el.value || "").trim() : "";
    });
    return out;
  });
}

async function loadDietPlan(){
  const box = document.getElementById("dietDaysBox");
  if(!box) return;
  if(!supabaseClient || !currentUser){
    currentDietPlanDays = emptyDietDays();
    renderDietPlan();
    return;
  }
  try {
    const { data } = await supabaseClient.from("diet_plans").select("calorie_target,days").eq("user_id", currentUser.id).maybeSingle();
    currentDietPlanDays = normalizeWeekDays(data && data.days, "diet");
    const calEl = document.getElementById("dietCalorieTarget");
    if(calEl) calEl.value = (data && data.calorie_target) ? data.calorie_target : "";
  } catch(e){
    currentDietPlanDays = emptyDietDays();
  }
  renderDietPlan();
  loadMealLog();
}

async function saveDietPlan(){
  if(!supabaseClient || !currentUser){ toast("Devi accedere per salvare il piano"); return; }
  const days = collectDietPlanDays();
  const calRaw = (document.getElementById("dietCalorieTarget").value || "").trim();
  const calorieTarget = calRaw ? parseInt(calRaw, 10) : null;
  try {
    const { error } = await supabaseClient.from("diet_plans").upsert({ user_id: currentUser.id, days: days, calorie_target: calorieTarget, updated_at: new Date().toISOString() });
    if(error) throw error;
    currentDietPlanDays = days;
    toast("Piano alimentare salvato");
  } catch(e){
    console.error("Salvataggio piano alimentare non riuscito:", e);
    toast("Salvataggio non riuscito: " + (e && e.message ? e.message : "riprova"));
  }
}

// Punto d'ingresso usato dal Coach AI ("Usa come base per Alimentazione").
function importDietPlanDays(rawDays, calorieTarget){
  currentDietPlanDays = normalizeWeekDays(rawDays, "diet");
  if(calorieTarget != null){
    const calEl = document.getElementById("dietCalorieTarget");
    if(calEl) calEl.value = calorieTarget;
  }
  if(document.getElementById("dietDaysBox")) renderDietPlan();
}
window.importDietPlanDays = importDietPlanDays;

function importDietFromPdf(inputEl){
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
        body: JSON.stringify({ pdfBase64: base64, kind: "dieta" })
      });
      if(!res.ok) throw new Error("import_failed");
      const data = await res.json();
      if(!data || !Array.isArray(data.days)) throw new Error("formato_inatteso");
      importDietPlanDays(data.days, data.calorie_target);
      toast("PDF importato: controlla il piano e premi \"Salva piano alimentare\"");
    } catch(e){
      console.error("Import PDF piano alimentare non riuscito:", e);
      toast("Non sono riuscito a leggere questo PDF: " + (e && e.message ? e.message : "riprova"));
    }
    inputEl.value = "";
  };
  reader.onerror = function(){ toast("Non sono riuscito a leggere il file"); inputEl.value = ""; };
  reader.readAsDataURL(file);
}

// ---- Diario pasti giornaliero ----
async function addMealLog(){
  if(!supabaseClient || !currentUser){ toast("Devi accedere per usare il diario"); return; }
  const typeEl = document.querySelector("#mealLogTypeChips .chip.active");
  const mealName = typeEl ? typeEl.textContent.trim() : "Pasto";
  const descEl = document.getElementById("mealLogDescription");
  const description = (descEl.value || "").trim();
  if(!description){ toast("Scrivi cosa hai mangiato"); return; }
  try {
    const { error } = await supabaseClient.from("meal_logs").insert({ user_id: currentUser.id, meal_name: mealName, description: description });
    if(error) throw error;
    descEl.value = "";
    toast("Aggiunto al diario");
    loadMealLog();
  } catch(e){
    console.error("Aggiunta al diario pasti non riuscita:", e);
    toast("Non riuscito: " + (e && e.message ? e.message : "riprova"));
  }
}

async function deleteMealLog(id){
  if(!supabaseClient || !currentUser) return;
  try { await supabaseClient.from("meal_logs").delete().eq("id", id); loadMealLog(); } catch(e){}
}

async function loadMealLog(){
  const list = document.getElementById("mealLogList");
  if(!list) return;
  if(!supabaseClient || !currentUser){ list.innerHTML = ""; return; }
  try {
    const { data } = await supabaseClient.from("meal_logs").select("id,log_date,meal_name,description,created_at").eq("user_id", currentUser.id).order("created_at", { ascending: false }).limit(30);
    list.innerHTML = "";
    (data || []).forEach(function(m){
      const row = document.createElement("div");
      row.className = "filter-card";
      row.style.marginBottom = "8px";
      row.style.display = "flex";
      row.style.justifyContent = "space-between";
      row.style.alignItems = "flex-start";
      row.style.gap = "10px";
      const left = document.createElement("div");
      const title = document.createElement("b");
      title.style.fontSize = "13px";
      const d = new Date(m.created_at);
      title.textContent = m.meal_name + " · " + d.toLocaleDateString("it-IT");
      const desc = document.createElement("p");
      desc.style.cssText = "font-size:13px; color:#DADEE3; margin:4px 0 0;";
      desc.textContent = m.description;
      left.appendChild(title); left.appendChild(desc);
      const removeBtn = document.createElement("button");
      removeBtn.className = "ex-remove";
      removeBtn.textContent = "✕";
      removeBtn.onclick = function(){ deleteMealLog(m.id); };
      row.appendChild(left); row.appendChild(removeBtn);
      list.appendChild(row);
    });
    if(!(data || []).length){
      const p = document.createElement("p");
      p.style.cssText = "font-size:13px; color:var(--fog); margin:0 0 20px;";
      p.textContent = "Ancora nessun pasto segnato.";
      list.appendChild(p);
    }
  } catch(e){
    list.innerHTML = "";
  }
}
