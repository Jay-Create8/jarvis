# JARVIS 5.9 – Alles zusammen für max. 5 Fr. im Monat: ehrlicher Prüfbericht

Sicherung der Vorversion: `jarvis-v5.8-backup/` · Live: https://jay-create8.github.io/jarvis/
**Kategorien:** ✅ ECHT GETESTET · 🟡 NUR SIMULIERT · ⚪ IMPLEMENTIERT, ABER UNGETESTET

## Wichtig vorweg
Weiterhin **kein echter Gemini-, Anthropic- oder Twilio-Zugang** in dieser Umgebung: KI-Antworten, Telefon und Audio sind in den
Tests nachgestellt (🟡). Echt geprüft: der Aufbau jeder Anfrage, die ganze Logik in App und Server, das Bündeln des Servers für
Cloudflare und das neue Fenster im Browser. Die Laptop-Fernsteuerung vom Handy aus wird nicht mehr eingerichtet (dein Wunsch).

## Was neu ist
| Teil | Was | Kategorie |
|---|---|---|
| Server denkt gratis | Mit Gemini-Key: Wächter (mit Google-Suche), Telefon-Gespräche (mit Dritten und mit dir), Routinen – ohne Claude, 0 Fr. | ✅ Logik · 🟡 KI |
| 🧠 Profi-Modus | Alltägliches → Gemini Flash-Lite (gratis). Grosse Aufgaben (App/Spiel/3D bauen, Analyse, Vergleich, lange Texte) → Claude Sonnet im Kostendeckel (ab 60 % verbraucht: Haiku), ohne Claude-Key → Gemini Flash (gratis). Gemini kann auch selbst „zu komplex“ melden, dann übernimmt das stärkere Modell mitten in der Aufgabe | ✅ Ablauf · 🟡 KI |
| 💰 Kostendeckel 5 Fr. | Ein Deckel für alles, was kostet: Claude-Anteil + Telefon-Anteil (Standard 3.50 Fr.) – gerechnet 1 $ = 1 Fr. (vorsichtig). Wird er mitten in einer Aufgabe erreicht, macht Gemini gratis weiter | ✅ |
| 📞 Telefon im Budget | Echte Twilio-Preise Schweiz (Festnetz ~0.04 $/Min., Handy ~0.18–0.25 $/Min., gerundet nach oben), echte Gesprächsminuten werden gezählt, Nummernpreis eingerechnet. Der Server lehnt jeden Anruf ab, der das Telefon-Budget sprengen könnte – auch bei „Keine Limits“ | ✅ Logik · 🟡 Twilio |
| 🔁 Routinen | „Jeden Werktag um 7:00 …“ – per Sprache anlegen. Mit Server laufen sie auch bei ausgeschaltetem Handy (Push), sonst in der App; nie doppelt | ✅ |
| 🏢 Agenten-Büro | Alle Helfer live an ihren Schreibtischen: JARVIS, Sprecher, Wächter, Routinen, Missionen, Briefing, Telefonist, Server-Wache – mit Status, Aufgabe, Fortschritt | ✅ |
| Störung am Telefon | Fällt die KI aus (z.B. Gratis-Kontingent leer): höflicher deutscher Abschied statt englischer Twilio-Fehlermeldung, Meldung in der App | ✅ Logik |
| Einrichtung | Assistent fragt den Gemini-Key (gratis), Telefon optional mit ehrlichen Preisen, keine PC-Fernsteuerung mehr | ✅ Syntax · ⚪ echter Lauf |

## Kosten (max. 5 Fr. im Monat)
| Posten | pro Monat |
|---|---|
| Gemini: Denken, Stimme, Wächter, Routinen, Telefon-Gespräche | **0 Fr.** (Gratis-Kontingent, im Google-Projekt keine Abrechnung aktivieren) |
| Briefing, Push (ntfy), Telegram-Anruf, Cloudflare-Server | **0 Fr.** |
| Claude für grosse Aufgaben (nur mit Anthropic-Key) | Rest des Deckels: 5 − Telefon-Anteil (Standard 1.50 Fr., ohne Telefon 5 Fr.) |
| Telefon über Twilio (nur wenn eingerichtet) | max. 3.50 Fr. inkl. Nummer (einstellbar) |
| **Total** | **max. 5 Fr.** |

**Was 3.50 Fr. Telefon-Anteil ungefähr bedeuten:** Nummer 1.15 $ (US-Nummer; eine Schweizer Handynummer kostet bei Twilio 11.70 $
und passt nicht ins Budget) + ca. 14 Anrufe à 3 Min. bei Restaurants/Praxen (Festnetz) **oder** ca. 4 Anrufe à 2 Min. auf dein
Handy. Twilio arbeitet mit Guthaben, das du vorher auflädst. Eine US-Nummer erscheint beim Angerufenen als +1 – manche nehmen
das nicht ab. Preise laut Twilio (Aug./Okt. 2026), bitte vor dem Kauf selbst prüfen.
**Nicht im Budget:** eine eigene geklonte ElevenLabs-Stimme (Abo ca. 6 $) – stattdessen die Gratis-Stimmen aus 5.8.

