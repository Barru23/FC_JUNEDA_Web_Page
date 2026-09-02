# 🔴⚽ CF Juneda — Full de Ruta cap a Producció (ROADMAP)

Aquest document detalla pas a pas tot el que necessites configurar per tenir la **primera versió 100% operativa i gratuïta** de la pàgina web del **Club Futbol Juneda** amb:
- Venda de tiquets per a dinars i sopars
- Venda de la 1a equipació i marxandatge
- Altes i cobrament de quotes de Socis
- Panell d'administració per a la Junta (`/admin`)
- Sincronització automàtica a Google Sheets en temps real

---

## 🧭 Resum dels 5 Serveis Gratuïts que farem servir

| Servei | Per a què serveix | Cost | Quota gratuïta |
| :--- | :--- | :--- | :--- |
| **Vercel** | Hosting de la web i les funcions del servidor | **0,00 €** | 100 GB ample de banda, funcions il·limitades |
| **Stripe** | Cobrament amb targeta, Bizum i Apple Pay | **0,00 € fixos** | Només comissió per venda (coberta amb la taxa de 0,75 €) |
| **Supabase** | Base de dades oficial (esdeveniments, estoc, compres) | **0,00 €** | 500 MB de base de dades PostgreSQL (més que suficient) |
| **Google Sheets API** | Full de càlcul compartit per a la Junta | **0,00 €** | Ilimitat per a ús de club |
| **Resend** | Enviament de correus de confirmació oficials | **0,00 €** | 3.000 correus al mes de franc |

---

## 📋 PAS 1: Crear la Base de Dades (Supabase) — ~5 minuts

