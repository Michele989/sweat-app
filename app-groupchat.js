// ================= CHAT DI GRUPPO VERA =================
let currentGroupChat = null;
let groupChatRealtimeChannel = null;

function appendGroupChatBubble(m, fromMe){
  const thread = document.getElementById("groupChatThread");
  if(!thread) return;
  const b = document.createElement("div");
  b.className = "msg-bubble " + (fromMe ? "me" : "them");
  if(!fromMe){
    const name = document.createElement("div");
    name.style.cssText = "font-size:11px; font-weight:700; opacity:0.75; margin-bottom:2px;";
    name.textContent = m.sender_name || "Utente Sweat";
    b.appendChild(name);
  }
  if(m.media_url){
    const img = document.createElement("img");
    img.src = m.media_url; img.className = "msg-image"; img.loading = "lazy"; img.alt = "";
    b.appendChild(img);
  }
  if(m.content){
    const txt = document.createElement("div"); txt.textContent = m.content;
    b.appendChild(txt);
  }
  thread.appendChild(b);
  thread.scrollTop = thread.scrollHeight;
}

async function openGroupChat(groupId, groupName){
  currentGroupChat = { id: groupId, name: groupName || "Gruppo" };
  try {
    const { data } = await supabaseClient.from("group_messages").select("*").eq("group_id", groupId).order("created_at", { ascending: true }).limit(100);
    const thread = document.getElementById("groupChatThread");
    thread.innerHTML = "";
    (data || []).forEach(function(m){ appendGroupChatBubble(m, m.sender_id === currentUser.id); });
    subscribeGroupChatRealtime(groupId);
  } catch(e){}
}

function subscribeGroupChatRealtime(groupId){
  unsubscribeGroupChatRealtime();
  if(!supabaseClient || !currentUser || !supabaseClient.channel) return;
  try {
    groupChatRealtimeChannel = supabaseClient.channel("groupchat-" + groupId)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "group_messages", filter: "group_id=eq." + groupId }, function(payload){
        const m = payload.new;
        if(m.sender_id === currentUser.id) return; // già mostrato localmente quando inviato
        appendGroupChatBubble(m, false);
      })
      .subscribe();
  } catch(e){}
}

function unsubscribeGroupChatRealtime(){
  if(groupChatRealtimeChannel && supabaseClient && supabaseClient.removeChannel){
    supabaseClient.removeChannel(groupChatRealtimeChannel);
  }
  groupChatRealtimeChannel = null;
}

async function sendGroupChatMessage(){
  const input = document.getElementById("groupChatInput");
  const content = input.value.trim();
  if(!content || !currentGroupChat || !currentUser) return;
  try {
    const { data, error } = await supabaseClient.from("group_messages").insert({
      group_id: currentGroupChat.id,
      sender_id: currentUser.id,
      sender_name: (currentProfile && currentProfile.name) || currentUser.email,
      sender_avatar_url: (currentProfile && currentProfile.avatar_url) || null,
      content: content
    }).select().single();
    if(error) throw error;
    appendGroupChatBubble(data, true);
    input.value = "";
  } catch(e){ toast("Messaggio non inviato, riprova"); }
}

async function sendGroupChatImage(input){
  const file = input.files && input.files[0];
  input.value = "";
  if(!file || !currentGroupChat || !currentUser || !supabaseClient) return;
  if(file.type && file.type.indexOf("image/") !== 0){ toast("Scegli un'immagine"); return; }
  toast("Invio foto...");
  try {
    const url = await uploadFileToBucket("group-media", file);
    if(!url) throw new Error("upload-failed");
    const { data, error } = await supabaseClient.from("group_messages").insert({
      group_id: currentGroupChat.id,
      sender_id: currentUser.id,
      sender_name: (currentProfile && currentProfile.name) || currentUser.email,
      sender_avatar_url: (currentProfile && currentProfile.avatar_url) || null,
      content: "",
      media_url: url
    }).select().single();
    if(error) throw error;
    appendGroupChatBubble(data, true);
  } catch(e){ toast("Invio foto non riuscito, riprova"); }
}
