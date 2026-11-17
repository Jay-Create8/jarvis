plugins { id("com.android.application") version "8.7.2"; id("org.jetbrains.kotlin.android") version "2.0.21" }
android { namespace = "ch.jarvis.companion"; compileSdk = 35
  defaultConfig { applicationId = "ch.jarvis.companion"; minSdk = 26; targetSdk = 35; versionCode = 1; versionName = "0.1" }
  compileOptions { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 } }
kotlin { compilerOptions { jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17) } }
dependencies { implementation("org.java-websocket:Java-WebSocket:1.5.7") }
