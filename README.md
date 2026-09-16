# Web oficial del CF Juneda

Aplicació web del **Club Futbol Juneda** per a la temporada 2026/27, en què el primer equip competeix a **Segona Catalana, Grup 5**.

La web reuneix en un sol lloc la informació esportiva i els serveis digitals del club: calendari de lliga, plantilla, campanya de socis, botiga, esdeveniments, reserves i gestió interna. L'objectiu és que l'afició pugui seguir l'equip i fer gestions habituals des del mòbil, mentre la Junta rep les dades i controla les operacions des d'un panell propi.

## Funcionalitats

### Web pública

- Calendari complet de les 30 jornades de lliga, amb pròxim partit i filtres de casa/fora.
- Plantilla i cos tècnic presentats sobre un camp tàctic interactiu.
- Alta de socis amb modalitats, validació de DNI/NIE i IBAN i mandat de domiciliació.
- Botiga oficial amb talla, estoc i personalització de nom i dorsal.
- Reserva i pagament de dinars, sopars i altres esdeveniments del club.
- Pàgina de confirmació de compra i consulta de l'estat real de Stripe.
- Avís legal, política de privacitat i condicions de compra.
- Disseny responsive, animacions respectuoses amb `prefers-reduced-motion` i navegació accessible per seccions.

### Panell d'administració

La ruta `/admin` permet a la Junta:

- Consultar ingressos, tiquets, comandes, despeses de gestió i altes de socis.
- Crear, editar i cancel·lar esdeveniments.
- Crear, editar i ocultar productes de la botiga.
- Registrar cobraments manuals en efectiu.
- Corregir l'estat d'operacions i marcar altes com a domiciliades o anul·lades.
- Exportar dades en CSV i obrir el full mestre de Google Sheets.

El calendari esportiu no es gestiona des del panell: és contingut oficial versionat a `content/matches.json`, de manera que cada canvi queda auditable a Git.

## Stack tecnològic

### Interfície

- **Next.js 15** amb App Router per a pàgines, layouts i rutes d'API.
- **React 19** i **TypeScript**.
- **Tailwind CSS 3** per al sistema visual responsive.
- **Framer Motion** per a transicions, entrada inicial i microinteraccions.
- **Three.js**, **React Three Fiber**, **Drei** i **React Three Postprocessing** per al camp tàctic 3D de la plantilla, carregat sota demanda quan la secció s'acosta a la pantalla.
- **Lucide React** per a la iconografia.
- `next/font` amb Syne i Inter.

### Backend i serveis

- **Route Handlers de Next.js** com a backend. El navegador no accedeix directament a Supabase ni rep la seva clau de servei.
- **Supabase/PostgreSQL** com a font de veritat per a esdeveniments, productes, compres i altes de socis.
- **Stripe Checkout** per cobrar tiquets i marxandatge, amb verificació de preus i estoc al servidor.
- **Webhooks de Stripe** per confirmar pagaments immediats i asíncrons, finalitzar reserves i recuperar inventari de sessions caducades o fallides.
- **Google Apps Script** com a pont cap a Google Sheets i Gmail/MailApp: desa files al full de la Junta i envia correus des del compte del club.
- **Netlify** com a entorn de desplegament i domini públic, amb el runtime oficial de Next.js.

No s'utilitzen Radix UI, shadcn/ui, GSAP, Resend ni l'API directa de Google Sheets en la implementació actual.

## Arquitectura i fluxos

```text
Navegador
   │
   ├── contingut versionat ──► calendari, plantilla i catàlegs base
   │
   └── /api/* (Next.js, servidor)
          │
          ├── Supabase ──► dades, preus, estoc i registres
          ├── Stripe ──► Checkout i confirmació per webhook
          └── Apps Script ──► Google Sheets + correus del club
```

### Compra d'un producte o reserva d'un esdeveniment

