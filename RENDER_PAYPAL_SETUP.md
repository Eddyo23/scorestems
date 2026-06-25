# Render + PayPal setup

## 1. Create the Render service

Connect this repository in Render and create a Blueprint from `render.yaml`, or create
a Node web service manually with:

- Build command: `npm install`
- Start command: `npm start`
- Health check: `/api/health`

## 2. Add Render environment variables

Set these in the Render dashboard. Do not commit their values:

- `PAYPAL_ENV`: `sandbox` while testing, then `live`
- `PAYPAL_CLIENT_ID`: PayPal REST app client ID
- `PAYPAL_CLIENT_SECRET`: PayPal REST app secret
- `RESEND_API_KEY`: Resend API key
- `EMAIL_FROM`: verified sender, such as `ScoreStems <orders@scorestems.com>`
- `DOWNLOAD_SECRET`: long random value; Render can generate this
- `PUBLIC_BASE_URL`: final site URL, such as `https://scorestems.com`

## 3. Add private ZIP files

The server expects these filenames in a non-public `private-downloads` directory:

- `documentary.zip`
- `thriller.zip`
- `moody-cue.zip`
- `orchestral.zip`
- `sophisticated.zip`

For Render, mount a persistent disk at:

`/opt/render/project/src/private-downloads`

Upload the ZIP files through a Render shell. A private object-storage service such as
Amazon S3 or Cloudflare R2 is preferable if downloads become large or traffic grows.

## 4. Configure PayPal

Create a REST app in the PayPal Developer Dashboard. Start with sandbox credentials.
After a complete sandbox purchase succeeds and the email/download flow is verified,
replace the credentials with the live app credentials and set `PAYPAL_ENV=live`.

The browser sends only product names and quantities. The server independently validates
the products and calculates every price at $40 before creating the PayPal order.

## 5. Configure email

Verify the sending domain in Resend and set `EMAIL_FROM` to an address on that domain.
After PayPal captures payment, the server emails seven-day signed download links to the
email address returned by PayPal.

## Production hardening

Before significant sales volume, add a database and a verified
`PAYMENT.CAPTURE.COMPLETED` webhook. Store PayPal capture IDs to make fulfillment
idempotent and allow reliable retries if the email provider is temporarily unavailable.
