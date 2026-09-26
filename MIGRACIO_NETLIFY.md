# Migració de Vercel a Netlify

## Per què

El pla gratuït de Vercel és **només per a ús personal i no comercial**, i Vercel
defineix com a ús comercial «qualsevol mètode de sol·licitar o processar
pagaments dels visitants del web». Amb `/api/checkout` i Stripe Checkout en
marxa, la web del club hi entra de ple. Quedar-se al pla Hobby no implica una
factura sorpresa: implica que Vercel pot **suspendre el desplegament** i
demanar-nos pujar a Pro (20 $/mes), possiblement el mateix dia que estiguem
venent samarretes.

Netlify permet ús comercial al pla gratuït de manera explícita. L'única cosa
que prohibeix és revendre l'allotjament.

**Supabase no s'ha de tocar.** El seu pla gratuït no restringeix l'ús
comercial, només té límits de volum, i en som lluny.

## Què canvia al codi

Pràcticament res. Els canvis ja estan fets en aquest commit:

| Fitxer | Canvi |
|---|---|
| `netlify.toml` | Nou. Build, versió de Node, runtime de Next.js i exclusions de l'escaneig de secrets. |
| `lib/site-url.ts` | Afegit el fallback a les variables `URL` i `DEPLOY_PRIME_URL` de Netlify. |
| `.env.example` | La secció `# SITE` ja no parla de Vercel. |
| `README.md` | Stack i secció de desplegament actualitzats. |

El `next.config.mjs` **no s'ha tocat**: el runtime de Netlify respecta la CSP i
la resta de capçaleres de seguretat tal com estan.

---

## Passos

### 1. Crear el projecte a Netlify

