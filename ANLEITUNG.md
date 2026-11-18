# J.A.R.V.I.S. 5.9.4 🤖

> **5.9.4: Mehr Assistent.** ① **Dateien am Laptop:** Mit dem neuen PC-Agent darf JARVIS in deinem ganzen Benutzerordner arbeiten –
> Downloads, Desktop, Dokumente, OneDrive, alle Unterordner: aufräumen/sortieren, suchen („wo ist meine Bewerbung?“), Word/PowerPoint
> lesen und zusammenfassen, Dateien öffnen. Alles umkehrbar („mach das rückgängig“); Löschen und Programme starten fragen immer.
> ② **Robotertests:** JARVIS sucht über die Google-Suche der KI (ohne Robotertest) und öffnet dann die Website direkt. Kommt doch einer,
> bittet er dich, ihn kurz anzuklicken – lösen darf ihn nur ein Mensch. ③ **Steckbrief „Über dich“:** Adresse, Schule/Arbeit, Geburtstag,
> wichtige Personen, Vorlieben, Allergien – JARVIS merkt sich das selbst, wenn du es erwähnst, oder fragt dich (Einstellungen →
> „🤝 Kennenlernen“). Der Gemini-Key ist nur sein Gehirn, er ist **nicht** mit deinem Google-Konto verbunden. ④ Der PC-Agent-Token
> bleibt gleich – nur einmal eintragen, danach verbindet sich JARVIS selbst. **Update des PC-Agents:** in der App neu herunterladen,
> ins selbe Verzeichnis entpacken (Dateien ersetzen), neu starten, Token einmal eintragen.

> **5.9.3:** **PC-Agent ohne Admin-Rechte:** In der App unter Einstellungen → PC-AGENT auf „📥 PC-Agent herunterladen“ tippen, ZIP entpacken,
> Doppelklick auf `PC-Agent-starten.cmd`. Node.js kommt als portable Version mit, als Browser nimmt er das Edge/Chrome, das schon auf dem PC ist.
> Ausserdem: Ist Google gerade **überlastet** („high demand“), wartet JARVIS kurz und weicht automatisch aufs andere Gemini-Modell aus.

> **5.9.2:** Neue **JARVIS-Stimme direkt auf dem Handy** – ohne Konto, ohne Kreditkarte, ohne Limit, gratis. Einmal ca. 90 MB laden (im WLAN automatisch, sonst Einstellungen → STIMME → „🎙️ JARVIS-STIMME LADEN“), danach spricht JARVIS damit jede Antwort.

> **5.9.1:** Die Kamera läuft nicht mehr dauernd. Sie geht nur an, wenn ein 3D-Modell offen ist (und Handsteuerung erlaubt ist) oder du „Handsteuerung an“ sagst – nach 1 Minute ohne Hand wieder aus. Fotos („Was siehst du?“) öffnen sie nur kurz.

> **Neu in 5.9: alles zusammen für max. 5 Fr. im Monat.**
> 1. **🧠 Profi-Modus:** Alltägliches denkt Gemini gratis. Grosse Aufgaben (App/Spiel/3D bauen, Analysen, Vergleiche, lange Texte)
>    übernimmt ein stärkeres Modell: Claude Sonnet im Kostendeckel (wenn du einen Anthropic-Key hast), sonst Gemini Flash gratis.
> 2. **💰 Kostendeckel:** Einstellungen → SCHNELLSTART → „Deckel gesamt“ (Standard 5 Fr.) und „davon Telefon“ (3.50 Fr.).
>    Alles, was Geld kostet (Claude + Telefon), bleibt darunter – auch mitten in einer Aufgabe.
> 3. **🔁 Routinen:** Sag z.B. „Jeden Werktag um 7 Uhr: Wetter, Termine und Börse“. Mit Server laufen sie auch bei ausgeschaltetem
>    Handy und kommen als Push.
> 4. **🏢 Agenten-Büro:** „Zeig mir meine Agenten“ – alle Helfer live an ihren Schreibtischen.
> 5. **Server gratis:** Wächter, Routinen und Telefon-Gespräche denken auf dem Server mit Gemini (Assistent fragt den Key).
> 6. **📞 Telefon (optional, Twilio):** echte Preise, echte Minuten, harter Deckel. Laptop-Fernsteuerung wird nicht mehr eingerichtet.
> Prüfbericht: **STATUS-5.9.md**

