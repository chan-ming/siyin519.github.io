(function () {
  const cards = Array.from(document.querySelectorAll("[data-publication]"));
  if (!cards.length) {
    return;
  }

  const searchInput = document.querySelector(".publication-search");
  const filters = Array.from(document.querySelectorAll(".publication-filter"));
  const countNode = document.querySelector(".home-publication-count");
  const emptyNode = document.querySelector(".home-publications__empty");

  const splitTags = (value) => value.split(",").map((tag) => tag.trim()).filter(Boolean);

  const unique = (values) => Array.from(new Set(values.filter(Boolean)));

  const fillSelect = (select, values, sorter) => {
    unique(values).sort(sorter).forEach((value) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      select.appendChild(option);
    });
  };

  filters.forEach((select) => {
    const filter = select.dataset.filter;
    if (filter === "year") {
      fillSelect(select, cards.map((card) => card.dataset.year), (a, b) => Number(b) - Number(a));
    }
    if (filter === "venue") {
      fillSelect(select, cards.map((card) => card.dataset.venue), (a, b) => a.localeCompare(b));
    }
    if (filter === "tag") {
      fillSelect(select, cards.flatMap((card) => splitTags(card.dataset.tags || "")), (a, b) => a.localeCompare(b));
    }
  });

  const getFilterValue = (name) => {
    const select = filters.find((item) => item.dataset.filter === name);
    return select ? select.value : "";
  };

  const applyFilters = () => {
    const query = (searchInput ? searchInput.value : "").trim().toLowerCase();
    const year = getFilterValue("year");
    const venue = getFilterValue("venue");
    const tag = getFilterValue("tag");
    let visibleCount = 0;

    cards.forEach((card) => {
      const tags = splitTags(card.dataset.tags || "");
      const haystack = [
        card.dataset.title,
        card.dataset.authors,
        card.dataset.venue,
        card.dataset.year,
        card.dataset.tags
      ].join(" ").toLowerCase();

      const matchesQuery = !query || haystack.includes(query);
      const matchesYear = !year || card.dataset.year === year;
      const matchesVenue = !venue || card.dataset.venue === venue;
      const matchesTag = !tag || tags.includes(tag);
      const visible = matchesQuery && matchesYear && matchesVenue && matchesTag;

      card.hidden = !visible;
      if (visible) {
        visibleCount += 1;
      }
    });

    if (countNode) {
      countNode.textContent = `${visibleCount} of ${cards.length} publications shown`;
    }
    if (emptyNode) {
      emptyNode.hidden = visibleCount !== 0;
    }
  };

  if (searchInput) {
    searchInput.addEventListener("input", applyFilters);
  }
  filters.forEach((select) => select.addEventListener("change", applyFilters));
  applyFilters();
})();
