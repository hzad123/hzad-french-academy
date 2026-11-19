// HZad French Academy version-aware bootstrap.
// This small, stable file is published as academy.js so the existing
// GoHighLevel Custom HTML block never needs to be changed for releases.
(function () {
  var host = document.getElementById('hzad-academy-host');
  if (!host || host.dataset.hzadBootstrapStarted === 'true') return;
  host.dataset.hzadBootstrapStarted = 'true';
  var scriptTag = document.currentScript;
  var base = scriptTag && scriptTag.src
    ? scriptTag.src.replace(/academy\.js(?:\?.*)?$/, '')
    : 'https://hzad123.github.io/hzad-french-academy/';
  if (!/\/$/.test(base)) base = 'https://hzad123.github.io/hzad-french-academy/';
  function inject(version) {
    var suffix = '?v=' + encodeURIComponent(version);
    host.dataset.hzadAssetVersion = version;
    // New stylesheet is inserted AFTER any unversioned link from the
    // legacy GHL snippet, so fresh styles always win in the cascade.
    var css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = base + 'academy.css' + suffix;
    document.head.appendChild(css);
    var app = document.createElement('script');
    app.src = base + 'academy-app.js' + suffix;
    app.async = true;
    app.onerror = function () {
      host.textContent = 'Unable to load HZad French Academy. Please refresh the page or contact support.';
    };
    document.head.appendChild(app);
  }
  fetch(base + 'BUILD_COMMIT.txt?check=' + Date.now(), {cache:'no-store'})
    .then(function (res) {
      if (!res.ok) throw new Error('Build manifest unavailable');
      return res.text();
    })
    .then(function (version) {
      version = version.trim();
      if (!/^[0-9a-f]{40}$/.test(version)) throw new Error('Invalid build revision');
      inject(version);
    })
    // Cross-origin manifest requests may be blocked, but a unique app URL
    // still bypasses any cached old JS/CSS. Do not silently render a stale app.
    .catch(function () { inject('refresh-' + Date.now()); });
})();
