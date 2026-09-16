
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
    }());
