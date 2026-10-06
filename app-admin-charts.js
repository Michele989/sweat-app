// ================= GRAFICI DI CRESCITA (PANNELLO ADMIN) =================

function lastNDays(n){
  const days = [];
  const now = new Date();
  for(let i = n - 1; i >= 0; i--){
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    days.push(d);
  }
  return days;
}

function dayKey(d){
  return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0");
}

function dayLabel(d){
  return String(d.getDate()).padStart(2,"0") + "/" + String(d.getMonth()+1).padStart(2,"0");
}

function renderBarChart(containerId, counts, days){
  const el = document.getElementById(containerId);
  if(!el) return;
  el.innerHTML = "";
  const max = Math.max.apply(null, counts.concat([1]));
  days.forEach(function(d, i){
    const col = document.createElement("div"); col.className = "bar-col";
    const bar = document.createElement("div"); bar.className = "bar";
    const h = Math.round((counts[i] / max) * 100);
    bar.style.height = Math.max(h, counts[i] > 0 ? 4 : 1) + "%";
    col.appendChild(bar);
    if(i % 2 === 0 || days.length <= 8){
      const label = document.createElement("div"); label.className = "bar-label"; label.textContent = dayLabel(d);
      col.appendChild(label);
    }
    el.appendChild(col);
  });
}

async function loadAdminCharts(){
  if(!supabaseClient || !currentProfile || !currentProfile.is_admin) return;
  const days = lastNDays(14);
  const since = days[0].toISOString();

  try {
    const [{ data: newUsers }, { data: newPosts }] = await Promise.all([
      supabaseClient.from("profiles").select("created_at").gte("created_at", since),
      supabaseClient.from("posts").select("created_at").gte("created_at", since)
    ]);

    const userCounts = days.map(function(d){
      const key = dayKey(d);
      return (newUsers || []).filter(function(r){ return dayKey(new Date(r.created_at)) === key; }).length;
    });
    const postCounts = days.map(function(d){
      const key = dayKey(d);
      return (newPosts || []).filter(function(r){ return dayKey(new Date(r.created_at)) === key; }).length;
    });

    renderBarChart("chartUsers", userCounts, days);
    renderBarChart("chartPosts", postCounts, days);
  } catch(e){}
}
