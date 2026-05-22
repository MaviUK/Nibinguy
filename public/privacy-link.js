(function () {
  var privacyHref = "/privacy-policy.html";
  var overlayId = "nbg-privacy-policy-overlay";

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function closePrivacyOverlay() {
    var overlay = document.getElementById(overlayId);
    if (overlay) overlay.remove();
  }

  function stylePolicyContent(container) {
    container.querySelectorAll("h1").forEach(function (el) {
      el.style.cssText = "margin:0 0 8px;color:#16a34a;font-size:clamp(28px,5vw,44px);line-height:1.1;font-weight:900;";
    });
    container.querySelectorAll("h2").forEach(function (el) {
      el.style.cssText = "margin:28px 0 10px;color:#111;font-size:20px;line-height:1.2;font-weight:900;";
    });
    container.querySelectorAll("p").forEach(function (el) {
      el.style.cssText = "margin:0 0 14px;color:#222;line-height:1.65;";
    });
    container.querySelectorAll("ul").forEach(function (el) {
      el.style.cssText = "margin:0 0 16px;padding-left:22px;color:#222;line-height:1.65;";
    });
    container.querySelectorAll("a").forEach(function (el) {
      el.style.cssText = "color:#16a34a;text-decoration:underline;font-weight:700;";
    });
    container.querySelectorAll(".updated").forEach(function (el) {
      el.style.cssText = "margin-top:0;margin-bottom:22px;color:#555;";
    });
    container.querySelectorAll(".contact-box").forEach(function (el) {
      el.style.cssText = "margin-top:28px;padding:18px;border-radius:16px;background:rgba(22,163,74,.08);border:1px solid rgba(22,163,74,.25);";
    });
  }

  function loadPolicyInto(content) {
    content.innerHTML = '<p style="margin:0;color:#444;">Loading Privacy Policy...</p>';

    fetch(privacyHref, { cache: "no-store" })
      .then(function (response) {
        if (!response.ok) throw new Error("Privacy Policy request failed");
        return response.text();
      })
      .then(function (html) {
        var parsed = new DOMParser().parseFromString(html, "text/html");
        var article = parsed.querySelector("article.card") || parsed.querySelector("article") || parsed.body;
        content.innerHTML = article ? article.innerHTML : html;
        stylePolicyContent(content);
      })
      .catch(function () {
        content.innerHTML = '<p style="margin:0 0 12px;color:#222;line-height:1.6;">Sorry, the Privacy Policy could not load inside this popup.</p><p style="margin:0;color:#222;line-height:1.6;">Please open <a href="/privacy-policy.html" target="_blank" rel="noopener noreferrer" data-allow-policy-navigation="true" style="color:#16a34a;text-decoration:underline;font-weight:700;">the Privacy Policy here</a>.</p>';
      });
  }

  function openPrivacyOverlay() {
    closePrivacyOverlay();

    var overlay = document.createElement("div");
    overlay.id = overlayId;
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "nbg-privacy-policy-title");
    overlay.style.cssText = "position:fixed;inset:0;z-index:80;background:rgba(0,0,0,.82);display:flex;align-items:center;justify-content:center;padding:12px;box-sizing:border-box;";

    var panel = document.createElement("div");
    panel.style.cssText = "width:min(920px,96vw);max-height:90dvh;background:#fff;color:#111;border-radius:18px;overflow:hidden;box-shadow:0 20px 70px rgba(0,0,0,.45);display:flex;flex-direction:column;";
    panel.addEventListener("click", function (event) {
      event.stopPropagation();
    });

    var header = document.createElement("div");
    header.style.cssText = "display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 20px;border-bottom:1px solid #e5e7eb;background:#f9fafb;flex-shrink:0;";
    header.innerHTML = '<strong id="nbg-privacy-policy-title" style="font-size:18px;">Privacy Policy</strong>';

    var closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.textContent = "Close";
    closeButton.style.cssText = "border:0;border-radius:10px;background:#16a34a;color:#fff;font-weight:700;padding:9px 14px;cursor:pointer;";
    closeButton.addEventListener("click", closePrivacyOverlay);
    header.appendChild(closeButton);

    var content = document.createElement("div");
    content.style.cssText = "padding:22px;overflow:auto;max-height:calc(90dvh - 70px);background:#fff;color:#111;";

    panel.appendChild(header);
    panel.appendChild(content);
    overlay.appendChild(panel);
    overlay.addEventListener("click", closePrivacyOverlay);
    document.body.appendChild(overlay);

    loadPolicyInto(content);
  }

  function addPrivacyLinkToTerms() {
    var nodes = document.querySelectorAll("div.whitespace-pre-line");

    nodes.forEach(function (node) {
      if (node.dataset.privacyPolicyLinked === "true") return;

      var text = node.textContent || "";
      if (text.indexOf("7) Data & Communication") === -1) return;
      if (text.indexOf("Text reminders are a courtesy") === -1) return;

      var updatedText = text.replace(
        "• You consent to us storing your details and contacting you about your service.",
        "• You consent to us storing your details and contacting you about your service. Please read our Privacy Policy for full details."
      );

      var linkMarkup = '<button type="button" data-open-privacy-policy="true" style="background:none;border:0;padding:0;color:#16a34a;text-decoration:underline;font-weight:700;cursor:pointer;font:inherit">Privacy Policy</button>';

      node.innerHTML = escapeHtml(updatedText)
        .replace(/\n/g, "<br>")
        .replace("Privacy Policy", linkMarkup);

      var trigger = node.querySelector("[data-open-privacy-policy]");
      if (trigger) {
        trigger.addEventListener("click", function (event) {
          event.preventDefault();
          event.stopPropagation();
          openPrivacyOverlay();
        });
      }

      node.dataset.privacyPolicyLinked = "true";
    });
  }

  function isPrivacyPolicyHref(href) {
    if (!href) return false;
    try {
      var url = new URL(href, window.location.origin);
      return url.pathname === privacyHref;
    } catch (e) {
      return href === privacyHref;
    }
  }

  document.addEventListener("click", function (event) {
    var link = event.target.closest("a[href]");
    if (!link) return;
    if (link.dataset.allowPolicyNavigation === "true") return;
    if (!isPrivacyPolicyHref(link.getAttribute("href"))) return;

    event.preventDefault();
    event.stopPropagation();
    openPrivacyOverlay();
  }, true);

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") closePrivacyOverlay();
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", addPrivacyLinkToTerms);
  } else {
    addPrivacyLinkToTerms();
  }

  setInterval(addPrivacyLinkToTerms, 500);
})();
