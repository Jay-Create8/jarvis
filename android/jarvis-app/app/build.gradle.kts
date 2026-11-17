// JARVIS als Android-App (Trusted Web Activity): startet https://jay-create8.github.io/jarvis/ mit der Chrome-Engine.
// Sprache, Kamera, 3D, Benachrichtigungen funktionieren wie auf der Website; Updates kommen automatisch über die Website.
import java.util.Properties
plugins { id("com.android.application") version "8.11.1" }
val keyProps = Properties().apply { rootProject.file("keystore.properties").takeIf { it.exists() }?.inputStream()?.use { load(it) } }
android {
  namespace = "ch.jarvis.app"; compileSdk = 36
  defaultConfig { applicationId = "ch.jarvis.app"; minSdk = 24; targetSdk = 36; versionCode = 1; versionName = "5.7" }
  signingConfigs { create("release") { if (keyProps.isNotEmpty()) { storeFile = rootProject.file(keyProps.getProperty("storeFile")); storePassword = keyProps.getProperty("storePassword"); keyAlias = keyProps.getProperty("keyAlias"); keyPassword = keyProps.getProperty("keyPassword") } } }
  buildTypes { release { isMinifyEnabled = false; if (keyProps.isNotEmpty()) signingConfig = signingConfigs.getByName("release") } }
  compileOptions { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 }
}
dependencies { implementation("com.google.androidbrowserhelper:androidbrowserhelper:2.7.4") }
