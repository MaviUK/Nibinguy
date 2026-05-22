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
    header.style.cssText = "display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 20px;border-bottom:1px solid #e5e7eb;background:#f9fafb;";
    header.innerHTML = '<strong id="nbg-privacy-policy-title" style="font-size:18px;">Privacy Policy</strong>';

    var closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.textContent = "Close";
    closeButton.style.cssText = "border:0;border-radius:10px;background:#16a34a;color:#fff;font-weight:700;padding:9px 14px;cursor:pointer;";
    closeButton.addEventListener("click", closePrivacyOverlay);
    header.appendChild(closeButton);

    var frame = document.createElement("iframe");
    frame.src = privacyHref;
    frame.title = "Ni Bin Guy Privacy Policy";
    frame.style.cssText = "width:100%;height:72dvh;border:0;background:#050505;";

    panel.appendChild(header);
    panel.appendChild(frame);
    overlay.appendChild(panel);

    overlay.addEventListener("click", closePrivacyOverlay);

    document.body.appendChild(overlay);
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
