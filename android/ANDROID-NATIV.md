# Untersuchung: Native Android-Ergänzung für JARVIS

**Status: untersucht, nicht implementiert.** Diese Datei beschreibt, was eine native Begleit-App zusätzlich ermöglichen würde,
welche Berechtigungen dafür nötig sind und wo Google-Play-Regeln Grenzen setzen.

## Was die PWA (aktuell) NICHT kann – und warum
| Fähigkeit | Grund in der PWA |
|---|---|
| Andere Apps bedienen (z.B. WhatsApp-Knopf „Senden“ drücken) | Browser-Apps haben keinen Zugriff auf andere Apps |
| SMS selbst senden | Nur `sms:`-Link, Senden muss der Mensch |
| Dauerhaft im Hintergrund laufen | Android beendet Browser-Tabs; Wächter laufen nur mit dem Cloud-Server weiter |
| Benachrichtigungen anderer Apps lesen | Kein Zugriff |
| Kalender direkt schreiben | Nur über Google-Link mit Bestätigung |
| Exakte Wecker auch bei geschlossener App | Nicht zuverlässig |

## Stufe 1 – TWA-Hülle (geringer Aufwand, empfehlenswert)
JARVIS als echte APK verpacken (Trusted Web Activity mit **Bubblewrap** oder **PWABuilder**). Gleicher Code, eigenes App-Icon,
Vollbild, Play-Store-fähig. **Fügt keine neuen Rechte hinzu**, ist aber die Basis für Stufe 2.

## Stufe 2 – Native Begleit-App (Kotlin), spricht mit der PWA über eine lokale Brücke
| Funktion | Android-API | Berechtigung | Play-Store |
|---|---|---|---|
| Andere Apps bedienen (Text lesen, Knöpfe drücken) | `AccessibilityService` | Bedienungshilfen (Nutzer schaltet manuell frei) | **Stark eingeschränkt**: nur für echte Barrierefreiheits-Zwecke zugelassen; privat per APK-Installation (Sideload) möglich |
| SMS senden | `SmsManager` | `SEND_SMS` | Nur für Standard-SMS-Apps zugelassen; Sideload möglich |
| Benachrichtigungen lesen und darauf reagieren | `NotificationListenerService` | Benachrichtigungszugriff | erlaubt mit Begründung |
| Kalender lesen/schreiben | `CalendarContract` | `READ/WRITE_CALENDAR` | erlaubt |
| Hintergrund-Wächter lokal | `WorkManager` (min. 15 Min) | – | erlaubt |
| Exakte Wecker / JARVIS-Anrufbildschirm bei gesperrtem Handy | `AlarmManager.setExactAndAllowWhileIdle` + Full-Screen-Intent | `SCHEDULE_EXACT_ALARM`, `USE_FULL_SCREEN_INTENT` | erlaubt mit Begründung |
| Anrufe annehmen/tätigen | `TelecomManager` | `CALL_PHONE` | eingeschränkt |

## Sicherheit
Eine App mit Bedienungshilfen-Recht kann **alles auf dem Bildschirm sehen und bedienen**. Deshalb gelten dieselben
Regeln wie beim PC-Agent: verbindliche Aktionen nur nach menschlicher Bestätigung, Protokoll aller Aktionen,
jederzeit abschaltbar.

## Aufwand (Schätzung)
- Stufe 1: ca. 1 Stunde (Anleitung: pwabuilder.com → URL eingeben → Android-Paket)
- Stufe 2: mehrere Wochen Entwicklung + Tests auf echten Geräten; nicht in dieser Umgebung testbar (kein Android-Gerät, kein Android-SDK-Emulator mit Play-Diensten).

## Empfehlung
Erst Stufe 1. Stufe 2 nur für die Funktionen, die du wirklich brauchst – realistisch zuerst: Benachrichtigungen lesen,
Kalender, exakte Wecker. Fremde Apps bedienen nur privat per Sideload, wegen der Play-Regeln.

