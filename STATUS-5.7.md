# JARVIS 5.7 – Echte App + max. 2 Fr. im Monat: ehrlicher Prüfbericht

Sicherung der Vorversion: `jarvis-v5.6-backup/` · Live: https://jay-create8.github.io/jarvis/
**Kategorien:** ✅ ECHT GETESTET · 🟡 NUR SIMULIERT · ⚪ IMPLEMENTIERT, ABER UNGETESTET

## Kosten im Sparmodus (Preise Anthropic, Stand 03.11.2026)
| Posten | Kosten pro Monat |
|---|---|
| KI in der App (Claude Haiku 5.5, $0.10 / $0.50 pro Mio. Tokens) | max. **1.60 USD** (harter Deckel) |
| KI auf dem Server (Wächter max. alle 12 h, Haiku) | max. **0.40 USD** (harter Deckel) |
| Website (GitHub Pages), Server (Cloudflare Free), Push (ntfy), Telegram-Anruf (CallMeBot), Briefing, Wissen, Handsteuerung | **0** |
| **Summe** | **max. 2 USD ≈ 1.70–1.80 Fr.** (Wechselkurs schwankt) |

Gemessen: eine Anfrage hat ~10'500 Tokens (Systemprompt + Werkzeuge, per Prompt-Caching gespeichert).
Geschätzt pro Antwort: Haiku ~0.2–0.3 Rappen → **~600–800 Antworten im Monat**; Opus wären ~3–6 Rappen (~40–60 Antworten für 2 Fr.).
Die Schätzung ist ⚪ – echte Werte zeigt der Kostenzähler in den Einstellungen.

**Was im Sparmodus nicht drin ist:** echte Telefonate über Twilio (Nummer + Minuten allein kosten 1–5 Fr./Monat) – stattdessen
Alarm-Push (Priorität 5) und Telegram-Anruf, beide gratis. Opus-Qualität (z.B. sehr aufwendige 3D-Szenen) – Haiku ist schwächer.
Sparmodus aus = volle Qualität, dann gilt das eigene Budget.

## Was neu ist
| Teil | Was | Kategorie |
|---|---|---|
| Sparmodus | Haiku für alles (App, Wächter, Gutachter), max. 2 Websuchen (Server 1), Deckel 1.60 + 0.40 USD, Sparhinweis im Prompt, Twilio aus | ✅ |
| Server-Kostenzähler | Server zählt eigene KI-Kosten pro Monat, stoppt bei 0.40 USD, zeigt sie in „SERVER PRÜFEN“ | ✅ Logik |
| Cloudflare-Gratis-Kontingent | Vorher: ~43'000 Schreibvorgänge/Tag im Fernmodus (Limit 1'000) → jetzt ~300–500 | ✅ Logik |
| „📲 ALS APP INSTALLIEREN“ | Nutzt die Installations-Abfrage von Chrome (WebAPK = echte App, ohne Adressleiste) | ✅ Ablauf · ⚪ echtes Handy |
| APK | Trusted Web Activity, Chrome-Engine, signiert (v2), 3.8 MB, Lint 0 Fehler | ✅ gebaut · ⚪ nie auf einem Handy installiert |

## Gefundene Probleme
1. **Cloudflare-Gratis-Limit wäre gesprengt worden:** leerer Posteingang schrieb jede Minute, Fernmodus schrieb alle 2 s, App synchronisierte alle 10 Min alles. Jetzt nur bei Änderungen, Agent fragt alle 4 s, „zuletzt gesehen“ max. alle 5 Min.
2. Wächter auf dem Server nutzten immer Opus mit Fallback-Beta – im Sparmodus jetzt Haiku ohne Beta (Haiku hat keine Server-Fallbacks).
3. APK: neueste Bibliothek brauchte Android SDK 36 + neueres Build-System → aktualisiert. Maven Central blockte kurz (HTTP 429), zweiter Versuch klappte.

## Tests
| Test | Ergebnis |
|---|---|
| Server | **24/24** (+2: Sparmodus-Wächter/Kosten/Budget, Gratis-Kontingent) |
| Sparmodus in der App (Haiku, Websuche, Deckel, kein Twilio, Gratis-Alarm) | ✅ |
| Installieren-Knopf | ✅ (Installations-Abfrage nachgestellt) |
| APK | gebaut, Signatur geprüft, Manifest geprüft, Lint 0 Fehler |
| Betroffene App-Tests (Schnell-Modus, Kosten, PIN, Freiheit ×2, Telefon, Fernsteuerung, Wächter, Briefing, Selbsttest, Persönlichkeit, Einrichtungs-Link, Ein Knopf, Sparmodus, Installieren, Sprachkette, Autokorrektur) | **17/17** ✅ |

