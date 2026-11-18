# JARVIS 5.8 – Gratis-Gehirn (Gemini), Gratis-Stimmen, Lader für wackliges Netz: ehrlicher Prüfbericht

Sicherung der Vorversion: `jarvis-v5.7.2-backup/` · Live: https://jay-create8.github.io/jarvis/
**Kategorien:** ✅ ECHT GETESTET · 🟡 NUR SIMULIERT · ⚪ IMPLEMENTIERT, ABER UNGETESTET

## Wichtig vorweg
- **Kein echter Gemini-, ElevenLabs- oder Azure-Key in dieser Umgebung.** Antworten der KI und Audio der Stimmen sind in den Tests
  nachgestellt (🟡). Echt geprüft: der **Aufbau jeder Anfrage gegen Googles echten Server** (Google prüft das Format vor dem Key –
  falsche Felder werden abgelehnt, siehe Gegenproben), CORS (Browser darf Google, Azure, ElevenLabs direkt ansprechen) und die
  gesamte App-Logik im echten Browser.
- **Kritischer Fehler seit 5.2 gefunden und behoben:** Die Werkzeugnamen `rückmeldung`, `hörfehler` (App) und `gespräch_beenden`
  (Server) verstossen gegen die offizielle Regel der Claude-API (`^[a-zA-Z0-9_-]{1,128}$`, laut Doku). **Mit einem echten
  Anthropic-Key wäre jede einzelne Nachricht mit Fehler 400 abgelehnt worden** – in den Tests war die KI nachgestellt, deshalb
  unsichtbar. Jetzt `rueckmeldung`, `hoerfehler`, `gespraech_beenden`, plus feste Prüfung in App- und Server-Tests (Gegenprobe:
  die Prüfung findet den Fehler in 5.7.2).

## Was neu ist
| Teil | Was | Kategorie |
|---|---|---|
| 🆓 Gemini als Gehirn | Gratis-Key von aistudio.google.com/apikey. JARVIS übersetzt seinen Verlauf ins Gemini-Format – alle Werkzeuge bleiben gleich. Modelle werden aus der Liste deines Keys gewählt (neuestes stabiles Flash-Lite = meiste Gratis-Anfragen) | ✅ Format echt · 🟡 KI |
| Websuche / Seiten lesen | Über Googles Suche (`google_search`) und `url_context`, Quellen im Recherche-Fenster | ✅ Format echt · 🟡 Ergebnis |
| Gratis-Limits | Minutenlimit → wartet und macht weiter · Tageslimit → anderes Modell (eigenes Kontingent) · alles leer → ehrliche Meldung. **Claude nur, wenn du „Bei Gemini-Limit Claude nutzen“ einschaltest** | ✅ |
| KEY EINFÜGEN | erkennt Gemini- (AIza…) und Anthropic-Keys, prüft den Gemini-Key sofort bei Google | ✅ Ablauf · 🟡 Google-Antwort |
| Komprimierte Anfragen | gzip – Google nimmt das an (echt geprüft): 33.8 KB → 13.3 KB pro Nachricht | ✅ |
| Leicht-Modus | nur bei gemessenen < 4 KB/s: kurze Anweisungen + 21 Kernwerkzeuge → 6.6 KB pro Nachricht | ✅ |
| 🗣 Stimmen-Kette | ElevenLabs (Gratis-Plan) → Azure (F0) → **Gemini-Stimme** → Gerätestimme; jede nur im Gratis-Rahmen, Ausfall → nächste Stimme an derselben Stelle | ✅ Ablauf · 🟡 Audio |
| Gemini-Stimme | gleicher Key, Stimme „Charon“ (wählbar), Regieanweisung „kultivierter KI-Butler, ruhig, trockener Humor“, Tonfall je Satz; Sätze werden gebündelt (2 Anfragen statt 4) | ✅ Format echt · 🟡 Klang |
| Azure (optional) | 500'000 Zeichen/Monat gratis (Stufe F0 stoppt einfach, kostet nie), u.a. Schweizer Stimme Jan | ✅ Anfrage · 🟡 Audio |
| ElevenLabs (optional) | wie bei Moritz Maaker; JARVIS stoppt **vor** 10'000 Zeichen/Monat (Gratis-Plan) – auch nicht mit einem Satz darüber | ✅ |
| STIMMEN VERGLEICHEN | spielt jede verfügbare Stimme mit demselben Satz | ✅ |
| Start-Lader | winzige Startseite (2.5 KB) lädt JARVIS in 16-KB-Häppchen mit Prüfsumme; Abbruch kostet nur das aktuelle Häppchen; Fortschritt, Tempo, Restzeit | ✅ |
| Schneller Start | zum Starten 111 KB statt 390 KB; 3D und Fenster laden danach (Chat geht sofort) | ✅ |
| Updates | nur geänderte Dateien kommen übers Netz, der Rest wird vom Handy übernommen | ✅ |

