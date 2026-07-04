(function () {
  const PAGE_URL = "https://www.facebook.com/profile.php?id=100064103796752";
  const BASE_URL = "https://www.facebook.com/plugins/page.php";
  const MIN_WIDTH = 180;
  const MAX_WIDTH = 500;
  const HEIGHT = 500;

  function clampWidth(value) {
    const n = Math.floor(Number(value) || MAX_WIDTH);
    return Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, n));
  }

  function buildSrc(width) {
    const params = new URLSearchParams({
      href: PAGE_URL,
      tabs: "timeline",
      width: String(width),
      height: String(HEIGHT),
      small_header: "false",
      adapt_container_width: "true",
      hide_cover: "false",
      show_facepile: "true",
    });

    return BASE_URL + "?" + params.toString();
  }

  function fitFacebookFeed() {
    const frame = document.querySelector('iframe[title="Ni Bin Guy Facebook page"]');
    if (!frame) return;

    const parent = frame.parentElement;
    const available = parent ? parent.clientWidth : frame.clientWidth;
    const width = clampWidth(available);
    const nextSrc = buildSrc(width);

    frame.width = String(width);
    frame.height = String(HEIGHT);
    frame.style.width = width + "px";
    frame.style.maxWidth = "100%";
    frame.style.margin = "0 auto";
    frame.style.display = "block";

    if (frame.src !== nextSrc) {
      frame.src = nextSrc;
    }
  }

  let resizeTimer = null;

  function scheduleFit() {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(fitFacebookFeed, 150);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", fitFacebookFeed);
  } else {
    fitFacebookFeed();
  }

  window.addEventListener("resize", scheduleFit);
})();