## 5.0: Projektgerüst `jarvis-companion/` (NICHT kompiliert, NICHT getestet)
Kotlin-Gerüst für Stufe 2: Bedienungshilfen-Dienst, der der JARVIS-PWA auf demselben Handy über `ws://127.0.0.1:47322` (mit Token)
erlaubt, **Apps zu öffnen, den Bildschirm zu lesen und Elemente anzutippen**. Gleiche Sicherheitslogik wie der PC-Agent:
verbindliche Wörter (kaufen, senden, löschen …) → Einmal-Code, den nur die JARVIS-Freigabe kennt.
Fehlt noch: Token-Anzeige per Benachrichtigung, Gegenstück-Werkzeug in der PWA, Tests auf einem echten Gerät, Play-Store-Prüfung
(Bedienungshilfen-Apps werden dort nur für Barrierefreiheit zugelassen → realistisch nur privat per APK-Installation).
In dieser Entwicklungsumgebung gibt es weder Android-SDK noch Gerät – daher keine Aussage über Lauffähigkeit.

## 5.1: Gerüst kompiliert – und 3 Fehler gefunden, die nur beim Bauen/Durchsehen sichtbar wurden
**Ergebnis:** `assembleDebug` mit Android SDK 35, Build-Tools 35.0.0, Gradle 8.10.2, AGP 8.7.2, Kotlin 2.0.21 → **BUILD SUCCESSFUL**,
Debug-APK 907 KB, Lint: 0 Fehler (Hinweise: fehlendes App-Icon, neuere AGP-Version verfügbar).
**Das heisst nur: Der Code ist gültig.** Ob er auf einem Handy läuft, ist **nicht getestet** (kein Gerät, kein Emulator in dieser Umgebung).

| Fehler | Folge | Behoben |
|---|---|---|
| Java- und Kotlin-Zielversion passten nicht zusammen | Bau brach ab | `jvmTarget 17` gesetzt |
| `INTERNET`-Berechtigung fehlte | Lokale Brücke (Socket auf 127.0.0.1) hätte nicht starten können | ergänzt |
| Keine `<queries>` (Paket-Sichtbarkeit ab Android 11) | „App öffnen“ hätte für fast alle Apps „nicht installiert“ gemeldet | Launcher-Abfrage ergänzt |
| Token wurde nirgends angezeigt | Koppeln mit JARVIS unmöglich | Token wird beim Einschalten in die Zwischenablage kopiert + Hinweis |

### Was das Gerüst an App-Steuerung kann (laut Code, ungetestet)
| Aktion | Wie | Grenze |
|---|---|---|
| `app_öffnen` (Paketname) | Launch-Intent | nur Apps mit Startsymbol |
| `lesen` | Bedienungshilfen-Baum des aktiven Fensters (Texte, antippbare Elemente) | keine Inhalte aus geschützten Fenstern (Banking-Apps, `FLAG_SECURE`), kein Bild |
| `tippen` (Element) | `ACTION_CLICK`; Wörter wie kaufen/senden/löschen → Einmal-Code nötig | **kein Texteingeben** (fehlt: `ACTION_SET_TEXT`), kein Wischen/Scrollen |
| `zurück`, `home` | globale Aktionen | – |
| **Fehlt** | Gegenstück-Werkzeug in der JARVIS-App, Texteingabe, Scrollen, Benachrichtigungen lesen, Symbol, Test auf Gerät | |

### Selbst bauen
```
cd android/jarvis-companion
echo "sdk.dir=/pfad/zum/Android/sdk" > local.properties
gradle assembleDebug        # APK: app/build/outputs/apk/debug/app-debug.apk
```
Die APK liegt bewusst **nicht** im Download: ohne Gegenstück in der App und ohne Gerätetest wäre sie nur ein Risiko mit Bedienungshilfen-Recht.

### Hinweis Browser
Neuere Chrome-Versionen fragen, bevor eine Webseite Geräte im lokalen Netz (auch `127.0.0.1`) erreichen darf. Das betrifft auch den
PC-Agent. Ob und wie diese Abfrage bei JARVIS erscheint, ist **ungetestet** – falls „PC-Agent nicht verbunden“ trotz Token: im
Schloss-Symbol der Adresszeile den Zugriff auf das lokale Netzwerk erlauben.
