document.addEventListener("DOMContentLoaded", function () {
  var titleLinks = Array.prototype.slice.call(
    document.querySelectorAll('.pub-venue + strong a[href*="doi.org/"], .pub-venue + strong a[href*="/doi/"]')
  );

  if (!titleLinks.length) return;

  function extractDoi(href) {
    var decoded = decodeURIComponent(href);
    var lower = decoded.toLowerCase();
    var marker = lower.indexOf("doi.org/");
    var offset = 8;
    if (marker === -1) {
      marker = lower.indexOf("/doi/");
      offset = 5;
    }
    if (marker === -1) return null;
    return decoded.slice(marker + offset).split(/[?#]/)[0].toLowerCase();
  }

  var linksByDoi = {};
  titleLinks.forEach(function (link) {
    var doi = extractDoi(link.href);
    if (!doi) return;
    linksByDoi[doi] = linksByDoi[doi] || [];
    linksByDoi[doi].push(link);
  });

  var dois = Object.keys(linksByDoi);
  if (!dois.length) return;

  var params = new URLSearchParams({
    filter: "doi:" + dois.map(function (doi) {
      return "https://doi.org/" + doi;
    }).join("|"),
    "per-page": "50",
    select: "doi,cited_by_count"
  });

  fetch("https://api.openalex.org/works?" + params.toString())
    .then(function (response) {
      if (!response.ok) throw new Error("Citation lookup failed");
      return response.json();
    })
    .then(function (data) {
      data.results.forEach(function (work) {
        if (!work.doi) return;
        var doi = work.doi.replace(/^https:\/\/doi\.org\//i, "").toLowerCase();
        (linksByDoi[doi] || []).forEach(function (link) {
          var badge = document.createElement("span");
          badge.className = "citation-badge";
          badge.title = "Citation count from OpenAlex";
          badge.innerHTML =
            '<span class="citation-badge__label"><i class="fas fa-graduation-cap" aria-hidden="true"></i> Citations</span>' +
            '<span class="citation-badge__count">' + work.cited_by_count + "</span>";
          var authorBlock = link.parentElement.parentElement.querySelector(".pub-authors");
          if (authorBlock) {
            authorBlock.insertAdjacentElement("beforebegin", badge);
          } else {
            link.parentElement.insertAdjacentElement("afterend", badge);
          }
        });
      });
    })
    .catch(function () {
      // Keep the publication list usable if the external citation service is unavailable.
    });
});
