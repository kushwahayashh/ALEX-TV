export default {
  async fetch(request) {
    if (request.method !== "GET") {
      return new Response("Method not allowed", { status: 405 });
    }

    const url = new URL(request.url);
    const targetUrl = url.searchParams.get("url");

    if (!targetUrl) {
      return new Response(
        JSON.stringify({ error: "Missing 'url' query parameter" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    try {
      new URL(targetUrl);
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid URL" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    try {
      const headers = new Headers();
      const range = request.headers.get("Range");
      if (range) headers.set("Range", range);

      const response = await fetch(targetUrl, { headers });

      const responseHeaders = new Headers();

      const contentType = response.headers.get("Content-Type");
      if (contentType) responseHeaders.set("Content-Type", contentType);

      const contentLength = response.headers.get("Content-Length");
      if (contentLength) responseHeaders.set("Content-Length", contentLength);

      const contentRange = response.headers.get("Content-Range");
      if (contentRange) responseHeaders.set("Content-Range", contentRange);

      const acceptRanges = response.headers.get("Accept-Ranges");
      if (acceptRanges) responseHeaders.set("Accept-Ranges", acceptRanges);
      else responseHeaders.set("Accept-Ranges", "bytes");

      responseHeaders.set("Access-Control-Allow-Origin", "*");
      responseHeaders.set("Cache-Control", "public, max-age=600");

      return new Response(response.body, {
        status: response.status,
        headers: responseHeaders,
      });
    } catch (err) {
      return new Response(
        JSON.stringify({ error: "Fetch failed", details: err.message }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }
  },
};
