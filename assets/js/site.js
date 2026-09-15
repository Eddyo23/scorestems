(() => {
  function updateCount() {
    let cart = {};
    try { cart = JSON.parse(localStorage.getItem('scorestems-cart')) || {}; } catch (_) {}
    const total = Object.values(cart).reduce((sum, value) => sum + (Number.isFinite(value) && value > 0 ? value : 0), 0);
    document.querySelectorAll('.cart-count').forEach(el => { el.textContent = String(total); });
  }
  updateCount();
  window.addEventListener('storage', updateCount);
})();
