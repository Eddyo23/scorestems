(() => {
  const config = window.SCORESTEMS_DOWNLOADS || {};
  const titles = { documentary: 'Documentary', thriller: 'Thriller', 'moody-cue': 'Moody Cue', orchestral: 'Orchestral', sophisticated: 'Sophisticated' };
  const slug = new URLSearchParams(location.search).get('pack');
  const status = document.getElementById('download-status');
  const container = document.getElementById('kit-signup');
  if (container) {
    if (!Object.hasOwn(titles, slug)) {
      document.getElementById('download-title').textContent = 'Choose a sound pack';
      status.textContent = 'Choose a collection from the sound packs page to get started.';
      return;
    }
    document.getElementById('download-title').textContent = titles[slug] + ' sound pack';
    const form = config.forms?.[slug];
    let url;
    try { url = new URL(form?.scriptUrl); } catch (_) {}
    if (!form?.uid || !url || url.protocol !== 'https:' || !/(^|\.)(kit\.com|convertkit\.com|ck\.page)$/.test(url.hostname)) {
      status.textContent = 'Email downloads are being prepared. Please check back soon or contact scorestems@gmail.com.';
      return;
    }
    status.textContent = 'Loading email signup…';
    const script = document.createElement('script');
    script.async = true;
    script.dataset.uid = form.uid;
    script.src = url.href;
    script.onload = () => { status.textContent = ''; };
    script.onerror = () => { status.textContent = 'The signup form could not load. Please try again or contact scorestems@gmail.com.'; };
    container.appendChild(script);
  }
  const donate = document.getElementById('contribute');
  if (donate) {
    let url;
    try { url = new URL(config.stripePaymentLink); } catch (_) {}
    if (url?.protocol === 'https:' && url.hostname === 'buy.stripe.com') {
      donate.href = url.href;
      donate.hidden = false;
    } else {
      status.textContent = 'Contributions will be available soon. Your free download does not require a payment.';
    }
  }
})();
