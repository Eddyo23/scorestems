# Sound-pack delivery

Each pack uses its owner-provided Google Drive URL in pack-links.json. No Kit subscription, ZIP uploads, or Render disk is needed. All five Drive files were checked: sharing says anyone with the link can access without signing in.

Flow: player page → optional contribution page → Stripe payment → automatic email containing the selected pack's Drive link. Skip contribution → email form → the same Drive link. No newsletter enrollment.

## Activation

Deploy server.js, pack-links.json, the changed HTML files and assets. Preserve existing image/audio assets. Existing Render variables RESEND_API_KEY, EMAIL_FROM and PUBLIC_BASE_URL are required. Keep DOWNLOAD_SECRET only for legacy signed URLs.

Live Stripe Payment Link created: https://buy.stripe.com/00w8wR3WK63M20ueKR67S00
Suggested $15 USD; customer can change amount. The website appends client_reference_id with the selected pack slug.

Configure a Stripe event destination at https://scorestems.com/api/stripe/webhook for checkout.session.completed and checkout.session.async_payment_succeeded. Save its signing secret as STRIPE_WEBHOOK_SECRET in Render. The server verifies the signature, requires a paid live checkout, and emails the selected Drive URL to the checkout email address. Resend's session-based idempotency key suppresses duplicates within its 24-hour window; manual replays later can resend a download email.

Only set contributionsEnabled to true in assets/js/download-config.js once the webhook and live email delivery have been verified. Until then, the free download form remains available.

## Checks

npm test covers free email delivery, invalid input, origin checks, email failures, rate limits, private files, legacy signed-link rejection, and paid Stripe webhook validation. Tests mock Resend and do not send real email. Verify a real email with an owner-approved recipient before launch.

Free-path limits: 3 requests per recipient per hour and 90 total per rolling 24 hours. Counters are process-local and reset on restart. Paid checkout email failures return an error so Stripe can retry. No persistent disk has been purchased as part of this setup.
