/* Einblendungen für das Anleitungsvideo: Untertitel, Rahmen um das erklärte
   Element, sichtbarer Mauszeiger mit Klick-Welle und Titelkarten. Wird von
   tools/video/video.mjs in jede Seite geladen (addInitScript). Liegt als
   Popover in der obersten Ebene, damit es auch über dem Anmeldefenster steht. */
(() => {
  if (window.__tut) return;
  const css = `
    #tut { position: fixed; inset: 0; width: 100vw; height: 100vh; margin: 0; padding: 0; border: 0;
      background: transparent; overflow: visible; pointer-events: none; color: inherit; }
    #tut * { box-sizing: border-box; }
    #tut-text { position: absolute; left: 0; right: 0; bottom: 22px; margin: 0 auto; width: fit-content;
      max-width: min(1080px, calc(100vw - 48px)); padding: 12px 22px; border-radius: 12px;
      background: rgba(6, 22, 28, 0.9); color: #fff; font: 600 21px/1.4 "IBM Plex Sans", system-ui, sans-serif;
      text-align: center; box-shadow: 0 6px 24px rgba(0,0,0,.3); opacity: 0; transition: opacity .25s; }
    #tut-text.an { opacity: 1; }
    #tut-rahmen { position: absolute; border: 4px solid #f2b705; border-radius: 10px;
      box-shadow: 0 0 0 9999px rgba(6, 22, 28, 0.28); opacity: 0; transition: opacity .25s, left .35s, top .35s, width .35s, height .35s; }
    #tut-rahmen.an { opacity: 1; }
    #tut-zeiger { position: absolute; left: -60px; top: -60px; width: 30px; height: 30px;
      transition: left .7s cubic-bezier(.4,0,.2,1), top .7s cubic-bezier(.4,0,.2,1); filter: drop-shadow(0 2px 3px rgba(0,0,0,.45)); }
    #tut-welle { position: absolute; width: 46px; height: 46px; margin: -23px 0 0 -23px; border-radius: 50%;
      border: 4px solid #f2b705; opacity: 0; }
    #tut-welle.los { animation: tut-welle .6s ease-out; }
    @keyframes tut-welle { from { opacity: 1; transform: scale(.3); } to { opacity: 0; transform: scale(1.5); } }
    #tut-karte { position: absolute; inset: 0; display: grid; place-items: center; background: rgba(6, 22, 28, 0.82);
      opacity: 0; transition: opacity .35s; }
    #tut-karte.an { opacity: 1; }
    #tut-karte > div { background: #fff; color: #10242c; border-radius: 18px; padding: 44px 60px; max-width: 900px;
      text-align: center; font: 400 26px/1.45 "IBM Plex Sans", system-ui, sans-serif; box-shadow: 0 20px 60px rgba(0,0,0,.4); }
    #tut-karte h1 { font: 700 46px/1.15 "IBM Plex Sans", system-ui, sans-serif; margin: 0 0 14px; color: #0d6a80; }
    #tut-karte .zugang { display: grid; grid-template-columns: auto auto; gap: 10px 24px; justify-content: center;
      margin-top: 22px; text-align: left; font-size: 30px; }
    #tut-karte code { font: 700 34px/1.2 "IBM Plex Mono", ui-monospace, monospace; background: #fff3d1; color: #5e4500;
      padding: 2px 14px; border-radius: 8px; }
    #tut-karte .klein { font-size: 20px; color: #566b75; margin-top: 18px; }
  `;
  const PFEIL = `<svg viewBox="0 0 24 24" width="30" height="30"><path d="M4 2l15 11-6.6 1.2 3.9 7.3-3 1.6-3.9-7.4L4 20z" fill="#fff" stroke="#10242c" stroke-width="1.6" stroke-linejoin="round"/></svg>`;

  let root, text, rahmen, zeiger, welle, karte;
  let ziel = null;
  let zx = -60, zy = -60;

  function bauen() {
    if (root && document.body.contains(root)) return;
    const st = document.createElement("style");
    st.textContent = css;
    document.head.appendChild(st);
    root = document.createElement("div");
    root.id = "tut";
    root.setAttribute("popover", "manual");
    root.innerHTML = `<div id="tut-rahmen"></div><div id="tut-karte"></div><div id="tut-text"></div><div id="tut-welle"></div><div id="tut-zeiger">${PFEIL}</div>`;
    document.body.appendChild(root);
    [text, rahmen, zeiger, welle, karte] = ["#tut-text", "#tut-rahmen", "#tut-zeiger", "#tut-welle", "#tut-karte"].map((s) => root.querySelector(s));
    nachVorn();
    zeiger.style.left = zx + "px";
    zeiger.style.top = zy + "px";
    requestAnimationFrame(folgen);
  }

  function nachVorn() {
    try {
      if (root.matches(":popover-open")) root.hidePopover();
      root.showPopover();
    } catch (e) { /* ohne Popover: normale Ebene */ }
  }

  function folgen() {
    if (ziel && document.contains(ziel)) {
      const r = ziel.getBoundingClientRect();
      const p = 8;
      Object.assign(rahmen.style, { left: r.left - p + "px", top: r.top - p + "px", width: r.width + 2 * p + "px", height: r.height + 2 * p + "px" });
    }
    requestAnimationFrame(folgen);
  }

  window.__tut = {
    bauen,
    nachVorn,
    untertitel(t) {
      bauen();
      text.textContent = t || "";
      text.classList.toggle("an", !!t);
    },
    rahmen(sel) {
      bauen();
      ziel = sel ? document.querySelector(sel) : null;
      rahmen.classList.toggle("an", !!ziel);
    },
    zeiger(x, y) {
      bauen();
      zx = x; zy = y;
      zeiger.style.left = x - 4 + "px";
      zeiger.style.top = y - 2 + "px";
    },
    welle() {
      welle.style.left = zx + "px";
      welle.style.top = zy + "px";
      welle.classList.remove("los");
      void welle.offsetWidth;
      welle.classList.add("los");
    },
    karte(html) {
      bauen();
      if (html) karte.innerHTML = `<div>${html}</div>`;
      karte.classList.toggle("an", !!html);
    },
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bauen);
  else bauen();
})();