## Tests
| Test | Ergebnis |
|---|---|
| Gemini-Übersetzer (Node) | **9/9** |
| Server (31 Tests, +6 neue für Gemini, Routinen, Telefon-Geld, Störung) | **31/31** |
| 5.9 im Browser (Profi P1–P5, Routinen R1–R2, Agenten-Büro A1, Telefon T1) | **9/9** |
| 5.8 im Browser (Gemini, Stimmen, Lader) | **20/20** |
| Alte Regression (39) | **35/39 am Stück**, danach alle einzeln geklärt: ① **Schnell-Modus – echter Fehler gefunden:** Wer ohne Kostendeckel Claude Opus eingestellt hatte, wurde vom Profi-Modus auf Sonnet heruntergestuft → behoben, Test ✅. ② Ein Knopf: Test erwartete eingeschaltete Laptop-Fernsteuerung (abbestellt) → angepasst ✅. ③ Wissensordner: feste Wartezeit von 3.5 s nach Neuladen zu knapp → wartet jetzt auf das Ergebnis ✅ (Wissen bleibt erhalten). ④ Kontext-Vorrat: der echte Wetterdienst Open-Meteo antwortete hier mit HTTP 429 („zu viele Anfragen“, geteilte IP) – extern; dass JARVIS 429 ehrlich behandelt, prüft ein eigener Test ✅ |
| Cloudflare-Bündel des Servers mit Gemini (Probelauf, ohne Hochladen) | ✅ 1 MB |

## Was ungetestet bleibt
Echte KI-Antworten (wie gut Flash-Lite im Alltag und Sonnet bei grossen Aufgaben sind), echte Telefonate (Twilio, Sprach-
erkennung Schweizerdeutsch), dein echtes Gemini-Gratiskontingent (Server und App teilen sich den Key), Einrichtungs-Assistent mit
echtem Cloudflare-Konto, echtes Android-Gerät. Smartwatch-Werte im Briefing sind nicht gebaut (bräuchten eigenen Android-Code).

## 5.9.1 – Kamera nur bei Bedarf
Vorher lief die Kamera bei eingeschalteter Handsteuerung **dauernd** (mit kleinem Vorschaubild). Jetzt:
| Situation | Kamera |
|---|---|
| Kein 3D-Modell offen | **aus** |
| 3D-Modell/-Szene offen und Handsteuerung erlaubt | an |
| 1 Minute keine Hand vor der Kamera | **aus** (startet beim selben Modell nicht gleich wieder) |
| „Handsteuerung an“ / „aus“ (JARVIS-Werkzeug `handsteuerung`) | an (max. 10 Min.) / sofort aus |
| „Was siehst du?“ (Foto) | nur für ca. 1 Sekunde, wie bisher |

| Test | Ergebnis |
|---|---|
| Neuer Test K1 (Leerlauf aus → 3D an → nach 67 s ohne Hand aus → bleibt aus → an/aus auf Zuruf) | ✅ |
| Handsteuerung mit echtem Handvideo, 3D-Modell, Kamera-Befehle | ✅ 3/3 |

## 5.9.2 – JARVIS-Stimme direkt auf dem Gerät (ohne Konto, ohne Karte, ohne Limit)
Problem: Die Gemini-Stimme war nach ca. 10 Nachrichten pro Tag aufgebraucht; Azure verlangt ein Konto mit Kreditkarte.
Lösung: Eine **Sprachsynthese, die auf dem Handy selbst läuft** (Piper, deutsche Stimme „Thorsten“; Datensatz von Thorsten Müller, CC0).
Einmal laden (Stimme ~63 MB + Sprach-Engine ~29 MB, im WLAN automatisch), danach **kostenlos und unbegrenzt**, kein Konto, kein Key.
Reihenfolge „Automatisch“: ElevenLabs → Azure → **JARVIS-Stimme** → Gemini-Stimme → Gerätestimme. Auswahl: Thorsten, Thorsten HD,
Karlsson (männlich), Kerstin, Ramona (weiblich).

| Test (echt, im Browser, echter Download) | Ergebnis |
|---|---|
| Laden der Stimme | 63 MB Stimme + Engine, startklar nach ~25 s (schnelle Leitung) |
| Tempo (dieser Rechner) | „Sehr wohl.“ in 0.24 s, ein 2.6-s-Satz in 0.86 s (3× schneller als Echtzeit); auf dem Handy grob 2–4× langsamer – ⚪ ungetestet |
| **Verständlichkeit:** unabhängige Spracherkennung (Vosk, deutsch) hört die erzeugten Sätze ab | **29 von 31 Wörtern** richtig („sonnig“ → „zornig“, „warm“ → „waren“) |
| In der App: Antworten werden mit der JARVIS-Stimme gesprochen, keine Gemini-Stimmen-Anfragen mehr | ✅ (Test S1) |
| Alle anderen Stimmen (Gemini, Azure, ElevenLabs, Vergleichen) | ✅ 5/5 |
| 5.9-Tests gesamt | **11/11** |
Ungetestet: Klang und Tempo auf deinem echten Handy.