1. La interfície carrega el catàleg actiu des de `/api/products` o `/api/events`.
2. `/api/checkout` valida les dades i torna a consultar a Supabase el preu, l'estat i la disponibilitat. No accepta com a fiable cap preu enviat pel navegador.
3. El servidor crea una sessió de Stripe d'uns 30 minuts i reserva places o estoc a Supabase amb una operació atòmica. La URL de pagament només es retorna si la reserva ha funcionat.
4. Stripe crida `/api/webhooks/stripe`; la signatura es verifica abans d'actualitzar res. `checkout.session.completed` confirma els mètodes immediats i `checkout.session.async_payment_succeeded` confirma els asíncrons.
5. Una transacció idempotent converteix la reserva en una compra. Webhooks repetits i la pàgina `/success` poden coincidir sense duplicar files ni descomptar dues vegades.
6. Si la sessió caduca o el pagament asíncron falla, es recupera exactament una vegada l'estoc reservat.
7. Apps Script escriu la fila al full corresponent i envia el correu de confirmació. Si aquest pas falla, la compra continua registrada a Supabase i Stripe conserva el rebut.

La pantalla `/success` consulta Stripe al servidor i només mostra **Pagament confirmat** quan `payment_status` és `paid`. Això és la confirmació del cobrament del comprador; no depèn del pagament posterior que Stripe fa al compte bancari del club. La resposta pública conté només el resum necessari i el correu emmascarat.

### Alta de soci

L'alta no cobra en línia. `/api/socis` valida les dades, desa el registre a `soci_registrations` i l'envia al full de la Junta. El DNI i l'IBAN només circulen pel servidor i per les eines internes necessàries per preparar la domiciliació. La Junta activa l'alta quan el cobrament queda gestionat.

### Fonts de dades

- `content/matches.json`: calendari oficial del primer equip.
- `content/memberships.json`: presentació i modalitats base de socis.
- `content/events.json`: llavor per a esdeveniments antics; després Supabase és la font viva.
- Supabase: esdeveniments publicats, productes, inventari, compres i altes.
- `lib/squad.ts`: plantilla i estructura esportiva.

## Estructura principal

```text
app/                 Pàgines, panell d'administració i rutes API
components/          Seccions públiques, modals, botiga i components 3D
content/             Catàlegs versionats, inclòs el calendari
lib/                 Domini, validació i integracions de servidor
public/              Imatges optimitzades i recursos que sí pot servir el web
assets/web-sources/  Originals locals ignorats per Git, per regenerar imatges optimitzades
documents/           Fonts internes locals ignorades per Git, com el PDF federatiu
apps-script/Codi.gs  Integració amb Google Sheets i correus
supabase-schema.sql  Esquema inicial de la base de dades
```

## Posada en marxa local

### Requisits

- Node.js 18 o superior.
- Un projecte de Supabase.
- Un compte de Stripe si es vol provar el checkout.
- Un full de Google Sheets amb l'Apps Script desplegat si es volen provar registres i correus.

### Instal·lació

```bash
git clone https://github.com/Barru23/FC_JUNEDA_Web_Page.git
cd FC_JUNEDA_Web_Page
npm install
copy .env.example .env.local
npm run dev
```

La web estarà disponible a `http://localhost:3000`.

### Base de dades

Executa `supabase-schema.sql` a l'editor SQL del projecte de Supabase. L'esquema crea les taules següents:

- `events`
- `products`
- `membership_tiers`
- `purchases`
- `checkout_reservations`
- `soci_registrations`

També inclou les funcions transaccionals de reserva, confirmació i alliberament d'inventari i les polítiques de lectura pública previstes. L'aplicació, però, accedeix a les dades mitjançant les rutes del servidor i la clau de servei.

Després d'una actualització de `supabase-schema.sql`, executa'l **abans de desplegar el codi que utilitza les funcions noves**. L'script es pot tornar a executar (`IF NOT EXISTS`, `CREATE OR REPLACE` i llavors amb conflicte controlat).

### Google Apps Script

1. Obre el full mestre de la Junta i entra a **Extensions → Apps Script**.
2. Copia-hi `apps-script/Codi.gs`.
3. Substitueix el valor de `TOKEN` per un secret llarg i exclusiu.
4. Desplega l'script com a aplicació web, executada pel propietari i accessible per a qualsevol persona.
5. Desa la URL `/exec` a `APPS_SCRIPT_URL` i el mateix secret a `APPS_SCRIPT_TOKEN`.
6. Després de cada canvi a l'script, publica una versió nova del desplegament.

El token d'Apps Script ha de ser diferent de la contrasenya d'administració.
El contacte canònic dels textos legals, el peu i els correus és `junedaclubfutbol@gmail.com`. Si es modifica `apps-script/Codi.gs`, cal crear una versió nova del desplegament perquè el canvi arribi als correus reals.

## Variables d'entorn

