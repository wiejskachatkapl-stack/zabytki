const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const androidRoot = path.join(root, 'android');
const manifest = path.join(androidRoot, 'app', 'src', 'main', 'AndroidManifest.xml');
const appGradle = path.join(androidRoot, 'app', 'build.gradle');

if (!fs.existsSync(manifest)) {
  console.error('Brak AndroidManifest.xml. Najpierw uruchom 01_PRZYGOTUJ_ANDROID.bat');
  process.exit(1);
}

function addManifestPermission(xml, permission) {
  if (xml.includes(`android:name="${permission}"`)) return xml;
  return xml.replace(/<manifest([^>]*)>/, (m) => `${m}\n    <uses-permission android:name="${permission}" />`);
}

// 1. GPS + foreground navigation + notifications.
let xml = fs.readFileSync(manifest, 'utf8');
[
  'android.permission.ACCESS_COARSE_LOCATION',
  'android.permission.ACCESS_FINE_LOCATION',
  'android.permission.FOREGROUND_SERVICE',
  'android.permission.FOREGROUND_SERVICE_LOCATION',
  'android.permission.POST_NOTIFICATIONS',
  'android.permission.SYSTEM_ALERT_WINDOW'
].forEach((permission) => { xml = addManifestPermission(xml, permission); });

if (!xml.includes('android.hardware.location.gps')) {
  xml = xml.replace(/<manifest([^>]*)>/, (m) => `${m}\n    <uses-feature android:name="android.hardware.location.gps" android:required="false" />`);
}

// MainActivity: zachowujemy obsługę zmian konfiguracji, ale v1.0.35 nie korzysta już z PiP.
xml = xml.replace(/<activity\b([^>]*android:name=["'][^"']*MainActivity["'][^>]*)>/i, (tag) => {
  let next = tag.replace(/\s+android:supportsPictureInPicture=["'][^"']*["']/g, '');
  next = next.replace(/\s+android:windowSoftInputMode=["'][^"']*["']/g, '');
  next = next.replace('<activity', '<activity android:windowSoftInputMode="adjustResize"');
  const configMatch = next.match(/android:configChanges=["']([^"']*)["']/);
  const required = ['screenSize', 'smallestScreenSize', 'screenLayout', 'orientation'];
  if (configMatch) {
    const parts = configMatch[1].split('|').filter(Boolean);
    required.forEach((item) => { if (!parts.includes(item)) parts.push(item); });
    next = next.replace(configMatch[0], `android:configChanges="${parts.join('|')}"`);
  } else {
    next = next.replace('<activity', `<activity android:configChanges="${required.join('|')}"`);
  }
  return next;
});

if (!xml.includes('NavigationForegroundService')) {
  xml = xml.replace(
    /<\/application>/,
    '        <service android:name=".NavigationForegroundService" android:exported="false" android:foregroundServiceType="location" />\n    </application>'
  );
}

fs.writeFileSync(manifest, xml, 'utf8');
console.log('AndroidManifest.xml: GPS + foreground service + powiadomienia + overlay tła OK.');

// 2. Wersja techniczna Android.
if (fs.existsSync(appGradle)) {
  let gradle = fs.readFileSync(appGradle, 'utf8');
  gradle = gradle.replace(/versionCode\s+\d+/, 'versionCode 91');
  gradle = gradle.replace(/versionName\s+["'][^"']+["']/, 'versionName "1.0.90"');
  fs.writeFileSync(appGradle, gradle, 'utf8');
  console.log('app/build.gradle: versionCode 91, versionName 1.0.90.');
}

function findFile(dir, name) {
  if (!fs.existsSync(dir)) return null;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const found = findFile(full, name);
      if (found) return found;
    } else if (entry.name === name) {
      return full;
    }
  }
  return null;
}

const javaRoot = path.join(androidRoot, 'app', 'src', 'main', 'java');
const mainActivity = findFile(javaRoot, 'MainActivity.java');
if (!mainActivity) {
  console.warn('Nie znaleziono MainActivity.java – pominięto natywne rozszerzenia.');
  process.exit(0);
}

const original = fs.readFileSync(mainActivity, 'utf8');
const packageMatch = original.match(/^package\s+([^;]+);/m);
const packageName = packageMatch ? packageMatch[1].trim() : 'pl.rnapp.mapaatrakcjipolski';
const javaDir = path.dirname(mainActivity);

