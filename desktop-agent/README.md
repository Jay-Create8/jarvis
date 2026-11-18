# JARVIS PC-Agent – Websites bedienen

Lässt JARVIS echte Websites in einem eigenen Browserfenster bedienen: suchen, lesen, klicken, Formulare ausfüllen,
Reservierungen und Bestellungen **vorbereiten**.

## Start – ohne Admin-Rechte, ohne Installation
1. ZIP **entpacken** (Rechtsklick → „Alle extrahieren“), nicht direkt im ZIP doppelklicken.
2. **Windows:** Doppelklick auf `PC-Agent-starten.cmd`
   **Mac:** Rechtsklick auf `PC-Agent-starten.command` → Öffnen (nur beim ersten Mal) · **Linux:** `./PC-Agent-starten.command`
3. Beim ersten Start (ca. 1–2 Minuten):
   - Ist kein Node.js installiert, lädt das Skript es als **portable Version** in diesen Ordner (ca. 30 MB, nichts wird installiert).
   - Als Browser nimmt der Agent das **Edge bzw. Chrome, das schon auf dem PC ist** (mit eigenem, getrenntem Profil – dein normaler
     Browser bleibt unberührt). Nur wenn keins da ist, lädt er einmalig Chromium (ca. 150 MB) in deinen Benutzerordner.
   - Wird ein Download unterbrochen: einfach nochmal doppelklicken, er macht weiter.
4. Das angezeigte **Token** in JARVIS → Einstellungen → „PC-Agent“ eintragen → VERBINDEN. Das schwarze Fenster offen lassen.

JARVIS muss dafür am **selben PC** in Chrome/Edge offen sein (Verbindung nur über 127.0.0.1).
Chrome fragt evtl. einmal nach der Erlaubnis für „Geräte im lokalen Netzwerk“ – zulassen.
**Schul-/Firmen-Laptops:** Manche IT sperrt Programme aus dem Download-Ordner oder die Fernsteuerung von Edge. Dann erscheint eine
Meldung – das lässt sich nur mit der IT lösen.

Von Hand (wer Node.js hat): `npm install` und `npm start`. Eigener Browser: `JARVIS_BROWSER=msedge|chrome|chromium|<Pfad>`.

## Sicherheit
- Nur lokal erreichbar (127.0.0.1) und nur mit Token.
- **Verbindliche Aktionen** (kaufen, bestellen, buchen, bezahlen, absenden, löschen …) werden blockiert, bis **du**
  in JARVIS bestätigst. Der Bestätigungscode geht nur an den Dialog, nie an die KI.
- Eigenes Browserprofil im Agent-Ordner (`profil-msedge/`, `profil-chrome/` bzw. `profil/`) – einmal eingeloggte Seiten (z.B. Lieferdienst) bleiben eingeloggt.

## Grenzen
- Captchas, Zwei-Faktor-Codes und Zahlungsfreigaben musst du selbst erledigen.
- Websites ändern sich; JARVIS liest die Seite jedes Mal neu und meldet, wenn etwas nicht klappt.

## Neu in 5.1
- **iframes:** Reservierungs- und Buchungs-Widgets stecken oft in eingebetteten Rahmen fremder Anbieter. Der Agent liest sichtbare iframes mit
  (Element-IDs `f1e1`, `f1e2` …, Feld `rahmen` = Anbieter).
- **Cookie-Banner & Widgets im Shadow DOM** werden gelesen (Text erscheint als „[Überlagerung/Dialog]“), damit JARVIS sie schliessen kann.
- **Neuladen nach Klick** (z.B. nach Cookie-Zustimmung) wird abgewartet statt als Fehler gemeldet; `öffnen` wartet bis zu 5 s aufs vollständige Laden.
- **Klickbare Nicht-Links:** Knöpfe, die nur per JavaScript funktionieren (z.B. `<a>` ohne Ziel, `div` mit Zeiger), werden erkannt.
- **Strengere Sperre:** Auf Buchungs-/Kassen-/Reservierungsseiten (auch im iframe) braucht **jedes Absenden** einen Bestätigungscode –
  egal wie der Knopf heisst („Weiter“, „OK“) und auch Enter in einem Formularfeld. Vorher hätte Enter im Namensfeld ein Formular
  ohne Rückfrage abschicken können.
- **Sauberes Beenden:** Strg+C / SIGTERM schliesst Browser und Prozess (vorher lief der alte Prozess weiter).
- Test: `node tests/agent-reservierung-test.mjs` (lokale Test-Reservierung mit Cookie-Banner und iframe, 9 Prüfungen, gibt nichts frei).

## Neu in 5.2: Fernmodus (vom Handy aus)
Mit `JARVIS_SERVER` und `JARVIS_AGENT_SERVER_TOKEN` gestartet, holt sich der Agent Aufträge bei deinem JARVIS-Server ab
(siehe `server/ANLEITUNG-SERVER.md`). Lokal (WebSocket) und fern laufen über denselben Weg – strikt nacheinander und mit
derselben Bestätigungssperre.

## Neu in 5.4
- Meldet bei einer Sperre auch den eingebetteten Anbieter (`rahmen`), damit JARVIS Buchung (z.B. Reservierungs-Widget) von Zahlung unterscheiden kann.
  Ob JARVIS danach selbst freigibt, entscheidet die Freiheitsstufe in der App – **Zahlungen fragen immer**.
- Liest auch iframes ohne Knöpfe (z.B. „Reservierung eingegangen“).

## Neu in 5.9.3: ohne Admin-Rechte
- Doppelklick-Starter für Windows (`PC-Agent-starten.cmd`) und Mac/Linux (`PC-Agent-starten.command`), Node.js portabel.
- Nutzt Edge/Chrome vom PC statt 150 MB Download; fehlt beides, lädt er Chromium selbst nach (auch nach einem abgebrochenen Download).
- Behoben: Ordner mit Leerzeichen im Namen (z.B. „C:\Users\Vorname Nachname\…“) – das Browserprofil landete vorher unter einem falschen Pfad.
