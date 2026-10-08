# Sweat — guida passo-passo per metterla online (gratis)

## AGGIORNAMENTO — tutto quello che mancava: video nelle storie, allenamenti completi (scheda/corsa), progressi mensili, Esplora, DM con foto, chat di gruppo vera, condivisione post, cancellazione account, blocco utenti, scroll infinito, tempo reale (ottobre 2026, blocco 4)

Blocco grande, risponde a tutta la lista di "cosa manca" discussa insieme. Non tocca nulla dei blocchi precedenti (foto, storie, nuova identità visiva restano validi), aggiunge solo roba nuova sopra.

### Nuovi file
- `schema-v10.sql` — blocco utenti, hashtag sui post, tutte le nuove colonne per allenamenti completi (esercizi, frequenza cardiaca, dislivello, sforzo percepito), tabella degli aggiornamenti di progresso mensili, foto/video nei messaggi diretti, chat di gruppo vera, video nelle storie, tre nuovi bucket di Storage
- `api/delete-account.js` — endpoint serverless per la cancellazione account (GDPR)
- `app-safety.js` — blocco utenti (bottone sul profilo altrui) e cancellazione del proprio account (bottone in fondo al tuo profilo)
- `app-groupchat.js` — chat di gruppo vera (testo + foto) per i membri di un gruppo
- `app-workout.js` — la "scheda" dell'allenamento: lista esercizi per chi fa palestra (anche importabile dal Coach AI con un tocco), hashtag dalla didascalia
- `app-explore.js` — tab "Popolari" dentro Cerca: post più apprezzati di recente e ricerca per hashtag
- `app-progress.js` — aggiornamenti di progresso mensili: foto, peso, % di grasso corporeo, note, in una timeline personale

### File modificati
`index.html`, `app-core.js`, `app-stories.js`, `styles.css`