## 5.7.1 – Wichtige Korrektur: JARVIS hätte nach der ersten Nachricht aufhören können
**Gefunden durch deine Frage „stoppt es nach einer Nachricht?“.** Laut Claude-Dokumentation lehnt die API bei Konten, die nach dem
31.08.2026 erstellt wurden (also deinem neuen), jede Anfrage mit **HTTP 400** ab, wenn sich mitten im Gespräch der Systemprompt, die
Werkzeugliste oder frühere Nachrichten ändern und dabei „Denkblöcke“ des Modells mitgeschickt werden. JARVIS änderte genau das:
- Gedächtnis („Merk dir …“), Selbsttest-Lektionen und Einstellungen standen im Systemprompt → nach der ersten Änderung wäre **jede weitere Nachricht** gescheitert.
- Beim Wechsel Haiku↔Opus (Schnell-Modus) entfernte JARVIS Denkblöcke selbst – die Doku rät ausdrücklich davon ab (kann ebenfalls 400 auslösen).
In den Tests war das nicht sichtbar, weil die KI dort nachgestellt ist und keine Denkblöcke prüft.

**Behoben (alles nach der offiziellen Doku):**
| Massnahme | Wirkung |
|---|---|
| `thinking.block_binding.prefix_mismatch_behavior: "drop_block"` + Header `thinking-binding-controls-2026-08-01` | Statt Fehler verwirft die API nur veraltete Denkblöcke – das Gespräch läuft weiter |
| Systemprompt bleibt pro Gespräch gleich; Änderungen (Gedächtnis, Persönlichkeit, Freiheit, Kontaktregeln) kommen als angehängte System-Notiz | Denkblöcke bleiben gültig, **Prompt-Cache bleibt erhalten → günstiger** |
| Kein eigenes Entfernen von Denkblöcken mehr | wie von der Doku verlangt |
| Gesprächsfenster: ab ~60'000 Tokens werden ältere Nachrichten ausgeblendet | lange Chats bleiben schnell und günstig (Haiku kostet über 100'000 Tokens 5× mehr) |

| Test | Ergebnis | Kategorie |
|---|---|---|
| Mehrere Nachrichten mit Gedächtnis-Änderung: Systemprompt byte-gleich, eine System-Notiz direkt nach deiner Nachricht, Verlauf nur ergänzt, `drop_block` + Header in jeder Anfrage, Fenster greift bei sehr langem Chat | ✅ | Anfrage-Inhalte echt geprüft · 🟡 KI-Antworten nachgestellt |
| Ob die echte API das so annimmt | – | ⚪ braucht deinen Key (Selbsttest im Sparmodus ≈ 0.05–0.15 USD) |
| Gesamt-Regression nach der Korrektur | **39/39** (37 im Gesamtlauf, Kontext-Vorrat + Wissensordner im Einzel-Lauf grün – bekannte Last-/Wetterdienst-Schwankung) | ✅ Ablauf · 🟡 KI |

## 5.7.2 – Langsames Netz (7 KB/s)
| Messung (Leitung serverseitig auf 7 KB/s gedrosselt, Browser-Cache geleert) | Vorher (5.7.1) | Jetzt (5.7.2) |
|---|---|---|
| Erneutes Öffnen | **über 200 s** (noch nicht gestartet) | **3,3–3,5 s** |
| Offline öffnen | – | **3,3 s** |
| Erstes Öffnen | ~513 KB (gzip) → bei 7 KB/s grob 1–3 Min., ohne Hinweis | gleich gross, aber mit Ladeanzeige („Lädt … 37 s“) und Erklärung |

Änderungen: Offline-Speicher startet JARVIS sofort vom Handy und lädt Updates leise im Hintergrund (vorher: zuerst über das Netz);
grosse Dateien (Handsteuerung 21 MB, APK) nur einmal laden (vorher bei jeder Benutzung); nach dem ersten Laden werden alle
benutzten Dateien gespeichert; KI-Modul (78 KB) lädt erst nach dem Startbildschirm; Ladeanzeige mit Zeit und Hinweis.
Ehrlich: Eine erste Messung mit der Browser-Drosselung war irreführend (die drosselt den Offline-Speicher nicht) – deshalb ein
eigener gedrosselter Server für die Zahlen oben. Pro Nachricht schickt JARVIS ca. 40 KB an Claude (Anweisungen + Werkzeuge);
bei langsamem Upload dauert das ein paar Sekunden.
