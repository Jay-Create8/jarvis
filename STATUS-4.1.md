# JARVIS 4.1 – Prüfbericht

Sicherung der Vorversion: `jarvis-v4.0-backup/` (bzw. JARVIS-4.0-Laptop.zip)

**Kategorien:** ✅ ECHT GETESTET · 🟡 NUR SIMULIERT · ⚪ IMPLEMENTIERT, ABER UNGETESTET · ❌ NICHT FUNKTIONSFÄHIG
**Wichtig:** In der Entwicklungsumgebung gibt es keinen Anthropic-API-Key für die App. Kein Test lief mit einem echten KI-Aufruf
*aus der App*. Wo ich (Claude) in der Entwicklungsumgebung die Rolle der KI übernommen habe, steht das ausdrücklich dabei.

## Neu in 4.1
| Bereich | Was |
|---|---|
| Persönlichkeit | Eigener Charakter (trocken, souverän, ehrlich, gelegentlich frech), Regler für Humor, Sarkasmus, Anrede und Gesprächigkeit, Ernstfall-Regel, Verbot von Assistenten-Floskeln, Gedächtnis gegen Wiederholungen der letzten 14 Einstiege und Pointen. Gilt auch am Telefon. |
| Stimme | Tonmarker (trocken/ernst/warm/energisch) ändern Tempo und Tonhöhe, leichte natürliche Variation pro Satz, Fragen enden höher, Pausen über „…“ |
| Selbstständigkeit | Arbeitsweise verstehen → planen → handeln → prüfen → berichten; **Missionen** (gespeichert, Fortschrittsfenster, Fortsetzen nach Neustart); bis zu 40 Werkzeugschritte pro Auftrag; lernt Vorlieben aus Korrekturen |
| 3D | SDK: `sweep` (Körper entlang Kurven), `organic` (Organe, Gestein), `arrow` (Kräfte), `molecule` (CPK), `planetTexture`, Umgebung „weltraum“; Baurezepte je Fachgebiet; Planer liefert einen **Bauplan**; Code darf `THREE` neu deklarieren (häufiger KI-Fehler); leere Hervorhebung hebt korrekt auf |
| Anrufregeln | Ruhezeiten, max. Anrufe pro Tag, Monatsbudget, Dringlichkeit (Notfall darf in die Ruhezeit) – in App **und** Server durchgesetzt; Eskalation: selbst lösen → App → Push → Anruf |
| PC-Agent | Sperre erkennt verbindliche Schritte auch auf Kassenseiten („Finish“, „Place order“ …), ignoriert versteckte Menüpunkte, heilt sich nach geschlossenem Browser, kurze Fehlermeldungen mit Seiteninhalt |
| Selbsttest | 3 zufällig gezogene neue 3D-Themen, Visualisierung ohne Stichwort, Persönlichkeit inkl. Ernstfall, Wiederholungs-Check |
| Android nativ | untersucht: `android/ANDROID-NATIV.md` |

## Ergebnisse je Prüfbereich
| Test | Ergebnis | Kategorie |
|---|---|---|
| **A – neue 3D-Modelle** (Themen nach der Implementierung ausgelost: Brennstoffzelle, Mondphasen, Gleichstrommotor) | 3 Szenen durch die echte App-Pipeline (Prüfbericht + Screenshot + Gesten + Zerlegen), Videos aufgezeichnet. **Szenencode schrieb Claude in der Entwicklungsumgebung**, nicht die App-KI. Ergebnisse unten. | 🟡 KI-Rolle simuliert, Pipeline echt |
| **B – eigenständige Visualisierung** | Planer + Hinweis + Fensteröffnung getestet; ob die echte KI ohne Stichwort visualisiert, nur mit echtem Key prüfbar | 🟡 → Selbsttest |
| **C – Persönlichkeit** | Mechanik echt getestet (Regler im Prompt, Anti-Wiederholung, Tonmarker → Stimme); Qualität des Humors braucht echte KI | ✅ Mechanik · ⚪ Humor-Qualität |
| **D – echte KI** | Kein App-Key verfügbar | ⚪ → Selbsttest |
| **E – Android-Gerät** | Kein Gerät; Pixel-7-Emulation (Touch) bestanden | 🟡 → Selbsttest |
| **F – Telefonie** | Server-Logik 9/9 (Twilio simuliert); in echter Cloudflare-Laufzeit lokal: Anrufregel blockierte korrekt (Ruhezeit) | 🟡 / ⚪ echter Anruf braucht dein Twilio-Konto |
| **G – Browserautomatisierung, unbekannte Website** | saucedemo.com (öffentlicher Übungsshop, nie vorbereitet): Login → nach Preis sortieren → günstigsten Artikel → Warenkorb → Formular → Übersicht (8.63 $) → **„Finish“ gesperrt** ✅. Browser, Website und Agent echt; Entscheidungen traf Claude über dasselbe Protokoll wie die App | ✅ Agent echt · 🟡 KI-Rolle |
| **H – Hintergrund/Cloud** | Worker in echter Cloudflare-Laufzeit (workerd, lokal): Cron-Handler lief, Wächter geprüft, Herzschlag gespeichert, Token-Schutz, Ruhezeit-Sperre | ✅ lokal · ⚪ nicht auf deinem Cloudflare-Konto |
| Automatische App-Tests | 12/12 (KI-Antworten skriptgesteuert) | 🟡 |
| Telegram-Anruf (CallMeBot) | nicht ausgelöst (würde echte Anrufe senden) | ⚪ |

