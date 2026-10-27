document.addEventListener("DOMContentLoaded", function () {
  var titleLinks = Array.prototype.slice.call(
    document.querySelectorAll(".pub-venue + strong a")
  );

  function normalizeTitle(value) {
    return value
      .normalize("NFKD")
      .toLowerCase()
      .replace(/[\u2010-\u2015]/g, "-")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function relaxedTitle(value) {
    return normalizeTitle(value)
      .replace(/\b(a|an|the)\b/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  fetch("/assets/data/google-scholar.json?ts=" + Date.now(), { cache: "no-store" })
    .then(function (response) {
      if (!response.ok) throw new Error("Google Scholar snapshot lookup failed");
      return response.json();
    })
    .then(function (data) {
      var publications = {};
      (data.publications || []).forEach(function (publication) {
        publications[normalizeTitle(publication.title)] = publication;
        publications[relaxedTitle(publication.title)] = publication;
      });

      titleLinks.forEach(function (link) {
        var publication = publications[normalizeTitle(link.textContent)] ||
          publications[relaxedTitle(link.textContent)];
        if (!publication) return;

        var badge = document.createElement("span");
        badge.className = "citation-badge";
        badge.title = "Citation count from Google Scholar";
        badge.innerHTML =
          '<span class="citation-badge__label"><i class="fas fa-graduation-cap" aria-hidden="true"></i> Citations</span>' +
          '<span class="citation-badge__count">' + publication.citations + "</span>";
        var authorBlock = link.parentElement.parentElement.querySelector(".pub-authors");
        if (authorBlock) {
          authorBlock.insertAdjacentElement("beforebegin", badge);
        } else {
          link.parentElement.insertAdjacentElement("afterend", badge);
        }
      });

      var totalElement = document.getElementById("total-citations");
      var hIndexElement = document.getElementById("h-index");
      if (totalElement && data.metrics && data.metrics.citations) {
        totalElement.textContent = data.metrics.citations.all.toLocaleString();
      }
      if (hIndexElement && data.metrics && data.metrics.h_index) {
        hIndexElement.textContent = data.metrics.h_index.all;
      }
    })
    .catch(function () {
      // Keep the publication list usable if the snapshot is unavailable.
    });
});
