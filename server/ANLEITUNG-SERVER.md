# JARVIS-Server – echte Telefonanrufe & Wächter bei geschlossener App

Der Server ist **optional**. Ohne ihn funktioniert JARVIS weiter (Push über ntfy, Telegram-Anruf über CallMeBot).
Er kostet **nichts, bis du Twilio-Zugangsdaten einträgst**.

## Was er kann
| Funktion | Wie |
|---|---|
| Echter Telefonanruf auf dein Handy | Twilio ruft dich an, JARVIS spricht mit dir (Spracherkennung de-CH) und versteht deine Anweisungen |
| Aufgaben nach dem Anruf fortsetzen | Was du am Telefon sagst, landet im Posteingang → die JARVIS-App übernimmt es beim nächsten Öffnen |
| Wächter bei geschlossener App | Cloudflare prüft deine Wächter-Regeln alle 15 Minuten mit Claude + Websuche |

## Kosten (Stand Nov. 2026, bitte vor dem Aktivieren selbst prüfen)
| Posten | Preis |
|---|---|
| Cloudflare Workers + Cron + KV | **gratis** im Free-Tarif (100'000 Anfragen/Tag) |
| Twilio-Nummer (US-Nummer reicht, um Schweizer Handys anzurufen) | ca. **1.15 USD/Monat** |
| Anruf auf Schweizer Handy (Swisscom/Sunrise/Salt) | ca. **0.18 USD/Min** (teils bis 0.25), angefangene Minuten zählen voll |
| Claude im Anruf (Haiku 5.5) / Wächter (Opus 5.5) | wenige Rappen pro Anruf / Prüfung |
Beispiel: 10 kurze Anrufe à 2 Min/Monat ≈ 1.15 + 3.60 = **ca. 4.75 USD/Monat** plus Claude.
Quelle Anrufpreise: https://www.twilio.com/en-us/voice/pricing/ch

## Einrichtung (ca. 20 Minuten)
1. Konto bei **cloudflare.com** (gratis) und **twilio.com** (Testguthaben; für Anrufe auf beliebige Nummern Konto aufladen und deine Handynummer verifizieren).
2. Am PC im Ordner `server/`:
   ```
   npm install
   npx wrangler login
   npx wrangler kv namespace create JARVIS_KV      → ID in wrangler.toml eintragen
   npx wrangler secret put ANTHROPIC_API_KEY
   npx wrangler secret put JARVIS_TOKEN            → ein langes zufälliges Passwort
   npx wrangler secret put TWILIO_SID
   npx wrangler secret put TWILIO_TOKEN
   npx wrangler secret put TWILIO_FROM             → deine Twilio-Nummer, z.B. +1…
   npx wrangler secret put USER_PHONE              → deine Handynummer, z.B. +4179…
   npx wrangler secret put NTFY_TOPIC              → optional, gleiches Thema wie in der App
   npx wrangler deploy
   ```
3. Die angezeigte URL in `wrangler.toml` bei `PUBLIC_URL` eintragen und nochmal `npx wrangler deploy`.
4. In JARVIS → Einstellungen → „JARVIS-Server“: URL + Token eintragen → **SERVER PRÜFEN**.
5. Test: JARVIS sagen „Ruf mich an, um den Server zu testen“ (Anrufe erlauben muss aktiv sein).

## Sicherheit
- Die App-API verlangt dein Token; Twilio-Webhooks werden per Signatur (HMAC) geprüft, gefälschte Anfragen abgewiesen.
- Der Anthropic-Key liegt nur als Cloudflare-Secret auf dem Server.

## Prüfstand
`npm test` führt 8 Logiktests aus (Twilio/Anthropic/ntfy simuliert): alle bestanden.
**Nicht** geprüft: ein echter Anruf mit echtem Twilio-Konto und ein echter Cloudflare-Cron-Lauf – dafür braucht es deine Konten.

## Neu in 5.2
### Laptop vom Handy aus steuern (Fernmodus)
1. Zusätzliches Geheimnis setzen: `npx wrangler secret put AGENT_TOKEN` (lange Zufallszeichenfolge, **anders** als JARVIS_TOKEN).
2. Am Laptop den PC-Agent so starten (Windows: `set` statt `export`):
   ```
   export JARVIS_SERVER=https://jarvis-server.DEINNAME.workers.dev
   export JARVIS_AGENT_SERVER_TOKEN=<AGENT_TOKEN>
   npm start
   ```
   Der Agent fragt alle 2 Sekunden beim Server nach Aufträgen (nur ausgehend – am Laptop wird kein Port geöffnet).
3. In JARVIS → Einstellungen → „PC-Agent über Server (unterwegs)“ einschalten.

Sicherheit: Der Laptop kennt nur sein eigenes Token und kann keine Aufträge erteilen. Aufträge, die älter als 2 Minuten sind,
werden verworfen statt verspätet ausgeführt. Kaufen/Buchen/Absenden braucht weiterhin deine Freigabe in der App.
Hinweis: Cloudflare KV ist „eventuell konsistent“ – zwischen weit entfernten Rechenzentren kann ein Auftrag einige Sekunden
(selten bis ~60 s) verzögert ankommen.

### Briefings als Push, auch bei geschlossener App
In JARVIS die Briefing-Zeiten eintragen. Die App schickt Zeiten, Termine der nächsten Tage und den ungefähren Standort
(2 Nachkommastellen, nur wenn Standort erlaubt) an deinen Server. Der Server sendet das Briefing zur Zeit als ntfy-Push
(kostenlos, ohne KI aus Wetter und Terminen zusammengesetzt) und legt es in den Posteingang; die App liest es beim nächsten Öffnen vor.

## Neu in 5.3: JARVIS ruft für dich an (z.B. Restaurant, Coiffeur, Praxis)
Voraussetzung: Twilio wie oben eingerichtet (TWILIO_SID, TWILIO_TOKEN, TWILIO_FROM). `USER_PHONE` ist dafür nicht nötig.
In der App: Einstellungen → TELEFONIE → „JARVIS darf andere anrufen“ einschalten → Speichern (das überträgt die Regeln an den Server).

**Ablauf:** Du sagst z.B. „Reservier bei der Pizzeria Molino für Samstag 19 Uhr“. JARVIS sucht die Nummer, zeigt dir Nummer +
Auftrag + was er sagen darf → **du gibst frei** → der Server ruft an. JARVIS sagt im ersten Satz, dass er ein KI-Assistent in
deinem Auftrag ist (das erzwingt der Server, auch wenn das Modell es vergisst), führt das Gespräch (Twilio-Spracherkennung + Claude Haiku)
und legt auf. Das Ergebnis kommt in die App, JARVIS macht weiter (z.B. Kalendereintrag).

**Feste Regeln im Server (nicht abschaltbar durch die KI):**
- Nur wenn in der App eingeschaltet, nur nach Freigabe im Freigabe-Dialog.
- Nur 08:00–20:00 (Zeitzone der App), max. 5 Minuten pro Anruf, Tageslimit (Standard 5), dieselbe Nummer max. 2× pro Tag.
- Gesperrt: Notruf- und Kurznummern, Mehrwertnummern (0900 usw.), Satellit, alle Länder ausser CH, DE, AT, LI.
- Mailbox → sofort auflegen, nichts hinterlassen. Besetzt/keine Antwort → ehrliche Meldung.
- Zusagen nur im freigegebenen Rahmen. Kosten, Anzahlung, Kreditkarte, andere Zeiten → JARVIS sagt nichts zu und fragt dich.
- Keine Aufnahme; Twilio transkribiert nur die gesprochenen Sätze für das Gespräch.

**Kosten:** Twilio-Minutenpreis (CH-Festnetz/Mobil ca. 0,05–0,35 USD/Min, bitte bei Twilio prüfen) + Claude Haiku (Bruchteile eines Rappens).

**Rechtliches (kurz, keine Rechtsberatung):** Für eigene, einzelne Anliegen (Reservierung, Terminanfrage) ist ein KI-Anruf mit
sofortiger Offenlegung üblich. Nicht verwenden für Werbung, Massenanrufe oder Anrufe gegen den Willen des Gegenübers.

## Neu in 5.4: Freiheit am Telefon + Rückruf
Die App schickt pro Anruf einen **Spielraum** (z.B. „18:00–21:00 am selben Tag“) und deine **freien Zeiten** mit. Geht der
Wunsch nicht, sagt JARVIS selbst eine Alternative im Spielraum zu – nie mit Kosten, Anzahlung, Kreditkarte oder Vertrag.
Hat er so abweichend entschieden und ist in der App „Rückruf bei eigener Entscheidung“ + „Telefonanrufe erlauben“ an, **ruft der
Server dich danach an** („19 Uhr war voll, ich habe 19:30 genommen – passt das?“). Deine Antwort („lieber 18 Uhr“) kommt in die
App, und JARVIS ändert es selbst. Ohne Rückruf-Erlaubnis: Push (ntfy) + Knöpfe in der App. Stufe „Vorsichtig“: kein Spielraum.
Für den Rückruf an dich muss `USER_PHONE` gesetzt sein; Ruhezeiten und Anruflimits gelten wie immer.
Briefings vom Server sind jetzt kostenlos (ohne KI) und nennen die Uhrzeiten in deiner Ortszeit.
