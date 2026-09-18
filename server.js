const crypto = require("crypto");
const fs = require("fs");
const http = require("http");
const path = require("path");

const driveLinks = require("./pack-links.json");
const root = __dirname;
const port = Number(process.env.PORT || 3000);
const privateDownloads = process.env.PRIVATE_DOWNLOADS_DIR || path.join(root, "private-downloads");
const products = {
  Documentary: { price: "40.00", slug: "documentary" },
  Thriller: { price: "40.00", slug: "thriller" },
  "Moody Cue": { price: "40.00", slug: "moody-cue" },
  Orchestral: { price: "40.00", slug: "orchestral" },
  Sophisticated: { price: "40.00", slug: "sophisticated" }
};

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".m4a": "audio/mp4",
  ".mp3": "audio/mpeg",
  ".mp4": "video/mp4",
  ".otf": "font/otf",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ttf": "font/ttf",
  ".wav": "audio/wav",
  ".webm": "video/webm",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2"
};

const longLivedAssetExtensions = new Set([
  ".css",
  ".gif",
  ".ico",
  ".jpeg",
  ".jpg",
  ".js",
  ".png",
  ".svg",
  ".webp"
]);

function sendJson(response, status, payload) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", chunk => {
      body += chunk;
      if (body.length > 100000) {
        request.destroy();
        reject(new Error("Request body is too large."));
      }
    });
    request.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(new Error("Invalid JSON."));
      }
    });
    request.on("error", reject);
  });
}

function signedDownloadUrl(slug) {
  const expires = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7;
  const signature = crypto
    .createHmac("sha256", process.env.DOWNLOAD_SECRET)
    .update(`${slug}:${expires}`)
    .digest("hex");
  const base = process.env.PUBLIC_BASE_URL.replace(/\/$/, "");
  return `${base}/downloads/${slug}?expires=${expires}&signature=${signature}`;
}

async function sendDownloadEmail(email, items, idempotencyKey) {
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
    throw new Error("Email delivery is not configured.");
  }

  const links = items
    .map(item => `<li><a href="${driveLinks[item.slug]}">${item.name} Sound Pack</a></li>`)
    .join("");
  const result = await fetch("https://api.resend.com/emails", {
    method: "POST",
    signal: AbortSignal.timeout(15000),
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json", ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}) },
    body: JSON.stringify({
    from: process.env.EMAIL_FROM,
    to: [email],
    subject: "Your ScoreStems downloads",
    html: `<p>Here is your free ScoreStems sound pack. No payment is required.</p><p>Open your pack in Google Drive and choose Download:</p><ul>${links}</ul>`
    })
  });
  if (!result.ok) throw new Error("Email service unavailable. Please try again later.");
}

function serveDownload(requestUrl, response) {
  const slug = requestUrl.pathname.split("/").pop();
  if (!process.env.DOWNLOAD_SECRET || !Object.values(products).some(p => p.slug === slug)) {
    response.writeHead(404); response.end("Not found."); return;
  }
  const expires = Number(requestUrl.searchParams.get("expires"));
  const signature = requestUrl.searchParams.get("signature") || "";
  const expected = crypto
    .createHmac("sha256", process.env.DOWNLOAD_SECRET || "")
    .update(`${slug}:${expires}`)
    .digest("hex");
  const validSignature =
    /^[a-f0-9]{64}$/.test(signature) &&
    crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));

  if (!expires || expires < Math.floor(Date.now() / 1000) || !validSignature) {
    response.writeHead(403);
    response.end("This download link is invalid or expired.");
    return;
  }

  const file = path.join(privateDownloads, `${slug}.zip`);
  if (!fs.existsSync(file)) {
    response.writeHead(404);
    response.end("This download is not available yet.");
    return;
  }
  response.writeHead(200, {
    "Content-Disposition": `attachment; filename="${slug}.zip"`,
    "Content-Type": "application/zip"
  });
  fs.createReadStream(file).pipe(response);
}

function serveStatic(request, requestUrl, response) {
  const requestedPath = requestUrl.pathname === "/" ? "/index.html" : requestUrl.pathname;
  const decodedPath = decodeURIComponent(requestedPath);
  const file = path.resolve(root, `.${decodedPath}`);
  const blocked =
    !file.startsWith(root + path.sep) ||
    decodedPath.split("/").some(part => part.startsWith(".")) ||
    !(decodedPath.startsWith("/assets/") || /^\/[a-z-]+\.html$/.test(decodedPath)) ||
    file.startsWith(privateDownloads) ||
    [".env", ".gitignore", "package.json", "render.yaml", "server.js"].includes(path.basename(file));
  if (blocked || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    response.writeHead(404);
    response.end("Not found.");
    return;
  }
  const extension = path.extname(file).toLowerCase();
  const fileSize = fs.statSync(file).size;
  const headers = {
    "Accept-Ranges": "bytes",
    "Content-Length": fileSize,
    "Content-Type": mimeTypes[extension] || "application/octet-stream"
  };
  if (longLivedAssetExtensions.has(extension)) {
    headers["Cache-Control"] = [".js", ".css"].includes(extension) ? "no-cache" : "public, max-age=86400";
  }

  const range = request.headers.range;
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!match || (!match[1] && !match[2])) {
      response.writeHead(416, { "Content-Range": `bytes */${fileSize}` });
      response.end();
      return;
    }

    let start;
    let end;
    if (!match[1]) {
      const suffixLength = Number(match[2]);
      start = Math.max(fileSize - suffixLength, 0);
      end = fileSize - 1;
    } else {
      start = Number(match[1]);
      end = match[2] ? Number(match[2]) : fileSize - 1;
    }

    if (
      !Number.isSafeInteger(start) ||
      !Number.isSafeInteger(end) ||
      start < 0 ||
      end < start ||
      start >= fileSize
    ) {
      response.writeHead(416, { "Content-Range": `bytes */${fileSize}` });
      response.end();
      return;
    }

    end = Math.min(end, fileSize - 1);
    headers["Content-Length"] = end - start + 1;
    headers["Content-Range"] = `bytes ${start}-${end}/${fileSize}`;
    response.writeHead(206, headers);
    if (request.method === "HEAD") {
      response.end();
      return;
    }
    fs.createReadStream(file, { start, end }).pipe(response);
    return;
  }

  response.writeHead(200, headers);
  if (request.method === "HEAD") {
    response.end();
    return;
  }
  fs.createReadStream(file).pipe(response);
}


