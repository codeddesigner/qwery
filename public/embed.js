/* Qwery embed — https://qwery (standard, full page, popup, slider, popover, side tab) */
(function () {
  if (window.Qwery && window.Qwery.__loaded) return;
  function iframe(url, extra) {
    var f = document.createElement('iframe');
    var u = url + (url.indexOf('?') > -1 ? '&' : '?') + 'embed=1' + (extra || '');
    if (location.search) u += '&' + location.search.slice(1).split('&').filter(function (p) { return /^utm_/.test(p); }).join('&');
    f.src = u; f.allow = 'camera; microphone; autoplay; encrypted-media; clipboard-write';
    f.style.cssText = 'border:0;width:100%;height:100%;display:block;border-radius:inherit';
    f.title = 'Qwery form';
    return f;
  }
  function overlay(url, opts) {
    opts = opts || {};
    var size = { Small: '60%', Medium: '75%', Large: '90%' }[opts.size || 'Large'];
    var o = document.createElement('div');
    o.style.cssText = 'position:fixed;inset:0;background:rgba(16,16,16,.6);z-index:2147483646;display:flex;align-items:center;justify-content:center';
    var box = document.createElement('div');
    var kind = opts.kind || 'popup';
    if (kind === 'slider' || kind === 'sidetab') box.style.cssText = 'position:absolute;right:0;top:0;bottom:0;width:min(560px,100%);background:#fff;box-shadow:0 16px 40px rgba(0,0,0,.2)';
    else if (kind === 'popover') { o.style.background = 'transparent'; o.style.pointerEvents = 'none'; box.style.cssText = 'pointer-events:auto;position:absolute;right:20px;bottom:90px;width:min(380px,calc(100% - 40px));height:min(560px,calc(100% - 120px));background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 16px 40px rgba(0,0,0,.2)'; }
    else box.style.cssText = 'position:relative;width:' + size + ';height:' + size + ';max-width:1100px;background:#fff;border-radius:14px;overflow:hidden';
    var x = document.createElement('button');
    x.innerHTML = '&times;'; x.setAttribute('aria-label', 'Close form');
    x.style.cssText = 'position:absolute;right:8px;top:6px;z-index:2;background:#fff;border:0;border-radius:50%;width:30px;height:30px;font-size:20px;cursor:pointer';
    function close() { o.remove(); document.removeEventListener('keydown', esc); }
    function esc(e) { if (e.key === 'Escape') close(); }
    x.onclick = close; o.onclick = function (e) { if (e.target === o) close(); };
    document.addEventListener('keydown', esc);
    box.appendChild(x); box.appendChild(iframe(url, opts.hidden)); o.appendChild(box); document.body.appendChild(o);
    return { close: close };
  }
  function button(el, url, d) {
    var kind = d.qwery;
    var b = document.createElement('button');
    b.textContent = d.buttonText || 'Open form';
    var color = d.buttonColor || '#4D4DE1';
    var r = Math.round((+(d.radius || 65) / 100) * 30) + 'px';
    b.style.cssText = d.asText === 'true'
      ? 'background:none;border:0;color:' + color + ';text-decoration:underline;cursor:pointer;font-size:' + (d.fontSize || 20) + 'px;font-family:inherit'
      : 'background:' + color + ';color:#fff;border:0;border-radius:' + r + ';padding:10px 20px;cursor:pointer;font-size:' + (d.fontSize || 20) + 'px;font-family:inherit';
    if (kind === 'slider' || kind === 'sidetab') { b.style.position = 'fixed'; b.style.right = kind === 'sidetab' ? '-48px' : '0'; b.style.top = '45%'; b.style.zIndex = 2147483645; if (kind === 'sidetab') b.style.transform = 'rotate(-90deg)'; }
    if (kind === 'popover') { b.style.cssText += ';position:fixed;right:20px;bottom:20px;width:56px;height:56px;border-radius:50%;padding:0;z-index:2147483645'; b.textContent = '💬'; b.setAttribute('aria-label', d.buttonText || 'Open form'); }
    b.onclick = function () { overlay(url, { kind: kind, size: d.size, hidden: d.hidden ? '#' + d.hidden.replace(/,/g, '&') : '' }); };
    el.appendChild(b);
  }
  function mount(el) {
    if (el.__qwery) return; el.__qwery = true;
    var d = el.dataset, url = d.url, kind = d.qwery || 'standard';
    if (!url) return;
    if (kind === 'standard' || kind === 'full') {
      var w = d.width || '100%', h = d.height || '500px';
      if (kind === 'full') { el.style.cssText = 'position:fixed;inset:0;z-index:2147483640'; }
      else { el.style.width = w; el.style.height = h; el.style.maxWidth = '100%'; el.style.borderRadius = '12px'; el.style.overflow = 'hidden'; }
      if (d.transparency) el.style.opacity = String(1 - +d.transparency / 100 * 0.6);
      el.appendChild(iframe(url, d.hidden ? '#' + d.hidden.replace(/,/g, '&') : ''));
      if (kind === 'standard' && window.innerWidth < 640) el.style.height = '80vh';
    } else button(el, url, d);
  }
  function scan() { document.querySelectorAll('[data-qwery]').forEach(mount); }
  window.Qwery = { __loaded: true, popup: function (url, o) { return overlay(url, Object.assign({ kind: 'popup' }, o || {})); }, slider: function (url, o) { return overlay(url, Object.assign({ kind: 'slider' }, o || {})); }, scan: scan };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scan); else scan();
})();