## Kosten
| | pro Monat |
|---|---|
| Gemini (Gehirn + Stimme) | **0 Fr.** – Gratis-Kontingent; im Google-Projekt **keine Abrechnung aktivieren** |
| Stimmen ElevenLabs / Azure | **0 Fr.** – JARVIS bleibt im Gratis-Rahmen (10'000 / 500'000 Zeichen) |
| Claude (nur wenn du willst) | Sparmodus-Deckel 1.60 USD wie bisher |
Dein 1-Fr.-Budget für die Stimme wird nicht gebraucht.

**Gratis-Grenzen (ehrlich):** Google nennt die Zahlen nicht mehr fest in der Doku. Berichte von Entwicklern (Okt. 2026):
Flash-Lite ca. 15 Anfragen/Minute und ~500/Tag, Flash ca. 5/Minute und ~20/Tag. Eine Nachricht mit Werkzeugen braucht 1–4
Anfragen, die Stimme 1–2. Deine echten Grenzen zeigt AI Studio. Kontingent setzt sich täglich um ca. 9 Uhr zurück.
**Daten:** Laut Googles Bedingungen (Fassung Dez. 2025) gelten für Nutzer in der Schweiz auch bei Gratis-Nutzung die Regeln der
bezahlten Dienste (Eingaben werden nicht zum Verbessern der Produkte verwendet). Aktuelle Fassung bitte selbst prüfen.
Google verlangt für AI Studio ein Konto ab 18 Jahren.

## Messungen (echt, im Browser)
| Messung | Ergebnis |
|---|---|
| Zweiter Start bei 0.2 KB/s | Chat nach **0.7 s**, 3D nach 2.0 s, **0 Bytes** übers Netz |
| Offline-Start | 0.2 s |
| Erster Start, 8 KB/s, 40 % der Übertragungen brechen ab | 81 s, 9 Abbrüche, alle automatisch fortgesetzt |
| Neu laden mitten im Laden | geht bei 32 KB weiter statt bei 0 |
| Update von 5.7.2 | 128 KB statt ~412 KB übers Netz |

## Tests
| Test | Ergebnis |
|---|---|
| Gemini-Übersetzer (Node) | **9/9** |
| 5.8 im Browser (Gemini G1–G10, Stimmen V1–V5, Lader B1–B5) | **20/20** |
| Server | **25/25** (+1: Werkzeugnamen) |
| Alte App-Regression (39 Tests seit 3.0) | **38/39 am Stück**; der 39. (Rückruf nach Reservierung) scheiterte am Tageslimit für Anrufe bei dir, weil der Test-Server heute schon mehrere Telefon-Testläufe hatte (richtiges Verhalten) – mit frischem Test-Server ✅ |
| Alter Test 40 (7 KB/s) | ersetzt durch B1–B5 (Lader mit Abbrüchen) |

**Am Testgerüst verbessert (keine JARVIS-Fehler):** Nach jedem Test werden jetzt alle Browser geschlossen – vorher liess ein
gescheiterter Test seine 3D-Seite weiterlaufen (bis 170 % CPU) und bremste alle folgenden aus. Feste Wartezeiten → Warten auf
das Ergebnis. Zwei Tests hingen von der Uhrzeit ab („Guten Morgen“ ist vor 11 Uhr auch die normale Begrüssung; Anrufe an Dritte
erst ab 08:00 – der Test-Browser lief in UTC, jetzt Schweizer Zeit wie dein Handy). Zum Vergleich gemessen: 5.7.2 war auf diesem
Rechner gleich schnell bzw. langsamer (3.6 s statt 3.3 s bis zur ersten Anfrage).

## Was ungetestet bleibt (⚪/🟡)
Echte Gemini-Antworten (Qualität der Entscheidungen mit Flash-Lite), echter Klang der Gemini-Stimme auf Deutsch, deine echten
Gratis-Grenzen, ElevenLabs/Azure mit echtem Konto, echtes Android-Gerät. Der JARVIS-Server (Wächter/Telefon) nutzt weiterhin
Claude – Gemini dort ist ein möglicher nächster Schritt.