1. Entra a **[supabase.com](https://supabase.com)** i crea un compte gratuït (o inicia sessió amb GitHub/Google).
2. Fes clic a **"New Project"**:
   - **Name**: `CF Juneda`
   - **Database Password**: Posa una contrasenya segura (apunta-la).
   - **Region**: Tria `West EU (Frankfurt)` o `West EU (London)` (la més propera a Catalunya).
   - **Pricing Plan**: Free (0€).
3. Un cop creat el projecte, ves a la columna esquerra a **SQL Editor** > **New Query**.
4. Obre el fitxer [`supabase-schema.sql`](./supabase-schema.sql) d'aquest projecte, copia tot el contingut, enganxa'l a l'editor de Supabase i fes clic a **Run**.
   - *Això crearà automàticament les taules d'esdeveniments, botiga, socis i compres amb les dades inicials.*
5. Ves a **Project Settings** (icona d'engranatge avall a l'esquerra) > **API**:
   - Copia la **Project URL** (ex: `https://xyzcompany.supabase.co`).
   - Copia la clau **anon (public)**.
   - A sota, copia la clau **service_role (secret)** (fent clic a *Reveal*).
6. Obre el fitxer `.env.local` del teu ordinador i omple:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://el-teu-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=la-teva-clau-anon
   SUPABASE_SERVICE_ROLE_KEY=la-teva-clau-service-role
   ```

---

## 💳 PAS 2: Configurar Stripe (Pagaments i Proves) — ~5 minuts

1. Entra a **[dashboard.stripe.com](https://dashboard.stripe.com)**.
2. Assegura't que a dalt a la dreta estigui activat el **"Test mode"** (mode de proves en taronja).
3. Ves a **Developers** > **API keys**:
   - Copia la **Publishable key** (`pk_test_...`).
   - Fes clic a revelar i copia la **Secret key** (`sk_test_...`).
   - Posa-les a `.env.local`:
     ```env
     NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
     STRIPE_SECRET_KEY=sk_test_...
     ```
4. *(Opcional per a local)* Per provar que el webhook respongui al teu ordinador sense desplegar encara:
   - Descarrega la [Stripe CLI](https://docs.stripe.com/stripe-cli) i executa:
     ```bash
     stripe listen --forward-to localhost:3000/api/webhooks/stripe
     ```
   - Copia el `whsec_...` que et doni i posa'l a `STRIPE_WEBHOOK_SECRET`.
5. Activa mètodes de pagament (com Bizum, Apple Pay, Targetes) a **Settings** > **Payment methods** a Stripe.

---

## 📗 PAS 3: Google Sheets per al control de la Junta — ~7 minuts

Volem que cada cop que algú compri un tiquet o pagui en efectiu, s'escrigui automàticament al full de càlcul que pot veure la Junta al mòbil o tauleta:

1. **Crear el Full de Càlcul mestre**:
   - Obre Google Drive i crea un nou Google Sheet (ex: `"CF Juneda — Registre d'Esdeveniments i Compres"`).
   - Mira la URL del navegador:
     `https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit`
   - El codi entre `/d/` i `/edit` és el teu `GOOGLE_MASTER_SHEET_ID`. Copia'l a `.env.local`:
     ```env
     GOOGLE_MASTER_SHEET_ID=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms
     ```
2. **Crear el Compte de Servei (Robot que escriu al full)**:
   - Entra a **[console.cloud.google.com](https://console.cloud.google.com)**.
   - Crea un projecte nou anomenat `CF Juneda`.
   - Al cercador superior cerca **Google Sheets API** i fes clic a **Enable** (Habilitar).
   - Ves a **IAM & Admin** > **Service Accounts** > **Create Service Account**:
     - Nom: `juneda-sheets`
     - Fes clic a **Create and Continue** i després **Done**.
   - Fes clic sobre el compte que s'acaba de crear, ves a la pestanya **Keys** > **Add Key** > **Create new key** > tria **JSON** i descarrega el fitxer.
   - Obre el fitxer JSON descarregat:
     - Copia el camp `client_email` a `GOOGLE_SERVICE_ACCOUNT_EMAIL`.
     - Copia el camp `private_key` a `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` (mantén les cometes dobles).
3. **Donar permís al robot**:
   - Torna al teu Google Sheet, fes clic al botó verd **Compartir** (Share).
   - Afegeix el correu del compte de servei (el que acaba en `@...iam.gserviceaccount.com`) amb rol d'**Editor**.

---

## 📧 PAS 4: Correus electrònics de confirmació (Resend) — ~3 minuts

1. Entra a **[resend.com](https://resend.com)** i crea un compte gratuït.
2. Ves a **API Keys** > **Create API Key** (Nom: `CF Juneda`).
3. Copia la clau (`re_...`) a `.env.local`:
   ```env
   RESEND_API_KEY=re_...
   RESEND_FROM_EMAIL=CF Juneda <onboarding@resend.dev>
   ```
   *(Més endavant, si teniu domini propi com `cfjuneda.cat`, podreu verificar-lo a Resend per enviar des de `info@cfjuneda.cat`)*.

---

## 🚀 PAS 5: Desplegament a Internet (Vercel) — ~4 minuts

1. Assegura't que els canvis estiguin pujats al teu repositori de GitHub:
   ```bash
   git add .
   git commit -m "feat: Sistema de pagaments, admin i gestió de socis"
   git push origin main
   ```
2. Entra a **[vercel.com](https://vercel.com)** (inicia sessió amb el teu compte de GitHub).
3. Fes clic a **"Add New..."** > **"Project"** i selecciona el repositori `FC_JUNEDA_Web_Page`.
4. Desplega la secció **Environment Variables** i enganxa totes les variables del teu fitxer `.env.local`:
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`
   - `GOOGLE_MASTER_SHEET_ID`
   - `RESEND_API_KEY`
   - `RESEND_FROM_EMAIL`
   - `ADMIN_PASSWORD` (tria una contrasenya forta per a la Junta)
   - `NEXT_PUBLIC_SITE_URL` (la URL de Vercel, ex: `https://cf-juneda.vercel.app`)
5. Fes clic a **Deploy**. En 60 segons la teva web estarà pública a tot el món!

---

## 🔄 PAS 6: Connectar el Webhook de Stripe a Producció — ~2 minuts

Un cop Vercel t'hagi donat la URL pública (ex: `https://cf-juneda.vercel.app`):
1. Torna a **Stripe Dashboard** > **Developers** > **Webhooks**.
2. Fes clic a **Add endpoint**:
   - **Endpoint URL**: `https://cf-juneda.vercel.app/api/webhooks/stripe`
   - **Events to listen to**: Selecciona `checkout.session.completed`.
3. Fes clic a **Add endpoint**.
4. Copia el **Signing secret** (`whsec_...`) que et mostrarà.
5. Afegeix aquest valor a les variables d'entorn de Vercel com a `STRIPE_WEBHOOK_SECRET` i torna a fer un redeploy ràpid.

---

## ✅ PAS 7: Prova General abans del llançament oficial

Fes aquestes 3 comprovacions en mode de prova:
1. **Reserva un tiquet d'esdeveniment**:
   - Ves a la web pública, tria un dinar/sopar, posa nom, correu i intoleràncies.
   - Paga amb la targeta de test de Stripe: `4242 4242 4242 4242` (amb qualsevol data futura i CVC `123`).
   - Comprova que et redirigeix a `/success` amb el resum.
   - Comprova que reps el correu en català i que surt al teu Google Sheet.
2. **Entra a `/admin`**:
   - Comprova que la reserva apareix a la llista i que la barra de places s'ha actualitzat.
   - Prova el botó **"+ Efectiu"** per simular algú que paga 18 € en mà. Comprova que s'afegeix a la taula i al Google Sheet com a pagament en efectiu.
   - Prova el botó **"CSV"** per descarregar el llistat d'assistents en Excel.
3. **Passar a Real**:
   - Quan estiguis llest per cobrar de veritat, desactiva el "Test mode" a Stripe, posa les claus reals (`pk_live_...` i `sk_live_...`) a Vercel, i ja podeu començar a vendre!

---
*Club Futbol Juneda · Som-hi Rojos! 🔴⚽*
