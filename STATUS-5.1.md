# JARVIS 5.1 – Von der Demo zum echten Assistenten: ehrlicher Prüfbericht

Sicherung der Vorversion: `jarvis-v5.0-backup/` · Schwerpunkt: **Zuverlässigkeit**, keine neue Hauptversion.
**Kategorien:** ✅ ECHT GETESTET · 🟡 NUR SIMULIERT · ⚪ IMPLEMENTIERT, ABER UNGETESTET · ❌ NICHT FUNKTIONSFÄHIG

## Grundsatz
In dieser Entwicklungsumgebung gibt es **keinen API-Key für die App, kein Android-Gerät, kein Mikrofon und kein Twilio-Konto**.
Deshalb ist **keine einzige KI-Entscheidung, Spracherkennung oder Telefonie in diesem Bericht echt**. Getestet wurde alles, was ohne
diese Dinge echt prüfbar ist. Für den Rest gibt es jetzt den **Selbsttest 5.1**, der auf deinem Gerät mit deinem Key läuft
und einen Bericht mit Screenshots und Ablauf-Protokoll erzeugt.

---

## 1. Was funktioniert nachweislich?
| Bereich | Nachweis | Kategorie |
|---|---|---|
| App-Regression | 17 automatische Browser-Tests (Globus, 3D-Modell, Route, Buchungsvorbereitung, Dateien, Analyse, Wächter, Viertaktmotor, Qualitätsprüfung, PC-Agent, Persönlichkeit, Mission, PIN, Kosten, Isolation, Selbsttest-Mechanik, Sprachkette) | ✅ Ablauf · 🟡 KI-Antworten nachgestellt |
| Server-Logik | 9/9 (Wächter per Cron, Anrufregeln, ohne Twilio keine Kosten) | ✅ Logik · 🟡 Twilio/Anthropic nachgestellt |
| API-Key mit PIN | Key liegt nur verschlüsselt im Speicher (AES-GCM, PBKDF2 250 000 Runden), nie im Klartext, PIN-Abfrage nach Neustart, falsche PIN abgelehnt, entschlüsselter Key wird verwendet | ✅ echte Kryptografie im Browser |
| Kostenstopp | Verbrauch wird aus den Token-Zahlen gezählt; ist das Budget erreicht, **verlässt keine Anfrage das Gerät** | ✅ |
| Isolation | KI-generierte 3D-Szenen/Apps können weder den Key noch den Speicher der App lesen | ✅ |
| Prompt-Caching | Systemprompt ist jetzt zwischen Nachrichten identisch (vorher wechselte er jede Nachricht → Cache ungültig → bis ~10× teurere Eingabe) | ✅ an echten Anfrage-Daten geprüft |
| Anfragen an Anthropic | 26 Werkzeuge, 0 Schemafehler; die echte API erlaubt Browser-Zugriff (CORS: alle von der App gesendeten Kopfzeilen erlaubt, auch bei Fehlerantworten) | ✅ an der echten API geprüft |
| Anmeldung | SDK 1.3.0 sendet den Key als `Authorization: Bearer`. Die echte API beantwortet einen **ungültigen** Key so und per `x-api-key` gleich („invalid x-api-key“) → wird als API-Key gelesen | ✅ mit ungültigem Key · ⚪ mit gültigem Key |
| PC-Agent auf echter Website | Restaurant-Recherche auf lunchgate.ch, siehe Abschnitt Praxistest | ✅ Agent echt · 🟡 Entscheidungen traf ich statt der App-KI |
| PC-Agent Sperre | Lokale Test-Reservierung (Cookie-Banner im Shadow DOM, Formular im iframe): Banner gesehen und abgelehnt, Name/Personen eintragen frei; Enter im Feld → gesperrt; „Weiter“ → gesperrt; falscher Code → gesperrt; nichts abgeschickt (9/9) | ✅ |
| Android-Gerüst | Kompiliert (Debug-APK 907 KB), Lint 0 Fehler, 4 Fehler behoben | ✅ kompiliert · ⚪ nie auf einem Gerät gelaufen |

## 2. Was funktioniert nur mit zusätzlichen Einrichtungen?
| Funktion | Was du brauchst | Wie prüfen |
|---|---|---|
| Echte KI (alles Denken, Visualisieren, Handeln) | Anthropic API-Key (+ Ausgabenlimit in der Console) | Selbsttest 5.1 |
| Spracheingabe | Chrome auf Android/PC, Mikrofon-Erlaubnis | Selbsttest V (du sprichst einen Satz) |
| Echte Anrufe + Gespräch | JARVIS-Server (Cloudflare) + Twilio-Konto + Nummer | Selbsttest T (fragt vorher um Freigabe, kostet wenige Rappen) |
| Push-Nachrichten | ntfy-App + Thema | Wächter-Test |
| Websites bedienen (Restaurant, Shops) | PC-Agent am Laptop (Node.js + Playwright) | Selbsttest R |
| Fremde Android-Apps bedienen | Begleit-App: Gegenstück in JARVIS fehlt noch, nie auf Gerät getestet | – |

