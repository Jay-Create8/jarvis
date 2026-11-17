package ch.jarvis.companion
// ⚠ NICHT KOMPILIERT / NICHT GETESTET – Gerüst für die native JARVIS-Erweiterung.
// Lässt die JARVIS-PWA auf DEMSELBEN Handy (ws://127.0.0.1:47322, Token) Apps öffnen, den Bildschirm lesen
// und Elemente antippen – mit derselben Bestätigungssperre wie der PC-Agent.
import android.accessibilityservice.AccessibilityService
import android.content.Intent
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import org.java_websocket.WebSocket
import org.java_websocket.handshake.ClientHandshake
import org.java_websocket.server.WebSocketServer
import org.json.JSONArray
import org.json.JSONObject
import java.net.InetSocketAddress
import java.security.SecureRandom

class JarvisAccessibilityService : AccessibilityService() {
  private val token = ByteArray(9).also { SecureRandom().nextBytes(it) }.joinToString("") { "%02x".format(it) }
  private val sensitive = Regex("(kauf|bestell|bezahl|zahlungspflichtig|buchen|senden|absenden|löschen|überweis|pay|purchase|send|delete)", RegexOption.IGNORE_CASE)
  private val pending = mutableMapOf<String, String>()   // one-time confirmation codes, shown only in the JARVIS UI
  private var nodes = listOf<AccessibilityNodeInfo>()
  private lateinit var server: WebSocketServer

  override fun onServiceConnected() {
    server = object : WebSocketServer(InetSocketAddress("127.0.0.1", 47322)) {
      override fun onOpen(c: WebSocket, h: ClientHandshake) { if (!h.resourceDescriptor.contains("token=$token")) c.close(4001, "falsches Token") }
      override fun onMessage(c: WebSocket, msg: String) {
        val m = JSONObject(msg); val rid = m.optString("rid"); val a = m.optJSONObject("args") ?: JSONObject()
        val reply = JSONObject().put("rid", rid)
        try { reply.put("ok", true).put("data", handle(m.getString("aktion"), a)) } catch (e: Exception) { reply.put("ok", false).put("data", e.message) }
        c.send(reply.toString())
      }
      override fun onClose(c: WebSocket, code: Int, r: String, remote: Boolean) {}
      override fun onError(c: WebSocket?, e: Exception) {}
      override fun onStart() {}
    }.also { it.start() }
    // 5.1: hand the token to the user – copied to the clipboard + short hint (paste it into JARVIS → Einstellungen → Handy-Begleit-App)
    val cm = getSystemService(android.content.ClipboardManager::class.java)
    cm?.setPrimaryClip(android.content.ClipData.newPlainText("JARVIS-Token", token))
    android.widget.Toast.makeText(this, "JARVIS Companion aktiv – Token in die Zwischenablage kopiert", android.widget.Toast.LENGTH_LONG).show()
  }

  private fun handle(aktion: String, a: JSONObject): Any = when (aktion) {
    "app_öffnen" -> { val i = packageManager.getLaunchIntentForPackage(a.getString("paket")) ?: error("App nicht installiert"); i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK); startActivity(i); "geöffnet" }
    "lesen" -> readScreen()
    "tippen" -> tap(a.getString("id"), a.optString("bestätigung"))
    "zurück" -> { performGlobalAction(GLOBAL_ACTION_BACK); "ok" }
    "home" -> { performGlobalAction(GLOBAL_ACTION_HOME); "ok" }
    else -> error("Unbekannte Aktion")
  }

  private fun readScreen(): JSONObject {
    val list = mutableListOf<AccessibilityNodeInfo>()
    fun walk(n: AccessibilityNodeInfo?) { if (n == null) return; if (n.isVisibleToUser && (n.isClickable || n.text != null)) list += n; for (i in 0 until n.childCount) walk(n.getChild(i)) }
    walk(rootInActiveWindow); nodes = list
    val arr = JSONArray(); list.forEachIndexed { i, n -> arr.put(JSONObject().put("id", "n$i").put("text", (n.text ?: n.contentDescription ?: "").toString().take(80)).put("klickbar", n.isClickable)) }
    return JSONObject().put("app", rootInActiveWindow?.packageName ?: "").put("elemente", arr)
  }

  private fun tap(id: String, code: String): Any {
    val n = nodes.getOrNull(id.removePrefix("n").toInt()) ?: error("Element nicht gefunden – zuerst lesen")
    val label = (n.text ?: n.contentDescription ?: "").toString()
    if (sensitive.containsMatchIn(label) && pending.remove(code) != id) {
      val c = ByteArray(6).also { SecureRandom().nextBytes(it) }.joinToString("") { "%02x".format(it) }; pending[c] = id
      return JSONObject().put("bestätigung_nötig", true).put("element", label).put("seite", rootInActiveWindow?.packageName).put("code", c)
    }
    var t: AccessibilityNodeInfo? = n; while (t != null && !t.isClickable) t = t.parent
    return if (t?.performAction(AccessibilityNodeInfo.ACTION_CLICK) == true) "getippt: $label" else error("Nicht antippbar")
  }

  override fun onAccessibilityEvent(e: AccessibilityEvent?) {}
  override fun onInterrupt() {}
  override fun onDestroy() { server.stop(); super.onDestroy() }
}
