(function () {
  var privacyHref = "/privacy-policy.html";

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
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

      var linkMarkup = '<a href="' + privacyHref + '" target="_blank" rel="noopener noreferrer" style="color:#16a34a;text-decoration:underline;font-weight:700">Privacy Policy</a>';

      node.innerHTML = escapeHtml(updatedText)
        .replace(/\n/g, "<br>")
        .replace("Privacy Policy", linkMarkup);

      node.dataset.privacyPolicyLinked = "true";
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", addPrivacyLinkToTerms);
  } else {
    addPrivacyLinkToTerms();
  }

  setInterval(addPrivacyLinkToTerms, 500);
})();
