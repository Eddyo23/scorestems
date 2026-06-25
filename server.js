const crypto = require("crypto");
const fs = require("fs");
const http = require("http");
const path = require("path");
const { Resend } = require("resend");

const root = __dirname;
const port = Number(process.env.PORT || 3000);
const privateDownloads = path.join(root, "private-downloads");
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
  ".woff": "font/woff",
  ".woff2": "font/woff2"
};

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

function paypalBaseUrl() {
  return process.env.PAYPAL_ENV === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

async function paypalAccessToken() {
  const credentials = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
  ).toString("base64");
  const response = await fetch(`${paypalBaseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials"
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error_description || "Unable to authenticate with PayPal.");
  }
  return data.access_token;
}

function normalizeCart(items) {
  if (!Array.isArray(items)) {
    throw new Error("Cart items are required.");
  }
  const normalized = items.map(item => {
    const product = products[item.name];
    const quantity = Number(item.quantity);
    if (!product || !Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
      throw new Error("The cart contains an invalid item.");
    }
    return { name: item.name, quantity, ...product };
  });
  if (!normalized.length) {
    throw new Error("The cart is empty.");
  }
  return normalized;
}

function orderAmount(items) {
  return items
    .reduce((total, item) => total + Number(item.price) * item.quantity, 0)
    .toFixed(2);
}

async function createPaypalOrder(items) {
  const token = await paypalAccessToken();
  const response = await fetch(`${paypalBaseUrl()}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "PayPal-Request-Id": crypto.randomUUID(),
      Prefer: "return=representation"
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [{
        amount: {
          currency_code: "USD",
          value: orderAmount(items),
          breakdown: {
            item_total: {
              currency_code: "USD",
              value: orderAmount(items)
            }
          }
        },
        items: items.map(item => ({
          name: `${item.name} Sound Pack`,
          quantity: String(item.quantity),
          unit_amount: {
            currency_code: "USD",
            value: item.price
          },
          category: "DIGITAL_GOODS"
        }))
      }]
    })
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Unable to create the PayPal order.");
  }
  return data;
}

async function capturePaypalOrder(orderId) {
  const token = await paypalAccessToken();
  const response = await fetch(
    `${paypalBaseUrl()}/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "PayPal-Request-Id": `capture-${orderId}`,
        Prefer: "return=representation"
      }
    }
  );
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Unable to capture the PayPal order.");
  }
  return data;
}

function purchasedItems(capture) {
  const paypalItems = capture.purchase_units?.[0]?.items || [];
  return normalizeCart(
    paypalItems.map(item => ({
      name: item.name.replace(/ Sound Pack$/, ""),
      quantity: Number(item.quantity)
    }))
  );
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

async function sendDownloadEmail(email, items) {
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
    throw new Error("Email delivery is not configured.");
  }
  const resend = new Resend(process.env.RESEND_API_KEY);
  const links = items
    .map(item => `<li><a href="${signedDownloadUrl(item.slug)}">${item.name} Sound Pack</a></li>`)
    .join("");
  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM,
    to: [email],
    subject: "Your ScoreStems downloads",
    html: `<p>Thank you for your purchase.</p><p>Your download links expire in seven days:</p><ul>${links}</ul>`
  });
  if (error) {
    throw new Error(error.message || "Unable to send the download email.");
  }
}

function serveDownload(requestUrl, response) {
  const slug = requestUrl.pathname.split("/").pop();
  const expires = Number(requestUrl.searchParams.get("expires"));
  const signature = requestUrl.searchParams.get("signature") || "";
  const expected = crypto
    .createHmac("sha256", process.env.DOWNLOAD_SECRET || "")
    .update(`${slug}:${expires}`)
    .digest("hex");
  const validSignature =
    signature.length === expected.length &&
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

function serveStatic(requestUrl, response) {
  const requestedPath = requestUrl.pathname === "/" ? "/index.html" : requestUrl.pathname;
  const decodedPath = decodeURIComponent(requestedPath);
  const file = path.resolve(root, `.${decodedPath}`);
  const blocked =
    !file.startsWith(root) ||
    file.startsWith(privateDownloads) ||
    [".env", ".gitignore", "package.json", "render.yaml", "server.js"].includes(path.basename(file));
  if (blocked || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    response.writeHead(404);
    response.end("Not found.");
    return;
  }
  response.writeHead(200, {
    "Content-Type": mimeTypes[path.extname(file).toLowerCase()] || "application/octet-stream"
  });
  fs.createReadStream(file).pipe(response);
}

const server = http.createServer(async (request, response) => {
  const requestUrl = new URL(request.url, `http://${request.headers.host}`);
  try {
    if (request.method === "GET" && requestUrl.pathname === "/api/health") {
      return sendJson(response, 200, { ok: true });
    }
    if (request.method === "GET" && requestUrl.pathname === "/api/paypal/config") {
      return sendJson(response, 200, {
        clientId: process.env.PAYPAL_CLIENT_ID || "",
        currency: "USD"
      });
    }
    if (request.method === "POST" && requestUrl.pathname === "/api/paypal/orders") {
      const body = await readJson(request);
      const order = await createPaypalOrder(normalizeCart(body.items));
      return sendJson(response, 200, { id: order.id });
    }
    if (
      request.method === "POST" &&
      /^\/api\/paypal\/orders\/[^/]+\/capture$/.test(requestUrl.pathname)
    ) {
      const orderId = requestUrl.pathname.split("/")[4];
      const capture = await capturePaypalOrder(orderId);
      if (capture.status !== "COMPLETED") {
        throw new Error("PayPal did not complete the payment.");
      }
      const email = capture.payer?.email_address;
      if (!email) {
        throw new Error("PayPal did not return a customer email address.");
      }
      await sendDownloadEmail(email, purchasedItems(capture));
      return sendJson(response, 200, { status: capture.status, email });
    }
    if (request.method === "GET" && requestUrl.pathname.startsWith("/downloads/")) {
      return serveDownload(requestUrl, response);
    }
    if (request.method === "GET" || request.method === "HEAD") {
      return serveStatic(requestUrl, response);
    }
    sendJson(response, 404, { error: "Not found." });
  } catch (error) {
    console.error(error);
    sendJson(response, 400, { error: error.message || "Request failed." });
  }
});

server.listen(port, () => {
  console.log(`ScoreStems is running on port ${port}`);
});
