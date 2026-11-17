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
