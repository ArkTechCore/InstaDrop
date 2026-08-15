# InstaDrop Android

Native Android share-target app for the InstaDrop Cloudflare backend.

## Flow

1. Open Instagram.
2. Tap share on a public post or Reel.
3. Choose InstaDrop.
4. InstaDrop receives the shared URL.
5. The app calls your Cloudflare backend at `/api/extract`.
6. Tap Download to save via Android Download Manager.

## Configure Backend URL

Edit `gradle.properties`:

```properties
INSTADROP_API_BASE=https://your-real-cloudflare-url
```

Use the deployed Cloudflare URL only. Do not include a trailing slash.

## Build APK

Open `android-app/` in Android Studio, let Gradle sync, then run:

```bash
./gradlew assembleDebug
```

The APK will be here:

```text
app/build/outputs/apk/debug/app-debug.apk
```

On Windows:

```powershell
.\gradlew.bat assembleDebug
```

## Notes

- No login.
- No database.
- No analytics.
- No extra third-party downloader API.
- The app uses only your Cloudflare backend plus Android system services.
- Instagram private/deleted/blocked posts stay unsupported.
