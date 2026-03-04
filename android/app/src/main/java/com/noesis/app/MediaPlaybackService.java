package com.noesis.app;

import androidx.media3.common.Player;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.session.MediaSession;
import androidx.media3.session.MediaSessionService;
import androidx.annotation.Nullable;

/**
 * MediaPlaybackService — exposes the WebView audio element to the Android
 * media notification system (lock screen + notification bar controls).
 *
 * The WebView drives actual playback via the HTML <audio> element.
 * This service registers a MediaSession so Android shows the media
 * notification with play/pause/next/prev controls.
 */
public class MediaPlaybackService extends MediaSessionService {
    private MediaSession mediaSession = null;
    private ExoPlayer player = null;

    @Override
    public void onCreate() {
        super.onCreate();
        player = new ExoPlayer.Builder(this).build();
        mediaSession = new MediaSession.Builder(this, player).build();
    }

    @Nullable
    @Override
    public MediaSession onGetSession(MediaSession.ControllerInfo controllerInfo) {
        return mediaSession;
    }

    @Override
    public void onDestroy() {
        if (player != null) {
            player.release();
            mediaSession.release();
            mediaSession = null;
            player = null;
        }
        super.onDestroy();
    }
}
