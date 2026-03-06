package com.noesis.app;

import android.content.ComponentName;
import android.content.Context;
import androidx.media3.common.MediaItem;
import androidx.media3.common.MediaMetadata;
import androidx.media3.common.Player;
import androidx.media3.session.MediaController;
import androidx.media3.session.SessionToken;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.common.util.concurrent.ListenableFuture;
import com.google.common.util.concurrent.MoreExecutors;

@CapacitorPlugin(name = "MusicPlayer")
public class MusicPlayerPlugin extends Plugin {
    private MediaController mediaController;

    @Override
    public void load() {
        super.load();
        Context context = getContext();
        SessionToken sessionToken = new SessionToken(context, new ComponentName(context, MediaPlaybackService.class));
        ListenableFuture<MediaController> controllerFuture = new MediaController.Builder(context, sessionToken).buildAsync();
        controllerFuture.addListener(() -> {
            try {
                mediaController = controllerFuture.get();
            } catch (Exception e) {
                e.printStackTrace();
            }
        }, MoreExecutors.directExecutor());
    }

    @PluginMethod
    public void play(PluginCall call) {
        String url = call.getString("url");
        String title = call.getString("title", "Noesis Audio");
        String artist = call.getString("artist", "Noesis App");
        String artworkUrl = call.getString("artworkUrl");

        if (url == null || mediaController == null) {
            call.reject("URL missing or controller not ready");
            return;
        }

        getBridge().executeOnMainThread(() -> {
            MediaMetadata metadata = new MediaMetadata.Builder()
                    .setTitle(title)
                    .setArtist(artist)
                    .build();

            MediaItem mediaItem = new MediaItem.Builder()
                    .setUri(url)
                    .setMediaMetadata(metadata)
                    .build();

            mediaController.setMediaItem(mediaItem);
            mediaController.prepare();
            mediaController.play();
            call.resolve();
        });
    }

    @PluginMethod
    public void pause(PluginCall call) {
        if (mediaController != null) {
            getBridge().executeOnMainThread(() -> {
                mediaController.pause();
                call.resolve();
            });
        }
    }

    @PluginMethod
    public void stop(PluginCall call) {
        if (mediaController != null) {
            getBridge().executeOnMainThread(() -> {
                mediaController.stop();
                call.resolve();
            });
        }
    }
}
