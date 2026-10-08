// ================= SICUREZZA: BLOCCO UTENTI E CANCELLAZIONE ACCOUNT =================

let myBlockedIds = new Set();
let blockedByOthersIds = new Set();

async function loadBlockLists(){
  if(!supabaseClient || !currentUser) return;
  try {
    const { data: iBlocked } = await supabaseClient.from("blocked_users").select("blocked_id").eq("blocker_id", currentUser.id);
    myBlockedIds = new Set((iBlocked || []).map(function(r){ return r.blocked_id; }));
  } catch(e){}
}

function isBlockedEitherWay(userId){
  return myBlockedIds.has(userId);
}

async function refreshBlockButton(otherId){
  const btn = document.getElementById("otherBlockBtn");
  if(!btn || !currentUser) return;
  if(otherId === currentUser.id){ btn.style.display = "none"; return; }
  btn.style.display = "block";
  btn.textContent = myBlockedIds.has(otherId) ? "Sblocca" : "Blocca";
}

async function toggleBlockOther(){
  if(!currentUser || !currentOtherProfile || !supabaseClient) return;
  const otherId = currentOtherProfile.id;
  const btn = document.getElementById("otherBlockBtn");
  try {
    if(myBlockedIds.has(otherId)){
      await supabaseClient.from("blocked_users").delete().match({ blocker_id: currentUser.id, blocked_id: otherId });
      myBlockedIds.delete(otherId);
      if(btn) btn.textContent = "Blocca";
      toast("Utente sbloccato");
    } else {
      if(!window.confirm("Bloccare " + (currentOtherProfile.name || "questo utente") + "? Non vedrai più i suoi contenuti e non potrete più scrivervi.")) return;
      await supabaseClient.from("blocked_users").insert({ blocker_id: currentUser.id, blocked_id: otherId });
      myBlockedIds.add(otherId);
      if(btn) btn.textContent = "Sblocca";
      toast("Utente bloccato");
    }
    renderBlockedUsersList();
  } catch(e){ toast("Operazione non riuscita, riprova"); }
}

async function renderBlockedUsersList(){
  const box = document.getElementById("blockedUsersList");
  if(!box || !supabaseClient || !currentUser) return;
  try {
    const ids = Array.from(myBlockedIds);
    if(ids.length === 0){
      box.innerHTML = '<p style="font-size:12.5px;color:var(--fog);margin:0;">Nessuno è bloccato</p>';
      return;
    }
    const { data: profs } = await supabaseClient.from("profiles").select("id,name,avatar_url").in("id", ids);
    box.innerHTML = "";
    (profs || []).forEach(function(p){
      const row = document.createElement("div"); row.className = "conv-row";
      const av = document.createElement("div"); av.className = "avatar a1";
      setAvatarContent(av, p.name, p.avatar_url);
      const ci = document.createElement("div"); ci.className = "ci";
      const cn = document.createElement("div"); cn.className = "cn"; cn.textContent = p.name || "Utente Sweat";
      ci.appendChild(cn);
      const unblockBtn = document.createElement("button");
      unblockBtn.className = "profile-btn"; unblockBtn.style.width = "auto"; unblockBtn.style.padding = "8px 14px";
      unblockBtn.textContent = "Sblocca";
      unblockBtn.onclick = function(){
        supabaseClient.from("blocked_users").delete().match({ blocker_id: currentUser.id, blocked_id: p.id }).then(function(){
          myBlockedIds.delete(p.id);
          toast("Utente sbloccato");
          renderBlockedUsersList();
        }).catch(function(){ toast("Operazione non riuscita, riprova"); });
      };
      row.appendChild(av); row.appendChild(ci); row.appendChild(unblockBtn);
      box.appendChild(row);
    });
  } catch(e){}
}

// ================= CANCELLAZIONE ACCOUNT =================
async function deleteMyAccount(){
  if(!currentUser || !supabaseClient) return;
  if(!window.confirm("Vuoi davvero eliminare per sempre il tuo account? Post, foto, messaggi e follower verranno cancellati e non potrai più tornare indietro.")) return;
  if(!window.confirm("Ultima conferma: eliminare DEFINITIVAMENTE l'account di " + (currentUser.email || "") + "?")) return;
  try {
    const { data: sessionData } = await supabaseClient.auth.getSession();
    const token = sessionData && sessionData.session && sessionData.session.access_token;
    if(!token){ toast("Sessione scaduta, accedi di nuovo e riprova"); return; }
    const res = await fetch("/api/delete-account", {
      method: "POST",
      headers: { "Authorization": "Bearer " + token }
    });
    if(!res.ok) throw new Error("delete_failed");
    toast("Account eliminato. Ci dispiace vederti andare!");
    await supabaseClient.auth.signOut().catch(function(){});
    window.location.reload();
  } catch(e){
    toast("Cancellazione non riuscita, riprova o scrivi al supporto");
  }
}
