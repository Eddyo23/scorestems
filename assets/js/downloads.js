(() => {
  const config = window.SCORESTEMS_DOWNLOADS || {};
  const titles = { documentary: 'Documentary', thriller: 'Thriller', 'moody-cue': 'Moody Cue', orchestral: 'Orchestral', sophisticated: 'Sophisticated' };
  const slug = new URLSearchParams(location.search).get('pack');
  const status = document.getElementById('download-status');
  const form = document.getElementById('download-form');
  if (form) {
    if (!Object.hasOwn(titles, slug)) {
      document.getElementById('download-title').textContent = 'Choose a sound pack';
      status.textContent = 'Choose a collection from the sound packs page to get started.';
      return;
    }
    document.getElementById('download-title').textContent = titles[slug] + ' sound pack';
    form.hidden = false;
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const button = form.querySelector('button');
      button.disabled = true;
      status.textContent = 'Sending your download email…';
      try {
        const data = new FormData(form);
        const response = await fetch('/api/downloads/request', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pack: slug, email: data.get('email'), website: data.get('website') })
        });
        const result = await response.json();
        if (!response.ok || !result.ok) throw new Error(result.error || 'Unable to send your email. Please try again.');
        form.hidden = true;
        status.textContent = 'Check your inbox for your Google Drive download link. If it hasn’t arrived, check spam.';
      } catch (error) {
        status.textContent = error.message || 'Unable to send your email. Please try again.';
        button.disabled = false;
      }
    });
  }
  const skip = document.querySelector('.skip-contribution');
  if (skip && Object.hasOwn(titles, slug)) skip.href = 'download.html?pack=' + encodeURIComponent(slug);
  const donate = document.getElementById('contribute');
  if (donate) {
    let url;
    try { url = new URL(config.stripePaymentLink); } catch (_) {}
    if (config.contributionsEnabled && Object.hasOwn(titles, slug) && url?.protocol === 'https:' && url.hostname === 'buy.stripe.com') {
      if (Object.hasOwn(titles, slug)) url.searchParams.set('client_reference_id', slug);
      donate.href = url.href;
      donate.hidden = false;
    } else {
      status.textContent = 'Contributions will be available soon. Your free download does not require a payment.';
    }
  }
})();
