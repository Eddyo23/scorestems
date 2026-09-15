
    (function () {
      var collections = {
        documentary: [
          ['Comes Back Around', 'assets/Collection Audio/Documentary Collection WAVs/Comes Back Around.m4a'],
          ['DOC PAD 1', 'assets/Collection Audio/Documentary Collection WAVs/DOC PAD 1.m4a'],
          ['DOC SHORT 1', 'assets/Collection Audio/Documentary Collection WAVs/DOC SHORT 1.m4a'],
          ['Evening Blend', 'assets/Collection Audio/Documentary Collection WAVs/Evening Blend.m4a'],
          ['Feathered Ending', 'assets/Collection Audio/Documentary Collection WAVs/Feathered Ending.m4a'],
          ['Slow Runner', 'assets/Collection Audio/Documentary Collection WAVs/Slow Runner.m4a'],
          ['Wine Dark', 'assets/Collection Audio/Documentary Collection WAVs/Wine Dark.m4a']
        ],
        thriller: [
          ['Hard Sell', 'assets/Collection Audio/Thriller Collection WAVs/Hard Sell.m4a'],
          ['Run and Hide', 'assets/Collection Audio/Thriller Collection WAVs/Run and Hide.m4a'],
          ['Rust', 'assets/Collection Audio/Thriller Collection WAVs/Rust.m4a'],
          ['Not available', ''],
          ['ST SHORT 1', 'assets/Collection Audio/Thriller Collection WAVs/ST SHORT 1.m4a'],
          ['Sharp Teeth', 'assets/Collection Audio/Thriller Collection WAVs/Sharp Teeth.m4a'],
          ['Thrills', 'assets/Collection Audio/Thriller Collection WAVs/Thrills.m4a']
        ],
        essentials: [],
        moody: [
          ['Clocks', 'assets/Collection Audio/Moody Cue Collection WAVs/Clocks.m4a'],
          ['Dark Woods', 'assets/Collection Audio/Moody Cue Collection WAVs/Dark Woods.m4a'],
          ['MC PAD 1', 'assets/Collection Audio/Moody Cue Collection WAVs/MC PAD 1.m4a'],
          ['MC SHORT 1', 'assets/Collection Audio/Moody Cue Collection WAVs/MC SHORT 1.m4a'],
          ['Mellow Walk', 'assets/Collection Audio/Moody Cue Collection WAVs/Mellow Walk.m4a'],
          ['Old Worn Piano', 'assets/Collection Audio/Moody Cue Collection WAVs/Old Worn Piano.m4a'],
          ['Plans', 'assets/Collection Audio/Moody Cue Collection WAVs/Plans.m4a']
        ],
        orchestral: [
          ['Dripping Gold', 'assets/Collection Audio/Orchestral Collection WAVs/Dripping Gold.m4a'],
          ['Easy Dawn', 'assets/Collection Audio/Orchestral Collection WAVs/Easy Dawn.m4a'],
          ['Hidden Signal', 'assets/Collection Audio/Orchestral Collection WAVs/Hidden Signal.m4a'],
          ['Orchestral PAD 1', 'assets/Collection Audio/Orchestral Collection WAVs/Orchestral PAD 1.m4a'],
          ['Orchestral SHORT 1', 'assets/Collection Audio/Orchestral Collection WAVs/Orchestral SHORT 1.m4a'],
          ['Overgrown Path', 'assets/Collection Audio/Orchestral Collection WAVs/Overgrown Path.m4a'],
          ['Zoom Out', 'assets/Collection Audio/Orchestral Collection WAVs/Zoom Out.m4a']
        ],
        sophisticated: [
          ['Basil Old Fashioned', 'assets/Collection Audio/Sophisticated Collection WAVs/Basil Old Fashioned.m4a'],
          ['Just Me', 'assets/Collection Audio/Sophisticated Collection WAVs/Just Me.m4a'],
          ['Onto Something', 'assets/Collection Audio/Sophisticated Collection WAVs/Onto Something.m4a'],
          ['Red Fast Jazz', 'assets/Collection Audio/Sophisticated Collection WAVs/Red Fast Jazz.m4a'],
          ['Not available', ''],
          ['SOPH SHORT 1', 'assets/Collection Audio/Sophisticated Collection WAVs/SOPH SHORT 1.m4a'],
          ['Under The Bridge Lo-Fi', 'assets/Collection Audio/Sophisticated Collection WAVs/Under The Bridge Lo-Fi.m4a']
        ]
      };
      var players = document.querySelectorAll('.score-pack-player');
      var scorePackProjects = document.querySelectorAll('#scorePacks1 .project');

      function mobileCardHoverEnabled() {
        return window.matchMedia && window.matchMedia('(max-width: 992px)').matches;
      }

      function closeScorePackCards(exceptProject) {
        Array.prototype.forEach.call(scorePackProjects, function (project) {
          if (project !== exceptProject) {
            project.classList.remove('is-open');
          }
        });
      }

      Array.prototype.forEach.call(scorePackProjects, function (project) {
        project.addEventListener('click', function (event) {
          if (!mobileCardHoverEnabled() || project.classList.contains('is-open')) {
            return;
          }
          event.preventDefault();
          event.stopPropagation();
          closeScorePackCards(project);
          project.classList.add('is-open');
        }, true);
      });

      document.addEventListener('click', function (event) {
        if (!mobileCardHoverEnabled() || event.target.closest('#scorePacks1 .project')) {
          return;
        }
        closeScorePackCards();
      });

      document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') {
          closeScorePackCards();
        }
      });

      Array.prototype.forEach.call(players, function (audio) {
        var tracks = collections[audio.getAttribute('data-collection')] || [];
        var trackCount = Number(audio.getAttribute('data-track-count')) || 7;
        var playlist = document.createElement('div');
        var previous = document.createElement('button');
        var selector = document.createElement('select');
        var next = document.createElement('button');

        playlist.className = 'score-pack-playlist';
        previous.className = 'score-pack-track-button';
        previous.type = 'button';
        previous.setAttribute('aria-label', 'Previous track');
        previous.textContent = '‹';

        selector.className = 'score-pack-track-select';
        selector.setAttribute('aria-label', 'Choose a preview track');

        for (var i = 1; i <= trackCount; i += 1) {
          var option = document.createElement('option');
          option.value = String(i);
          option.textContent = tracks[i - 1] ? tracks[i - 1][0] : 'Track ' + i;
          selector.appendChild(option);
        }

        next.className = 'score-pack-track-button';
        next.type = 'button';
        next.setAttribute('aria-label', 'Next track');
        next.textContent = '›';

        playlist.appendChild(previous);
        playlist.appendChild(selector);
        playlist.appendChild(next);
        audio.parentNode.insertBefore(playlist, audio);

        function loadTrack(trackNumber, autoplay) {
          var track = tracks[trackNumber - 1];
          var source = track ? track[1] : '';
          selector.value = String(trackNumber);

          if (!source) {
            audio.pause();
            audio.removeAttribute('src');
            audio.load();
            return;
          }

          audio.src = source;
          audio.load();
          if (autoplay) {
            var playAttempt = audio.play();
            if (playAttempt && typeof playAttempt.catch === 'function') {
              playAttempt.catch(function () {
                // Mobile browsers may block automatic playback after a track ends.
              });
            }
          }
        }

        function changeTrack(direction, autoplay) {
          var current = Number(selector.value);
          var nextTrack = ((current - 1 + direction + trackCount) % trackCount) + 1;
          loadTrack(nextTrack, autoplay);
        }

        selector.addEventListener('change', function () {
          loadTrack(Number(selector.value), false);
        });
        previous.addEventListener('click', function () {
          changeTrack(-1, false);
        });
        next.addEventListener('click', function () {
          changeTrack(1, false);
        });
        audio.addEventListener('ended', function () {
          changeTrack(1, true);
        });
        loadTrack(1, false);
      });
    }());
  

    (function () {
      var storageKey = 'scorestems-cart';
      var cartItems = document.getElementById('cartItems');
      var cartEmpty = document.getElementById('cartEmpty');
      var clearCart = document.getElementById('clearCart');
      var cartTotalPrice = document.getElementById('cartTotal');
      var paypalButtonContainer = document.getElementById('paypalButtonContainer');
      var cartPaymentMessage = document.getElementById('cartPaymentMessage');
      var productPrices = {
        Documentary: 40,
        Thriller: 40,
        'Moody Cue': 40,
        Orchestral: 40,
        Sophisticated: 40
      };

      function readCart() {
        try {
          var savedCart = JSON.parse(localStorage.getItem(storageKey)) || {};
          Object.keys(savedCart).forEach(function (name) {
            if (!productPrices[name]) {
              delete savedCart[name];
            }
          });
          return savedCart;
        } catch (error) {
          return {};
        }
      }

      function writeCart(cart) {
        localStorage.setItem(storageKey, JSON.stringify(cart));
      }

      function cartTotal(cart) {
        return Object.keys(cart).reduce(function (total, name) {
          return total + cart[name];
        }, 0);
      }

      function updateCartCount(cart) {
        var total = cartTotal(cart);
        Array.prototype.forEach.call(document.querySelectorAll('.cart-count'), function (count) {
          count.textContent = String(total);
        });
      }

      function paypalCartItems() {
        var cart = readCart();
        return Object.keys(cart).map(function (name) {
          return { name: name, quantity: cart[name] };
        });
      }

      function loadPaypal() {
        fetch('/api/paypal/config')
          .then(function (response) {
            if (!response.ok) {
              throw new Error('Unable to load PayPal configuration.');
            }
            return response.json();
          })
          .then(function (config) {
            if (!config.clientId) {
              cartPaymentMessage.textContent = 'PayPal checkout is not configured yet.';
              return;
            }
            var script = document.createElement('script');
            script.src = 'https://www.paypal.com/sdk/js?client-id=' +
              encodeURIComponent(config.clientId) +
              '&currency=USD&components=buttons';
            script.onload = renderPaypalButtons;
            script.onerror = function () {
              cartPaymentMessage.textContent = 'PayPal could not be loaded.';
            };
            document.head.appendChild(script);
          })
          .catch(function (error) {
            cartPaymentMessage.textContent = error.message;
          });
      }

      function renderPaypalButtons() {
        if (!window.paypal) {
          return;
        }
        window.paypal.Buttons({
          style: {
            color: 'gold',
            shape: 'rect',
            label: 'paypal',
            height: 42
          },
          createOrder: function () {
            var items = paypalCartItems();
            if (!items.length) {
              cartPaymentMessage.textContent = 'Add a sound pack before checking out.';
              return Promise.reject(new Error('The cart is empty.'));
            }
            cartPaymentMessage.textContent = '';
            return fetch('/api/paypal/orders', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ items: items })
            })
              .then(function (response) {
                return response.json().then(function (data) {
                  if (!response.ok) {
                    throw new Error(data.error || 'Unable to create the PayPal order.');
                  }
                  return data.id;
                });
              });
          },
          onApprove: function (data) {
            cartPaymentMessage.textContent = 'Confirming payment and preparing your email…';
            return fetch('/api/paypal/orders/' + encodeURIComponent(data.orderID) + '/capture', {
              method: 'POST'
            })
              .then(function (response) {
                return response.json().then(function (result) {
                  if (!response.ok) {
                    throw new Error(result.error || 'Unable to complete the payment.');
                  }
                  writeCart({});
                  renderCart();
                  cartPaymentMessage.textContent =
                    'Payment complete. Download links were sent to ' + result.email + '.';
                });
              })
              .catch(function (error) {
                cartPaymentMessage.textContent = error.message;
                throw error;
              });
          },
          onCancel: function () {
            cartPaymentMessage.textContent = 'Checkout was canceled. Your cart is unchanged.';
          },
          onError: function () {
            if (!cartPaymentMessage.textContent) {
              cartPaymentMessage.textContent = 'PayPal checkout encountered an error.';
            }
          }
        }).render(paypalButtonContainer);
      }

      function renderCart() {
        var cart = readCart();
        var names = Object.keys(cart);
        cartItems.innerHTML = '';
        cartEmpty.style.display = names.length ? 'none' : 'block';
        clearCart.disabled = !names.length;

        names.forEach(function (name) {
          var item = document.createElement('div');
          var productName = document.createElement('span');
          var itemPrice = document.createElement('span');
          var quantity = document.createElement('div');
          var decrease = document.createElement('button');
          var amount = document.createElement('span');
          var increase = document.createElement('button');
          var remove = document.createElement('button');

          item.className = 'cart-item';
          productName.className = 'cart-item-name';
          productName.textContent = name + ' Sound Pack';
          itemPrice.className = 'cart-item-price';
          itemPrice.textContent = '$' + (productPrices[name] * cart[name]);

          quantity.className = 'cart-quantity';
          decrease.type = 'button';
          decrease.textContent = '−';
          decrease.setAttribute('aria-label', 'Decrease ' + name + ' quantity');
          amount.textContent = String(cart[name]);
          increase.type = 'button';
          increase.textContent = '+';
          increase.setAttribute('aria-label', 'Increase ' + name + ' quantity');

          remove.className = 'cart-remove';
          remove.type = 'button';
          remove.textContent = 'Remove';

          decrease.addEventListener('click', function () {
            cart[name] -= 1;
            if (cart[name] < 1) {
              delete cart[name];
            }
            writeCart(cart);
            renderCart();
          });

          increase.addEventListener('click', function () {
            cart[name] += 1;
            writeCart(cart);
            renderCart();
          });

          remove.addEventListener('click', function () {
            delete cart[name];
            writeCart(cart);
            renderCart();
          });

          quantity.appendChild(decrease);
          quantity.appendChild(amount);
          quantity.appendChild(increase);
          item.appendChild(productName);
          item.appendChild(itemPrice);
          item.appendChild(quantity);
          item.appendChild(remove);
          cartItems.appendChild(item);
        });

        updateCartCount(cart);
        cartTotalPrice.textContent = '$' + names.reduce(function (total, name) {
          return total + (productPrices[name] * cart[name]);
        }, 0);
      }

      Array.prototype.forEach.call(document.querySelectorAll('.score-pack-purchase'), function (button) {
        button.addEventListener('click', function () {
          var cart = readCart();
          var product = button.getAttribute('data-product');
          cart[product] = (cart[product] || 0) + 1;
          writeCart(cart);
          renderCart();
          button.textContent = 'Added';
          window.setTimeout(function () {
            button.textContent = 'Add to Cart';
          }, 900);
        });
      });

      clearCart.addEventListener('click', function () {
        writeCart({});
        renderCart();
      });

      renderCart();
      loadPaypal();
    }());
  