## Test A im Detail (Selbstkritik inklusive)
| Thema | Modell | Animation | Interaktion | Qualitätsprobleme |
|---|---|---|---|---|
| Brennstoffzelle (PEM) | 18 Teile: Endplatten, Bipolarplatten mit Kanälen, Gasdiffusionslagen, Pt-Katalysatoren, Membran, Zuganker, Gasleitungen, Stromkreis mit Lampe | 4 Phasen (H₂ spalten, Protonen, Strom, Wasser), Partikel für H₂/H⁺/e⁻/O₂/H₂O, Regler Stromabnahme | Zerlegen, Röntgen, Phasen, Antippen mit Reaktionsgleichungen | **v1 schlecht** (graue „Lattenkiste“, Kanäle ragten heraus, Schichten nicht unterscheidbar) → nach Screenshot-Prüfung **v2** farbcodiert und lesbar. Schichtdicken stark vergrössert (gekennzeichnet). |
| Mondphasen | Sonne (Richtung), Erde mit Textur, Mond mit Kratern, Bahn, Sonnenlicht, Tag-Nacht-Grenze + 2D-„Von der Erde“-Ansicht mit beleuchtetem Anteil | 8 Phasen, gebundene Rotation, Erdrotation | Phasen anklicken, Pause/Schritt | **v1 stürzte ab** (Code deklarierte `THREE` doppelt) → Fehler korrekt gemeldet → SDK robust gemacht. Mond aus 3D-Sicht klein/dunkel – die Phase ist v. a. in der 2D-Ansicht erkennbar. Qualitätsregel „≥5 Teile“ ist für einfache Systeme zu streng. |
| Gleichstrommotor | Nord-/Südpol, Gehäuse, Feldlinien, Welle, Blechpaket, Spule, Kommutator, 2 Bürsten, Batterie, Leitungen | Rotor dreht im Uhrzeigersinn; Lorentzkraft-Pfeile, Stromumkehr am Kommutator, 4 Phasen, Spannungsregler | Zerlegen, Antippen, Phasen | Physik stimmig (F = I·L×B, Drehrichtung konstant). Bug gefunden: leere Hervorhebung hob nicht auf → behoben. Batterie/Blechpaket wirken blass. |

## Fehler, die diese Version gefunden und behoben hat
1. PC-Agent: „Finish“ auf der Kassenseite war nicht gesperrt (4.0 hätte bestellt).
2. PC-Agent: „Checkout“ allein wurde unnötig gesperrt.
3. PC-Agent: versteckte Menüpunkte (z.B. „Reset App State“) wurden als klickbar gemeldet → Gefahr von Fehlklicks.
4. PC-Agent: nach geschlossenem Browser keine Erholung.
5. PC-Agent: 30-s-Wartezeiten und unlesbare Fehler.
6. SDK: `const THREE` im KI-Code → Syntaxfehler.
7. SDK: leere Hervorhebung hob nicht auf.
8. Anrufregeln: gleiche Start/Endzeit galt als 24-h-Ruhezeit.
9. Ortssuche ohne Cache → Drosselung (429) bei Gratisdiensten; jetzt mit Cache.

## Was bleibt (ehrlich)
- **Keine echten KI-Tests aus der App** – bitte **Selbsttest** starten (Einstellungen), Bericht schicken.
- **Echter Telefonanruf und Cloud-Wächter** brauchen deine Cloudflare- und Twilio-Konten (Anleitung `server/ANLEITUNG-SERVER.md`; Kosten dort).
- **Andere Android-Apps bedienen** geht nur mit einer nativen App (siehe `android/ANDROID-NATIV.md`).
- **Essen bestellen/Reservieren**: über den PC-Agent bis zur Bestätigung; Login, Captcha, Zahlung machst du.
- Die Qualität **KI-generierter** 3D-Modelle schwankt (siehe Brennstoffzelle v1). Prüfbericht + Screenshot fangen grobe Fehler ab; Perfektion ist nicht garantiert.

**JARVIS 4.1 ist eine geprüfte Zwischenversion – nicht „fertig“.**
