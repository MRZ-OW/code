# Publishing MCSR Ranked Explorer to Google Play — Step by Step

This app is ready to submit. I built and signed the release artifacts, but the
actual publish must be done from **your** Google Play Console — only you can log
in, pay the fee, and accept the developer agreement.

## What I've prepared for you
- `app-release.aab` — the signed **Android App Bundle** Play requires (this is
  what you upload). Signed with your upload key.
- `upload.keystore` + its password — your **release signing key** (delivered
  privately; see "Your signing key" below). **Back this up. If you lose it and
  don't use Play App Signing, you can never update the app again.**
- `store/play-icon-512.png` (512×512 app icon) and
  `store/play-feature-1024x500.png` (feature graphic).
- `store/privacy-policy.html` — host it publicly and use its URL.
- `store/PLAY_LISTING.md` — title, descriptions, data-safety answers.
- A signed `app-release.apk` if you want to sideload the exact release build to test.

## 0. Before you start
- **Google Play Developer account** — one-time **$25**, with identity
  verification that can take a few days: https://play.google.com/console/signup
- Decide on **Play App Signing** (recommended): Google holds the real app-signing
  key and you only ever use the upload key I generated. If your upload key is
  ever lost, Google can reset it. Enrolling is the default for new apps.

## 1. Host the privacy policy
Play requires a public privacy-policy URL. Easiest options:
- Put `privacy-policy.html` in a GitHub repo and enable **GitHub Pages**, or
- Paste its contents into a free host / Gist and get a public link.
Replace `YOUR-CONTACT-EMAIL` in the file first.

## 2. Create the app in Play Console
1. **All apps → Create app.** Name: *MCSR Ranked Explorer*. Type: App. Free.
2. Complete **Dashboard → "Set up your app"**:
   - **App access**: All functionality available without special access.
   - **Ads**: No ads.
   - **Content rating**: fill the questionnaire → expected **Everyone / PEGI 3**.
   - **Target audience**: 13+ is a safe choice (avoids "designed for children").
   - **Data safety**: **No data collected / no data shared** (see PLAY_LISTING.md).
   - **Privacy policy**: paste your hosted URL.

## 3. Store listing (Main store listing)
Copy from `store/PLAY_LISTING.md`:
- App name, short description, full description.
- **App icon**: `play-icon-512.png`.
- **Feature graphic**: `play-feature-1024x500.png`.
- **Phone screenshots**: at least 2 (I can generate a set from the app — just ask).
- Category: Sports or Entertainment. Contact email.

## 4. Upload the build
1. **Release → Testing → Internal testing** (recommended first — instant, up to
   100 testers by email) **or Production**.
2. **Create new release.**
3. If prompted, **enroll in Play App Signing** (recommended — accept the default).
4. **Upload `app-release.aab`.**
5. Release name is auto-filled from the version. Add release notes.
6. **Review release → Start rollout.**

Internal testing is live for testers within minutes. Production goes through
review (hours to a few days for a first submission).

## Your signing key
- Keystore: `upload.keystore`  ·  Alias: `upload`
- Store/key password: delivered privately with the file.
- SHA-256: `C7:08:34:B1:8A:0E:CD:B8:36:23:61:5A:F2:24:25:EE:82:4A:A7:12:A7:7A:58:CE:0E:04:4B:60:5D:60:17:3B`
- To rebuild the AAB yourself later: put `upload.keystore` in `android/keystore/`,
  recreate `android/keystore.properties` (see build.gradle), then
  `cd android && ./gradlew bundleRelease`.

## ⚠️ Important: trademark / IP review
The app uses the "MCSR Ranked" name and shows Minecraft player heads. You said
you have the MCSR developer's blessing — keep that in writing. Note separately
that **Minecraft** is Mojang/Microsoft's trademark. Google Play (and Mojang's
brand guidelines) can flag apps that use Minecraft branding or imply affiliation.
Mitigations already in place: the app states "Not affiliated with Mojang" in the
listing and privacy policy. If review pushes back, options are to adjust the
name/icon or add clearer disclaimers. This is the main risk to a smooth approval.

## App identity
- Package (applicationId): `com.mcsr.explorer`  (permanent once published)
- versionName: 1.6.0  ·  versionCode: auto (build timestamp)
