package com.arktechcore.instadrop;

import android.app.Activity;
import android.app.DownloadManager;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.text.TextUtils;
import android.view.Gravity;
import android.view.View;
import android.view.inputmethod.InputMethodManager;
import android.widget.Button;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class MainActivity extends Activity {
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private final Handler main = new Handler(Looper.getMainLooper());
    private EditText input;
    private Button fetchButton;
    private ProgressBar loader;
    private TextView status;
    private LinearLayout results;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        buildUi();
        readSharedIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        readSharedIntent(intent);
    }

    @Override
    protected void onDestroy() {
        executor.shutdownNow();
        super.onDestroy();
    }

    private void buildUi() {
        FrameLayout root = new FrameLayout(this);
        root.setBackground(makeGradient());

        ScrollView scroll = new ScrollView(this);
        scroll.setFillViewport(true);
        root.addView(scroll, new FrameLayout.LayoutParams(-1, -1));

        LinearLayout page = new LinearLayout(this);
        page.setOrientation(LinearLayout.VERTICAL);
        page.setPadding(dp(20), dp(26), dp(20), dp(26));
        scroll.addView(page, new ScrollView.LayoutParams(-1, -2));

        TextView brand = text("InstaDrop", 18, Color.rgb(15, 23, 42), true);
        brand.setGravity(Gravity.CENTER);
        page.addView(brand, margins(-1, -2, 0, 0, 0, 10));

        TextView title = text("Share. Grab. Save.", 34, Color.rgb(15, 23, 42), true);
        title.setGravity(Gravity.CENTER);
        page.addView(title, margins(-1, -2, 0, 0, 0, 10));

        TextView subtitle = text("Pick InstaDrop from Instagram's share menu or paste a public post, Reel, video, or carousel link.", 15, Color.rgb(71, 85, 105), false);
        subtitle.setGravity(Gravity.CENTER);
        subtitle.setLineSpacing(dp(3), 1.0f);
        page.addView(subtitle, margins(-1, -2, 0, 0, 0, 22));

        LinearLayout card = card();
        page.addView(card, margins(-1, -2, 0, 0, 0, 18));

        input = new EditText(this);
        input.setSingleLine(false);
        input.setMinLines(2);
        input.setMaxLines(4);
        input.setHint("Paste public Instagram URL");
        input.setTextColor(Color.rgb(15, 23, 42));
        input.setHintTextColor(Color.rgb(100, 116, 139));
        input.setTextSize(15);
        input.setPadding(dp(14), dp(12), dp(14), dp(12));
        input.setBackground(round(Color.rgb(248, 250, 252), dp(16), Color.rgb(226, 232, 240), 1));
        card.addView(input, margins(-1, -2, 0, 0, 0, 12));

        LinearLayout row = new LinearLayout(this);
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.setGravity(Gravity.CENTER);
        card.addView(row, margins(-1, -2, 0, 0, 0, 12));

        Button paste = secondaryButton("Paste");
        paste.setOnClickListener(v -> pasteFromClipboard());
        row.addView(paste, new LinearLayout.LayoutParams(0, dp(48), 1));

        Button clear = secondaryButton("Clear");
        clear.setOnClickListener(v -> {
            input.setText("");
            status.setText("Ready when you are.");
            results.removeAllViews();
        });
        LinearLayout.LayoutParams clearParams = new LinearLayout.LayoutParams(0, dp(48), 1);
        clearParams.leftMargin = dp(10);
        row.addView(clear, clearParams);

        fetchButton = primaryButton("Get Media");
        fetchButton.setOnClickListener(v -> fetch());
        card.addView(fetchButton, margins(-1, dp(54), 0, 0, 0, 10));

        loader = new ProgressBar(this);
        loader.setVisibility(View.GONE);
        card.addView(loader, margins(dp(36), dp(36), 0, 0, 0, 10));

        status = text("Ready when you are.", 14, Color.rgb(71, 85, 105), false);
        status.setGravity(Gravity.CENTER);
        card.addView(status, margins(-1, -2, 0, 0, 0, 0));

        results = new LinearLayout(this);
        results.setOrientation(LinearLayout.VERTICAL);
        page.addView(results, margins(-1, -2, 0, 0, 0, 0));

        TextView footer = text("Mohammed Yousuf Qadri. Not affiliated with Instagram or Meta.", 12, Color.rgb(100, 116, 139), false);
        footer.setGravity(Gravity.CENTER);
        page.addView(footer, margins(-1, -2, 0, 18, 0, 0));

        setContentView(root);
    }

    private void readSharedIntent(Intent intent) {
        String text = null;
        if (Intent.ACTION_SEND.equals(intent.getAction())) {
            text = intent.getStringExtra(Intent.EXTRA_TEXT);
        } else if (Intent.ACTION_PROCESS_TEXT.equals(intent.getAction())) {
            CharSequence selected = intent.getCharSequenceExtra(Intent.EXTRA_PROCESS_TEXT);
            text = selected == null ? null : selected.toString();
        }

        String url = findInstagramUrl(text);
        if (url != null) {
            input.setText(url);
            status.setText("Shared link received.");
            fetch();
        }
    }

    private void pasteFromClipboard() {
        ClipboardManager clipboard = (ClipboardManager) getSystemService(CLIPBOARD_SERVICE);
        if (clipboard == null || !clipboard.hasPrimaryClip() || clipboard.getPrimaryClip() == null) {
            toast("Clipboard is empty.");
            return;
        }
        CharSequence clip = clipboard.getPrimaryClip().getItemAt(0).coerceToText(this);
        String url = findInstagramUrl(clip == null ? "" : clip.toString());
        input.setText(url == null ? clip : url);
    }

    private void fetch() {
        String url = findInstagramUrl(input.getText().toString());
        if (url == null) {
            showError("Paste a valid public Instagram post or Reel URL.");
            return;
        }

        hideKeyboard();
        setLoading(true);
        results.removeAllViews();

        executor.execute(() -> {
            try {
                ExtractResult result = callExtract(url);
                main.post(() -> showResults(result));
            } catch (Exception error) {
                main.post(() -> showError(readableError(error)));
            }
        });
    }

    private ExtractResult callExtract(String instagramUrl) throws IOException, JSONException {
        URL endpoint = new URL(apiBase() + "/api/extract");
        HttpURLConnection connection = (HttpURLConnection) endpoint.openConnection();
        connection.setConnectTimeout(15000);
        connection.setReadTimeout(30000);
        connection.setRequestMethod("POST");
        connection.setRequestProperty("Content-Type", "application/json; charset=utf-8");
        connection.setRequestProperty("Accept", "application/json");
        connection.setDoOutput(true);

        JSONObject body = new JSONObject();
        body.put("url", instagramUrl);
        try (OutputStream output = connection.getOutputStream()) {
            output.write(body.toString().getBytes(StandardCharsets.UTF_8));
        }

        int code = connection.getResponseCode();
        String response = readStream(code >= 400 ? connection.getErrorStream() : connection.getInputStream());
        JSONObject json = new JSONObject(response);

        if (!json.optBoolean("success")) {
            JSONObject error = json.optJSONObject("error");
            String message = error == null ? "Could not get media." : error.optString("message", "Could not get media.");
            throw new IOException(message);
        }

        JSONObject post = json.getJSONObject("post");
        JSONArray items = post.getJSONArray("items");
        List<MediaItem> media = new ArrayList<>();
        for (int i = 0; i < items.length(); i++) {
            JSONObject item = items.getJSONObject(i);
            media.add(new MediaItem(
                    item.optString("id", String.valueOf(i + 1)),
                    item.optString("type", "image"),
                    item.getString("url"),
                    item.optInt("width", 0),
                    item.optInt("height", 0)
            ));
        }

        return new ExtractResult(post.optString("type", "media"), media);
    }

    private void showResults(ExtractResult result) {
        setLoading(false);
        status.setTextColor(Color.rgb(71, 85, 105));
        if (result.items.isEmpty()) {
            showError("No downloadable media found.");
            return;
        }

        status.setText(String.format(Locale.US, "%d media file%s found.", result.items.size(), result.items.size() == 1 ? "" : "s"));
        results.removeAllViews();

        for (int i = 0; i < result.items.size(); i++) {
            MediaItem item = result.items.get(i);
            results.addView(mediaCard(item, i + 1), margins(-1, -2, 0, 0, 0, 12));
        }
    }

    private View mediaCard(MediaItem item, int index) {
        LinearLayout card = card();
        card.setPadding(dp(16), dp(16), dp(16), dp(16));

        LinearLayout row = new LinearLayout(this);
        row.setGravity(Gravity.CENTER_VERTICAL);
        row.setOrientation(LinearLayout.HORIZONTAL);
        card.addView(row, margins(-1, -2, 0, 0, 0, 14));

        TextView icon = text(item.type.equals("video") ? "Video" : "Photo", 13, Color.WHITE, true);
        icon.setGravity(Gravity.CENTER);
        icon.setBackground(round(item.type.equals("video") ? Color.rgb(244, 63, 94) : Color.rgb(249, 115, 22), dp(24), 0, 0));
        row.addView(icon, new LinearLayout.LayoutParams(dp(76), dp(42)));

        LinearLayout meta = new LinearLayout(this);
        meta.setOrientation(LinearLayout.VERTICAL);
        LinearLayout.LayoutParams metaParams = new LinearLayout.LayoutParams(0, -2, 1);
        metaParams.leftMargin = dp(12);
        row.addView(meta, metaParams);

        meta.addView(text("Media " + index, 17, Color.rgb(15, 23, 42), true));
        String dims = item.width > 0 && item.height > 0 ? item.width + " x " + item.height : "Best public source";
        meta.addView(text(dims, 13, Color.rgb(100, 116, 139), false));

        Button download = primaryButton(item.type.equals("video") ? "Download Video" : "Download Photo");
        download.setOnClickListener(v -> startDownload(item));
        card.addView(download, margins(-1, dp(52), 0, 0, 0, 10));

        Button open = secondaryButton("Open Source");
        open.setOnClickListener(v -> startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(item.url))));
        card.addView(open, margins(-1, dp(48), 0, 0, 0, 0));

        return card;
    }

    private void startDownload(MediaItem item) {
        try {
            String target = apiBase() + "/api/download?url=" + URLEncoder.encode(item.url, StandardCharsets.UTF_8.name());
            DownloadManager.Request request = new DownloadManager.Request(Uri.parse(target));
            request.setTitle(item.type.equals("video") ? "InstaDrop video" : "InstaDrop photo");
            request.setDescription("Downloading public Instagram media");
            request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
            request.setAllowedOverMetered(true);
            request.setAllowedOverRoaming(true);
            request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, filename(item));

            DownloadManager manager = (DownloadManager) getSystemService(DOWNLOAD_SERVICE);
            if (manager == null) {
                throw new IllegalStateException("Download manager is unavailable.");
            }
            manager.enqueue(request);
            toast("Download started.");
        } catch (Exception error) {
            showError("Could not start download. Try opening the source.");
        }
    }

    private String apiBase() {
        String base = BuildConfig.INSTADROP_API_BASE.trim();
        if (base.endsWith("/")) {
            return base.substring(0, base.length() - 1);
        }
        return base;
    }

    private String filename(MediaItem item) {
        String extension = item.type.equals("video") ? "mp4" : "jpg";
        return "instadrop-" + System.currentTimeMillis() + "." + extension;
    }

    private String findInstagramUrl(String text) {
        if (TextUtils.isEmpty(text)) {
            return null;
        }
        String[] parts = text.split("\\s+");
        for (String part : parts) {
            String candidate = part.trim();
            int query = candidate.indexOf('?');
            String clean = query >= 0 ? candidate.substring(0, query) : candidate;
            if (clean.matches("https://(www\\.|m\\.)?instagram\\.com/(p|reel|reels)/[A-Za-z0-9_-]+/?")) {
                return clean.endsWith("/") ? clean : clean + "/";
            }
        }
        return null;
    }

    private void setLoading(boolean loading) {
        loader.setVisibility(loading ? View.VISIBLE : View.GONE);
        fetchButton.setEnabled(!loading);
        fetchButton.setText(loading ? "Fetching..." : "Get Media");
        status.setTextColor(Color.rgb(71, 85, 105));
        status.setText(loading ? "Talking to your Cloudflare backend..." : status.getText());
    }

    private void showError(String message) {
        setLoading(false);
        status.setText(message);
        status.setTextColor(Color.rgb(190, 18, 60));
    }

    private String readableError(Exception error) {
        String message = error.getMessage();
        return TextUtils.isEmpty(message) ? "Something went wrong. Try again." : message;
    }

    private String readStream(InputStream stream) throws IOException {
        if (stream == null) {
            return "{}";
        }
        StringBuilder builder = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(stream, StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                builder.append(line);
            }
        }
        return builder.toString();
    }

    private void hideKeyboard() {
        InputMethodManager manager = (InputMethodManager) getSystemService(INPUT_METHOD_SERVICE);
        if (manager != null) {
            manager.hideSoftInputFromWindow(input.getWindowToken(), 0);
        }
    }

    private void toast(String message) {
        Toast.makeText(this, message, Toast.LENGTH_SHORT).show();
    }

    private LinearLayout card() {
        LinearLayout card = new LinearLayout(this);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setPadding(dp(18), dp(18), dp(18), dp(18));
        card.setBackground(round(Color.argb(238, 255, 255, 255), dp(24), Color.argb(120, 255, 255, 255), 1));
        card.setElevation(dp(8));
        return card;
    }

    private Button primaryButton(String label) {
        Button button = new Button(this);
        button.setAllCaps(false);
        button.setText(label);
        button.setTextColor(Color.WHITE);
        button.setTextSize(15);
        button.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        button.setBackground(round(Color.rgb(15, 23, 42), dp(18), 0, 0));
        return button;
    }

    private Button secondaryButton(String label) {
        Button button = new Button(this);
        button.setAllCaps(false);
        button.setText(label);
        button.setTextColor(Color.rgb(15, 23, 42));
        button.setTextSize(14);
        button.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        button.setBackground(round(Color.rgb(255, 255, 255), dp(16), Color.rgb(226, 232, 240), 1));
        return button;
    }

    private TextView text(String value, int sp, int color, boolean bold) {
        TextView view = new TextView(this);
        view.setText(value);
        view.setTextSize(sp);
        view.setTextColor(color);
        if (bold) {
            view.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        }
        return view;
    }

    private GradientDrawable makeGradient() {
        return new GradientDrawable(
                GradientDrawable.Orientation.TOP_BOTTOM,
                new int[]{Color.rgb(255, 247, 237), Color.rgb(255, 255, 255), Color.rgb(240, 253, 250)}
        );
    }

    private GradientDrawable round(int color, int radius, int strokeColor, int strokeWidth) {
        GradientDrawable drawable = new GradientDrawable();
        drawable.setColor(color);
        drawable.setCornerRadius(radius);
        if (strokeWidth > 0) {
            drawable.setStroke(strokeWidth, strokeColor);
        }
        return drawable;
    }

    private LinearLayout.LayoutParams margins(int width, int height, int left, int top, int right, int bottom) {
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(width, height);
        params.setMargins(dp(left), dp(top), dp(right), dp(bottom));
        return params;
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    private static final class ExtractResult {
        final String type;
        final List<MediaItem> items;

        ExtractResult(String type, List<MediaItem> items) {
            this.type = type;
            this.items = items;
        }
    }

    private static final class MediaItem {
        final String id;
        final String type;
        final String url;
        final int width;
        final int height;

        MediaItem(String id, String type, String url, int width, int height) {
            this.id = id;
            this.type = type;
            this.url = url;
            this.width = width;
            this.height = height;
        }
    }
}
