package com.alex.tv

object StreamProxy {
    // Set this to your deployed Cloudflare Worker URL (no trailing slash)
    // Example: "https://alex-stream-proxy.your-subdomain.workers.dev"
    // Leave empty to bypass proxy (use original URLs directly)
    const val PROXY_BASE_URL = "https://server.alexhasitbig.workers.dev"

    /**
     * If proxy is configured, wraps the original URL through the worker:
     *   https://worker.dev/?url=<encoded-original-url>
     * Otherwise returns the original URL unchanged.
     */
    fun proxyUrl(originalUrl: String): String {
        if (PROXY_BASE_URL.isBlank()) return originalUrl
        return "$PROXY_BASE_URL/?url=${android.net.Uri.encode(originalUrl)}"
    }
}