const activity = `package ${packageName};

import android.Manifest;
import android.app.PictureInPictureParams;
import android.content.Intent;
import android.content.pm.ActivityInfo;
import android.content.pm.PackageManager;
import android.content.res.Configuration;
import android.graphics.Color;
import android.net.Uri;
import android.provider.Settings;
import android.speech.RecognizerIntent;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.Rational;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.widget.Toast;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

import java.util.ArrayList;

public class MainActivity extends BridgeActivity {
    private static final int VOICE_ADDRESS_REQUEST_CODE = 6402;
    private final Handler navigationOrientationHandler = new Handler(Looper.getMainLooper());
    private boolean navigationLandscapeApplied = false;
    private boolean navigationPipEnabled = false;
    private boolean overlayPermissionRequestInProgress = false;

    private final Runnable navigationOrientationWatcher = new Runnable() {
        @Override
        public void run() {
            syncNavigationOrientationFromWebView();
            navigationOrientationHandler.postDelayed(this, 350);
        }
    };

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AppControlPlugin.class);
        super.onCreate(savedInstanceState);
        registerAndroidJavascriptBridge();
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        applyStatusBarSafeArea();
        hideNavigationBar();
        updatePictureInPictureParams();
    }

    @Override
    public void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != VOICE_ADDRESS_REQUEST_CODE) return;

        if (resultCode == RESULT_OK && data != null) {
            ArrayList<String> results = data.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS);
            if (results != null && !results.isEmpty()) {
                String spoken = results.get(0) == null ? "" : results.get(0).trim();
                if (!spoken.isEmpty()) {
                    deliverVoiceAddressResult(spoken);
                    return;
                }
            }
        }
        deliverVoiceAddressError("Nie rozpoznano adresu. Naciśnij mikrofon i spróbuj ponownie.");
    }

    @Override
    public void onResume() {
        super.onResume();
        registerAndroidJavascriptBridge();
        navigationOrientationHandler.removeCallbacks(navigationOrientationWatcher);
        navigationOrientationHandler.post(navigationOrientationWatcher);
        updatePictureInPictureParams();
        sendOverlayCommand(NavigationForegroundService.ACTION_HIDE_OVERLAY);
        if (overlayPermissionRequestInProgress) overlayPermissionRequestInProgress = false;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N && !isInPictureInPictureMode()) {
            setWebPictureInPictureMode(false);
        }
    }

    @Override
    public void onPause() {
        navigationOrientationHandler.removeCallbacks(navigationOrientationWatcher);
        if (navigationPipEnabled && !overlayPermissionRequestInProgress &&
            (Build.VERSION.SDK_INT < Build.VERSION_CODES.M || Settings.canDrawOverlays(this))) {
            sendOverlayCommand(NavigationForegroundService.ACTION_SHOW_OVERLAY);
        }
        super.onPause();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            applyStatusBarSafeArea();
            hideNavigationBar();
        }
    }

    @Override
    public void onUserLeaveHint() {
        super.onUserLeaveHint();
        showBackgroundNavigationOverlayIfAllowed();
    }

    @Override
    public void onStop() {
        showBackgroundNavigationOverlayIfAllowed();
        super.onStop();
    }

    private void showBackgroundNavigationOverlayIfAllowed() {
        if (!navigationPipEnabled || overlayPermissionRequestInProgress) return;
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M || Settings.canDrawOverlays(this)) {
            sendOverlayCommand(NavigationForegroundService.ACTION_SHOW_OVERLAY);
        }
    }

    @Override
    public void onPictureInPictureModeChanged(boolean isInPictureInPictureMode, Configuration newConfig) {
        super.onPictureInPictureModeChanged(isInPictureInPictureMode, newConfig);

        if (isInPictureInPictureMode) {
            // TYLKO w PiP zwalniamy blokadę poziomu i pozwalamy czujnikowi
            // obracać widok wraz z telefonem. Główna mapa nadal pozostaje LANDSCAPE.
            setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_FULL_SENSOR);
        } else {
            // Po powrocie z PiP natychmiast odtwarzamy wcześniejszą zasadę aplikacji:
            // mapa/nawigacja poziomo, pozostałe ekrany bez wymuszania.
            setRequestedOrientation(navigationLandscapeApplied
                ? ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE
                : ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED);
        }

        setWebPictureInPictureMode(isInPictureInPictureMode);
    }

    @Override
    public void onConfigurationChanged(Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
        updatePictureInPictureParams();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N && isInPictureInPictureMode()) {
            // Po obrocie urządzenia wymuszamy ponowne przeliczenie układu panelu PiP.
            setWebPictureInPictureMode(true);
        }
    }

    private Rational currentPictureInPictureRatio() {
        // Stałe szerokie okno nawigacyjne niezależnie od położenia telefonu.
        return new Rational(20, 9);
    }

    private PictureInPictureParams buildPictureInPictureParams(boolean autoEnter) {
        PictureInPictureParams.Builder builder = new PictureInPictureParams.Builder()
            .setAspectRatio(currentPictureInPictureRatio());
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            builder.setAutoEnterEnabled(false);
            builder.setSeamlessResizeEnabled(true);
        }
        return builder.build();
    }

    private void updatePictureInPictureParams() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        try {
            setPictureInPictureParams(buildPictureInPictureParams(true));
        } catch (Exception ignored) { }
    }

    private void setWebPictureInPictureMode(boolean active) {
        if (getBridge() == null || getBridge().getWebView() == null) return;
        final String value = active ? "true" : "false";
        getBridge().getWebView().post(() -> getBridge().getWebView().evaluateJavascript(
            "document.body.classList.toggle('android-pip-mode'," + value + ");window.dispatchEvent(new Event('resize'));",
            null
        ));
    }

    public void setNavigationPipEnabled(boolean enabled) {
        navigationPipEnabled = enabled;
        updatePictureInPictureParams();
        if (!enabled && Build.VERSION.SDK_INT >= Build.VERSION_CODES.N && isInPictureInPictureMode()) {
            moveTaskToBack(false);
        }
    }

    private void requestOverlayPermissionIfNeeded() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M || Settings.canDrawOverlays(this)) return;
        if (overlayPermissionRequestInProgress) return;
        overlayPermissionRequestInProgress = true;
        Toast.makeText(this, "Włącz: Wyświetlanie nad innymi aplikacjami – potrzebne dla obracanej nawigacji w tle.", Toast.LENGTH_LONG).show();
        try {
            Intent permissionIntent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                Uri.parse("package:" + getPackageName()));
            startActivity(permissionIntent);
        } catch (Exception ignored) {
            overlayPermissionRequestInProgress = false;
        }
    }

    private void sendOverlayCommand(String action) {
        Intent overlayIntent = new Intent(this, NavigationForegroundService.class).setAction(action);
        try { startService(overlayIntent); } catch (Exception ignored) { }
    }

    private void requestNotificationPermissionIfNeeded() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.POST_NOTIFICATIONS}, 6101);
        }
    }

    public void startBackgroundNavigation(String instruction, String road, String turnDistance, String remainingDistance, String remainingTime, String destination) {
        requestNotificationPermissionIfNeeded();
        requestOverlayPermissionIfNeeded();
        setNavigationPipEnabled(true);
        Intent intent = NavigationForegroundService.createIntent(this, NavigationForegroundService.ACTION_START,
            instruction, road, turnDistance, remainingDistance, remainingTime, destination);
        ContextCompat.startForegroundService(this, intent);
    }

    public void updateBackgroundNavigation(String instruction, String road, String turnDistance, String remainingDistance, String remainingTime, String destination) {
        Intent intent = NavigationForegroundService.createIntent(this, NavigationForegroundService.ACTION_UPDATE,
            instruction, road, turnDistance, remainingDistance, remainingTime, destination);
        try { startService(intent); } catch (Exception ignored) { }
    }

    public void stopBackgroundNavigation() {
        sendOverlayCommand(NavigationForegroundService.ACTION_HIDE_OVERLAY);
        setNavigationPipEnabled(false);
        Intent intent = new Intent(this, NavigationForegroundService.class).setAction(NavigationForegroundService.ACTION_STOP);
        try { startService(intent); } catch (Exception ignored) { stopService(intent); }
    }

    public void showAttractionAlert(String title, String text) {
        Intent intent = new Intent(this, NavigationForegroundService.class)
            .setAction(NavigationForegroundService.ACTION_ATTRACTION)
            .putExtra(NavigationForegroundService.EXTRA_ALERT_TITLE, title)
            .putExtra(NavigationForegroundService.EXTRA_ALERT_TEXT, text);
        try { startService(intent); } catch (Exception ignored) { }
    }

    public void setBackgroundAttractions(String attractionsJson, double radiusMeters) {
        Intent intent = new Intent(this, NavigationForegroundService.class)
            .setAction(NavigationForegroundService.ACTION_SET_ATTRACTIONS)
            .putExtra(NavigationForegroundService.EXTRA_ATTRACTIONS_JSON, attractionsJson == null ? "[]" : attractionsJson)
            .putExtra(NavigationForegroundService.EXTRA_ALERT_RADIUS, radiusMeters);
        try { startService(intent); } catch (Exception ignored) { }
    }

    public void setBackgroundSpeedControls(String controlsJson) {
        Intent intent = new Intent(this, NavigationForegroundService.class)
            .setAction(NavigationForegroundService.ACTION_SET_SPEED_CONTROLS)
            .putExtra(NavigationForegroundService.EXTRA_SPEED_CONTROLS_JSON, controlsJson == null ? "[]" : controlsJson);
        try { startService(intent); } catch (Exception ignored) { }
    }

    private void applyStatusBarSafeArea() {
        final View content = findViewById(android.R.id.content);
        if (content == null) return;

        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        ViewCompat.setOnApplyWindowInsetsListener(content, (v, windowInsets) -> {
            Insets topInsets = windowInsets.getInsets(
                WindowInsetsCompat.Type.statusBars() | WindowInsetsCompat.Type.displayCutout()
            );
            v.setPadding(0, topInsets.top, 0, 0);
            return windowInsets;
        });
        ViewCompat.requestApplyInsets(content);

        WindowInsetsControllerCompat bars = WindowCompat.getInsetsController(getWindow(), content);
        bars.setAppearanceLightStatusBars(true);
        getWindow().getDecorView().setBackgroundColor(Color.rgb(232, 238, 229));
    }

    private void registerAndroidJavascriptBridge() {
        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().addJavascriptInterface(new AndroidAppInterface(), "AndroidApp");
        }
    }

    public class AndroidAppInterface {
        @JavascriptInterface
        public void setNavigationLandscape(boolean active) {
            runOnUiThread(() -> {
                navigationLandscapeApplied = active;
                setRequestedOrientation(active
                    ? ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE
                    : ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED);
            });
        }

        @JavascriptInterface
        public void startBackgroundNavigation(String instruction, String road, String turnDistance, String remainingDistance, String remainingTime, String destination) {
            runOnUiThread(() -> MainActivity.this.startBackgroundNavigation(instruction, road, turnDistance, remainingDistance, remainingTime, destination));
        }

        @JavascriptInterface
        public void updateBackgroundNavigation(String instruction, String road, String turnDistance, String remainingDistance, String remainingTime, String destination) {
            MainActivity.this.updateBackgroundNavigation(instruction, road, turnDistance, remainingDistance, remainingTime, destination);
        }

        @JavascriptInterface
        public void stopBackgroundNavigation() {
            runOnUiThread(() -> MainActivity.this.stopBackgroundNavigation());
        }

        @JavascriptInterface
        public void showAttractionAlert(String title, String text) {
            MainActivity.this.showAttractionAlert(title, text);
        }

        @JavascriptInterface
        public void setBackgroundAttractions(String attractionsJson, double radiusMeters) {
            MainActivity.this.setBackgroundAttractions(attractionsJson, radiusMeters);
        }


        @JavascriptInterface
        public void setBackgroundSpeedControls(String controlsJson) {
            MainActivity.this.setBackgroundSpeedControls(controlsJson);
        }

        @JavascriptInterface
        public void startVoiceAddressSearch() {
            runOnUiThread(() -> MainActivity.this.startVoiceAddressSearch());
        }

        @JavascriptInterface
        public void closeApp() {
            runOnUiThread(() -> {
                navigationOrientationHandler.removeCallbacks(navigationOrientationWatcher);
                stopBackgroundNavigation();
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                    finishAndRemoveTask();
                } else {
                    finish();
                }
            });
        }
    }

    public void startVoiceAddressSearch() {
        Intent speechIntent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
        speechIntent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
        speechIntent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, "pl-PL");
        speechIntent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, "pl-PL");
        speechIntent.putExtra(RecognizerIntent.EXTRA_PROMPT, "Powiedz adres lub nazwę miejsca");
        speechIntent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 3);
        try {
            startActivityForResult(speechIntent, VOICE_ADDRESS_REQUEST_CODE);
        } catch (Exception error) {
            Toast.makeText(this, "Brak usługi rozpoznawania mowy na tym telefonie.", Toast.LENGTH_LONG).show();
            deliverVoiceAddressError("Na tym telefonie nie znaleziono usługi rozpoznawania mowy.");
        }
    }

    private void deliverVoiceAddressResult(String value) {
        evaluateVoiceAddressCallback("onAndroidVoiceAddressResult", value);
    }

    private void deliverVoiceAddressError(String value) {
        evaluateVoiceAddressCallback("onAndroidVoiceAddressError", value);
    }

    private void evaluateVoiceAddressCallback(String callbackName, String value) {
        if (getBridge() == null || getBridge().getWebView() == null) return;
        final String safeValue = org.json.JSONObject.quote(value == null ? "" : value);
        getBridge().getWebView().post(() -> {
            if (getBridge() == null || getBridge().getWebView() == null) return;
            getBridge().getWebView().evaluateJavascript(
                "(function(){if(window." + callbackName + "){window." + callbackName + "(" + safeValue + ");}})();",
                null
            );
        });
    }

    private void syncNavigationOrientationFromWebView() {
        if (getBridge() == null || getBridge().getWebView() == null) return;
        getBridge().getWebView().evaluateJavascript(
            "(function(){var m=document.getElementById('mapScreen');var e=document.getElementById('editScreen');return !!((m && !m.hidden) || (e && !e.hidden));})()",
            value -> {
                final boolean active = "true".equalsIgnoreCase(String.valueOf(value));
                if (active == navigationLandscapeApplied) return;
                navigationLandscapeApplied = active;
                setRequestedOrientation(active
                    ? ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE
                    : ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED);
            }
        );
    }

    private void hideNavigationBar() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            WindowInsetsController controller = getWindow().getInsetsController();
            if (controller != null) {
                controller.hide(WindowInsets.Type.navigationBars());
                controller.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            }
        } else {
            getWindow().getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
            );
        }
    }
}
`;

