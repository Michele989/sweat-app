// ================= SCHEDA ALLENAMENTO: ESERCIZI PALESTRA =================
// Costruttore della lista esercizi per i post di tipo "Palestra", più
// importazione rapida dalla scheda generata dal Coach AI, e il parsing
// degli hashtag dalla didascalia (usati dalla tab Esplora).

let exerciseRowSeq = 0;

function addExerciseRow(prefill){
  const list = document.getElementById("creaExercisesList");
  if(!list) return;
  const rowId = "exrow-" + (++exerciseRowSeq);
  const row = document.createElement("div");
  row.className = "exercise-row";
  row.id = rowId;

  const nameInput = document.createElement("input");
  nameInput.type = "text"; nameInput.className = "ex-name"; nameInput.placeholder = "Esercizio (es. Panca piana)";
  if(prefill && prefill.name) nameInput.value = prefill.name;

  const setsInput = document.createElement("input");
  setsInput.type = "text"; setsInput.className = "ex-sets"; setsInput.placeholder = "Serie"; setsInput.inputMode = "numeric";
  if(prefill && prefill.sets) setsInput.value = prefill.sets;

  const repsInput = document.createElement("input");
  repsInput.type = "text"; repsInput.className = "ex-reps"; repsInput.placeholder = "Rip."; repsInput.inputMode = "numeric";
  if(prefill && prefill.reps) repsInput.value = prefill.reps;

  const weightInput = document.createElement("input");
  weightInput.type = "text"; weightInput.className = "ex-weight"; weightInput.placeholder = "Kg"; weightInput.inputMode = "decimal";
  if(prefill && prefill.weight) weightInput.value = prefill.weight;

  const removeBtn = document.createElement("button");
  removeBtn.type = "button"; removeBtn.className = "ex-remove"; removeBtn.textContent = "✕";
  removeBtn.onclick = function(){ removeExerciseRow(rowId); };

  row.appendChild(nameInput); row.appendChild(setsInput); row.appendChild(repsInput); row.appendChild(weightInput); row.appendChild(removeBtn);
  list.appendChild(row);
}

function removeExerciseRow(rowId){
  const row = document.getElementById(rowId);
  if(row) row.remove();
}

function resetExerciseRows(){
  const list = document.getElementById("creaExercisesList");
  if(list) list.innerHTML = "";
}

function collectExerciseRows(){
  const list = document.getElementById("creaExercisesList");
  if(!list) return [];
  const rows = Array.from(list.querySelectorAll(".exercise-row"));
  const out = [];
  rows.forEach(function(row){
    const name = (row.querySelector(".ex-name").value || "").trim();
    if(!name) return;
    const sets = (row.querySelector(".ex-sets").value || "").trim();
    const reps = (row.querySelector(".ex-reps").value || "").trim();
    const weight = (row.querySelector(".ex-weight").value || "").replace(",", ".").trim();
    out.push({
      name: name,
      sets: sets ? parseInt(sets, 10) : null,
      reps: reps ? parseInt(reps, 10) : null,
      weight_kg: weight ? parseFloat(weight) : null
    });
  });
  return out;
}

// ---- Importa gli esercizi dalla scheda generata dal Coach AI (screen-ai) ----
function importExercisesFromAI(){
  const box = document.getElementById("schedaResultBox");
  const rows = box ? Array.from(box.querySelectorAll(".plan-day")) : [];
  if(!rows.length){
    toast("Genera prima una scheda nel Coach AI");
    return;
  }
  let added = 0;
  rows.forEach(function(planRow){
    const titleEl = planRow.querySelector(".info b");
    const detailEl = planRow.querySelector(".info span");
    const title = titleEl ? titleEl.textContent.trim() : "";
    if(!title) return;
    const detail = detailEl ? detailEl.textContent.trim() : "";
    const match = detail.match(/(\d+)\s*[x×]\s*(\d+)/i);
    addExerciseRow({
      name: title,
      sets: match ? match[1] : "",
      reps: match ? match[2] : "",
      weight: ""
    });
    added++;
  });
  if(added){
    toast(added + " esercizi importati dalla scheda AI");
  } else {
    toast("Nessun esercizio trovato nella scheda AI");
  }
}

// ---- Estrae gli hashtag dalla didascalia (es. #gambeDiFuoco) ----
function parseHashtags(caption){
  if(!caption) return [];
  const matches = caption.match(/#[a-zA-Z0-9_àèéìòù]+/g);
  if(!matches) return [];
  const seen = new Set();
  const out = [];
  matches.forEach(function(tag){
    const clean = tag.slice(1).toLowerCase();
    if(clean && !seen.has(clean)){ seen.add(clean); out.push(clean); }
  });
  return out;
}
