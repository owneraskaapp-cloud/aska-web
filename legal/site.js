/*
 * ASKA situs: membaca harga dan pengaturan dari backend, jadi halaman web tidak perlu diunggah ulang saat harga berubah.
 * Sumber kebenaran: database (tab PlanProducts + AppConfig) yang diatur di halaman admin › Paket › Harga jual.
 * Bila server tidak bisa dihubungi, halaman memakai salinan terakhir di perangkat, lalu isi tertanam di HTML masing-masing.
 *
 * Satu-satunya nilai yang harus diubah di sini adalah API bila alamat Web App backend pindah.
 */
(function (w) {
  var API = 'https://script.google.com/macros/s/AKfycbzSeoQ5Wopm9mMQdPIFhfWUE51fNi_ErWGnXeg3Abvc7NYC04WDh22zns83ff3kPkJSWA/exec?page=pricing';
  var KEY = 'askaPricing1';

  function cached() {
    try { var o = JSON.parse(w.localStorage.getItem(KEY)); if (o && o.d && o.d.ok && o.d.plans) return o.d; } catch (e) {}
    return null;
  }
  function remember(d) { try { w.localStorage.setItem(KEY, JSON.stringify({ at: Date.now(), d: d })); } catch (e) {} }

  /** cb(data) dipanggil sekali dari salinan di perangkat (bila ada) dan sekali lagi bila data dari server berbeda. cb(null) bila tidak ada sama sekali. */
  function get(cb) {
    var old = cached(), oldText = old ? JSON.stringify(old) : '', called = false;
    if (old) { called = true; cb(old); }
    var ctl = w.AbortController ? new w.AbortController() : null, timer = setTimeout(function () { if (ctl) ctl.abort(); }, 7000);
    w.fetch(API, { cache: 'no-store', signal: ctl ? ctl.signal : undefined })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
      .then(function (d) {
        clearTimeout(timer);
        if (!d || !d.ok || !d.plans) return Promise.reject();
        remember(d);
        var t = JSON.stringify(d);
        // updatedAt berubah tiap pemuatan; bandingkan tanpa itu supaya halaman tidak digambar ulang tanpa perlu.
        if (!called || strip(t) !== strip(oldText)) { called = true; cb(d); }
      })
      .catch(function () { clearTimeout(timer); if (!called) cb(null); });
  }
  function strip(t) { return t.replace(/"updatedAt":"[^"]*",?/, ''); }

  function each(sel, fn) { var n = document.querySelectorAll(sel); for (var i = 0; i < n.length; i++) fn(n[i]); }

  /** Isi elemen bertanda: data-contact (email), data-trial (hari), data-trial-tpl (kalimat dengan {n}), data-trial-only (disembunyikan bila tanpa masa gratis),
   *  data-q="PAKET:kunci" (kuota), data-ratio="PAKET:PEMBAGI:kunci" (kelipatan), data-announce (pengumuman). */
  function fill(d) {
    if (!d) return;
    each('[data-contact]', function (el) {
      el.textContent = d.contact;
      if (el.tagName === 'A') el.setAttribute('href', 'mailto:' + d.contact);
    });
    each('[data-trial]', function (el) { el.textContent = d.trialDays; });
    each('[data-trial-tpl]', function (el) { el.textContent = el.getAttribute('data-trial-tpl').replace('{n}', d.trialDays); });
    each('[data-trial-only]', function (el) { el.hidden = !(d.trialDays > 0); });
    each('[data-q]', function (el) {
      var a = el.getAttribute('data-q').split(':'), p = d.plans[a[0]], v = p && p.limits ? p.limits[a[1]] : null;
      if (v !== null && v !== undefined) el.textContent = v;
    });
    each('[data-ratio]', function (el) {
      var a = el.getAttribute('data-ratio').split(':'), p = d.plans[a[0]], q = d.plans[a[1]];
      var x = p && p.limits ? p.limits[a[2]] : 0, y = q && q.limits ? q.limits[a[2]] : 0;
      if (x > 0 && y > 0) el.textContent = String(Math.round(x / y));
    });
    each('[data-announce]', function (el) { el.textContent = d.announce || ''; el.hidden = !d.announce; });
  }

  w.AskaSite = { get: get, fill: fill };
})(window);