const plugin = `package ${packageName};

import android.app.Activity;
import android.os.Build;
import android.content.Context;
import android.content.SharedPreferences;
import android.speech.tts.TextToSpeech;

import java.util.Locale;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONArray;
import org.json.JSONObject;

@CapacitorPlugin(name = "AppControl")
public class AppControlPlugin extends Plugin {
    private TextToSpeech navigationTts;
    private boolean navigationTtsReady = false;
    private String pendingNavigationSpeech = null;

    private void ensureNavigationTts() {
        Activity activity = getActivity();
        if (activity == null || navigationTts != null) return;
        navigationTts = new TextToSpeech(activity.getApplicationContext(), status -> {
            navigationTtsReady = status == TextToSpeech.SUCCESS;
            if (!navigationTtsReady || navigationTts == null) return;
            navigationTts.setLanguage(new Locale("pl", "PL"));
            navigationTts.setSpeechRate(1.0f);
            String pending = pendingNavigationSpeech;
            pendingNavigationSpeech = null;
            if (pending != null && !pending.trim().isEmpty()) {
                navigationTts.speak(pending, TextToSpeech.QUEUE_FLUSH, null, "rnapp_navigation");
            }
        });
    }

    private String value(PluginCall call, String key, String fallback) {
        String result = call.getString(key);
        return result == null ? fallback : result;
    }

    private MainActivity mainActivity() {
        Activity activity = getActivity();
        return activity instanceof MainActivity ? (MainActivity) activity : null;
    }

    @PluginMethod
    public void startBackgroundNavigation(PluginCall call) {
        MainActivity activity = mainActivity();
        if (activity != null) {
            activity.runOnUiThread(() -> activity.startBackgroundNavigation(
                value(call, "instruction", "Nawigacja aktywna"),
                value(call, "road", ""),
                value(call, "turnDistance", ""),
                value(call, "remainingDistance", ""),
                value(call, "remainingTime", ""),
                value(call, "destination", "Cel podróży")
            ));
        }
        call.resolve();
    }

    @PluginMethod
    public void updateBackgroundNavigation(PluginCall call) {
        MainActivity activity = mainActivity();
        if (activity != null) {
            activity.updateBackgroundNavigation(
                value(call, "instruction", "Nawigacja aktywna"),
                value(call, "road", ""),
                value(call, "turnDistance", ""),
                value(call, "remainingDistance", ""),
                value(call, "remainingTime", ""),
                value(call, "destination", "Cel podróży")
            );
        }
        call.resolve();
    }

    @PluginMethod
    public void stopBackgroundNavigation(PluginCall call) {
        MainActivity activity = mainActivity();
        if (activity != null) activity.runOnUiThread(activity::stopBackgroundNavigation);
        call.resolve();
    }

    @PluginMethod
    public void showAttractionAlert(PluginCall call) {
        MainActivity activity = mainActivity();
        if (activity != null) {
            activity.showAttractionAlert(
                value(call, "title", "Atrakcja w pobliżu"),
                value(call, "text", "Ciekawe miejsce w pobliżu")
            );
        }
        call.resolve();
    }

    @PluginMethod
    public void setBackgroundAttractions(PluginCall call) {
        MainActivity activity = mainActivity();
        Double radius = call.getDouble("radiusMeters");
        if (activity != null) {
            activity.setBackgroundAttractions(
                value(call, "attractionsJson", "[]"),
                radius == null ? 5000.0 : radius
            );
        }
        call.resolve();
    }


    @PluginMethod
    public void setBackgroundSpeedControls(PluginCall call) {
        MainActivity activity = mainActivity();
        if (activity != null) activity.setBackgroundSpeedControls(value(call, "controlsJson", "[]"));
        call.resolve();
    }

    private static final String INTEREST_PREFS = "rnapp_interests";
    private static final String INTEREST_ITEMS = "saved_interests";
    private static final String PENDING_ATTRACTION = "pending_attraction";

    private SharedPreferences interestPrefs() {
        Activity activity = getActivity();
        return activity == null ? null : activity.getSharedPreferences(INTEREST_PREFS, Context.MODE_PRIVATE);
    }

    private JSONArray mergeInterestJson(String rawArray, String attractionJson) {
        JSONArray source;
        try { source = new JSONArray(rawArray == null ? "[]" : rawArray); } catch (Exception e) { source = new JSONArray(); }
        JSONObject incoming;
        try { incoming = new JSONObject(attractionJson == null ? "{}" : attractionJson); } catch (Exception e) { incoming = new JSONObject(); }
        String id = incoming.optString("id", incoming.optString("osmId", "")).trim();
        if (id.isEmpty()) return source;
        JSONArray result = new JSONArray();
        result.put(incoming);
        for (int i = 0; i < source.length(); i++) {
            JSONObject item = source.optJSONObject(i);
            if (item == null) continue;
            String existingId = item.optString("id", item.optString("osmId", "")).trim();
            if (!id.equals(existingId)) result.put(item);
        }
        return result;
    }

    @PluginMethod
    public void saveInterest(PluginCall call) {
        SharedPreferences prefs = interestPrefs();
        if (prefs != null) {
            String attractionJson = value(call, "attractionJson", "{}");
            JSONArray merged = mergeInterestJson(prefs.getString(INTEREST_ITEMS, "[]"), attractionJson);
            prefs.edit().putString(INTEREST_ITEMS, merged.toString()).apply();
        }
        call.resolve();
    }

    @PluginMethod
    public void removeInterest(PluginCall call) {
        SharedPreferences prefs = interestPrefs();
        String removeId = value(call, "id", "").trim();
        if (prefs != null && !removeId.isEmpty()) {
            JSONArray source;
            try { source = new JSONArray(prefs.getString(INTEREST_ITEMS, "[]")); } catch (Exception e) { source = new JSONArray(); }
            JSONArray result = new JSONArray();
            for (int i = 0; i < source.length(); i++) {
                JSONObject item = source.optJSONObject(i);
                if (item == null) continue;
                String id = item.optString("id", item.optString("osmId", "")).trim();
                if (!removeId.equals(id)) result.put(item);
            }
            prefs.edit().putString(INTEREST_ITEMS, result.toString()).apply();
        }
        call.resolve();
    }

    @PluginMethod
    public void getSavedInterests(PluginCall call) {
        SharedPreferences prefs = interestPrefs();
        JSObject result = new JSObject();
        result.put("itemsJson", prefs == null ? "[]" : prefs.getString(INTEREST_ITEMS, "[]"));
        call.resolve(result);
    }

    @PluginMethod
    public void consumePendingAttraction(PluginCall call) {
        SharedPreferences prefs = interestPrefs();
        String json = prefs == null ? "" : prefs.getString(PENDING_ATTRACTION, "");
        if (prefs != null && !json.isEmpty()) prefs.edit().remove(PENDING_ATTRACTION).apply();
        JSObject result = new JSObject();
        result.put("attractionJson", json == null ? "" : json);
        call.resolve(result);
    }

    @PluginMethod
    public void startVoiceAddressSearch(PluginCall call) {
        MainActivity activity = mainActivity();
        if (activity != null) {
            activity.runOnUiThread(activity::startVoiceAddressSearch);
        }
        call.resolve();
    }

    @PluginMethod
    public void speakNavigation(PluginCall call) {
        String text = value(call, "text", "").trim();
        Activity activity = getActivity();
        if (activity != null && !text.isEmpty()) {
            activity.runOnUiThread(() -> {
                ensureNavigationTts();
                if (navigationTtsReady && navigationTts != null) {
                    navigationTts.speak(text, TextToSpeech.QUEUE_FLUSH, null, "rnapp_navigation");
                } else {
                    pendingNavigationSpeech = text;
                }
            });
        }
        call.resolve();
    }

    @PluginMethod
    public void stopNavigationSpeech(PluginCall call) {
        Activity activity = getActivity();
        if (activity != null) {
            activity.runOnUiThread(() -> {
                pendingNavigationSpeech = null;
                if (navigationTts != null) navigationTts.stop();
            });
        }
        call.resolve();
    }

    @PluginMethod
    public void closeApp(PluginCall call) {
        final Activity activity = getActivity();
        call.resolve();
        if (activity == null) return;
        activity.runOnUiThread(() -> {
            if (activity instanceof MainActivity) ((MainActivity) activity).stopBackgroundNavigation();
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                activity.finishAndRemoveTask();
            } else {
                activity.finish();
            }
        });
    }
}
`;

