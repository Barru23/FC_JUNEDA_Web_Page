# Operació de producció

## Desplegament de les correccions de setembre de 2026

1. Aplicar `supabase/migrations/20260926_production_reliability.sql` després de l'esquema inicial. És additiva i es pot executar dues vegades. Crea la cua i deixa l'automatització desactivada.
2. Publicar `apps-script/Codi.gs` conservant el token configurat i la URL del desplegament. El GET ha de respondre `ok: true, protocol: 2`.
3. Publicar la web i les funcions de Netlify. `npm test`, `npm run validate:calendar` i `npm run build` han de passar amb Node 22 o superior.
4. Verificar el webhook de Stripe, que ha d'apuntar a `https://cf-juneda.netlify.app/api/webhooks/stripe`. Cal que estigui activat i que el secret de signatura del mateix endpoint coincideixi amb `STRIPE_WEBHOOK_SECRET` a Netlify. Un lliurament real ha de respondre **200**. Un 500 és un error de processament que s'ha de corregir.
5. Amb les versions publicades i comprovades, activar `maintenance_state.enabled` de la fila `reconcile`. Comprovar les funcions `reconcile` (cada quinze minuts) i `notifications` (cada cinc minuts, fins a quatre tasques per execució) al panell de Netlify.
6. Afegir un monitor HTTP a `/api/health/reconciliation`, conservant el monitor existent de `/api/events`. Un 503 indica conciliació desactivada, fallida o sense èxit en 35 minuts, o bé una sincronització de més de 30 minuts o pendent de revisió.

Els secrets es configuren a Netlify amb abast **Functions** (o tots els àmbits), no a `netlify.toml`. `RATE_LIMIT_SECRET` és opcional; si falta, els identificadors es deriven amb HMAC de la clau de servei. No es desen IP en clar. `SITE_ID`, proporcionat per Netlify en execució, habilita la lectura de la capçalera d'IP de la plataforma.

## Regles de funcionament

- Les places venudes són la suma de quantitats de compres pagades. Les reserves temporals es mostren per separat. `closed` tanca les inscripcions encara que quedin places i no es reobre quan caduca una reserva.
- Un esdeveniment nou es crea tancat. S'obre expressament des del panell. Els canvis d'aforament preserven les places ocupades i rebutgen reduccions incompatibles amb les reserves.
- El cobrament en efectiu de tiquets reserva inventari i registra la compra en una sola transacció. Un reintent del mateix formulari no crea una segona compra.
- La conciliació consulta totes les reserves pendents per torns, començant per les menys revisades. Només allibera sessions caducades i no pagades. Els pagaments asíncrons pendents conserven la reserva.
- Les comissions i el mitjà de pagament provenen del cobrament real de Stripe. El panell econòmic usa moviments de saldo paginats, en cèntims, amb dates de Catalunya. Inclou proves i devolucions del període; exclou transferències al banc.
- `amount_eur` és l'import base i `fee_eur` la gestió cobrada al comprador. Cap dels dos és el net real després de Stripe. Un reemborsament no torna a posar places a la venda automàticament; cal revisar l'inventari abans d'una nova obertura.
- Les altes de soci continuen per domiciliació bancària. No són cobraments Stripe. Només s'accepten modalitats actives amb preu vàlid; hi ha límits persistents de peticions, mida màxima i camp parany. Aquestes proteccions redueixen l'abús, però no verifiquen la identitat d'una persona.
- El panell utilitza sessions aleatòries de vuit hores, revocables en tancar sessió. Canviar `ADMIN_PASSWORD` invalida les anteriors. No es desa la contrasenya al navegador.

## Sincronització i incidències

Les altes i compres generen una tasca en la mateixa transacció de base de dades. La funció de notificacions reintenta els errors amb espera creixent; després de vuit intents demana revisió. El panell mostra el nombre de tasques pendents i en revisió. La compra continua registrada encara que Google falli.

Cada fila del full té un identificador en la columna oculta `__cfjuneda_id`; els reintents actualitzen la mateixa fila. No s'ha d'esborrar aquesta columna. La incorporació de files anteriors comprova nom i correu: davant de coincidències ambigües, s'atura per revisar i no fusiona persones silenciosament.

Apps Script registra l'intent d'enviament abans de contactar amb MailApp. Si el resultat del correu és incert, no el reenvia automàticament. Cal revisar `notification_jobs.last_error` i les propietats `mail:<sourceId>` de l'Apps Script. No esborrar-les per forçar reenviaments sense comprovar el correu enviat.

Per reintentar una sincronització resolta, deixar la tasca concreta en `pending`, `attempts = 0`, `next_attempt_at = now()` i `lease_until = null`. Mantenir l'identificador de la tasca i el registre. No modificar imports ni marcar pagaments Stripe manualment.

Per aturar l'automatització, posar `maintenance_state.enabled = false`. Les noves altes continuaran desant-se a Supabase i quedaran a la cua fins a reactivar-la. El monitor retornarà 503 mentre estigui aturada.

## Proves

Les proves automatitzades utilitzen PostgreSQL en memòria i peticions simulades; no creen compres ni socis en producció. No s'han de configurar secrets reals en CI. Per provar manualment fluxos complets, utilitzar un altre projecte Supabase, Stripe en mode test i un full de proves. Les funcions programades de Netlify només s'executen automàticament en desplegaments publicats; una previsualització pot compartir credencials si no es configuren per entorn.