### Cosa c'è di nuovo per chi usa l'app
- **Allenamento completo ("scheda")**: quando pubblichi un allenamento di tipo "Palestra" ora puoi aggiungere la lista degli esercizi (nome, serie, ripetizioni, kg) uno per uno, oppure importarli con un tocco dalla scheda che il Coach AI ti ha già generato. Per chi corre/pedala/cammina si aggiungono dislivello e frequenza cardiaca media (oltre a distanza e durata che c'erano già). Per tutti i tipi: sforzo percepito da 1 a 10, e gli hashtag scritti nella didascalia (es. "oggi gambe di fuoco #gambedifuoco") vengono salvati e si possono ritrovare nella ricerca
- **Video nelle storie**: oltre alle foto, ora puoi caricare un video (max 60MB) come storia; si vede a schermo intero e avanza da solo quando il video finisce
- **Aggiornamenti di progresso mensili**: nuova sezione "📈 Progressi" nel tuo profilo — foto, peso, % di grasso corporeo e una nota su come procede, con una timeline di tutti i tuoi aggiornamenti passati. Pensata per un ritmo mensile, non sostituisce il monitoraggio peso rapido che c'era già nel profilo Pro
- **Tab "Esplora"**: dentro la schermata Cerca, un secondo tab "Popolari" accanto a "Persone" — mostra i post più apprezzati di recente e permette di cercare per hashtag, per scoprire contenuti oltre a chi già segui
- **Foto nei messaggi diretti**: nella chat con un'altra persona ora c'è un bottone per inviare una foto, non solo testo
- **Chat di gruppo vera**: dalla lista dei tuoi gruppi, bottone "💬 Chat del gruppo" per scrivere (testo e foto) con tutti i membri in tempo reale
- **Condividere un post**: il bottone "condividi" su un post ora funziona davvero — apre la condivisione nativa del telefono (o copia un link) e offre anche "condividi nelle tue storie"
- **Cancellazione account**: in fondo al tuo profilo, "Elimina il mio account" cancella definitivamente account e tutti i tuoi dati (richiede doppia conferma, non si può annullare)
- **Blocco utenti**: sul profilo di un'altra persona, bottone per bloccarla — non vedrai più i suoi post nel feed e lei non potrà scriverti; la lista delle persone bloccate (con bottone per sbloccare) è in fondo al tuo profilo
- **Scroll infinito nel feed**: il feed principale carica altri post automaticamente quando arrivi in fondo, non solo i primi 20
- **Aggiornamenti in tempo reale**: nella chat singola, nella chat di gruppo e per le notifiche, i nuovi messaggi appaiono da soli mentre sei dentro, senza bisogno di uscire e rientrare

### PASSO 1 — Database
Esegui `schema-v10.sql` su Supabase (SQL Editor → Run). Crea da solo i tre nuovi bucket di Storage (`dm-media`, `group-media`, `progress-photos`) con le relative policy — non serve fare nulla a mano per questi.

**Se ricevi un errore come `relation "public.stories" does not exist`** (o simili, su altre tabelle): significa che sul tuo database non erano mai stati eseguiti tutti gli aggiornamenti precedenti (es. quello delle Storie). In questo caso, **non eseguire `schema-v10.sql` da solo**: esegui invece `schema-completo.sql`, che ora contiene TUTTO (dalla primissima versione fino a questo blocco) in un unico file, pensato apposta per poter essere eseguito anche quando non sai con certezza quali aggiornamenti erano già stati fatti — ogni istruzione controlla da sé se la cosa esiste già, quindi non duplica né cancella nulla, e si può eseguire più volte senza problemi. L'ho anche testato io stesso eseguendolo da zero e una seconda volta di fila, senza errori.

**Importante — attiva il Tempo Reale (Realtime):** su Supabase vai in *Database → Replication* e assicurati che le tabelle `messages`, `group_messages` e `notifications` abbiano il Realtime attivato (interruttore acceso). Senza questo passaggio, chat e notifiche continuano a funzionare ma non si aggiornano da sole finché non riapri la schermata.

### PASSO 2 — Variabili d'ambiente (Vercel)
Nessuna nuova variabile da aggiungere: `api/delete-account.js` riusa `SUPABASE_SERVICE_ROLE_KEY`, che hai già impostato per gli altri endpoint.

### PASSO 3 — Carica questi file su GitHub
Nella cartella principale (root): aggiungi `app-safety.js`, `app-groupchat.js`, `app-workout.js`, `app-explore.js`, `app-progress.js` (nuovi), e sovrascrivi `index.html`, `app-core.js`, `app-stories.js`, `styles.css`.
Nella cartella **`api`**: aggiungi `delete-account.js`.
Tutti i nuovi `<script>` sono già inclusi in `index.html` — basta che i file abbiano lo stesso nome ed esistano nella root.

### Limiti onesti su questo blocco
- Lo scroll infinito è stato aggiunto solo al feed principale (non a Gruppi e Marketplace): con pochi utenti non si nota, ma è un limite reale se la community crescesse molto
- La chat di gruppo non ha ancora "sta scrivendo..." né spunte di lettura, solo i messaggi in tempo reale
- Un utente bloccato non viene avvisato di esserlo (è voluto, per sicurezza/privacy), ma può ancora vedere i tuoi post pubblici nel feed generale se non ti segue più da nessun'altra via — il blocco impedisce i messaggi e filtra i suoi post dal tuo feed, non è ancora una privacy totale del profilo
- L'importazione degli esercizi dal Coach AI copia titolo e dettaglio di ogni giorno della scheda generata; se la scheda AI non segue il formato "giorno / titolo / dettaglio" l'importazione potrebbe non trovare nulla da importare — in quel caso restano gli esercizi inseriti a mano

## AGGIORNAMENTO — nuova identità visiva: logo, palette, carattere del nome (ottobre 2026, blocco 3)

Terzo blocco: non funzioni nuove, ma l'aspetto grafico, per allontanarsi dallo stile "fotocopia di Instagram" di partenza.

### Nuovi file
- `assets/icon-32.png`, `assets/icon-180.png`, `assets/icon-192.png`, `assets/icon-512.png` — le icone vere dell'app (prima erano vuote): favicon, icona Aggiungi a Home su iPhone, icone Android/PWA
- `assets/logo-mark.svg`, `assets/app-icon-tile.svg` — i sorgenti del logo, per se un giorno servirà modificarlo o mandarlo a uno studio grafico

### Cosa è cambiato
- **Un vero logo**: una goccia di sudore con dentro una linea cardiaca (il battito), al posto del semplice puntino verde — lo trovi in alto in ogni schermata e come icona dell'app sul telefono
- **Palette più curata**: stesso nero e verde di base (visto che ti piacciono), ma il verde è stato reso meno "neon" e più profondo/elegante, con un secondo colore — oro/ambra — usato solo per Coach AI Pro e i contenuti premium, così non è tutto un unico verde
- **Scritta "SWEAT" ridisegnata**: prima usava un carattere molto pesante e "da palestra anni 2000" (Anton); ora usa Space Grotesk, un carattere geometrico moderno, più simile a come scrivono i loro nomi le app vere (Strava, Nike Training Club) che a un logo fatto in Canva
- **Più profondità**: le card principali (sfida, punti, checklist) ora hanno un'ombra morbida invece di un bordo piatto, per un effetto più "app moderna" e meno "pagina web del 2015"
- **Spunta di verifica**: i profili di palestre e personal trainer mostrano ora una spunta verde accanto al nome, per distinguerli dagli utenti normali (sul proprio profilo e su quello degli altri)

### PASSO 1 — Carica questi file su GitHub
Nella cartella principale: sovrascrivi `index.html`, `styles.css`, `app-core.js`, `manifest.json`.
Crea una cartella **`assets`** nella root e caricaci dentro i 4 file PNG (`icon-32.png`, `icon-180.png`, `icon-192.png`, `icon-512.png`).

Non serve toccare il database per questo blocco.

### Limiti onesti su questo blocco
- Ho ridisegnato logo, colori e carattere del nome; non ho ridisegnato da zero ogni singola schermata — i post, le card e i pulsanti restano nella stessa struttura di prima, solo con la nuova palette e qualche ombra in più. Un restyling completo di ogni schermata è un lavoro enorme a parte, dimmi se è quello che vuoi e lo pianifichiamo

## AGGIORNAMENTO — Storie 24h, reazioni multiple, transizioni più fluide (ottobre 2026, blocco 2)

Secondo blocco dello stesso grande aggiornamento. Si aggiunge a quello appena sotto (blocco 1): foto, carosello, sfide ecc. restano validi.

### Nuovi file
- `app-stories.js` — Storie che durano 24 ore: riga in alto nel feed, visualizzatore a schermo intero con avanzamento automatico, chi le ha già viste
- `schema-v8.sql` — reazioni multiple (non solo cuore: anche 🔥👏😮💪)
- `schema-v9.sql` — tabella Storie, chi le ha viste, bucket di Storage dedicato

### Cosa c'è di nuovo per chi usa l'app
- **Storie da 24 ore**: tocca il "+" sul tuo cerchietto in alto nel feed per pubblicarne una (foto), scompare da sola dopo 24 ore. Tocca il cerchietto di un amico per vederla a schermo intero, scorre da sola, tocca a destra/sinistra per andare avanti/indietro, l'anello diventa grigio una volta vista
- **Reazioni multiple**: tieni premuto il cuore su un post per scegliere tra ❤️🔥👏😮💪 invece del semplice like (un tocco veloce resta un like normale, come prima)
- **Transizioni più fluide**: passare da una schermata all'altra e l'apparizione dei post nel feed ora hanno una piccola dissolvenza, invece di apparire di scatto

### PASSO 1 — Database
Esegui, nell'ordine, `schema-v8.sql` e poi `schema-v9.sql` su Supabase (SQL Editor → Run).

### PASSO 2 — Carica questi file su GitHub
Nella cartella principale (root): aggiungi `app-stories.js` (oltre a tutti gli altri). In `index.html` è già incluso `<script src="app-stories.js">` — basta sovrascrivere il file.

### PASSO 3 — Storage
`schema-v9.sql` crea da solo il bucket `stories` e le sue policy. Non serve fare nulla a mano.

### Limiti onesti su questo blocco
- Le Storie sono singole foto (non supportano ancora video o testo sopra l'immagine, come invece fa Instagram con gli sticker)
- Le storie scadute vengono cancellate dal database una volta al giorno dallo stesso lavoro automatico delle notifiche "ci manchi" (`api/reengagement-cron.js`) — quindi **serve aver attivato `CRON_SECRET` su Vercel** (Passo 4 dell'aggiornamento precedente) anche solo per questa pulizia; senza, le righe scadute si accumulano nel database (non visibili a nessuno, ma occupano spazio)

## AGGIORNAMENTO — foto vere, carosello, doppio tap, persone da conoscere, classifica amici, sfide 1v1, riepilogo settimanale, notifiche "ci manchi" (ottobre 2026)

Blocco 1 del grande aggiornamento "come Instagram ma con più funzioni": foto vere sui post e sul profilo (prima gap più grande rispetto a Instagram), e un primo blocco di funzioni per far tornare le persone sull'app ogni giorno.

### Nuovi file
- `app-photos.js` — upload delle foto (post e profilo) su Supabase Storage, carosello foto, doppio tap per metter like, avatar reali ovunque nell'app
- `schema-v6.sql` — foto sui post (fino a 5, con carosello), foto profilo, due bucket di Storage con le relative policy di sicurezza
- `schema-v7.sql` — sfide 1 contro 1, colonne per il riepilogo settimanale e le notifiche "ci manchi"
- `api/reengagement-cron.js` — controlla una volta al giorno chi non si vede da un po' e gli scrive una notifica (che fa scattare anche la push vera)
- `vercel.json` — programma la chiamata automatica giornaliera a `reengagement-cron.js` (Vercel Cron Job)

### Cosa c'è di nuovo per chi usa l'app
- **Foto vere sui post**: puoi caricare fino a 5 foto per allenamento, con un vero carosello scorrevole (pallini e contatore "1/5" come su Instagram)
- **Doppio tap sulla foto** per metter like, esattamente come su Instagram
- **Foto profilo vera**: tocca l'iconcina della fotocamera sul tuo avatar per cambiarla — compare ovunque (feed, profilo, commenti, messaggi, ricerca)
- **Griglia del profilo** ora mostra le foto vere dei tuoi allenamenti (quando ce ne sono), con un'iconcina se un post ha più foto
- **"Persone che potresti conoscere"** nella schermata Cerca (stessa città, o le ultime persone iscritte se non hai ancora indicato una città)
- **Classifica Globale / Amici**: nel profilo puoi scegliere se la classifica settimanale mostra tutti o solo le persone che segui
- **Checklist di completamento profilo**: appare nel profilo finché non hai foto, città, un post e almeno un "segui" — toccando una voce ti porta dove serve
- **Sfide 1 contro 1**: dal profilo di un amico tocca "Sfidalo 1v1", scegli i km in 7 giorni, lui riceve una notifica e può accettare/rifiutare dal suo profilo; chi è avanti si vede in tempo reale
- **Riepilogo settimanale automatico**: se ti sei allenato, una volta a settimana ricevi una notifica (e una push vera) con il totale di km e allenamenti
- **Notifiche "ci manchi"**: se non apri l'app da 3-14 giorni, ricevi una notifica push automatica una volta ogni 3 giorni — gira da sola sul server, non serve che tu apra l'app

### PASSO 1 — Database
Esegui `schema-v6.sql` e poi `schema-v7.sql` su Supabase (SQL Editor → Run, uno dopo l'altro, come sempre).

### PASSO 2 — Carica questi file su GitHub
Nella cartella principale (root): tutti i file come prima, più `app-photos.js` e `vercel.json`.
Dentro `api/`: `reengagement-cron.js` (oltre a quelli che già c'erano).
In `index.html` è già incluso il nuovo `<script src="app-photos.js">` — basta sovrascrivere il file.

### PASSO 3 — Attiva i bucket delle foto
`schema-v6.sql` crea già da solo i due bucket di Storage (`post-photos` e `avatars`) e le loro policy. Non devi fare nulla a mano su Supabase Storage: basta aver eseguito il file SQL.

### PASSO 4 — Attiva la notifica automatica "ci manchi" (facoltativo ma consigliato)
1. Vercel → il tuo progetto → **Settings → Environment Variables** → aggiungi `CRON_SECRET` con un valore segreto a tua scelta (una stringa lunga a caso, tipo una password)
2. Fai un **Redeploy** dall'ultimo deployment (serve sempre dopo aver aggiunto una variabile)
3. Da quel momento Vercel chiama da solo `api/reengagement-cron.js` ogni giorno alle 18:00 UTC (orario già impostato in `vercel.json`) — non serve altro

Se salti questo passo, tutto il resto dell'app funziona comunque: semplicemente non partiranno le notifiche automatiche "ci manchi".

### Limiti onesti su questo blocco
- Il carosello e il doppio-tap funzionano solo sulle foto vere caricate da ora in poi: i post pubblicati prima di questo aggiornamento restano senza foto (non è possibile aggiungerle retroattivamente senza che l'utente le ricarichi)
- Le sfide 1v1 confrontano i km pubblicati dall'inizio della sfida: se uno dei due non indica la distanza quando pubblica un allenamento, quell'allenamento non conta per la sfida
- Il riepilogo settimanale e le notifiche "ci manchi" dipendono dal fatto che le notifiche push siano già configurate (vedi il Passo 4 dell'aggiornamento precedente, più sotto in questo stesso file)

## AGGIORNAMENTO GRANDE — ottobre 2026: follow, ricerca, push, Stripe, presenza online, record reali

Questo è l'aggiornamento più grande fatto finora. Ecco cosa c'è di nuovo e cosa devi fare, passo per passo.

### Nuovi file (oltre a quelli che già avevi)
- `app-social.js` — follow tra utenti, ricerca, presenza online, modifica/elimina post e commenti, traguardi/record reali
- `app-admin-charts.js` — grafici di crescita nel pannello admin
- `app-push.js` — notifiche push vere (lato browser)
- `service-worker.js` — riceve le notifiche push anche ad app chiusa (va in **root**, stessa cartella di `index.html`, MAI dentro `api/`)
- `manifest.json` — serve per le notifiche push su iPhone
- `api/send-push.js`, `api/create-checkout-session.js`, `api/stripe-webhook.js` — nuove funzioni serverless (vanno dentro `api/`)
- `schema-v5.sql` — nuova migrazione database

### PASSO 1 — Database
Esegui `schema-v5.sql` su Supabase (SQL Editor → Run), come sempre.

### PASSO 2 — Carica TUTTI questi file su GitHub
Nella cartella principale (root): `index.html`, `styles.css`, `app-core.js`, `app-social.js`, `app-admin-charts.js`, `coach-ai.js`, `app-push.js`, `service-worker.js`, `manifest.json`.
Dentro la cartella `api/`: `send-push.js`, `create-checkout-session.js`, `stripe-webhook.js`.

### PASSO 3 — Nuove variabili d'ambiente su Vercel
Vai su Vercel → il tuo progetto → **Settings → Environment Variables** e aggiungi:

| Nome | Valore | Dove lo trovi |
|---|---|---|
| `VAPID_PUBLIC_KEY` | `BJzXBoIZSnErUwuOnxwqoz6zHFg5nbY16Dg8cdNKBs9jczg_rZEsxn7yEOinI4t4xhDOoA7PFJx5laCSEEW-ol4` | Già generata, copiala così com'è |
| `VAPID_PRIVATE_KEY` | `_GwetM4FTNY3dXe_Pzs3Uebn6nG4h0YBbIqXnbCtl64` | Già generata, copiala così com'è — **non condividerla mai pubblicamente** |
| `SUPABASE_URL` | Il tuo Project URL di Supabase | Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | La chiave **service_role** (diversa da quella "anon" che già usi) | Supabase → Project Settings → API — attenzione: questa chiave bypassa tutte le protezioni, non va mai scritta nel codice del sito, solo qui |
| `STRIPE_SECRET_KEY` | La tua chiave segreta Stripe | Stripe Dashboard → Developers → API keys |
| `STRIPE_PRICE_ID` | L'ID del prezzo "Coach AI Pro — 4,99€/mese" | Stripe Dashboard → Product Catalog (crea un prodotto ricorrente mensile da 4,99€, poi copia l'ID del prezzo, tipo `price_xxxxx`) |
| `STRIPE_WEBHOOK_SECRET` | Lo trovi dopo aver configurato il webhook (punto 5) | Stripe Dashboard → Developers → Webhooks |

Dopo aver aggiunto le variabili, vai su **Deployments** → sui tre puntini dell'ultimo deployment → **Redeploy**, altrimenti Vercel non le vede.

### PASSO 4 — Collega Supabase alle notifiche push (Database Webhook)
1. Supabase → **Database** → **Webhooks** → **Create a new hook**
2. Tabella: `notifications` — Evento: **Insert**
3. Tipo: **HTTP Request** → URL: `https://TUOSITO.vercel.app/api/send-push` (sostituisci col tuo indirizzo vero)
4. Metodo: POST, salva

Da questo momento, ogni volta che viene creata una notifica (like, commento, messaggio, nuovo follower) parte davvero una notifica push.

### PASSO 5 — Collega Stripe ai pagamenti
1. Crea un account su **stripe.com** se non l'hai già
2. Crea un prodotto ricorrente "Coach AI Pro" da 4,99€/mese (Product Catalog → Add Product)
3. Copia l'ID del prezzo (`price_...`) → mettilo come `STRIPE_PRICE_ID` (vedi tabella sopra)
4. Developers → Webhooks → Add endpoint → URL: `https://TUOSITO.vercel.app/api/stripe-webhook`
5. Eventi da ascoltare: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
6. Copia il "Signing secret" che ti dà → mettilo come `STRIPE_WEBHOOK_SECRET`

**Finché non fai questo passo**, il bottone "Sblocca Coach AI Pro" continua a funzionare in modalità demo gratuita (non si rompe nulla, semplicemente non chiede ancora soldi veri).

### Limiti onesti da sapere
- **Notifiche push su iPhone**: funzionano solo da iOS 16.4 in su, e solo se l'utente ha aggiunto il sito alla schermata Home prima (limite di Apple, non nostro)
- **Commissione marketplace (3%)**: non ancora collegata a Stripe — è un lavoro a parte (richiede Stripe Connect, più complesso di un abbonamento semplice); oggi resta "sulla fiducia" come prima

### Novità minori incluse in questo stesso aggiornamento
- Freccia "indietro" funzionante da chat e commenti (prima era un vicolo cieco)
- Icona messaggi in alto a destra nel Feed, come Instagram
- Conferma richiesta prima di: lasciare un gruppo, eliminare un log peso, eliminare un log performance
- Bottone elimina sui propri commenti
- Feed ora mostra prima i post di chi segui (se non segui nessuno, mostra comunque gli ultimi post per farti scoprire persone)
- Skeleton animato mentre il feed carica, pull-to-refresh (tira verso il basso per aggiornare)
- Record personali e traguardi calcolati sui dati veri, non più finti — serve indicare anche la durata (minuti) quando pubblichi un allenamento, altrimenti i record restano vuoti

## AGGIORNAMENTO — commenti veri, griglia allenamenti nel profilo

Aggiunti: commenti reali sui post (prima erano solo icone decorative), una griglia "I tuoi allenamenti" nel profilo al posto della griglia foto (Sweat non carica foto sui post, quindi mostra tipo di attività e distanza), e il profilo di chi commenta o scrive un messaggio è ora raggiungibile toccando il suo avatar ovunque appaia.

**Prima esegui**: `schema-v4.sql` su Supabase (SQL Editor → Run).
**Poi ricarica su GitHub**: `index.html`, `app-core.js`, `styles.css` (nessuna modifica a `coach-ai.js` questa volta).

**Nota sulle "storie in evidenza"**: non le ho costruite — richiederebbero un sistema di storie temporanee completo (upload, scadenza dopo 24h, raccolta in evidenza), una funzione separata e grande rispetto al resto dell'app. Se la vuoi, ne parliamo a parte.

## IMPORTANTE — nuova struttura dei file (ottobre 2026)

Il codice è stato riscritto e diviso in file separati, per renderlo più
solido e più facile da correggere in futuro. Ora ci sono **4 file al
posto di 1** per la parte del sito:

- `index.html` — solo la struttura della pagina (markup) e, in cima,
  le due righe con `SUPABASE_URL`/`SUPABASE_ANON_KEY` da configurare
- `styles.css` — tutto l'aspetto grafico (colori, font, layout)
- `app-core.js` — la logica principale: login, feed, gruppi,
  messaggi, marketplace, profilo, pannello admin
- `coach-ai.js` — tutta la parte Coach AI e Coach AI Pro (analisi
  foto, scheda, dieta, monitoraggio peso/performance)

**Quando aggiorni il sito su GitHub, questi 4 file vanno caricati
insieme, nella stessa cartella principale del repository** (root),
non dentro `api`. I file dentro `api/` restano separati, come prima.

Se avevi già un `index.html` vecchio (quello enorme, con tutto il
codice scritto dentro), sostituiscilo con questo nuovo più corto, e
aggiungi gli altri 3 file nuovi accanto.

---


Questo pacchetto contiene l'app già collegata a un database vero (Supabase)
e a una AI vera per il Coach (tramite funzioni serverless su Vercel).
Segui questi passaggi IN ORDINE. Non servono conoscenze avanzate: ogni
passaggio è un copia-incolla.

---

## PARTE 1 — Crea il database (Supabase)

1. Vai su **supabase.com** → "Start your project" → registrati (gratis).
2. Crea un nuovo progetto: dagli un nome (es. "sweat-app"), scegli una
   password per il database (salvala da qualche parte, non ti servirà
   spesso) e una regione vicina a te (es. Frankfurt).
3. Aspetta 1-2 minuti che il progetto si attivi.
4. Nel menu a sinistra vai su **SQL Editor** → **New query**.
5. Apri il file `schema.sql` incluso in questo pacchetto, copia TUTTO il
   contenuto, incollalo nell'editor e premi **Run**. Questo crea le
   tabelle (profili, post, like) e le regole di sicurezza.
6. Vai su **Project Settings** (icona ingranaggio) → **API**.
   Ti servono due valori, che userai nella Parte 3:
   - **Project URL**
   - **anon public** (la chiave pubblica, non quella "service_role")

### Consiglio per i test iniziali
Per non dover confermare l'email ogni volta che provi un account:
vai su **Authentication** → **Providers** → **Email** e disattiva
temporaneamente "Confirm email". Riattivalo prima di avere utenti veri.

---

## PARTE 2 — Crea la chiave AI (Anthropic)

1. Vai su **console.anthropic.com** → registrati.
2. Vai su **API Keys** → **Create Key**, dalle un nome e copiala subito
   (non la rivedrai più per intero).
3. Nella sezione "Billing" aggiungi un metodo di pagamento: i costi sono
   a consumo, pochi centesimi per ogni richiesta del Coach AI — per fare
   delle prove spendi pochi euro al massimo.

---

## PARTE 3 — Collega l'app a Supabase

1. Apri il file `index.html` con un editor di testo qualsiasi (anche il
   Blocco Note va bene, ma Visual Studio Code è più comodo e gratuito).
2. Cerca queste due righe vicino all'inizio del file:
   ```
   const SUPABASE_URL = "INCOLLA_QUI_IL_TUO_PROJECT_URL";
   const SUPABASE_ANON_KEY = "INCOLLA_QUI_LA_TUA_ANON_KEY";
   ```
3. Sostituisci i due testi tra virgolette con i valori che hai copiato
   nella Parte 1, punto 6. Salva il file.

---

## PARTE 4 — Metti tutto online (Vercel)

1. Crea un account gratuito su **github.com** (se non ce l'hai già).
2. Crea un nuovo repository (es. "sweat-app"), pubblico o privato come
   preferisci.
3. Carica TUTTI i file di questo pacchetto dentro il repository
   (su GitHub puoi trascinarli direttamente dal browser con
   "Add file" → "Upload files").
4. Vai su **vercel.com** → registrati (puoi accedere direttamente con
   il tuo account GitHub, è il modo più semplice).
5. Premi **Add New** → **Project**, scegli il repository "sweat-app"
   che hai appena creato, poi **Import**.
6. PRIMA di premere "Deploy", apri **Environment Variables** e aggiungi:
   - Nome: `ANTHROPIC_API_KEY`
   - Valore: la chiave che hai creato nella Parte 2
7. Premi **Deploy**. Dopo circa un minuto ti dà un link vero, del tipo
   `sweat-app-tuonome.vercel.app` — funziona, è online, chiunque può
   aprirlo.

---

## PARTE 5 — Prova che funzioni

1. Apri il link che Vercel ti ha dato.
2. Registrati con una tua email e password.
3. Pubblica un allenamento → dovrebbe apparire nel feed.
4. Apri Supabase → **Table Editor** → tabella `posts`: dovresti vedere
   la riga vera che hai appena creato.
5. Prova il Coach AI con una foto: se la chiave Anthropic è configurata
   bene, dopo qualche secondo vedrai un'analisi reale invece del testo
   di esempio.

---

## Se qualcosa non funziona

- **"Configura prima SUPABASE_URL..."** → non hai salvato le modifiche
  del punto 3 nella Parte 3, oppure non hai ricaricato i file su GitHub
  dopo averli modificati.
- **Il feed resta vuoto** → controlla di aver eseguito `schema.sql` per
  intero (Parte 1, punto 5).
- **Il Coach AI mostra sempre il testo di esempio** → la chiave
  `ANTHROPIC_API_KEY` non è configurata su Vercel, o non hai un metodo
  di pagamento attivo su Anthropic.
- **Errore quando ti registri** → prova a disattivare "Confirm email"
  come indicato nella Parte 1 (consiglio per i test).

Per qualsiasi altro errore, fai uno screenshot e torna in chat con
Claude: incollando l'errore esatto si trova la causa molto più in
fretta.

---

## AGGIORNAMENTO — Coach AI Pro (ottobre 2026)

Nuova funzione premium (4,99€/mese — **attivazione ancora in modalità demo**, nessun pagamento reale finché non colleghi Stripe): profilo esteso (età, altezza, peso, sesso, obiettivo, allenamento, alimentazione, routine), calcolo del fabbisogno calorico reale (formula di Mifflin-St Jeor, calcolato in JavaScript, mai dall'AI), scheda e piano alimentare generati sui dati veri invece di stime generiche, monitoraggio di peso e performance nel tempo. Aggiunta anche una sezione "Suggerimenti" nel Profilo, visibile a te nel Pannello Admin.

**Importante sui dati medici**: il campo "Condizioni mediche rilevanti" non viene MAI inviato all'AI che genera scheda/dieta — serve solo per mostrare un avviso che invita a sentire un medico prima di procedere.

**Prima di tutto, esegui la nuova migrazione**:
1. Supabase → SQL Editor → New query
2. Apri `schema-v3.sql`, copia tutto, incolla, premi **Run**

**File da ricaricare su GitHub**: `index.html`, `styles.css`, `app-core.js`, `coach-ai.js`, `api/generate-scheda.js`, `api/generate-diet.js`.

## AGGIORNAMENTO — Termini di Servizio e Privacy Policy (ottobre 2026)

Sono stati aggiunti due file: `termini.html` e `privacy.html` — pagine vere, con lo stesso stile dell'app, raggiungibili da chiunque all'indirizzo del tuo sito (es. `tuosito.vercel.app/termini.html`). La schermata di registrazione ora ha una casella obbligatoria "Ho letto e accetto i Termini..." — senza spuntarla non si può creare un account. Carica questi due file nella stessa cartella di `index.html` su GitHub (root del progetto), così i link funzionano subito.

**Se in futuro compri un dominio personalizzato**, questi due URL (`/termini.html` e `/privacy.html`) restano identici — non c'è nulla da cambiare nel codice.

## AGGIORNAMENTO — nuove funzioni (ottobre 2026)

Sono state aggiunte: marketplace reale (palestre/personal trainer), notifiche reali, sfida settimanale e classifica reali, punti e premi (gestiti da te come sponsor), gruppi creabili dagli utenti, messaggistica diretta, recupero password, profilo pubblico di altri utenti, onboarding, programma "invita un amico", pannello di amministrazione, accessibilità per disabili nel marketplace, e una prima versione di multilingua (IT/EN). Sono state rimosse: sincronizzazione Strava/Garmin/Apple Health/Google Fit, "Corri con me", modalità sicurezza/SOS, mappa Esplora.

**Prima di tutto**, esegui la nuova migrazione:
1. Vai su Supabase → SQL Editor → New query
2. Apri `schema-v2.sql`, copia tutto il contenuto, incollalo, premi **Run**
3. Questo aggiunge le nuove tabelle (gruppi, messaggi, notifiche, segnalazioni, sponsor) senza toccare i dati che hai già

**Per diventare amministratore** (vedere il Pannello Admin):
1. Supabase → Table Editor → tabella `profiles`
2. Trova la riga con il tuo account (cerca la tua email o il tuo nome)
3. Imposta la colonna `is_admin` su `true`
4. Ricarica l'app: nel tuo Profilo apparirà il bottone "Pannello Admin"

**Nota su "Password dimenticata"**: funziona già, ma Supabase deve sapere dove reindirizzare l'utente dopo il click sul link nell'email. Vai su Supabase → Authentication → URL Configuration → **Redirect URLs** e aggiungi l'indirizzo del tuo sito Vercel (es. `https://sweat-app-tuonome.vercel.app`).

**Nota sulla multilingua**: è una prima versione reale e funzionante (il cambio lingua in Profilo traduce davvero i testi), ma copre solo le parti principali dell'interfaccia (menu, bottoni chiave), non ogni singola scritta dell'app. È pensata per essere ampliata gradualmente.

## Cosa NON è ancora incluso in questo pacchetto

Come già discusso: "Corri con me" con geolocalizzazione vera, il
marketplace coach con prenotazioni vere, Strava/Garmin/Apple Health/
Google Fit, i pagamenti (Stripe) e l'app nativa per gli store. Questi
restano passaggi successivi, da costruire uno alla volta sopra questa
base.
