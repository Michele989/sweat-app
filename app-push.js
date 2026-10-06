// ================= NOTIFICHE PUSH VERE =================
// Nota: funzionano su Android/Chrome senza installare nulla.
// Su iPhone (Safari) servono iOS 16.4+ E l'app aggiunta alla
// schermata Home (Condividi -> Aggiungi a Home) prima che il
// permesso venga concesso: e' un limite di Apple, non nostro.

const VAPID_PUBLIC_KEY = "BJzXBoIZSnErUwuOnxwqoz6zHFg5nbY16Dg8cdNKBs9jczg_rZEsxn7yEOinI4t4xhDOoA7PFJx5laCSEEW-ol4";

function urlBase64ToUint8Array(base64String){
  const padding = "=".repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

async function registerServiceWorker(){
  if(!("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.register("/service-worker.js");
  } catch(e){ return null; }
}

async function enablePushNotifications(){
  if(!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)){
    toast("Le notifiche push non sono supportate su questo browser");
    return;
  }
  if(!currentUser || !supabaseClient){
    toast("Devi accedere prima");
    return;
  }

  try {
    const permission = await Notification.requestPermission();
    if(permission !== "granted"){
      toast("Permesso notifiche non concesso");
      return;
    }

    const reg = await registerServiceWorker();
    if(!reg){ toast("Impossibile registrare il service worker"); return; }

    let sub = await reg.pushManager.getSubscription();
    if(!sub){
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });
    }

    const subJson = sub.toJSON();
    await supabaseClient.from("push_subscriptions").upsert({
      user_id: currentUser.id,
      endpoint: subJson.endpoint,
      p256dh: subJson.keys.p256dh,
      auth_key: subJson.keys.auth
    }, { onConflict: "user_id,endpoint" });

    toast("Notifiche push attivate!");
    const btn = document.getElementById("pushEnableBtn");
    if(btn){ btn.textContent = "Notifiche push attive ✓"; btn.disabled = true; }
  } catch(e){
    toast("Attivazione non riuscita, riprova");
  }
}

// Registra il service worker da subito (silenzioso, non chiede ancora il permesso:
// quello parte solo quando l'utente preme il bottone, come richiesto dai browser)
if(typeof window !== "undefined"){
  window.addEventListener("load", function(){ registerServiceWorker(); });
}
