# Sweat — guida passo-passo per metterla online (gratis)

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

## Cosa NON è ancora incluso in questo pacchetto

Come già discusso: "Corri con me" con geolocalizzazione vera, il
marketplace coach con prenotazioni vere, Strava/Garmin/Apple Health/
Google Fit, i pagamenti (Stripe) e l'app nativa per gli store. Questi
restano passaggi successivi, da costruire uno alla volta sopra questa
base.
