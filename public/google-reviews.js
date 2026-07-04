(function () {
  const reviewList = document.getElementById("google-reviews-list");
  const ratingSummary = document.getElementById("google-rating-summary");
  const googleButton = document.getElementById("google-reviews-button");

  if (!reviewList) return;

  function setFallback(message) {
    reviewList.replaceChildren();
    const p = document.createElement("p");
    p.style.margin = "0";
    p.style.color = "#a1a1aa";
    p.style.lineHeight = "1.65";
    p.textContent = message;
    reviewList.appendChild(p);
  }

  function starText(rating) {
    const value = Math.max(0, Math.min(5, Math.round(Number(rating) || 0)));
    return "★★★★★".slice(0, value) + "☆☆☆☆☆".slice(0, 5 - value);
  }

  function makeReviewCard(review) {
    const article = document.createElement("article");
    article.style.background = "rgba(24,24,27,0.92)";
    article.style.border = "1px solid rgba(255,255,255,0.14)";
    article.style.borderRadius = "16px";
    article.style.padding = "16px";
    article.style.marginTop = "12px";

    if (review.rating) {
      const rating = document.createElement("div");
      rating.style.color = "#facc15";
      rating.style.letterSpacing = "1px";
      rating.style.marginBottom = "8px";
      rating.setAttribute("aria-label", review.rating + " star review");
      rating.textContent = starText(review.rating);
      article.appendChild(rating);
    }

    const text = document.createElement("p");
    text.style.margin = "0 0 12px";
    text.style.color = "#e4e4e7";
    text.style.lineHeight = "1.65";
    text.textContent = "“" + (review.text || "") + "”";
    article.appendChild(text);

    const meta = document.createElement("div");
    meta.style.display = "flex";
    meta.style.justifyContent = "space-between";
    meta.style.gap = "12px";
    meta.style.alignItems = "center";

    const author = document.createElement("strong");
    author.style.color = "white";
    author.textContent = review.author || "Google reviewer";
    meta.appendChild(author);

    if (review.published) {
      const published = document.createElement("span");
      published.style.color = "#71717a";
      published.style.fontSize = "0.85rem";
      published.textContent = review.published;
      meta.appendChild(published);
    }

    article.appendChild(meta);
    return article;
  }

  fetch("/.netlify/functions/googleReviews")
    .then((res) => res.json())
    .then((data) => {
      if (data.googleMapsUri && googleButton) googleButton.href = data.googleMapsUri;
      if (data.googleReviewsUrl && googleButton) googleButton.href = data.googleReviewsUrl;

      if (data.rating && ratingSummary) {
        const count = data.userRatingCount
          ? " from " + Number(data.userRatingCount).toLocaleString() + " Google reviews"
          : " on Google";
        ratingSummary.textContent = data.rating.toFixed(1) + "★" + count;
      }

      const reviews = Array.isArray(data.reviews) ? data.reviews.slice(0, 5) : [];
      if (!reviews.length) {
        setFallback("Google reviews will appear here once the Google Places API key and Place ID are configured in Netlify.");
        return;
      }

      reviewList.replaceChildren();
      reviews.forEach((review) => reviewList.appendChild(makeReviewCard(review)));
    })
    .catch(() => {
      setFallback("Google reviews could not be loaded right now. Use the button below to view them on Google.");
    });
})();
