plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.guardrail.ragebait"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.guardrail.ragebait"
        minSdk = 26
        targetSdk = 35
        versionCode = 6
        versionName = "0.6.0"

        // Bundled ML Kit OCR ships native libs per ABI; modern phones
        // (incl. Z Fold 6) are arm64, so drop the rest to keep the APK small.
        ndk {
            abiFilters += listOf("arm64-v8a")
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("com.google.android.material:material:1.12.0")
    implementation("androidx.constraintlayout:constraintlayout:2.1.4")
    // On-device OCR of screenshots — catches text baked into video frames
    // that never surfaces through accessibility nodes.
    implementation("com.google.mlkit:text-recognition:16.0.1")

    testImplementation("junit:junit:4.13.2")
}