const service = `package ${packageName};

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.speech.tts.TextToSpeech;

import java.util.Locale;
import android.content.pm.PackageManager;
import android.content.pm.ServiceInfo;
import android.content.res.Configuration;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.graphics.drawable.GradientDrawable;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.provider.Settings;
import android.util.DisplayMetrics;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;

public class NavigationForegroundService extends Service {
    public static final String ACTION_START = "${packageName}.navigation.START";
    public static final String ACTION_UPDATE = "${packageName}.navigation.UPDATE";
    public static final String ACTION_STOP = "${packageName}.navigation.STOP";
    public static final String ACTION_ATTRACTION = "${packageName}.navigation.ATTRACTION";
    public static final String ACTION_SET_ATTRACTIONS = "${packageName}.navigation.SET_ATTRACTIONS";
    public static final String ACTION_SET_SPEED_CONTROLS = "${packageName}.navigation.SET_SPEED_CONTROLS";
    public static final String ACTION_SHOW_OVERLAY = "${packageName}.navigation.SHOW_OVERLAY";
    public static final String ACTION_HIDE_OVERLAY = "${packageName}.navigation.HIDE_OVERLAY";

    public static final String EXTRA_INSTRUCTION = "instruction";
    public static final String EXTRA_ROAD = "road";
    public static final String EXTRA_TURN_DISTANCE = "turnDistance";
    public static final String EXTRA_REMAINING_DISTANCE = "remainingDistance";
    public static final String EXTRA_REMAINING_TIME = "remainingTime";
    public static final String EXTRA_DESTINATION = "destination";
    public static final String EXTRA_ALERT_TITLE = "alertTitle";
    public static final String EXTRA_ALERT_TEXT = "alertText";
    public static final String EXTRA_ATTRACTIONS_JSON = "attractionsJson";
    public static final String EXTRA_ALERT_RADIUS = "alertRadius";
    public static final String EXTRA_SPEED_CONTROLS_JSON = "speedControlsJson";

    private static final String CHANNEL_ACTIVE = "navigation_active";
    private static final String LEGACY_CHANNEL_MANEUVER = "navigation_maneuvers";
    private static final String CHANNEL_ATTRACTION = "navigation_attractions";
    private static final int FOREGROUND_ID = 2701;
    private static int attractionId = 2800;
    private static final String INTEREST_PREFS = "rnapp_interests";
    private static final String INTEREST_ITEMS = "saved_interests";
    private static final String PENDING_ATTRACTION = "pending_attraction";

    private String instruction = "Nawigacja aktywna";
    private String road = "";
    private String turnDistance = "";
    private String remainingDistance = "";
    private String remainingTime = "";
    private String destination = "Cel podróży";

    private WindowManager windowManager;
    private FrameLayout overlayRoot;
    private LinearLayout overlayPanel;
    private WindowManager.LayoutParams overlayParams;
    private TextView arrowView;
    private TextView destinationView;
    private TextView instructionView;
    private TextView roadView;
    private TextView turnDistanceView;
    private TextView remainingDistanceView;
    private TextView remainingTimeView;
    private TextView speedView;
    private TextView speedControlView;
    private double backgroundGpsSpeedKmh = 0.0;
    private Location previousSpeedLocation = null;
    private SensorManager sensorManager;
    private Sensor accelerometer;
    private SensorEventListener sensorListener;
    private int lastPhysicalRotation = 0;
    private float filteredX = 0f;
    private float filteredY = 0f;
    private boolean sensorSeeded = false;
    private boolean overlayVisible = false;
    // v1.0.44: natywne alerty atrakcji tylko w tle; bez pobierania zdjęć.
    private boolean appInForeground = true;

    // v1.0.38: pozycja panelu nawigacji zapamiętywana podczas przeciągania.
    private int savedOverlayX = 0;
    private int savedOverlayY = 0;
    private float dragStartRawX = 0f;
    private float dragStartRawY = 0f;
    private int dragStartOverlayX = 0;
    private int dragStartOverlayY = 0;
    private boolean overlayDragged = false;

    // v1.0.39: osobny baner atrakcji + natywna kolejka alertów działająca także przy uśpionym WebView.
    private FrameLayout attractionRoot;
    private LinearLayout attractionPanel;
    private WindowManager.LayoutParams attractionParams;
    private TextView attractionTitleView;
    private TextView attractionTextView;
    private TextView attractionShowButton;
    private TextView attractionInterestButton;
    private QueuedAttractionAlert currentAttractionAlert;
    private boolean attractionVisible = false;
    private final Handler attractionHandler = new Handler(Looper.getMainLooper());
    private final ArrayDeque<QueuedAttractionAlert> attractionQueue = new ArrayDeque<>();
    private final Runnable hideAttractionRunnable = () -> {
        hideAttractionOverlayNow();
        attractionHandler.postDelayed(this::showNextQueuedAttraction, 650);
    };

    private LocationManager locationManager;
    private LocationListener backgroundLocationListener;
    private boolean backgroundLocationRegistered = false;
    private final List<BackgroundAttraction> backgroundAttractions = new ArrayList<>();
    private final HashSet<String> backgroundAlertedIds = new HashSet<>();
    private double backgroundAlertRadiusMeters = 5000.0;
    private final List<BackgroundSpeedControl> backgroundSpeedControls = new ArrayList<>();
    private final HashSet<String> backgroundSpeedAlertedIds = new HashSet<>();
    private String activeBackgroundOppId = "";

    private static class BackgroundAttraction {
        final String id;
        final String name;
        final String type;
        final String category;
        final double lat;
        final double lon;

        BackgroundAttraction(String id, String name, String type, String category, double lat, double lon) {
            this.id = id;
            this.name = name;
            this.type = type;
            this.category = category;
            this.lat = lat;
            this.lon = lon;
        }
    }


    private static class BackgroundSpeedControl {
        final String id;
        final String kind;
        final double lat;
        final double lon;
        final double startLat;
        final double startLon;
        final double endLat;
        final double endLon;
        final int maxspeed;
        final double routeBearing;
        final double lengthMeters;

        BackgroundSpeedControl(String id, String kind, double lat, double lon,
                               double startLat, double startLon, double endLat, double endLon,
                               int maxspeed, double routeBearing, double lengthMeters) {
            this.id = id; this.kind = kind; this.lat = lat; this.lon = lon;
            this.startLat = startLat; this.startLon = startLon; this.endLat = endLat; this.endLon = endLon;
            this.maxspeed = maxspeed; this.routeBearing = routeBearing; this.lengthMeters = lengthMeters;
        }
    }

    private static class QueuedAttractionAlert {
        final String title;
        final String text;
        final BackgroundAttraction attraction;

        QueuedAttractionAlert(String title, String text, BackgroundAttraction attraction) {
            this.title = title;
            this.text = text;
            this.attraction = attraction;
        }
    }

    public static Intent createIntent(Context context, String action, String instruction, String road, String turnDistance,
                                      String remainingDistance, String remainingTime, String destination) {
        return new Intent(context, NavigationForegroundService.class)
            .setAction(action)
            .putExtra(EXTRA_INSTRUCTION, instruction)
            .putExtra(EXTRA_ROAD, road)
            .putExtra(EXTRA_TURN_DISTANCE, turnDistance)
            .putExtra(EXTRA_REMAINING_DISTANCE, remainingDistance)
            .putExtra(EXTRA_REMAINING_TIME, remainingTime)
            .putExtra(EXTRA_DESTINATION, destination);
    }

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannels();
        windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);
        sensorManager = (SensorManager) getSystemService(SENSOR_SERVICE);
        accelerometer = sensorManager == null ? null : sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER);
        sensorListener = new SensorEventListener() {
            @Override
            public void onSensorChanged(SensorEvent event) {
                if (!overlayVisible || event == null || event.values == null || event.values.length < 2) return;
                float x = event.values[0];
                float y = event.values[1];
                if (!sensorSeeded) {
                    filteredX = x;
                    filteredY = y;
                    sensorSeeded = true;
                } else {
                    filteredX = filteredX * 0.82f + x * 0.18f;
                    filteredY = filteredY * 0.82f + y * 0.18f;
                }

                float ax = Math.abs(filteredX);
                float ay = Math.abs(filteredY);
                int physicalRotation = lastPhysicalRotation;
                if (ax > 5.2f && ax > ay * 1.18f) {
                    physicalRotation = filteredX > 0 ? 90 : -90;
                } else if (ay > 5.2f && ay > ax * 1.18f) {
                    physicalRotation = 0;
                }

                if (physicalRotation != lastPhysicalRotation) {
                    lastPhysicalRotation = physicalRotation;
                    applyOverlayGeometry();
                    if (attractionVisible) applyAttractionGeometry();
                }
            }

            @Override
            public void onAccuracyChanged(Sensor sensor, int accuracy) { }
        };

        locationManager = (LocationManager) getSystemService(LOCATION_SERVICE);
        backgroundLocationListener = new LocationListener() {
            @Override
            public void onLocationChanged(Location location) {
                updateBackgroundGpsSpeed(location);
                processBackgroundAttractions(location);
                processBackgroundSpeedControls(location);
            }

            @Override
            public void onStatusChanged(String provider, int status, Bundle extras) { }

            @Override
            public void onProviderEnabled(String provider) { }

            @Override
            public void onProviderDisabled(String provider) { }
        };
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent == null ? ACTION_UPDATE : intent.getAction();
        if (ACTION_STOP.equals(action)) {
            stopBackgroundLocationTracking();
            backgroundGpsSpeedKmh = 0.0;
            previousSpeedLocation = null;
            backgroundAttractions.clear();
            backgroundAlertedIds.clear();
            backgroundSpeedControls.clear();
            backgroundSpeedAlertedIds.clear();
            activeBackgroundOppId = "";
            hideSpeedControlView();
            attractionQueue.clear();
            hideAttractionOverlay();
            hideOverlay();
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) stopForeground(STOP_FOREGROUND_REMOVE);
            else stopForeground(true);
            stopSelf();
            return START_NOT_STICKY;
        }

        if (ACTION_SHOW_OVERLAY.equals(action)) {
            appInForeground = false;
            showOverlay();
            Location last = bestLastKnownLocation();
            if (last != null) {
                processBackgroundAttractions(last);
                processBackgroundSpeedControls(last);
            }
            return START_STICKY;
        }
        if (ACTION_HIDE_OVERLAY.equals(action)) {
            appInForeground = true;
            attractionHandler.removeCallbacks(hideAttractionRunnable);
            attractionQueue.clear();
            hideAttractionOverlayNow();
            hideOverlay();
            return START_STICKY;
        }

        if (ACTION_SET_ATTRACTIONS.equals(action)) {
            if (intent != null) {
                updateBackgroundAttractions(
                    intent.getStringExtra(EXTRA_ATTRACTIONS_JSON),
                    intent.getDoubleExtra(EXTRA_ALERT_RADIUS, backgroundAlertRadiusMeters)
                );
                startBackgroundLocationTracking();
            }
            return START_STICKY;
        }


        if (ACTION_SET_SPEED_CONTROLS.equals(action)) {
            if (intent != null) {
                updateBackgroundSpeedControls(intent.getStringExtra(EXTRA_SPEED_CONTROLS_JSON));
                startBackgroundLocationTracking();
            }
            return START_STICKY;
        }

        if (ACTION_ATTRACTION.equals(action)) {
            if (!appInForeground && intent != null) {
                String alertTitle = safe(intent.getStringExtra(EXTRA_ALERT_TITLE), "Atrakcja w pobliżu");
                String alertText = safe(intent.getStringExtra(EXTRA_ALERT_TEXT), "Ciekawe miejsce w pobliżu");
                enqueueAttractionAlert(alertTitle, alertText);
            }
            return START_STICKY;
        }

        if (intent != null) {
            instruction = safe(intent.getStringExtra(EXTRA_INSTRUCTION), instruction);
            road = safe(intent.getStringExtra(EXTRA_ROAD), road);
            turnDistance = safe(intent.getStringExtra(EXTRA_TURN_DISTANCE), turnDistance);
            remainingDistance = safe(intent.getStringExtra(EXTRA_REMAINING_DISTANCE), remainingDistance);
            remainingTime = safe(intent.getStringExtra(EXTRA_REMAINING_TIME), remainingTime);
            destination = safe(intent.getStringExtra(EXTRA_DESTINATION), destination);
        }
        updateOverlayTexts();

        Notification notification = buildNavigationNotification();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(FOREGROUND_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION);
        } else {
            startForeground(FOREGROUND_ID, notification);
        }

        if (ACTION_START.equals(action)) {
            backgroundAlertedIds.clear();
            attractionQueue.clear();
            startBackgroundLocationTracking();
        }

        return START_STICKY;
    }

    private int dp(float value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    private TextView text(String value, float sp, boolean bold) {
        TextView view = new TextView(this);
        view.setText(value);
        view.setTextColor(Color.WHITE);
        view.setTextSize(sp);
        if (bold) view.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
        view.setGravity(Gravity.CENTER_VERTICAL);
        view.setSingleLine(true);
        view.setEllipsize(android.text.TextUtils.TruncateAt.END);
        return view;
    }

    private View spacer(int widthDp) {
        View view = new View(this);
        view.setLayoutParams(new LinearLayout.LayoutParams(dp(widthDp), 1));
        return view;
    }

    private void ensureOverlayView() {
        if (overlayRoot != null) return;

        overlayRoot = new FrameLayout(this);
        overlayRoot.setClipChildren(false);
        overlayRoot.setClipToPadding(false);
        overlayPanel = new LinearLayout(this);
        overlayPanel.setOrientation(LinearLayout.VERTICAL);
        overlayPanel.setPadding(dp(10), dp(6), dp(10), dp(6));
        GradientDrawable bg = new GradientDrawable();
        bg.setColor(Color.rgb(7, 72, 52));
        bg.setCornerRadius(dp(18));
        bg.setStroke(dp(1), Color.argb(90, 255, 255, 255));
        overlayPanel.setBackground(bg);

        LinearLayout top = new LinearLayout(this);
        top.setOrientation(LinearLayout.HORIZONTAL);
        top.setGravity(Gravity.CENTER_VERTICAL);

        arrowView = text("↑", 34, true);
        arrowView.setGravity(Gravity.CENTER);
        top.addView(arrowView, new LinearLayout.LayoutParams(dp(50), dp(60)));

        LinearLayout center = new LinearLayout(this);
        center.setOrientation(LinearLayout.VERTICAL);
        center.setGravity(Gravity.CENTER_VERTICAL);
        destinationView = text("CEL", 10, true);
        instructionView = text("jedź prosto", 17, true);
        roadView = text("", 10, true);
        center.addView(destinationView, new LinearLayout.LayoutParams(-1, dp(17)));
        center.addView(instructionView, new LinearLayout.LayoutParams(-1, dp(27)));
        center.addView(roadView, new LinearLayout.LayoutParams(-1, dp(17)));
        top.addView(center, new LinearLayout.LayoutParams(0, dp(62), 1f));

        View divider = new View(this);
        divider.setBackgroundColor(Color.argb(85, 255, 255, 255));
        top.addView(divider, new LinearLayout.LayoutParams(dp(1), dp(56)));

        LinearLayout turn = new LinearLayout(this);
        turn.setOrientation(LinearLayout.VERTICAL);
        turn.setGravity(Gravity.CENTER);
        TextView turnLabel = text("MANEWR ZA", 9, true);
        turnLabel.setTextColor(Color.rgb(205, 213, 209));
        turnLabel.setGravity(Gravity.CENTER);
        turnDistanceView = text("—", 19, true);
        turnDistanceView.setGravity(Gravity.CENTER);
        turn.addView(turnLabel, new LinearLayout.LayoutParams(-1, dp(20)));
        turn.addView(turnDistanceView, new LinearLayout.LayoutParams(-1, dp(38)));
        top.addView(turn, new LinearLayout.LayoutParams(dp(86), dp(60)));

        overlayPanel.addView(top, new LinearLayout.LayoutParams(-1, dp(64)));

        View horizontal = new View(this);
        horizontal.setBackgroundColor(Color.argb(75, 255, 255, 255));
        LinearLayout.LayoutParams hParams = new LinearLayout.LayoutParams(-1, dp(1));
        hParams.setMargins(0, dp(1), 0, dp(2));
        overlayPanel.addView(horizontal, hParams);

        speedControlView = text("", 11, true);
        speedControlView.setGravity(Gravity.CENTER);
        speedControlView.setTextColor(Color.rgb(30, 35, 24));
        speedControlView.setPadding(dp(6), dp(2), dp(6), dp(2));
        speedControlView.setVisibility(View.GONE);
        overlayPanel.addView(speedControlView, new LinearLayout.LayoutParams(-1, dp(24)));

        LinearLayout bottom = new LinearLayout(this);
        bottom.setOrientation(LinearLayout.HORIZONTAL);
        bottom.setGravity(Gravity.CENTER_VERTICAL);
        remainingDistanceView = text("— DO CELU", 12, true);
        speedView = text("0 km/h", 15, true);
        speedView.setGravity(Gravity.CENTER);
        remainingTimeView = text("— CZAS", 12, true);
        remainingTimeView.setGravity(Gravity.RIGHT | Gravity.CENTER_VERTICAL);
        bottom.addView(remainingDistanceView, new LinearLayout.LayoutParams(0, dp(30), 1f));
        bottom.addView(speedView, new LinearLayout.LayoutParams(0, dp(30), 0.78f));
        bottom.addView(remainingTimeView, new LinearLayout.LayoutParams(0, dp(30), 1f));
        overlayPanel.addView(bottom, new LinearLayout.LayoutParams(-1, dp(32)));

        overlayRoot.addView(overlayPanel);

        // v1.0.38: cały panel można przeciągać po ekranie.
        // Krótkie dotknięcie bez przesunięcia nadal otwiera aplikację.
        overlayRoot.setOnTouchListener((v, event) -> {
            if (overlayParams == null || windowManager == null || event == null) return false;
            switch (event.getActionMasked()) {
                case MotionEvent.ACTION_DOWN:
                    dragStartRawX = event.getRawX();
                    dragStartRawY = event.getRawY();
                    dragStartOverlayX = overlayParams.x;
                    dragStartOverlayY = overlayParams.y;
                    overlayDragged = false;
                    return true;

                case MotionEvent.ACTION_MOVE:
                    float dx = event.getRawX() - dragStartRawX;
                    float dy = event.getRawY() - dragStartRawY;
                    if (!overlayDragged && (Math.abs(dx) > dp(5) || Math.abs(dy) > dp(5))) {
                        overlayDragged = true;
                    }
                    if (overlayDragged) {
                        overlayParams.x = dragStartOverlayX + Math.round(dx);
                        overlayParams.y = dragStartOverlayY + Math.round(dy);
                        clampOverlayPosition();
                        savedOverlayX = overlayParams.x;
                        savedOverlayY = overlayParams.y;
                        try { windowManager.updateViewLayout(overlayRoot, overlayParams); } catch (Exception ignored) { }
                    }
                    return true;

                case MotionEvent.ACTION_UP:
                case MotionEvent.ACTION_CANCEL:
                    if (!overlayDragged && event.getActionMasked() == MotionEvent.ACTION_UP) openMainApp();
                    savedOverlayX = overlayParams.x;
                    savedOverlayY = overlayParams.y;
                    return true;

                default:
                    return true;
            }
        });
    }

    private String arrowForInstruction() {
        String lower = instruction == null ? "" : instruction.toLowerCase();
        if (lower.contains("zawr")) return "↶";
        if (lower.contains("rond")) return "↻";
        if (lower.contains("lewo")) return "←";
        if (lower.contains("prawo")) return "→";
        return "↑";
    }

    private void updateOverlayTexts() {
        if (overlayRoot == null) return;
        arrowView.setText(arrowForInstruction());
        destinationView.setText("CEL  " + destination);
        instructionView.setText(instruction);
        roadView.setText(road);
        turnDistanceView.setText(turnDistance.isEmpty() ? "—" : turnDistance);
        remainingDistanceView.setText((remainingDistance.isEmpty() ? "—" : remainingDistance) + "  DO CELU");
        if (speedView != null) speedView.setText(Math.max(0, Math.round(backgroundGpsSpeedKmh)) + " km/h");
        remainingTimeView.setText((remainingTime.isEmpty() ? "—" : remainingTime) + "  CZAS");
    }

    private boolean canOverlay() {
        return Build.VERSION.SDK_INT < Build.VERSION_CODES.M || Settings.canDrawOverlays(this);
    }

    private void showOverlay() {
        if (!canOverlay() || windowManager == null) return;
        ensureOverlayView();
        updateOverlayTexts();
        if (!overlayVisible) {
            int type = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
                : WindowManager.LayoutParams.TYPE_PHONE;
            overlayParams = new WindowManager.LayoutParams(
                dp(420), dp(118), type,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE |
                WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL |
                WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN |
                WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
                PixelFormat.TRANSLUCENT
            );
            overlayParams.gravity = Gravity.CENTER;
            overlayParams.x = savedOverlayX;
            overlayParams.y = savedOverlayY;
            try {
                windowManager.addView(overlayRoot, overlayParams);
                overlayVisible = true;
            } catch (Exception ignored) { return; }
        }
        sensorSeeded = false;
        if (sensorManager != null && accelerometer != null && sensorListener != null) {
            try { sensorManager.registerListener(sensorListener, accelerometer, SensorManager.SENSOR_DELAY_UI); } catch (Exception ignored) { }
        }
        applyOverlayGeometry();
    }

    private void hideOverlay() {
        if (sensorManager != null && sensorListener != null) {
            try { sensorManager.unregisterListener(sensorListener); } catch (Exception ignored) { }
        }
        if (overlayVisible && overlayRoot != null && windowManager != null) {
            if (overlayParams != null) {
                savedOverlayX = overlayParams.x;
                savedOverlayY = overlayParams.y;
            }
            try { windowManager.removeView(overlayRoot); } catch (Exception ignored) { }
        }
        overlayVisible = false;
        lastPhysicalRotation = 0;
        sensorSeeded = false;
    }

    private void applyOverlayGeometry() {
        if (!overlayVisible || overlayRoot == null || overlayPanel == null || overlayParams == null || windowManager == null) return;

        DisplayMetrics dm = new DisplayMetrics();
        try {
            windowManager.getDefaultDisplay().getRealMetrics(dm);
        } catch (Exception ignored) {
            dm.setTo(getResources().getDisplayMetrics());
        }
        int screenW = Math.max(1, dm.widthPixels);
        int screenH = Math.max(1, dm.heightPixels);
        boolean systemLandscape = screenW > screenH ||
            getResources().getConfiguration().orientation == Configuration.ORIENTATION_LANDSCAPE;

        int shortSide = Math.min(screenW, screenH);
        int longSide = Math.max(screenW, screenH);
        boolean radarRowVisible = speedControlView != null && speedControlView.getVisibility() == View.VISIBLE;
        int panelHigh = Math.min(dp(radarRowVisible ? 146 : 122), Math.round(shortSide * (radarRowVisible ? 0.36f : 0.30f)));
        panelHigh = Math.max(dp(radarRowVisible ? 130 : 108), panelHigh);

        // Gdy launcher pozostaje pionowy, a telefon fizycznie jest poziomo,
        // okno systemowe staje się pionowym prostokątem, a sam zielony panel
        // obracamy o 90 stopni. Po obróceniu telefonu wygląda dzięki temu poziomo.
        boolean rotateInsideLockedPortrait = !systemLandscape && lastPhysicalRotation != 0;

        FrameLayout.LayoutParams childParams;
        if (rotateInsideLockedPortrait) {
            int panelWide = Math.min(Math.round(longSide * 0.50f), dp(520));
            panelWide = Math.max(Math.round(longSide * 0.42f), panelWide);
            overlayParams.width = panelHigh;
            overlayParams.height = panelWide;
            childParams = new FrameLayout.LayoutParams(panelWide, panelHigh, Gravity.CENTER);
            overlayPanel.setRotation(lastPhysicalRotation);
        } else {
            int availableWidth = systemLandscape ? screenW : shortSide;
            int panelWide = Math.round(availableWidth * (systemLandscape ? 0.50f : 0.64f));
            overlayParams.width = panelWide;
            overlayParams.height = panelHigh;
            childParams = new FrameLayout.LayoutParams(panelWide, panelHigh, Gravity.CENTER);
            overlayPanel.setRotation(0f);
        }

        overlayPanel.setPivotX(childParams.width / 2f);
        overlayPanel.setPivotY(childParams.height / 2f);
        overlayPanel.setLayoutParams(childParams);
        overlayRoot.requestLayout();
        overlayPanel.requestLayout();
        clampOverlayPosition();
        savedOverlayX = overlayParams.x;
        savedOverlayY = overlayParams.y;
        try { windowManager.updateViewLayout(overlayRoot, overlayParams); } catch (Exception ignored) { }
    }

    private void clampOverlayPosition() {
        if (overlayParams == null || windowManager == null) return;
        DisplayMetrics dm = new DisplayMetrics();
        try {
            windowManager.getDefaultDisplay().getRealMetrics(dm);
        } catch (Exception ignored) {
            dm.setTo(getResources().getDisplayMetrics());
        }
        int maxX = Math.max(0, (dm.widthPixels - Math.max(1, overlayParams.width)) / 2);
        int maxY = Math.max(0, (dm.heightPixels - Math.max(1, overlayParams.height)) / 2);
        overlayParams.x = Math.max(-maxX, Math.min(maxX, overlayParams.x));
        overlayParams.y = Math.max(-maxY, Math.min(maxY, overlayParams.y));
    }

    private JSONObject attractionJson(BackgroundAttraction attraction) {
        JSONObject item = new JSONObject();
        if (attraction == null) return item;
        try {
            item.put("id", attraction.id);
            item.put("osmId", attraction.id);
            item.put("name", attraction.name);
            item.put("type", attraction.type);
            item.put("category", attraction.category);
            item.put("lat", attraction.lat);
            item.put("lon", attraction.lon);
            item.put("savedAt", System.currentTimeMillis());
        } catch (Exception ignored) { }
        return item;
    }

    private void saveInterestedAttraction(BackgroundAttraction attraction) {
        if (attraction == null) return;
        SharedPreferences prefs = getSharedPreferences(INTEREST_PREFS, MODE_PRIVATE);
        JSONArray source;
        try { source = new JSONArray(prefs.getString(INTEREST_ITEMS, "[]")); } catch (Exception e) { source = new JSONArray(); }
        JSONArray result = new JSONArray();
        result.put(attractionJson(attraction));
        for (int i = 0; i < source.length(); i++) {
            JSONObject item = source.optJSONObject(i);
            if (item == null) continue;
            String id = item.optString("id", item.optString("osmId", "")).trim();
            if (!attraction.id.equals(id)) result.put(item);
        }
        prefs.edit().putString(INTEREST_ITEMS, result.toString()).apply();
    }

    private void savePendingAttraction(BackgroundAttraction attraction) {
        if (attraction == null) return;
        getSharedPreferences(INTEREST_PREFS, MODE_PRIVATE)
            .edit().putString(PENDING_ATTRACTION, attractionJson(attraction).toString()).apply();
    }

    private void openMainApp() { openMainApp(null); }

    private void openMainApp(BackgroundAttraction attraction) {
        if (attraction != null) savePendingAttraction(attraction);
        try {
            Intent open = new Intent(this, MainActivity.class)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            startActivity(open);
        } catch (Exception ignored) { }
    }

    private void updateBackgroundAttractions(String json, double radiusMeters) {
        backgroundAlertRadiusMeters = Math.max(500.0, Math.min(25000.0, radiusMeters));
        backgroundAttractions.clear();
        if (json == null || json.trim().isEmpty()) return;

        try {
            JSONArray array = new JSONArray(json);
            for (int i = 0; i < array.length() && i < 600; i++) {
                JSONObject item = array.optJSONObject(i);
                if (item == null) continue;
                String id = item.optString("id", "").trim();
                String name = item.optString("name", "Atrakcja").trim();
                String type = item.optString("type", "Atrakcja turystyczna").trim();
                String category = item.optString("category", "castle").trim();
                double lat = item.optDouble("lat", Double.NaN);
                double lon = item.optDouble("lon", Double.NaN);
                if (id.isEmpty() || Double.isNaN(lat) || Double.isNaN(lon)) continue;
                backgroundAttractions.add(new BackgroundAttraction(id, name, type, category, lat, lon));
            }
        } catch (Exception ignored) { }

        Location last = bestLastKnownLocation();
        if (last != null) processBackgroundAttractions(last);
    }

    private void updateBackgroundSpeedControls(String json) {
        backgroundSpeedControls.clear();
        backgroundSpeedAlertedIds.clear();
        activeBackgroundOppId = "";
        hideSpeedControlView();
        if (json == null || json.trim().isEmpty()) return;
        try {
            JSONArray array = new JSONArray(json);
            for (int i = 0; i < array.length() && i < 300; i++) {
                JSONObject item = array.optJSONObject(i);
                if (item == null) continue;
                String id = item.optString("id", "").trim();
                String kind = item.optString("kind", "fixed").trim();
                if (id.isEmpty()) continue;
                double lat = item.optDouble("lat", Double.NaN);
                double lon = item.optDouble("lon", Double.NaN);
                double startLat = item.optDouble("startLat", Double.NaN);
                double startLon = item.optDouble("startLon", Double.NaN);
                double endLat = item.optDouble("endLat", Double.NaN);
                double endLon = item.optDouble("endLon", Double.NaN);
                int maxspeed = Math.max(0, item.optInt("maxspeed", 0));
                double routeBearing = item.optDouble("routeBearing", -1.0);
                double lengthMeters = Math.max(0.0, item.optDouble("lengthMeters", 0.0));
                if ("opp".equals(kind)) {
                    if (Double.isNaN(startLat) || Double.isNaN(startLon) || Double.isNaN(endLat) || Double.isNaN(endLon)) continue;
                } else if (Double.isNaN(lat) || Double.isNaN(lon)) continue;
                backgroundSpeedControls.add(new BackgroundSpeedControl(id, kind, lat, lon, startLat, startLon, endLat, endLon, maxspeed, routeBearing, lengthMeters));
            }
        } catch (Exception ignored) { }
        Location last = bestLastKnownLocation();
        if (last != null) processBackgroundSpeedControls(last);
    }

    private double bearingDifference(double a, double b) {
        double delta = Math.abs((((a - b) % 360.0) + 540.0) % 360.0 - 180.0);
        return Double.isNaN(delta) ? 180.0 : delta;
    }

    private boolean speedControlHeadingMatches(Location location, BackgroundSpeedControl control) {
        if (location == null || control == null || control.routeBearing < 0.0 || !location.hasBearing()) return true;
        if (location.hasSpeed() && location.getSpeed() < 2.5f) return true;
        return bearingDifference(location.getBearing(), control.routeBearing) <= 85.0;
    }

    private boolean speedControlPointIsAhead(Location location, double lat, double lon) {
        if (location == null || !location.hasBearing()) return true;
        if (location.hasSpeed() && location.getSpeed() < 2.5f) return true;
        try {
            float[] bearingResult = new float[2];
            Location.distanceBetween(location.getLatitude(), location.getLongitude(), lat, lon, bearingResult);
            return bearingDifference(location.getBearing(), bearingResult[1]) <= 100.0;
        } catch (Exception ignored) {
            return true;
        }
    }

    private String speedLimitSuffix(BackgroundSpeedControl control) {
        return control != null && control.maxspeed > 0 ? " · " + control.maxspeed + " km/h" : "";
    }

    private void showSpeedControlView(String value, boolean overspeed) {
        if (speedControlView == null) return;
        speedControlView.setText(value == null ? "" : value);
        GradientDrawable bg = new GradientDrawable();
        bg.setCornerRadius(dp(8));
        if (overspeed) {
            bg.setColor(Color.rgb(190, 38, 38));
            bg.setStroke(dp(1), Color.rgb(255, 206, 206));
            speedControlView.setTextColor(Color.WHITE);
        } else {
            bg.setColor(Color.rgb(245, 198, 48));
            bg.setStroke(dp(1), Color.rgb(101, 76, 0));
            speedControlView.setTextColor(Color.rgb(31, 35, 24));
        }
        speedControlView.setBackground(bg);
        if (speedControlView.getVisibility() != View.VISIBLE) {
            speedControlView.setVisibility(View.VISIBLE);
            if (overlayVisible) applyOverlayGeometry();
        }
    }

    private void hideSpeedControlView() {
        if (speedControlView != null && speedControlView.getVisibility() != View.GONE) {
            speedControlView.setVisibility(View.GONE);
            if (overlayVisible) applyOverlayGeometry();
        }
    }

    private void processBackgroundSpeedControls(Location location) {
        if (location == null || backgroundSpeedControls.isEmpty()) {
            hideSpeedControlView();
            return;
        }
        float[] result = new float[1];
        double currentSpeed = Math.max(0.0, backgroundGpsSpeedKmh);

        BackgroundSpeedControl bestOpp = null;
        float bestOppDistance = Float.MAX_VALUE;
        boolean insideOpp = false;
        float oppEndDistance = Float.MAX_VALUE;
        for (BackgroundSpeedControl c : backgroundSpeedControls) {
            if (!"opp".equals(c.kind) || !speedControlHeadingMatches(location, c)) continue;
            try {
                Location.distanceBetween(location.getLatitude(), location.getLongitude(), c.startLat, c.startLon, result);
                float startDistance = result[0];
                Location.distanceBetween(location.getLatitude(), location.getLongitude(), c.endLat, c.endLon, result);
                float endDistance = result[0];
                boolean active = c.id.equals(activeBackgroundOppId);
                if (!active && startDistance <= 160f && (endDistance > 160f || c.lengthMeters > 300.0)) {
                    activeBackgroundOppId = c.id;
                    active = true;
                    backgroundSpeedAlertedIds.add(c.id + ":start");
                }
                if (active) {
                    bestOpp = c; insideOpp = true; oppEndDistance = endDistance; break;
                }
                if (startDistance < bestOppDistance && startDistance <= 1000f && speedControlPointIsAhead(location, c.startLat, c.startLon)) {
                    bestOpp = c; bestOppDistance = startDistance;
                }
            } catch (Exception ignored) { }
        }
        if (bestOpp != null) {
            boolean over = bestOpp.maxspeed > 0 && currentSpeed > bestOpp.maxspeed + 2.0;
            if (insideOpp) {
                showSpeedControlView("OPP" + speedLimitSuffix(bestOpp) + " · do końca ok. " + formatAlertDistance(oppEndDistance) + " · GPS " + Math.round(currentSpeed), over);
                if (oppEndDistance <= 120f) {
                    backgroundSpeedAlertedIds.add(bestOpp.id + ":end");
                    activeBackgroundOppId = "";
                }
            } else {
                showSpeedControlView("OPP za " + formatAlertDistance(bestOppDistance) + speedLimitSuffix(bestOpp) + " · GPS " + Math.round(currentSpeed), over);
            }
            return;
        }

        BackgroundSpeedControl nearest = null;
        float nearestDistance = Float.MAX_VALUE;
        for (BackgroundSpeedControl c : backgroundSpeedControls) {
            if (!"fixed".equals(c.kind) || !speedControlHeadingMatches(location, c)) continue;
            try {
                Location.distanceBetween(location.getLatitude(), location.getLongitude(), c.lat, c.lon, result);
                float distance = result[0];
                if (distance <= 1000f && distance < nearestDistance && speedControlPointIsAhead(location, c.lat, c.lon)) { nearest = c; nearestDistance = distance; }
            } catch (Exception ignored) { }
        }
        if (nearest != null) {
            boolean over = nearest.maxspeed > 0 && currentSpeed > nearest.maxspeed + 2.0;
            showSpeedControlView("📷 " + formatAlertDistance(nearestDistance) + speedLimitSuffix(nearest) + " · GPS " + Math.round(currentSpeed), over);
            return;
        }
        hideSpeedControlView();
    }

    private void updateBackgroundGpsSpeed(Location location) {
        if (location == null) return;
        double rawKmh = Double.NaN;
        if (location.hasSpeed()) {
            rawKmh = Math.max(0.0, location.getSpeed() * 3.6);
        } else if (previousSpeedLocation != null) {
            long dtMs = location.getTime() - previousSpeedLocation.getTime();
            if (dtMs >= 700L && dtMs <= 8000L && location.getAccuracy() <= 45f && previousSpeedLocation.getAccuracy() <= 45f) {
                float moved = previousSpeedLocation.distanceTo(location);
                float noiseFloor = Math.max(2.5f, Math.min(12f, (location.getAccuracy() + previousSpeedLocation.getAccuracy()) * 0.18f));
                rawKmh = moved >= noiseFloor ? (moved / (dtMs / 1000.0)) * 3.6 : 0.0;
            }
        }
        previousSpeedLocation = new Location(location);

        if (!Double.isNaN(rawKmh) && rawKmh >= 0.0 && rawKmh <= 350.0) {
            if (rawKmh < 2.5) backgroundGpsSpeedKmh = 0.0;
            else if (backgroundGpsSpeedKmh <= 0.1) backgroundGpsSpeedKmh = rawKmh;
            else backgroundGpsSpeedKmh = backgroundGpsSpeedKmh * 0.45 + rawKmh * 0.55;
        }
        if (speedView != null) speedView.setText(Math.max(0, Math.round(backgroundGpsSpeedKmh)) + " km/h");
    }

    private boolean hasLocationPermission() {
        return ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED ||
            ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED;
    }

    private void startBackgroundLocationTracking() {
        if (backgroundLocationRegistered || locationManager == null || backgroundLocationListener == null || !hasLocationPermission()) return;
        boolean registered = false;
        try {
            if (locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER)) {
                locationManager.requestLocationUpdates(LocationManager.GPS_PROVIDER, 2500L, 12f, backgroundLocationListener);
                registered = true;
            }
        } catch (Exception ignored) { }
        try {
            if (locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)) {
                locationManager.requestLocationUpdates(LocationManager.NETWORK_PROVIDER, 4500L, 20f, backgroundLocationListener);
                registered = true;
            }
        } catch (Exception ignored) { }
        backgroundLocationRegistered = registered;

        Location last = bestLastKnownLocation();
        if (last != null) {
            updateBackgroundGpsSpeed(last);
            processBackgroundAttractions(last);
            processBackgroundSpeedControls(last);
        }
    }

    private void stopBackgroundLocationTracking() {
        if (locationManager != null && backgroundLocationListener != null && backgroundLocationRegistered) {
            try { locationManager.removeUpdates(backgroundLocationListener); } catch (Exception ignored) { }
        }
        backgroundLocationRegistered = false;
    }

    private Location bestLastKnownLocation() {
        if (locationManager == null || !hasLocationPermission()) return null;
        Location best = null;
        try {
            Location gps = locationManager.getLastKnownLocation(LocationManager.GPS_PROVIDER);
            if (gps != null) best = gps;
        } catch (Exception ignored) { }
        try {
            Location network = locationManager.getLastKnownLocation(LocationManager.NETWORK_PROVIDER);
            if (network != null && (best == null || network.getTime() > best.getTime())) best = network;
        } catch (Exception ignored) { }
        return best;
    }

    private void processBackgroundAttractions(Location location) {
        if (appInForeground) return;
        if (location == null || backgroundAttractions.isEmpty()) return;
        if (attractionQueue.size() >= 6) return;

        // v1.0.39: jedna aktualizacja GPS może od razu przygotować kilka najbliższych
        // atrakcji. Dzięki temu kolejne banery nie zależą od tego, czy WebView lub
        // producent telefonu ograniczy następne wybudzenia aplikacji w tle.
        int emitted = 0;
        while (emitted < 6 && attractionQueue.size() < 8) {
            BackgroundAttraction nearest = null;
            float nearestDistance = Float.MAX_VALUE;
            float[] result = new float[1];
            for (BackgroundAttraction attraction : backgroundAttractions) {
                if (attraction == null || backgroundAlertedIds.contains(attraction.id)) continue;
                try {
                    Location.distanceBetween(location.getLatitude(), location.getLongitude(), attraction.lat, attraction.lon, result);
                } catch (Exception ignored) {
                    continue;
                }
                float distance = result[0];
                if (distance <= backgroundAlertRadiusMeters && distance < nearestDistance) {
                    nearest = attraction;
                    nearestDistance = distance;
                }
            }

            if (nearest == null) break;
            backgroundAlertedIds.add(nearest.id);
            String text = safe(nearest.type, "Atrakcja turystyczna") + " · około " + formatAlertDistance(nearestDistance) + " od Ciebie";
            enqueueAttractionAlert(nearest, safe(nearest.name, "Atrakcja w pobliżu"), text);
            emitted += 1;
        }
    }

    private String formatAlertDistance(double meters) {
        if (meters < 1000.0) return Math.max(10, Math.round(meters / 10.0) * 10) + " m";
        if (meters < 10000.0) return String.format(java.util.Locale.forLanguageTag("pl-PL"), "%.1f km", meters / 1000.0);
        return Math.round(meters / 1000.0) + " km";
    }

    private void enqueueAttractionAlert(String title, String textValue) {
        enqueueAttractionAlert(null, title, textValue);
    }

    private void enqueueAttractionAlert(BackgroundAttraction attraction, String title, String textValue) {
        if (!canOverlay()) {
            showAttractionNotification(title, textValue);
            return;
        }
        QueuedAttractionAlert alert = new QueuedAttractionAlert(title, textValue, attraction);
        if (!attractionVisible && attractionQueue.isEmpty()) {
            showAttractionOverlay(alert);
            return;
        }
        if (attractionQueue.size() < 8) attractionQueue.offer(alert);
    }

    private void showNextQueuedAttraction() {
        if (attractionVisible) return;
        QueuedAttractionAlert next = attractionQueue.poll();
        if (next != null) showAttractionOverlay(next);
    }

    private TextView attractionActionButton(String label, int color) {
        TextView button = text(label, 9, true);
        button.setGravity(Gravity.CENTER);
        button.setTextColor(Color.WHITE);
        GradientDrawable bg = new GradientDrawable();
        bg.setColor(color);
        bg.setCornerRadius(dp(8));
        bg.setStroke(dp(1), Color.argb(130, 255, 255, 255));
        button.setBackground(bg);
        button.setPadding(dp(8), 0, dp(8), 0);
        return button;
    }

    private void ensureAttractionView() {
        if (attractionRoot != null) return;

        attractionRoot = new FrameLayout(this);
        attractionRoot.setClipChildren(false);
        attractionRoot.setClipToPadding(false);

        attractionPanel = new LinearLayout(this);
        attractionPanel.setOrientation(LinearLayout.VERTICAL);
        attractionPanel.setGravity(Gravity.CENTER_VERTICAL);
        attractionPanel.setPadding(dp(10), dp(7), dp(10), dp(7));

        GradientDrawable bg = new GradientDrawable();
        bg.setColor(Color.rgb(35, 78, 110));
        bg.setCornerRadius(dp(16));
        bg.setStroke(dp(1), Color.argb(150, 255, 220, 110));
        attractionPanel.setBackground(bg);

        LinearLayout header = new LinearLayout(this);
        header.setOrientation(LinearLayout.HORIZONTAL);
        header.setGravity(Gravity.CENTER_VERTICAL);

        TextView icon = text("★", 21, true);
        icon.setTextColor(Color.rgb(255, 220, 95));
        icon.setGravity(Gravity.CENTER);
        header.addView(icon, new LinearLayout.LayoutParams(dp(32), dp(43)));

        LinearLayout copy = new LinearLayout(this);
        copy.setOrientation(LinearLayout.VERTICAL);
        copy.setGravity(Gravity.CENTER_VERTICAL);
        attractionTitleView = text("Atrakcja w pobliżu", 12, true);
        attractionTextView = text("", 9, false);
        attractionTextView.setTextColor(Color.rgb(225, 235, 241));
        copy.addView(attractionTitleView, new LinearLayout.LayoutParams(-1, dp(22)));
        copy.addView(attractionTextView, new LinearLayout.LayoutParams(-1, dp(18)));
        header.addView(copy, new LinearLayout.LayoutParams(0, dp(43), 1f));
        attractionPanel.addView(header, new LinearLayout.LayoutParams(-1, dp(43)));

        LinearLayout actions = new LinearLayout(this);
        actions.setOrientation(LinearLayout.HORIZONTAL);
        actions.setGravity(Gravity.CENTER);
        attractionShowButton = attractionActionButton("POKAŻ", Color.rgb(39, 139, 78));
        attractionInterestButton = attractionActionButton("★ INTERESUJE", Color.rgb(190, 133, 24));
        attractionInterestButton.setTextSize(8);
        attractionInterestButton.setPadding(dp(5), 0, dp(5), 0);
        LinearLayout.LayoutParams showParams = new LinearLayout.LayoutParams(0, dp(31), 1f);
        showParams.setMargins(dp(3), dp(2), dp(3), 0);
        LinearLayout.LayoutParams interestParams = new LinearLayout.LayoutParams(dp(116), dp(31));
        interestParams.setMargins(dp(3), dp(2), dp(3), 0);
        actions.addView(attractionShowButton, showParams);
        actions.addView(attractionInterestButton, interestParams);
        attractionPanel.addView(actions, new LinearLayout.LayoutParams(-1, dp(34)));

        attractionShowButton.setOnClickListener(v -> {
            QueuedAttractionAlert current = currentAttractionAlert;
            attractionHandler.removeCallbacks(hideAttractionRunnable);
            hideAttractionOverlayNow();
            openMainApp(current == null ? null : current.attraction);
        });
        attractionInterestButton.setOnClickListener(v -> {
            QueuedAttractionAlert current = currentAttractionAlert;
            if (current != null && current.attraction != null) {
                saveInterestedAttraction(current.attraction);
                attractionInterestButton.setText("✓ ZAPISANO");
            }
            attractionHandler.removeCallbacks(hideAttractionRunnable);
            attractionHandler.postDelayed(() -> {
                hideAttractionOverlayNow();
                attractionHandler.postDelayed(this::showNextQueuedAttraction, 500);
            }, 650);
        });

        attractionRoot.addView(attractionPanel);
    }

    private void showAttractionOverlay(QueuedAttractionAlert alert) {
        if (alert == null) return;
        if (!canOverlay() || windowManager == null) {
            showAttractionNotification(alert.title, alert.text);
            return;
        }

        ensureAttractionView();
        currentAttractionAlert = alert;
        attractionTitleView.setText(alert.title);
        attractionTextView.setText(alert.text);
        attractionInterestButton.setText("★ INTERESUJE");
        attractionInterestButton.setEnabled(alert.attraction != null);
        attractionInterestButton.setAlpha(alert.attraction == null ? 0.45f : 1f);

        if (!attractionVisible) {
            int type = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
                : WindowManager.LayoutParams.TYPE_PHONE;
            attractionParams = new WindowManager.LayoutParams(
                dp(340), dp(94), type,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE |
                WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL |
                WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
                PixelFormat.TRANSLUCENT
            );
            attractionParams.gravity = Gravity.TOP | Gravity.CENTER_HORIZONTAL;
            attractionParams.y = dp(54);
            try {
                windowManager.addView(attractionRoot, attractionParams);
                attractionVisible = true;
            } catch (Exception ignored) {
                showAttractionNotification(alert.title, alert.text);
                attractionHandler.postDelayed(this::showNextQueuedAttraction, 650);
                return;
            }
        }

        applyAttractionGeometry();
        attractionHandler.removeCallbacks(hideAttractionRunnable);
        attractionHandler.postDelayed(hideAttractionRunnable, 10000);
    }

    private void hideAttractionOverlay() {
        attractionHandler.removeCallbacks(hideAttractionRunnable);
        attractionQueue.clear();
        hideAttractionOverlayNow();
    }

    private void hideAttractionOverlayNow() {
        if (attractionVisible && attractionRoot != null && windowManager != null) {
            try { windowManager.removeView(attractionRoot); } catch (Exception ignored) { }
        }
        attractionVisible = false;
        currentAttractionAlert = null;
    }

    private void applyAttractionGeometry() {
        if (!attractionVisible || attractionRoot == null || attractionPanel == null ||
            attractionParams == null || windowManager == null) return;

        DisplayMetrics dm = new DisplayMetrics();
        try {
            windowManager.getDefaultDisplay().getRealMetrics(dm);
        } catch (Exception ignored) {
            dm.setTo(getResources().getDisplayMetrics());
        }

        int screenW = Math.max(1, dm.widthPixels);
        int screenH = Math.max(1, dm.heightPixels);
        boolean systemLandscape = screenW > screenH ||
            getResources().getConfiguration().orientation == Configuration.ORIENTATION_LANDSCAPE;

        int shortSide = Math.min(screenW, screenH);
        int longSide = Math.max(screenW, screenH);
        int bannerHigh = Math.min(dp(104), Math.max(dp(90), Math.round(shortSide * 0.21f)));
        boolean rotateInsideLockedPortrait = !systemLandscape && lastPhysicalRotation != 0;

        FrameLayout.LayoutParams childParams;
        if (rotateInsideLockedPortrait) {
            int bannerWide = Math.min(Math.round(longSide * 0.48f), dp(520));
            bannerWide = Math.max(dp(250), bannerWide);
            attractionParams.width = bannerHigh;
            attractionParams.height = bannerWide;
            attractionParams.gravity = Gravity.CENTER_VERTICAL | Gravity.LEFT;
            attractionParams.x = dp(16);
            attractionParams.y = 0;
            childParams = new FrameLayout.LayoutParams(bannerWide, bannerHigh, Gravity.CENTER);
            attractionPanel.setRotation(lastPhysicalRotation);
        } else {
            int bannerWide = Math.min(Math.round(screenW * (systemLandscape ? 0.42f : 0.78f)), dp(520));
            bannerWide = Math.max(dp(250), bannerWide);
            attractionParams.width = bannerWide;
            attractionParams.height = bannerHigh;
            attractionParams.gravity = Gravity.TOP | Gravity.CENTER_HORIZONTAL;
            attractionParams.x = 0;
            attractionParams.y = dp(54);
            childParams = new FrameLayout.LayoutParams(bannerWide, bannerHigh, Gravity.CENTER);
            attractionPanel.setRotation(0f);
        }

        attractionPanel.setPivotX(childParams.width / 2f);
        attractionPanel.setPivotY(childParams.height / 2f);
        attractionPanel.setLayoutParams(childParams);
        attractionRoot.requestLayout();
        attractionPanel.requestLayout();
        try { windowManager.updateViewLayout(attractionRoot, attractionParams); } catch (Exception ignored) { }
    }

    @Override
    public void onConfigurationChanged(Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
        if (overlayVisible) applyOverlayGeometry();
        if (attractionVisible) applyAttractionGeometry();
    }

    private String safe(String value, String fallback) {
        String clean = value == null ? "" : value.trim();
        return clean.isEmpty() ? fallback : clean;
    }

    private PendingIntent openAppIntent() {
        Intent open = new Intent(this, MainActivity.class)
            .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) flags |= PendingIntent.FLAG_IMMUTABLE;
        return PendingIntent.getActivity(this, 10, open, flags);
    }

    private Notification buildNavigationNotification() {
        String title = remainingDistance.isEmpty() ? "Nawigacja" : "Nawigacja · " + remainingDistance;
        String firstLine = (turnDistance.isEmpty() ? "" : turnDistance + " · ") + instruction;
        String details = firstLine + (road.isEmpty() ? "" : "\\n" + road) +
            (remainingTime.isEmpty() ? "" : "\\nDo celu: " + remainingTime + " · " + destination);
        return new NotificationCompat.Builder(this, CHANNEL_ACTIVE)
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .setContentTitle(title)
            .setContentText(firstLine)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(details))
            .setContentIntent(openAppIntent())
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setSilent(true)
            .setCategory("navigation")
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .build();
    }

    private void showAttractionNotification(String title, String text) {
        Notification notification = new NotificationCompat.Builder(this, CHANNEL_ATTRACTION)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(title)
            .setContentText(text)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(text))
            .setContentIntent(openAppIntent())
            .setAutoCancel(true)
            .setTimeoutAfter(9000)
            .setCategory("recommendation")
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .build();
        notifySafely(++attractionId, notification);
    }

    private void notifySafely(int id, Notification notification) {
        try { NotificationManagerCompat.from(this).notify(id, notification); }
        catch (SecurityException ignored) { }
    }

    private void createNotificationChannels() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager == null) return;

        NotificationChannel active = new NotificationChannel(
            CHANNEL_ACTIVE, "Aktywna nawigacja", NotificationManager.IMPORTANCE_LOW);
        active.setDescription("Stała, cicha informacja techniczna o aktywnej trasie.");
        active.setSound(null, null);

        NotificationChannel attractions = new NotificationChannel(
            CHANNEL_ATTRACTION, "Atrakcje w pobliżu", NotificationManager.IMPORTANCE_HIGH);
        attractions.setDescription("Powiadomienia o atrakcjach w pobliżu.");

        manager.createNotificationChannel(active);
        manager.deleteNotificationChannel(LEGACY_CHANNEL_MANEUVER);
        manager.createNotificationChannel(attractions);
    }

    @Override
    public void onDestroy() {
        stopBackgroundLocationTracking();
        backgroundAttractions.clear();
        backgroundAlertedIds.clear();
        attractionQueue.clear();
        hideAttractionOverlay();
        hideOverlay();
        super.onDestroy();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) { return null; }
}
`;

fs.writeFileSync(mainActivity, activity, 'utf8');
fs.writeFileSync(path.join(javaDir, 'AppControlPlugin.java'), plugin, 'utf8');
fs.writeFileSync(path.join(javaDir, 'NavigationForegroundService.java'), service, 'utf8');
console.log('Android v1.0.59: ALERT w drugim rzędzie, ZAKOŃCZ u góry, zoom przy górnej krawędzi i WYCENTRUJ pod zoomem.');