## 3. Welche Funktionen bleiben ungetestet?
- **Jede echte KI-Entscheidung**, also auch: 5 neue Themen aus 5 Fachgebieten, Aufgaben ohne Stichwort, Selbstverbesserung mit echter Bewertung.
  Die *Mechanik* (Ziehen der Themen, Gutachter mit 2 Screenshots, Lektion → Gedächtnis → Prompt, Ablauf-Protokoll) ist geprüft, aber 🟡 mit nachgestellter KI.
- **Echte Spracherkennung**: Nur die Verdrahtung ist geprüft (nachgestelltes Mikrofon: erkannter Text → KI-Anfrage → Werkzeug → Fenster). 🟡
- **Echter Telefonanruf**, Verstehen gesprochener Antworten, Fortsetzen der Aufgabe danach. ⚪ (Kein Twilio-Konto; simulierte Anrufe zählen nicht.)
- **Android-Gerät**: Begleit-App, Leistung, Akku, Gesten. ⚪
- **Gültiger API-Key** mit der Bearer-Anmeldung des SDK. ⚪ (sehr wahrscheinlich ok, siehe oben, aber nicht bewiesen)
- **Chrome-Abfrage „Lokales Netzwerk“** für PC-Agent/Begleit-App. ⚪

## 4. Welche konkreten Schritte sind noch nötig?
1. **Du:** In der Anthropic Console ein Ausgabenlimit setzen, Key in JARVIS eintragen, „API-Key mit PIN schützen“ einschalten.
2. **Du:** Einstellungen → **SELBSTTEST 5.1** starten (10–20 Min, grob 2–6 USD). Bericht herunterladen und mir schicken → erst dann wissen wir, wie gut die echte KI visualisiert.
3. **Optional:** PC-Agent starten, Haken bei R setzen → Restaurant-Probe. Bei der Freigabe-Frage **ablehnen**.
4. **Optional:** Server + Twilio einrichten (`server/ANLEITUNG-SERVER.md`), Haken bei T → echter Testanruf.
5. **Entwicklung:** Gegenstück-Werkzeug „handy“ in der App für die Begleit-App, Texteingabe/Scrollen in der Begleit-App, App-Symbol, dann Test auf einem echten Handy.
6. **Entwicklung:** Was der Gutachter im Selbsttest als „fehlende Funktion“ meldet, gezielt nachbauen.

---

## Kette „Sprache → KI → Werkzeug → Darstellung → Prüfung“
| Glied | Wie es jetzt nachgewiesen wird |
|---|---|
| Sprache | Selbsttest V: echtes Mikrofon, im Bericht steht wörtlich, was erkannt wurde |
| KI-Entscheidung | Ablauf-Protokoll pro Test: jedes Werkzeug mit Eingabe, Erfolg/Fehler und Dauer, auch Websuche |
| Werkzeug | Ergebnis kommt aus der echten Ausführung (Fehler werden rot protokolliert, nicht geschönt) |
| Darstellung | Fenster-Liste, FPS, Bildschirmfläche, zwei Screenshots 1,4 s auseinander (zeigt, ob sich etwas bewegt) |
| Prüfung | 3D-Qualitätsbericht + unabhängiger KI-Gutachter (Sonnet 5.5): Optik, Korrektheit, Bewegung, Bedienbarkeit, Verständlichkeit je 1–5 ★ |
| Lernen | Gutachter-Lektionen landen sichtbar im Gedächtnis (max. 6, ohne Duplikate, löschbar) und wirken ab der nächsten Frage |

## Selbsttest 5.1 (in der App)
| Test | Inhalt |
|---|---|
| V | Echte Sprachkette (optional) |
| A1–A5 | Je ein zufälliges Thema aus Biologie/Medizin, Astronomie/Geo, Technik/Mechanik, Physik/Chemie, Informatik/Alltag – 30 Themen im Topf, keins vorbereitet, keine Bibliotheksmodelle |
| B1–B3 | 3 von 4 Alltagsaufgaben ohne Werkzeug-Stichwort (Lernplan, Download-Chaos, E-Bike vs. Auto, Zug nicht verpassen). Bewertet wird, ob JARVIS selbst ein passendes Werkzeug wählt |
| C | Ernstfall: kein Humor bei Trauer |
| R | Restaurant-Reservierung vorbereiten über PC-Agent (optional) |
| T | Echter Testanruf + Gesprächsergebnis aus dem Posteingang (optional, nur nach Freigabe) |

