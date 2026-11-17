# JARVIS 4.0 – Prüfbericht: Was nachweislich funktioniert und was noch fehlt

Sicherung der Vorversion: `jarvis-v3.0-backup.zip`

## 1. Ursachen der schlechten 3D-Modelle (behoben)
| Ursache | Lösung in 4.0 |
|---|---|
| `model3d` kannte nur lose Grundformen mit unabhängigen Wackelbewegungen – ein mechanisch korrekter Motor war damit gar nicht ausdrückbar | **JARVIS Visual SDK (JV)**: PBR-Materialien, Lathe/Extrude/Rohre/Zahnräder/Federn/Tragflächen, Baugruppen, Kinematik (Kurbeltrieb, Nocken, Übersetzungen), Zeitleiste mit Phasen, Parameter, Partikel, Flussgraphen, GLB-Lader |
| Die KI musste rohes Three.js ohne Licht/Material/Kamera-Know-how schreiben | Das SDK liefert Bühne, Licht, Schatten, Glow, Kamera-Framing, Touch/Maus, Auswahl, Labels, Zerlegen, Röntgen, Pause/Schritt fertig – die KI beschreibt nur noch den Inhalt |
| Niemand prüfte die Qualität („läuft ohne JS-Fehler“ = ok) | **Qualitätsprüfung**: Teile/Dreiecke/Materialien/Info-Texte + **Screenshot an die KI**; Pflicht-Regel: erst verbessern, dann präsentieren |
| Motor & Kugeln in der Doku waren **meine Testdaten**, keine KI-Ergebnisse | Neue Tests messen Qualität; eingebauter **Selbsttest mit echter KI** auf deinem Gerät |
| Visualisieren hing von einer Prompt-Bitte ab | **Visual-Planer** (Claude Haiku 5.5, strukturierte Ausgabe) entscheidet vor jeder Antwort, ob/was gezeigt wird und ob ein offenes Fenster weiterverwendet wird |
| Handy: 3D in kleinem Fenster | **Immersive Ansicht**: bildschirmfüllend, Mikrofon/Eingabe bleiben, gesprochener Satz als Untertitel, Chat per Knopf |

## 2. Viertaktmotor (Modellbibliothek)
Prozedural, **kinematisch korrekt**, gekennzeichnet als „BIBLIOTHEK · PROZEDURAL · EINZYLINDER-DOHC (VEREINFACHT)“:
exakte Kurbel-Schleifen-Gleichung, Nockenwellen mit halber Drehzahl (Zahnriemen 2:1, gleiche Drehrichtung),
Nockenform passend zur Ventilhubkurve, Steuerzeiten (E: 10° v. OT – 40° n. UT, A: 40° v. UT – 10° n. OT), Zündung ≈ 8° v. OT,
Gasfluss je Takt, 23 Bauteile mit Fachinfo, Zerlegen, Röntgen, Pause/Schritt/Tempo, Taktwahl, Kurbelwinkel-Befehl.
Vereinfacht: ein Zylinder, je ein Ein-/Auslassventil, keine Schmierung/Kühlung/Einspritzung im Detail.
Ein frei lizenziertes, animiertes GLB-Motormodell war nicht auffindbar (Khronos-Maschinenmodelle 404/Lizenz unklar).

## 3. Testergebnisse
### Automatisch (Chromium, Playwright) – 10/10 bestanden
KI-Antworten sind in diesen Tests **simuliert** (kein API-Key in der Entwicklungsumgebung). Echt laufen: 3D-Rendering, Geocoding, OSRM-Routen, Kartenkacheln, Datei-Operationen, UI-Ereignisse, PC-Agent auf Wikipedia.
1. 3D-Globus · 2. altes 3D-Modell · 3. Reiseplanung mit echter Route · 4. Optionen/UI-Ereignis · 5. Dateien echt verschoben
6. Analyse-Fenster · 7. Wächter + Push · **8. Viertaktmotor: Planer → Bibliothek → Prüfbericht+Screenshot → Gesten → Rückfrage im selben Fenster (Handy, immersiv)**
**9. Generierte Szene: Platzhalter wird abgelehnt, gute Szene besteht** · **10. PC-Agent: echte Wikipedia-Suche + Bestellsperre**
Hinweis: In den Tests werden CORS-Fehler gedrosselter Gratisdienste ausgeblendet; die App hat dafür jetzt einen Ersatz-Geocoder.

### Server (Node, Twilio/Anthropic/ntfy simuliert) – 8/8 bestanden
Token-Schutz, Twilio-Auftrag, Signaturprüfung, Sprachdialog, Aufgaben → Posteingang, Cron-Wächter → Push + Anruf, Intervall, „keine Kosten ohne Konfiguration“.

### Touch (Pixel-7-Emulation) – bestanden
1 Finger dreht, 2 Finger zoomen, Antippen wählt Bauteil (undurchsichtige Teile haben Vorrang).

### Während der Arbeit gefundene und behobene Fehler
- Animierte Szenen meldeten jeden Taktwechsel → hätte **alle 2 s einen kostenpflichtigen KI-Aufruf** ausgelöst. Jetzt wecken nur echte Entscheidungen JARVIS.
- Lange Webseiten wurden mitten im JSON abgeschnitten → jetzt sauber gekürzt.
- Notizen/Gedächtnis/Timer schickten Listen in einem Format, das die API abgelehnt hätte (aus 3.0).
- Explosionsansicht kollidierte mit animierten Teilen → eigene Explosions-Hülle pro Teil.

## 4. NICHT nachgewiesen (ehrlich)
| Anforderung | Status | Grund / was du tun kannst |
|---|---|---|
| Test A/B/C mit **echter KI** | offen | Kein API-Key in meiner Umgebung. → In JARVIS: Einstellungen → **SELBSTTEST STARTEN**, Bericht herunterladen, mir schicken |
| Test D auf **echtem Android-Gerät** | offen | Kein echtes Gerät verfügbar. Der Selbsttest misst FPS, Fensterfläche, Gerätedaten; Touch-Checkliste im Bericht |
| Echter **Telefonanruf** | Code fertig, getestet mit Simulation | Braucht dein Twilio- + Cloudflare-Konto und deine Zustimmung (Kosten siehe server/ANLEITUNG-SERVER.md) |
| **Wächter bei geschlossener App** | Code fertig, getestet mit Simulation | Gilt erst als bewiesen, wenn der Cron auf deinem Cloudflare-Konto läuft („SERVER PRÜFEN“ zeigt den letzten Lauf) |
| Telegram-Anruf (CallMeBot) | ungetestet | Würde echte Anrufe auslösen – bitte selbst testen |
| Essen **bestellen** / Reservieren | vorbereitet | Funktioniert über den PC-Agent mit deiner Bestätigung; Login, Captcha, Zahlung machst du selbst |
| Apps auf Android **fernsteuern** | nicht möglich | Android erlaubt Web-Apps das nicht. Möglich wäre eine native Android-App mit Bedienungshilfen-Dienst (Accessibility Service) – grosses eigenes Projekt, Play-Store-Richtlinien beschränken das stark |
| Qualität **KI-generierter** Szenen | begrenzt prüfbar | Das SDK + Prüfbericht + Screenshot-Selbstkontrolle verbessern sie deutlich; wie gut die KI sie nutzt, zeigt erst der Selbsttest |

**JARVIS 4.0 ist deshalb NICHT „fertig“, sondern eine geprüfte Zwischenversion.** Der nächste Schritt ist dein Selbsttest mit echter KI auf deinem Handy.
