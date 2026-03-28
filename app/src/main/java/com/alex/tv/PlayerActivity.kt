package com.alex.tv

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.core.view.WindowCompat
import com.alex.tv.ui.screens.PlayerScreen
import com.alex.tv.ui.theme.VibeTheme

class PlayerActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        WindowCompat.setDecorFitsSystemWindows(window, false)

        val streamUrl = intent.getStringExtra(EXTRA_STREAM_URL).orEmpty()
        val title = intent.getStringExtra(EXTRA_TITLE).orEmpty()
        val mediaPath = intent.getStringExtra(EXTRA_MEDIA_PATH).orEmpty()
        val resumePositionMs = PlaybackProgressStore.getResumePositionMs(this, mediaPath)
        if (streamUrl.isBlank()) {
            finish()
            return
        }

        setContent {
            VibeTheme {
                PlayerScreen(
                    streamUrl = streamUrl,
                    mediaPath = mediaPath,
                    title = title,
                    initialResumePositionMs = resumePositionMs,
                    onClose = { finish() }
                )
            }
        }
    }

    companion object {
        const val EXTRA_STREAM_URL = "stream_url"
        const val EXTRA_TITLE = "title"
        const val EXTRA_MEDIA_PATH = "media_path"
    }
}
