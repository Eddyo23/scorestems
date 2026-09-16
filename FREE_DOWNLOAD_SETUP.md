# Free sound packs and optional contributions

The website is prepared, but public signup embeds, the Stripe link, and full downloadable files must be configured before launch. No emails are collected while the form is unconfigured.

## Kit

Create one inline form for each available pack: Documentary, Thriller, Moody Cue, Orchestral, Sophisticated. Keep No Synth as coming soon.

1. Ask for email, label the action “Email my free download”, and explain what emails the person will receive. Newsletter marketing should be a separate optional choice; downloading must not require newsletter consent.
2. Enable the confirmation/incentive email. Set its confirmation button to deliver the corresponding complete ZIP, or redirect to a separately hosted download. Confirm Kit's upload limit against the actual ZIP sizes before choosing hosting. Do not use the compressed preview clips as the full pack.
3. Set the form's after-submission redirect to `https://YOUR_DOMAIN/support.html?pack=SLUG`, using the correct slug from `assets/js/download-config.js`.
4. Leave “Send subscriber data to thank you page” disabled. The site does not need email addresses in URLs.
5. Copy the JavaScript embed's `data-uid` and `src` into the matching `uid` and `scriptUrl` fields in `assets/js/download-config.js`. Style the Kit form with Work Sans, a white background, square controls, and restrained borders.
6. Test new and existing subscribers for every pack, including confirmation emails and download delivery. Configure optional marketing consent separately in Kit if marketing is desired.

## Stripe

Create a one-time Payment Link for “Support ScoreStems”, using **Customer chooses what to pay**, USD, with **no preset suggested amount**. This is an optional contribution; use the appropriate tipping/support category for the business. Put the public `https://buy.stripe.com/...` link in `stripePaymentLink`. The website says Optional Contribution; leave the amount for the visitor to choose. Configure the completion redirect to the website if desired.

The support page offers “Continue without contributing”. Kit sends the download independently of Stripe, so closing checkout or declining to pay never blocks delivery.

## Before launch

- Supply the five full ZIPs and configure their delivery in Kit.
- Verify all five form redirects and incentive emails with owner-approved test addresses.
- Verify the Stripe link uses USD and lets the visitor choose the amount.
- Test the free path without paying. Do not run a live charge as a routine test.
- The previous PayPal purchase endpoints return 410 and the cart has been removed. Old signed download links remain supported.

References: https://help.kit.com/en/articles/4009572-form-embedding-basics and https://docs.stripe.com/payment-links/create