// Single-process abuse limits. Shared storage is required before scaling replicas.
const attempts = new Map();
function consumeLimit(key, max, duration) {
  const now = Date.now();
  for (const [k,v] of attempts) if (v.until <= now) attempts.delete(k);
  const entry = attempts.get(key) || { count: 0, until: now + duration };
  if (entry.count >= max) return false;
  entry.count++; attempts.set(key, entry); return true;
}
async function requestDownload(request, response) {
  if (!String(request.headers['content-type']).startsWith('application/json'))
    return sendJson(response, 415, { error: 'Please use the download form.' });
  const body = await readJson(request);
  const item = Object.entries(products).find(([,p]) => p.slug === body.pack);
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!item || email.length > 254 || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email))
    return sendJson(response, 400, { error: 'Choose an available pack and enter a valid email address.' });
  if (body.website) return sendJson(response, 400, { error: 'Unable to submit this request.' });
  let base;
  try { base = new URL(process.env.PUBLIC_BASE_URL); } catch (_) {}
  if (!base || base.protocol !== 'https:' || !process.env.RESEND_API_KEY || !process.env.EMAIL_FROM)
    return sendJson(response, 503, { error: 'Email downloads are being prepared. Please check back soon.' });
  if (request.headers.origin && request.headers.origin !== base.origin)
    return sendJson(response, 403, { error: 'Please submit the form on the ScoreStems website.' });
  const emailHash = crypto.createHash('sha256').update(email).digest('hex');
  if (!consumeLimit('email:' + emailHash, 3, 3600000) || !consumeLimit('global', 90, 86400000))
    return sendJson(response, 429, { error: 'The download email limit has been reached. Please try again later.' });
  try {
    await sendDownloadEmail(email, [{ name: item[0], slug: body.pack }]);
  } catch (_) {
    return sendJson(response, 502, { error: 'The email could not be sent. Please try again later.' });
  }
  return sendJson(response, 200, { ok: true });
}


async function stripeWebhook(request, response) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return sendJson(response, 503, { error: 'Webhook not configured.' });
  const chunks = []; let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 1000000) return sendJson(response, 413, { error: 'Payload too large.' });
    chunks.push(Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks);
  const parts = String(request.headers['stripe-signature'] || '').split(',');
  const timestamp = parts.find(p => p.startsWith('t='))?.slice(2);
  const expected = crypto.createHmac('sha256', secret).update(timestamp + '.').update(raw).digest('hex');
  const valid = parts.filter(p => p.startsWith('v1=')).some(p => {
    const value = p.slice(3);
    return /^[a-f0-9]{64}$/.test(value) && crypto.timingSafeEqual(Buffer.from(value), Buffer.from(expected));
  });
  if (!timestamp || !Number.isFinite(Number(timestamp)) || Math.abs(Date.now()/1000 - Number(timestamp)) > 300 || !valid)
    return sendJson(response, 400, { error: 'Invalid signature.' });
  const event = JSON.parse(raw.toString('utf8'));
  if (!['checkout.session.completed','checkout.session.async_payment_succeeded'].includes(event.type))
    return sendJson(response, 200, { received: true });
  const session = event.data.object;
  const slug = session.client_reference_id;
  const item = Object.entries(products).find(([,p]) => p.slug === slug);
  if (!item || session.payment_status !== 'paid' || !session.livemode)
    return sendJson(response, 200, { received: true });
  const email = session.customer_details?.email;
  if (!email || !session.id) return sendJson(response, 400, { error: 'Missing checkout details.' });
  try {
    await sendDownloadEmail(email, [{ name: item[0], slug }], 'scorestems-' + session.id);
  } catch (_) {
    return sendJson(response, 502, { error: 'Email delivery failed. Retry event.' });
  }
  return sendJson(response, 200, { received: true });
}

const server = http.createServer(async (request, response) => {
  const requestUrl = new URL(request.url, `http://${request.headers.host}`);
  try {
    if (request.method === "POST" && requestUrl.pathname === "/api/stripe/webhook") return await stripeWebhook(request, response);
    if (request.method === "POST" && requestUrl.pathname === "/api/downloads/request") {
      return await requestDownload(request, response);
    }
    if (request.method === "GET" && requestUrl.pathname === "/api/health") {
      return sendJson(response, 200, { ok: true });
    }
    if (requestUrl.pathname.startsWith("/api/paypal/")) {
      return sendJson(response, 410, { error: "Sound packs are now free. Visit /score-packs.html." });
    }
    if (request.method === "GET" && requestUrl.pathname.startsWith("/downloads/")) {
      return serveDownload(requestUrl, response);
    }
    if (request.method === "GET" || request.method === "HEAD") {
      return serveStatic(request, requestUrl, response);
    }
    sendJson(response, 404, { error: "Not found." });
  } catch (error) {
    console.error("Request failed.");
    sendJson(response, 400, { error: error.message || "Request failed." });
  }
});

if (require.main === module) server.listen(port, () => {
  console.log(`ScoreStems is running on port ${port}`);
});

module.exports = { server };