## 5.9.3 – PC-Agent ohne Admin-Rechte + Google überlastet
**Problem 1:** Am Laptop ohne Admin-Rechte liess sich der PC-Agent nicht einrichten (Node.js installieren braucht Admin).
**Lösung:** In der App unter Einstellungen → PC-AGENT gibt es jetzt **„📥 PC-Agent herunterladen“** (ZIP, 12 KB). Entpacken,
Doppelklick auf `PC-Agent-starten.cmd` (Mac/Linux: `.command`). Der Starter
- nimmt ein vorhandenes Node.js 20–24, sonst lädt er **Node.js v24 portabel** in den Ordner (nichts wird installiert);
- der Agent nimmt den **Browser, der schon auf dem PC ist** (Windows: Edge, sonst Chrome) mit eigenem Profil – kein 150-MB-Download.
  Nur wenn keiner da ist, lädt er einmalig Chromium in den Benutzerordner (ebenfalls ohne Admin);
- macht nach einem abgebrochenen Download beim nächsten Doppelklick einfach weiter.
Gleiches für den Einrichtungs-Assistenten (`JARVIS-einrichten.cmd`), er nutzt das portable Node.js des PC-Agents mit.

**Problem 2:** Google meldete „This model is currently experiencing high demand“ – JARVIS zeigte die englische Rohmeldung.
**Lösung:** JARVIS wartet kurz (3 s, 6 s), weicht dann **automatisch aufs andere Gemini-Modell** aus (Flash-Lite ↔ Flash) und sagt
das kurz. Sind alle überlastet: deutsche Meldung „Google ist gerade überlastet …“ statt Englisch.

**Dabei gefundene und behobene Fehler**
| Fehler | Behebung |
|---|---|
| Mit dem neusten Node.js **v26** hing das Entpacken des Ersatz-Browsers (Download fertig, dann 10 Minuten nichts) – mit v24 in 29 s fertig | Starter nehmen fest **Node.js v24** (LTS bis 2028); Agent warnt bei neuerem Node.js, Abbruch nach 20 Min. statt ewig hängen |
| Ordner mit **Leerzeichen** (z.B. `C:\Users\Vorname Nachname\…`): Browserprofil landete unter falschem Pfad (`%20`, `/C:/…`) | Pfad wird jetzt korrekt umgewandelt |
| Abgebrochener Browser-Download → Agent startete nie mehr (Starter prüfte nur, ob `node_modules` da ist) | Agent prüft selbst und lädt fehlende Teile nach |
| Das neue npm blockiert Installations-Skripte | geprüft: Server-Bündel für Cloudflare entsteht trotzdem korrekt (1127 KB) |

| Test (echt, auf Linux, ohne vorinstalliertes Node.js im Pfad, ohne Admin) | Ergebnis |
|---|---|
| ZIP entpacken → `PC-Agent-starten.command`: Node.js v24 portabel laden, einrichten, Chromium laden, Token anzeigen | ✅ in 35 s (schnelle Leitung) |
| Zweiter Start: nichts wird nochmal geladen, vorhandenes Chrome wird genommen | ✅ |
| Abgebrochener Browser-Download → nächster Start räumt auf und lädt neu | ✅ |
| PC-Agent-Sicherheitsprüfung (Cookie-Banner, iframe-Formular, Absenden gesperrt, falscher Code gesperrt) mit vorhandenem Chrome **und** mit nachgeladenem Chromium | ✅ 9/9 + 9/9 |
| Einrichtungs-Assistent startet mit portablem Node.js bis zur Cloudflare-Anmeldung (dort gestoppt, kein Konto hier) | ✅ |
| App: Werkzeug ohne PC-Agent sagt JARVIS, wie man ihn ohne Admin holt; Download-Knopf liefert das echte ZIP (A2) | ✅ |
| App: Google überlastet → Ausweichen aufs andere Modell, sonst deutsche Meldung (O1) | ✅ |

| Gesamte Testreihe nach dem Umbau | Gemini-Übersetzer **9/9** · Server **31/31** · 5.9 im Browser **13/13** · 5.8 im Browser **20/20** · alte Regression **38/39** – der eine rote Test fragt das echte Wetter bei Open-Meteo ab, das hier wieder „HTTP 429 – zu viele Anfragen“ (geteilte IP) lieferte; extern, wie bei 5.9 |

**Ungetestet (⚪):** Die Windows-Dateien (`.cmd`, PowerShell) konnten hier nicht laufen – es gibt in dieser Umgebung kein Windows.
Sie machen dasselbe wie der getestete Mac/Linux-Starter. Auf Schul-/Firmen-Laptops kann die IT Programme aus dem Download-Ordner,
PowerShell oder die Fernsteuerung von Edge sperren – dann erscheint eine Meldung, lösen kann das nur die IT.