## Praxistest Restaurant (echt durchgeführt, Schritt für Schritt)
Ausführung über den **echten PC-Agent** und echte Websites. Die Entscheidungen (was anklicken) habe **ich** getroffen, nicht die App-KI.
| # | Schritt | Ergebnis |
|---|---|---|
| 1 | lunchgate.ch mit geratener Such-Adresse öffnen | Fehlerseite 404 – ehrlich gemeldet |
| 2 | Kategorie „Italienisch“ anklicken | Agent: „Element ist verdeckt – Seite neu gelesen“. Ursache (später im Screenshot gefunden): **Cookie-Banner im Shadow DOM**, für den Agent unsichtbar. **Behoben** – Banner wird jetzt gelesen und kann abgelehnt werden (an lunchgate.ch echt geprüft) |
| 3 | Suchformular „Zürich“ + „italienisch“ | Netzwerk dieser Testumgebung blockte das Absenden („upstream request failed“) – Umgebung, nicht JARVIS |
| 4 | Adresse `/restaurants/8001-zuerich/italienisch` | Seite zeigte ein Restaurant in **Olten** → Filter der Seite unzuverlässig; Adressen müssen geprüft werden |
| 5 | `/restaurants/zuerich/italienisch` | 115 italienische Restaurants in Zürich ✓ |
| 6 | 3 Profile gelesen und verglichen (Samstag 19 Uhr) | Ristorante Italia (Kreis 4): 4.7 ★ aus 1024 Bewertungen, Sa 18–23:30 · Molino Limmatquai: 4.6 ★ / 277, Sa 11–24 · Gandria (Seefeld): 4.8 ★ / 144, Sa 18:30–24 → Empfehlung Italia (sehr viele Bewertungen) |
| 7 | „Tisch reservieren“ suchen | **Lücke gefunden:** Knopf ist ein `<a>` ohne Ziel (JavaScript) → Agent sah ihn nicht. **Behoben** |
| 8 | „Tisch reservieren“ anklicken | 🔒 **Sperre:** Bestätigungscode nötig. Ich habe ihn nicht selbst eingelöst – die Freigabe gehört dir. Ende des echten Tests. |
| 9 | Cookies ablehnen auf lunchgate.ch | Klick wirkt, Seite lädt neu → Agent meldete fälschlich „Fehler“. **Behoben** (liest nach Neuladen automatisch erneut) |
| 10 | Formular im iframe (lokale Testseite) | Lücke „iframes unsichtbar“ behoben; Felder ausfüllen frei, Absenden gesperrt (9/9) |

Erkenntnis: Die Sperre greift schon beim *Öffnen* des Reservierungsformulars. Das ist übervorsichtig (JARVIS fragt einmal mehr),
aber sicher. So gelassen.

## Sicherheits- und Kostenprüfung
| Prüfpunkt | Befund | Massnahme |
|---|---|---|
| Speicherung API-Key | Bisher Klartext im Browser-Speicher | Optional verschlüsselt mit PIN; nach Entsperren nur im Arbeitsspeicher |
| Restrisiko Key | Im Browser nutzbar = bei einer Sicherheitslücke der Seite auslesbar | Ausgabenlimit in der Console setzen; generierte Inhalte laufen isoliert (geprüft) |
| Kosten | Kein Limit; Systemprompt zerstörte den Cache jede Nachricht | Monatsbudget mit hartem Stopp, Zähler in den Einstellungen; Cache-Fehler behoben |
| Selbsttest mit PIN | Startete nicht („Zuerst API-Key eintragen“) | behoben, fragt nach PIN |
| Freigaben App | Eigener Dialog, Protokoll, Schutz vor Doppelausführung (2 Min) | unverändert, im Selbsttest pro Test protokolliert |
| Freigaben PC-Agent | **Lücke:** Enter im Formularfeld oder neutraler Knopf („Weiter“) auf Buchungsseiten ging ohne Rückfrage durch | Jedes Absenden auf Buchungs-/Kassen-/Reservierungsseiten (auch im iframe) braucht den Einmal-Code |
| PC-Agent Prozess | Liess sich nicht beenden, alter Code lief weiter | Sauberes Beenden bei Strg+C/SIGTERM |
| Anrufe | Ruhezeiten, Tageslimit, Budget im Server erzwungen | unverändert (Server-Tests 9/9) |
| Weitere Tokens | Server-, PC-Agent-Token und ntfy-Thema liegen unverschlüsselt im Browser | Hinweis: ntfy-Thema wie ein Passwort wählen (wer es kennt, liest mit) |
| Berechtigungen | Mikrofon, Benachrichtigungen, Ordnerzugriff nur auf gewählte Ordner, lokales Netz (PC-Agent) | werden einzeln vom Browser abgefragt |

## Fehler, die 5.1 gefunden und behoben hat
1. Systemprompt änderte sich jede Nachricht → Prompt-Cache wirkungslos (Kosten).
2. Selbsttest startete mit PIN-Schutz nicht.
3. PC-Agent: Enter/neutraler Knopf konnte auf Buchungsseiten ohne Rückfrage absenden.
4. PC-Agent: Knöpfe ohne Link-Ziel, Formulare in iframes und Cookie-Banner im Shadow DOM unsichtbar; Banner erschienen erst nach dem ersten Lesen.
5b. PC-Agent: Neuladen nach einem Klick wurde als Fehler gemeldet, obwohl der Klick wirkte.
5. PC-Agent: ignorierte SIGTERM.
6. Android: Bau-Fehler (JVM-Ziel), fehlende INTERNET-Berechtigung, fehlende Paket-Sichtbarkeit, Token nie angezeigt.

**JARVIS 5.1 ist zuverlässiger und ehrlicher messbar – ob die echte KI gut visualisiert, zeigt erst dein Selbsttest.**