1. Compte a [netlify.com](https://netlify.com) amb el correu del club, no amb
   un de personal. Aquest compte ha de sobreviure als canvis de Junta.
2. **Add new site → Import an existing project → GitHub**, i tria el
   repositori `FC_JUNEDA_Web_Page`.
3. Netlify detectarà Next.js tot sol. El `netlify.toml` ja fixa la comanda de
   build i el directori publicat, així que no cal tocar res d'aquesta pantalla.
4. **Encara no facis el desplegament.** Primer, les variables.

### 2. Variables d'entorn

A **Site configuration → Environment variables**, afegeix-les totes amb els
valors reals de producció (els que ara tens a Vercel i a `.env.local`):

| Variable | Valor | Nota |
|---|---|---|
| `STRIPE_SECRET_KEY` | El mateix que a Vercel | Marca-la com a *secret* |
| `STRIPE_WEBHOOK_SECRET` | **Valor nou** | Surt al pas 5, deixa-la buida de moment |
| `NEXT_PUBLIC_SUPABASE_URL` | El mateix que a Vercel | |
| `SUPABASE_SERVICE_ROLE_KEY` | El mateix que a Vercel | Marca-la com a *secret* |
| `APPS_SCRIPT_URL` | El mateix que a Vercel | |
| `APPS_SCRIPT_TOKEN` | El mateix que a Vercel | Marca-la com a *secret* |
| `NEXT_PUBLIC_MASTER_SHEET_ID` | El mateix que a Vercel | Opcional |
| `ADMIN_PASSWORD` | El mateix que a Vercel | Marca-la com a *secret* |
| `NEXT_PUBLIC_SITE_URL` | La URL nova de Netlify | Pas 3 |

> Si el build falla amb un error d'escaneig de secrets en una variable que no
> és a la llista `SECRETS_SCAN_OMIT_KEYS` del `netlify.toml`, **no ampliïs la
> llista sense mirar-ho**: vol dir que una clau de servidor ha acabat dins del
> paquet del navegador, i això és un problema real, no un fals positiu.

### 3. Primer desplegament

1. Llança el desplegament i mira que el build acabi verd.
2. Netlify assigna una URL tipus `https://random-name-123.netlify.app`.
   Canvia-la a **Site configuration → Change site name** per una de decent,
   en el nostre cas `cf-juneda`.
3. Ara posa aquesta URL definitiva a `NEXT_PUBLIC_SITE_URL` i **torna a
   desplegar** (les variables `NEXT_PUBLIC_*` s'incrusten durant el build; si
   no redesplegues, es queda amb el valor vell).
4. Comprova a ull: portada, calendari, plantilla amb el camp 3D, botiga i
   esdeveniments. Entra a `/admin` amb la contrasenya.

### 4. Fer el projecte public

Des del juliol de 2026, Netlify crea els projectes nous del pla gratuit com a
**privats per defecte**: tota peticio sense sessio de Netlify rep un 401 amb una
redireccio al login, i el bloqueig s'aplica a l'edge, abans d'arribar al codi.
Aixo afecta *totes* les rutes, incloses les d'API.

Stripe no es pot autenticar a Netlify. Amb el projecte privat, el webhook rebria
un 401 en el 100% dels intents: el cobrament es faria, pero no es registraria a
Supabase ni s'enviaria cap correu. **Per tant aixo va abans de la prova, no
despres.**

A **Project configuration -> General -> Visitor access -> Project visibility**,
posa-ho a public. Comprova-ho des de fora amb:

```bash
curl -s -o /dev/null -w '%{http_code}' https://cf-juneda.netlify.app/
```

Ha de tornar `200`. Si torna `401`, encara es privat.

### 5. Webhook de Stripe

Aquest és **el pas que trenca coses si te'l saltes**: sense ell els pagaments
es cobrarien però no quedarien registrats a Supabase ni enviarien cap correu.

No esborris el webhook de Vercel encara. Stripe admet diverses destinacions
alhora, i la taula `purchases` té `stripe_session_id` amb restricció `UNIQUE`,
de manera que si tots dos processen el mateix esdeveniment no es pot duplicar
cap compra. Durant la transició, doncs:

1. Al panell de Stripe: **Developers → Webhooks → Add endpoint**.
2. URL: `https://cf-juneda.netlify.app/api/webhooks/stripe`
3. Selecciona exactament aquests quatre esdeveniments:
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
   - `checkout.session.async_payment_failed`
   - `checkout.session.expired`
4. Copia el **signing secret** nou (`whsec_...`) a `STRIPE_WEBHOOK_SECRET` a
   Netlify.
5. **Redesplega** (Deploys -> Trigger deploy). A Netlify els canvis de
   variables no arriben a les funcions fins al desplegament seguent, i fer el
   projecte public no compta com a build. Saltar-se aixo dona `400 Signatura
   no valida` a tots els intents.
6. Verifica-ho amb **Send test webhook** des de la pagina del endpoint, que
   envia un esdeveniment signat de veritat sense tocar diners ni estoc:

   | Resposta | Significat |
   |---|---|
   | `400` amb `Signatura no valida` | Secret erroni o redesplegament pendent |
   | `500` | Error de processament; no donar el webhook per verificat |
   | `200` | Correcte |

   Una signatura acceptada no prova que s'hagi registrat la compra. Cal
   comprovar un lliurament real amb resposta 200 i la compra corresponent a
   Supabase. Reenviar una compra ja confirmada no ha de duplicar registres,
   correus ni descomptar més places. Les proves noves s'han de fer amb Stripe
   en mode test, una base de dades i un full separats de producció.

### 6. Proves abans d'obrir les vendes

Utilitza Stripe en mode test amb Supabase i un full de proves separats:

1. Crea un esdeveniment i paga amb una targeta de prova de Stripe.
2. Verifica que `/success` diu **Pagament confirmat**.
3. Verifica que la fila apareix a `purchases` a Supabase.
4. Verifica que arriba el correu de confirmació.
5. Verifica que la fila apareix al full de la Junta.
6. Verifica que l'estoc ha baixat d'una unitat.
7. Simula devolucions, sessions caducades i webhooks repetits. Comprova que no hi ha duplicats i que un esdeveniment tancat continua tancat.

Si falta la compra, revisa el webhook i la conciliació. Si només falta la fila
o el correu, revisa la cua de notificacions i l'Apps Script. Vegeu `PRODUCCIO.md`.

### 7. Domini

Si algun dia compreu domini propi (`cfjuneda.cat` o similar), es configura a
**Domain management** i llavors cal actualitzar `NEXT_PUBLIC_SITE_URL`, la URL
del webhook de Stripe i tornar a desplegar. Mentrestant, el subdomini
`.netlify.app` és gratuït i funciona perfectament.

### 8. Tancar Vercel (només quan tot l'anterior funcioni)

Deixa passar uns dies amb les vendes reals funcionant a Netlify. Després:

1. Esborra el webhook antic de Vercel al panell de Stripe.
2. Esborra el projecte a Vercel, o com a mínim desactiva'n els desplegaments
   automàtics, perquè ningú no hi arribi per error.
3. Opcional: treure el fallback de Vercel de `lib/site-url.ts`, que queda
   documentat amb un comentari.

---

## Marxa enrere

Mentre el projecte de Vercel segueixi viu, tornar-hi és immediat: reactiva el
webhook antic a Stripe i torna a apuntar-hi el domini. Per això el pas 8 va
l'últim i no el primer.

## Límits del pla gratuït a vigilar

| Servei | Límit gratuït | On som |
|---|---|---|
| Netlify — amplada de banda | 100 GB/mes | Molt lluny |
| Netlify — minuts de build | 300/mes | Vigila si es despleguen moltes vegades el mateix dia |
| Netlify — funcions | 125.000 invocacions/mes | Molt lluny |
| Supabase — base de dades | 500 MB | Molt lluny |
| Supabase — fitxers | 1 GB | **A vigilar**: les imatges pujades des d'`/admin` hi van |
| Supabase — inactivitat | Es pausa a la setmana | Amb visites regulars no passa |

El punt de la pausa de Supabase és el que més convé tenir present fora de
temporada: una base de dades pausada vol dir checkout trencat.

## Costos que segueixen existint

Les comissions de Stripe (aproximadament 1,5% + 0,25 € per targeta europea)
són inevitables a qualsevol plataforma, però surten de cada venda i no són cap
factura mensual.
