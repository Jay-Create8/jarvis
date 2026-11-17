# JARVIS 5.6 – Ein Knopf für alles: ehrlicher Prüfbericht

Sicherung der Vorversion: `jarvis-v5.5-backup/` · Live: https://jay-create8.github.io/jarvis/
**Kategorien:** ✅ ECHT GETESTET · 🟡 NUR SIMULIERT · ⚪ IMPLEMENTIERT, ABER UNGETESTET

## Was neu ist
| Teil | Was | Kategorie |
|---|---|---|
| SCHNELLSTART | Ganz oben in den Einstellungen: „📋 KEY EINFÜGEN“ + „🚀 ALLES FREISCHALTEN“ | ✅ |
| Alle Berechtigungen | Benachrichtigungen, Mikrofon + Kamera (eine Abfrage), Standort, dauerhafter Speicher, Bildschirm wach – nacheinander, mit ✅/⚠️ je Punkt und Hilfe bei „abgelehnt“ | ✅ im Test-Browser · ⚪ echtes Android |
| Maximale Freiheit | Freie Hand, Keine Limits, Anrufe an dich + andere, Rückruf, Schnell-Modus, Kontext, „Hey Jarvis“, Fernmodus (wenn Server) | ✅ |
| Keine Limits | Keine Ruhezeiten, kein Tageslimit, kein Anruf- und kein KI-Kostenlimit – App und Server | ✅ |
| Nur ein Schlüssel | Anthropic-Key; alles andere optional oder automatisch (ntfy-Thema, Server-Tokens per QR-Code) | ✅ |

## Was bewusst bleibt – und warum
| Sperre | Warum |
|---|---|
| Notbremse: 30 Anrufe bei dir, 50 bei anderen pro 24 h, gleiche Nummer max. 6× | Schutz vor Endlosschleifen (Fehler oder manipulierte Webseite) – sonst könnte JARVIS hunderte Male wählen und viel kosten |
| Anrufe bei anderen nur 07–22 Uhr | Schützt die Angerufenen; nachts ist ohnehin niemand im Geschäft |
| Keine Notruf-, Kurz-, Mehrwert-, Satellitennummern | Ein KI-Anruf beim Notruf kann Leben gefährden; Mehrwertnummern sind eine Kostenfalle |
| KI gibt sich am Telefon zu erkennen | Ehrlichkeit gegenüber Fremden, rechtlich üblich |
| Zahlungen und Löschen fragen | Eine Webseite könnte JARVIS sonst zum Kaufen/Löschen bringen |
| Berechtigungen bestätigt Android | Kann keine App umgehen – der Knopf löst aber alle Abfragen auf einmal aus |

## Fehler gefunden und behoben
- Die neue Schnellstart-Box hatte dieselbe ID wie die Knopfleiste unten – Darstellung/Einfügen wurden dadurch unzuverlässig. Umbenannt; 3/3 Testläufe grün.
- Fehlermeldungen der Berechtigungen kamen auf Englisch – jetzt Deutsch.

## Tests
| Test | Ergebnis |
|---|---|
| Ein Knopf (Key einfügen, Berechtigungen, Freiheit, Server-Regeln) | ✅ 3/3 Läufe |
| Server | **22/22** (+2: Keine Limits bei dir; bei anderen mit Notbremse und Zeitfenster) |
| Betroffene App-Tests (PIN, Kosten, Freiheit ×2, Telefon, Wächter, Persönlichkeit, Selbsttest, Wissen, Thema, Briefing, Einrichtungs-Link, Wetter) | **13/13** ✅ |