## Version 5.8

> **Neu in 5.8: gratis denken, gratis sprechen.**
> 1. **🆓 Gratis-Gehirn (Gemini):** https://aistudio.google.com/apikey → „API-Schlüssel erstellen“ → kopieren → in JARVIS
>    Einstellungen → **📋 KEY EINFÜGEN**. JARVIS erkennt den Key, prüft ihn bei Google und denkt ab sofort gratis.
>    Im Google-Projekt **keine Abrechnung aktivieren** – dann kann es nichts kosten. Tageskontingent leer → ehrliche Meldung,
>    um ca. 9 Uhr geht's weiter (Claude nur, wenn du „Bei Gemini-Limit Claude nutzen“ einschaltest).
> 2. **🗣 Gratis-Stimmen:** Automatisch die beste, die gerade gratis geht: ElevenLabs (Gratis-Plan, wie bei Moritz Maaker) →
>    Azure (500'000 Zeichen gratis) → **Gemini-Stimme** (gleicher Key, KI-Butler-Stimme „Charon“) → Gerätestimme.
>    JARVIS bleibt immer im Gratis-Rahmen. Einstellungen → STIMME → **🔊 STIMMEN VERGLEICHEN** zum Anhören.
> 3. **Start-Lader:** JARVIS lädt in kleinen Häppchen; bricht das Netz ab, geht es dort weiter. Zum Starten nur noch 111 KB,
>    3D und Fenster kommen danach. Updates laden nur, was sich geändert hat.
> 4. **Wichtige Korrektur:** Drei Werkzeugnamen mit Umlauten hätten mit Claude jede Anfrage scheitern lassen – behoben.
> Prüfbericht: **STATUS-5.8.md**

## Version 5.7.2

> **5.7.2:** Für langsames Netz: Nach dem ersten Laden startet JARVIS in ca. 3 s direkt vom Handy (auch offline), statt jedes Mal über das Netz zu laden. Beim ersten Mal zeigt er, dass er lädt.

> **5.7.1:** Wichtige Korrektur – JARVIS hätte bei neuen Anthropic-Konten nach der ersten Gedächtnis-/Einstellungsänderung jede weitere Nachricht mit einem Fehler abgebrochen. Jetzt bleibt das Gespräch gültig, lange Chats bleiben günstig (Details: STATUS-5.7.md, Abschnitt 5.7.1).

> **Neu in 5.7: echte App + max. 2 Fr. im Monat.**
> - **App:** Einstellungen → SCHNELLSTART → **📲 ALS APP INSTALLIEREN** (Chrome macht daraus eine echte App) – oder die
>   **APK** laden: https://jay-create8.github.io/jarvis/JARVIS.apk (Details: `android/jarvis-app/README.md`).
> - **💰 Sparmodus (Standard an):** Haiku statt Opus (40× günstiger), max. 2 Websuchen pro Frage, harter Deckel
>   App 1.60 USD + Server 0.40 USD = **2 USD ≈ 1.70–1.80 Fr. im Monat**. Reicht für ca. 600–800 Antworten. Echte Telefonate
>   über Twilio sind darin aus (kosten extra) – stattdessen Alarm-Push (ntfy) und Telegram-Anruf (CallMeBot), beide gratis.
>   Ausschalten = volle Qualität mit Opus (dann gilt dein eigenes Budget).
> - Server bleibt im **Cloudflare-Gratis-Kontingent** (vorher hätte der Fernmodus es ~40× überschritten).
> Prüfbericht: **STATUS-5.7.md**

## Version 5.6

> **Neu in 5.6: Ein Knopf für alles.** Einstellungen → ganz oben **SCHNELLSTART**:
> 1. Anthropic-Key auf console.anthropic.com kopieren → **📋 KEY EINFÜGEN** (der einzige Schlüssel, den du brauchst).
> 2. **🚀 ALLES FREISCHALTEN** → bei jeder Abfrage „Zulassen“ tippen. Fragt Benachrichtigungen, Mikrofon + Kamera, Standort,
>    dauerhaften Speicher ab und stellt maximale Freiheit ein: Freie Hand, **Keine Limits** (keine Ruhezeiten, kein Tages- oder
>    Kostenlimit), Anrufe an dich und andere erlaubt, „Hey Jarvis“ an. Alles einzeln wieder abschaltbar.
> Bleibt aus Sicherheitsgründen: Notbremse gegen Endlosschleifen (30 Anrufe bei dir / 50 bei anderen in 24 h, dieselbe Nummer max. 6×),
> Anrufe bei anderen nur 07–22 Uhr, keine Notruf-/Mehrwertnummern, KI gibt sich am Telefon zu erkennen, Zahlungen und Löschen fragen.
> Live: **https://jay-create8.github.io/jarvis/** · Prüfbericht: **STATUS-5.6.md**

## Version 5.5

> **Einrichten:** siehe **EINRICHTEN.md** – der Einrichtungs-Assistent (Ordner `einrichten`) lädt Server und App in dein
> Cloudflare-Konto und verbindet dein Handy per QR-Code. Prüfbericht: **STATUS-5.5.md**.

## Version 5.4

> **Neu in 5.4: Freiheit & Mitdenken.** Einstellungen → FREIHEIT & MITDENKEN:
> - **Vorsichtig:** fragt vor jeder verbindlichen Aktion (wie bisher).
> - **Mitdenken (Standard):** Was du ihm aufträgst (reservieren, Termin, anrufen, anmelden), erledigt er ohne erneute Rückfrage –
>   geht dein Wunsch nicht, nimmt er selbst eine passende Alternative (passend zu deinem Kalender) und **meldet sich danach**:
>   per Anruf (wenn „Telefonanrufe erlauben“ + Server), sonst Push + Knöpfe „👍 Passt so / ↻ Alternative / ✏️ Anders“.
>   Sagst du „nein, lieber 18 Uhr“, ändert er es selbst.
> - **Freie Hand:** darf auch von sich aus buchen, reservieren, anrufen.
> - **Immer mit Rückfrage:** Zahlungen und Löschen (bei „Mitdenken“ auch Nachrichten an andere).
> - Mitdenken überall: sinnvolle Annahmen statt Rückfragen, Terminkonflikte erkennen und lösen, freie Zeiten finden,
>   Folgeschritte (Kalender, Erinnerung) selbst erledigen, keine unnötigen Kosten.
> - Unter „WAS JARVIS ENTSCHIEDEN HAT“ siehst du jede eigene Entscheidung.
> - **Briefings kosten nichts mehr:** ohne KI aus deinen Daten zusammengestellt, mit der Gerätestimme vorgelesen.

## Version 5.3

> **Neu in 5.3: JARVIS ruft für dich an.** „Reservier bei der Pizzeria Molino für Samstag 19 Uhr“ → JARVIS sucht die Nummer,
> du gibst den Anruf frei, JARVIS telefoniert als erkennbarer KI-Assistent, das Ergebnis erscheint live im Fenster TELEFONAT und
> JARVIS macht weiter. Braucht JARVIS-Server + Twilio. Regeln und Einrichtung: `server/ANLEITUNG-SERVER.md`, Abschnitt 5.3.
> Ohne Server öffnet JARVIS wie bisher die Telefon-App mit der Nummer – anrufen tust dann du.

## Version 5.2

> **Neu in 5.2 – nach Analyse der Videos von Moritz Maaker:** Schnell-Modus (sofortige Antwort, starkes Modell dahinter),
> Laptop vom Handy aus steuern (über deinen Server), Kontext-Vorrat, lernende Autokorrektur der Spracherkennung,
> automatische Morgen-/Abend-Briefings (mit Server auch als Push), Wissensordner („zweites Gehirn“), Handsteuerung per Kamera,
> warmes Farbthema, optional ElevenLabs-Stimme und Deepgram-Gehör. Prüfbericht: **STATUS-5.2.md**.
>
> ### ✋ Handsteuerung
> Einstellungen → „Handsteuerung (Kamera)“. Unten rechts erscheint ein kleines Kamerabild. Gesten (für das 3D-Fenster im Fokus):
> **Daumen + Zeigefinger zusammen und ziehen** = drehen · **beide Hände greifen und auseinander** = zoomen ·
> **offene Hand ~1 s halten** = zerlegen · **Faust ~1 s halten** = zusammensetzen. Die Erkennung läuft komplett auf dem Gerät.
>
> ### 📚 Wissensordner
> Einstellungen → WISSENSORDNER → DATEIEN oder ORDNER (am PC). Markdown/Text/CSV/JSON/HTML. JARVIS sucht darin automatisch,
> wenn deine Frage dazu passt, und nennt die Datei. Bleibt auf dem Gerät.
>
> ### 🗣 Profi-Stimme / genaueres Hören (optional, kostenpflichtig beim Anbieter)
> ElevenLabs: Key + Voice-ID eintragen (Modell „Flash v2.5“, niedrige Latenz). Deepgram: Key eintragen (Modell Nova-3).
> Fällt ein Dienst aus, nimmt JARVIS automatisch wieder die Gerätestimme bzw. Browser-Spracherkennung. Setz bei beiden
> Anbietern ein Ausgabenlimit.

## Version 5.1

> **Neu in 5.1 (Zuverlässigkeit statt neuer Features):** API-Key optional mit PIN verschlüsselt, Kostenzähler mit Monatsbudget-Stopp,
> günstigeres Prompt-Caching, Selbsttest 5.1 (5 Fachgebiete + KI-Gutachter, Aufgaben ohne Stichwort, echte Sprachkette, Restaurant-Probe,
> echter Testanruf, Ablauf-Protokoll, selbst gelernte Lektionen), PC-Agent liest iframes und sperrt jedes Absenden auf Buchungsseiten,
> Android-Gerüst kompiliert und 3 Fehler behoben. Ehrlicher Prüfbericht: **STATUS-5.1.md**.
>
> ### 🔐 API-Key mit PIN schützen (empfohlen)
> Einstellungen → Key eintragen → „API-Key mit PIN schützen“ einschalten → PIN (mind. 6 Zeichen) → Speichern. Der Key liegt dann nur
> verschlüsselt im Gerät (AES-GCM, PIN über PBKDF2), nach jedem Neustart fragt JARVIS einmal nach der PIN. PIN vergessen = Key neu eintragen.
>
> ### 💸 Kostenkontrolle
> Einstellungen → „Max. API-Kosten pro Monat (USD, geschätzt)“ (Standard 20). JARVIS schätzt die Kosten jeder Anfrage aus den echten Token-Zahlen der API. Ist das Budget
> erreicht, verlässt keine Anfrage mehr das Gerät. Die Schätzung ersetzt nicht die Abrechnung in der Anthropic Console – setze dort
> zusätzlich ein Ausgabenlimit.

## Version 5.0

> **Neu in 5.0:** Live-Visualisierung echter Arbeit nach dem Vorbild des Referenzvideos: Agenten-Orb folgt der Arbeit, 3D-Dateisortierung
> (jede Datei fliegt erst nach geprüfter Verschiebung, `auto_sortieren`, Rückgängig), Recherche- und Browser-Live-Fenster, Weltkugel mit
> Datenkarten, Freigabe-Zentrale, bessere 3D-Qualitätsprüfung, Android-Gerüst. Prüfbericht + Video-Vergleich: **STATUS-5.0.md**.
> Dateisortierung am PC: JARVIS in Chrome/Edge öffnen und sagen „Räum meinen Download-Ordner auf“.


> **Neu in 4.1:** Persönlichkeit mit trockenem Humor (Regler in den Einstellungen), Stimme mit Tonfärbung, Missionen (mehrstufige Aufgaben mit Fortschritt, Fortsetzen nach Neustart), erweitertes 3D-SDK (sweep, organic, Kräfte, Moleküle, Weltraum), Anrufregeln (Ruhezeiten, Tageslimit, Budget), robusterer PC-Agent. Prüfbericht: **STATUS-4.1.md**.


> **Neu in 4.0:** JARVIS Visual SDK (hochwertige, technisch korrekte 3D-Szenen), Modellbibliothek mit kinematisch korrektem Viertaktmotor,
> Visual-Planer (entscheidet selbst, wann visualisiert wird), Qualitätsprüfung mit Screenshot-Selbstkontrolle, bildschirmfüllende 3D-Ansicht auf dem Handy,
> eingebauter Selbsttest mit echter KI, optionaler Server für **echte Telefonanrufe** und **Wächter bei geschlossener App**, PC-Agent zum **Bedienen von Websites**.
> Was nachweislich funktioniert und was noch fehlt: **STATUS-4.0.md**. Server: **server/ANLEITUNG-SERVER.md**. PC-Agent: **desktop-agent/README.md**.
>
> **Als Erstes nach dem Update:** Einstellungen → **SELBSTTEST STARTEN** (echte KI, ca. 3–6 Min., ca. 0.5–2 USD), Bericht herunterladen.


## 1. Online stellen (gratis, 5 Minuten)
JARVIS braucht HTTPS (sonst gehen Mikrofon, Kamera und GPS nicht).
1. Auf github.com einloggen → **New repository** → Name z.B. `jarvis`, **Public**.
2. **Add file → Upload files** → alle Dateien aus diesem Ordner reinziehen → Commit.
3. **Settings → Pages** → Source: `Deploy from a branch`, Branch `main`, Ordner `/ (root)` → Save.
4. Nach ca. 1 Minute läuft er unter `https://DEIN-NAME.github.io/jarvis/`

## 2. Aufs Handy installieren
1. Link in **Chrome** auf Android öffnen.
2. Menü ⋮ → **Zum Startbildschirm hinzufügen / App installieren**.
3. JARVIS starten → Zahnrad → **API-Key** eintragen (von console.anthropic.com → API Keys).
4. **Berechtigungen erteilen** drücken (Mikro, Kamera, Standort, Benachrichtigungen).

Neue Dateien im ZIP: Ordner `js/`, `lib/`, `assets/`, `vendor/`, `tests/`, `server/`, `desktop-agent/`. Für GitHub Pages reichen alle Dateien ausser `server/` und `desktop-agent/` (schaden aber nicht).

Optional als echte APK: die GitHub-Pages-URL bei **pwabuilder.com** eingeben → *Package for stores* → Android → APK runterladen.

## 🧠 Holo-Interface (NEU): JARVIS zeigt selbstständig
JARVIS öffnet von sich aus passende Fenster, ohne dass du fragen musst:
- 🌍 **3D-Weltkugel** bei Geografie und Reisen (Marker, Flugbögen, Kamerafahrten)
- 🗺 **Live-Karte** mit echter Route und Fahrzeit (OpenStreetMap + OSRM)
- ⚙️ **3D-Modelle** bei Technik und Wissenschaft, die er aus Bauteilen baut (drehen, zoomen, Explosionsansicht, Röntgenblick)
- ✨ **Eigene 3D-Animationen** (Three.js) für alles, was keine Vorlage hat
- 📊 **Animierte Diagramme und Dashboards** bei Analysen
- ✅ **Live-Operationsanzeige**: zeigt echt, welche Werkzeuge gerade laufen, fertig sind oder Fehler haben
- 🏨 **Optionen und Buchungsvorbereitung**: deine Auswahl geht direkt an JARVIS zurück
- 📅 **Kalender**: neue und geänderte Termine leuchten auf
- 📁 **Dateien sortieren** (am PC in Chrome/Edge): Jede Datei fliegt erst in ihren Ordner, wenn das Verschieben wirklich geklappt hat und geprüft ist

**Sprache + Gesten:** Während JARVIS spricht, hebt er genau im passenden Satz Teile hervor, dreht oder zoomt.
**Handy:** Fenster erscheinen als Holo-Bühne mit Tabs. **PC:** Der Chat rückt nach links, die Fenster ordnen sich automatisch an, lassen sich verschieben und in der Grösse ändern, und mit ⧉ werden sie zu echten eigenständigen Fenstern.

## 📣 Proaktiv und Kontakt
- **Wächter:** „Sag mir, wenn es morgen regnet“. JARVIS prüft das selbstständig in Abständen und meldet sich (solange JARVIS offen ist).
- **Push aufs Handy, auch wenn JARVIS zu ist:** App **ntfy** installieren und das Thema aus den Einstellungen abonnieren. Mit „Test-Push senden“ prüfen.
- **Echter Anruf bei wichtigen Problemen:** In Telegram einmal @CallMeBot_txtbot starten und Anrufe erlauben (Anleitung auf callmebot.com), dann in den JARVIS-Einstellungen deinen Telegram-Namen eintragen und „Anrufe erlauben“ einschalten.
- **Kontaktregeln:** Leg in den Einstellungen fest, wann er dich wie stören darf.

## Was JARVIS kann
- 🛠 **Apps & Spiele bauen**: „Bau mir einen Taschenrechner / ein Snake-Spiel / einen Workout-Timer“ → läuft sofort in JARVIS, gespeichert in der App-Bibliothek (Raster-Symbol oben)
- 📞 **JARVIS ruft dich an**: „Ruf mich um 7 Uhr an“ → Vollbild-Anrufscreen mit Klingelton, abnehmen und mit ihm reden
- 🎵 **Musik direkt in JARVIS**: tausende Live-Radiosender („Spiel Hip-Hop“, „Spiel SRF 3“), mit Steuerung auf dem Sperrbildschirm
- 🌌 **3D-HUD**: holografischer Reaktor mit Glow, Partikelraum, Parallax beim Kippen des Handys
- 🎙 Sprachsteuerung + Sprachausgabe, optional „Hey Jarvis“-Aktivierung
- 🧠 Claude als Gehirn (Opus 5.5 / Sonnet 5.5 / Haiku 5.5), merkt sich Dinge über dich
- 🌐 Live-Websuche (News, Sport, Preise …) und Webseiten lesen
- 🌤 Wetter + 7-Tage-Vorhersage, 📍 GPS-Standort mit Adresse
- 📞 Anrufen, SMS, WhatsApp, E-Mail, 🧭 Navigation, YouTube, Spotify, Kalendertermine
- ⏱ Timer & Erinnerungen (Ton, Vibration, Benachrichtigung)
- 📷 Kamera-Analyse: Objekte, Text lesen/übersetzen, QR-/Barcodes; Bilder aus der Galerie
- 🔦 Taschenlampe, 📳 Vibration, 📋 Zwischenablage, 📤 Teilen
- 📝 Notizen, Einkaufslisten, To-dos
- 🔋 Systemstatus (Akku, Netz, Speicher, Gerät)

## Grenzen (ehrlich)
- Wächter laufen nur, solange JARVIS geöffnet ist (Browser-Apps dürfen im Hintergrund nicht dauerhaft arbeiten). Für 24/7-Überwachung bräuchte es einen Server.
- Dateien sortieren geht nur am PC (Chrome/Edge). Android-Browser geben Web-Apps keinen Ordnerzugriff.
- Der Kalender ist JARVIS-eigen. Für den Google-Kalender tippst du pro Termin auf GOOGLE ↗.
- CallMeBot-Anrufe kann JARVIS abschicken, aber technisch nicht bestätigen, dass sie angekommen sind. Er sagt dir das auch so.

- Nachrichten (SMS/WhatsApp) schreibt er fertig, **Senden tippst du selbst**
- Echte Telefonanrufe auf deine Nummer gehen nur mit einem Telefondienst wie Twilio + Server
- Kein Ein-/Ausschalten von WLAN, Bluetooth, Lautstärke; keine fremden Apps fernsteuern
- „Hey Jarvis“ funktioniert nur, solange die App offen im Vordergrund ist
- Timer klingeln zuverlässig nur, wenn die App offen oder im Hintergrund ist

## Kosten
Die KI läuft über deinen Anthropic-API-Key (Pay-per-use). Haiku 5.5 ist am günstigsten, Opus 5.5 am klügsten.
Der Key wird nur lokal auf dem Handy gespeichert – teil die App-URL ruhig, jeder braucht seinen eigenen Key.