| Variable | Ús |
|---|---|
| `STRIPE_SECRET_KEY` | Crear i consultar sessions de Stripe al servidor. |
| `STRIPE_WEBHOOK_SECRET` | Verificar la signatura dels webhooks. |
| `NEXT_PUBLIC_SUPABASE_URL` | URL del projecte de Supabase. |
| `SUPABASE_SERVICE_ROLE_KEY` | Accés de servidor a la base de dades; mai no s'ha d'exposar al navegador. |
| `APPS_SCRIPT_URL` | URL `/exec` del pont de Sheets i correus. |
| `APPS_SCRIPT_TOKEN` | Secret compartit amb `Codi.gs`. |
| `NEXT_PUBLIC_MASTER_SHEET_ID` | Activa l'enllaç al full mestre dins l'administració. |
| `ADMIN_PASSWORD` | Protegeix les rutes administratives actuals. |
| `NEXT_PUBLIC_SITE_URL` | URL pública usada pel retorn de Stripe; a Netlify pot derivar-se de `URL`, però es declara explícitament. |

Copia `.env.example` a `.env.local`, substitueix tots els valors de mostra i no versionis mai `.env.local` ni cap clau real.

## Ordres útils

```bash
npm run dev       # servidor de desenvolupament
npm run build     # build de producció
npm run start     # executar el build
npm run validate:calendar # validar les 30 jornades i els enfrontaments
npx tsc --noEmit  # comprovació de tipus
```

## Manteniment del calendari

Cada registre de `content/matches.json` conté:

```json
{
  "round": 1,
  "date": "2026-09-20",
  "time": "17:00",
  "opponent": "Avià",
  "venue": "away"
}
```

- `date` sempre ha d'estar en format ISO `YYYY-MM-DD`.
- `venue` només pot ser `home` o `away`.
- Les jornades han d'estar ordenades i no es poden repetir.
- Els canvis de la Federació s'han d'aplicar al fitxer i publicar amb un desplegament nou.
- El PDF original es conserva només en local a `documents/Calendario_26_27.pdf` com a font interna del calendari. La carpeta està ignorada per Git i no se serveix des del web perquè també conté dades de contacte dels clubs.

## Qualitat i desplegament

Abans de publicar:

```bash
npx tsc --noEmit
npm run validate:calendar
npm run build
```

Configura a Netlify les mateixes variables d'entorn, registra el webhook de producció de Stripe apuntant al domini de Netlify i confirma que Apps Script respon a la seva URL `/exec`. El procés complet de migració i la llista de comprovació són a [`MIGRACIO_NETLIFY.md`](./MIGRACIO_NETLIFY.md).

El webhook de Stripe ha d'escoltar aquests quatre esdeveniments:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.async_payment_failed`
- `checkout.session.expired`

### Revisió anual de conservació de dades

No hi ha cap esborrat automàtic, per evitar una eliminació irreversible per error. Un cop l'any, una persona de la Junta ha de:

1. Exportar una còpia protegida de les dades que calgui conservar i comprovar que es pot obrir.
2. Revisar `soci_registrations`, `purchases` i les pestanyes de Google Sheets d'acord amb el termini publicat a la política de privacitat i les obligacions comptables aplicables.
3. Eliminar les dades personals que ja no siguin necessàries tant de Supabase com dels fulls i de les còpies operatives; davant del dubte legal, no eliminar-les fins que el club ho hagi confirmat.
4. Registrar la data, la persona responsable, els conjunts revisats i el resultat, sense copiar DNI, IBAN ni altres dades personals al registre de manteniment.
5. Verificar des del panell que la temporada actual, els totals i les altes actives continuen correctes.

### Qualitat tècnica incorporada

- Capçalera CSP, protecció contra `iframe`, MIME sniffing, polítiques de referència i permisos restrictius.
- `robots.txt`, `sitemap.xml`, icona, canonical, Open Graph, Twitter Cards i dades estructurades del club.
- Modals amb focus inicial, bucle de teclat, tancament amb `Esc` i retorn del focus.
- Originals pesants fora de `public/` i càrrega diferida del camp 3D.
- El loader inicial amb l'escut forma part del disseny del club i es manté deliberadament.

Les limitacions de seguretat, operació i millores pendents estan documentades a [`PENDENTS.md`](./PENDENTS.md). Cal revisar-les abans d'obrir el panell d'administració a un ús ampli o gestionar dades reals a producció.

---

**Som-hi Rojos! Això és Juneda.**
