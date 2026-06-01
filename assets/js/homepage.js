(function () {
  const normalize = (value) => String(value || "").trim().toLowerCase();

  const splitTags = (value) => String(value || "").split(",").map((tag) => tag.trim()).filter(Boolean);

  const unique = (values) => Array.from(new Set(values.filter(Boolean)));

  const fillSelect = (select, values, sorter) => {
    unique(values).sort(sorter).forEach((value) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      select.appendChild(option);
    });
  };

  const initPublicationFilters = () => {
    const cards = Array.from(document.querySelectorAll("[data-publication]"));
    if (!cards.length) {
      return;
    }

    const searchInput = document.querySelector(".publication-search");
    const filters = Array.from(document.querySelectorAll(".publication-filter"));
    const countNode = document.querySelector(".home-publication-count");
    const emptyNode = document.querySelector(".home-publications__empty");
    const publicationTitle = document.getElementById("publications-heading");
    const publicationTitleText = publicationTitle ? publicationTitle.querySelector("[data-publication-title-text]") : null;

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
      const hasActiveFilter = Boolean(query || year || venue || tag);
      let visibleCount = 0;

      cards.forEach((card) => {
        const tags = splitTags(card.dataset.tags || "");
        const isFeatured = card.dataset.featured === "true";
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
        const matchesTag = !tag || tags.map(normalize).includes(normalize(tag));
        const visible = hasActiveFilter
          ? matchesQuery && matchesYear && matchesVenue && matchesTag
          : isFeatured;

        card.hidden = !visible;
        if (visible) {
          visibleCount += 1;
        }
      });

      if (countNode) {
        countNode.textContent = hasActiveFilter
          ? `${visibleCount} of ${cards.length} publications shown`
          : `${visibleCount} featured publications shown`;
      }
      if (emptyNode) {
        emptyNode.hidden = visibleCount !== 0;
      }
      if (publicationTitleText) {
        publicationTitleText.textContent = hasActiveFilter
          ? publicationTitle.dataset.filteredTitle || "Publications"
          : publicationTitle.dataset.defaultTitle || "Featured Publications";
      }
    };

    if (searchInput) {
      searchInput.addEventListener("input", applyFilters);
    }
    filters.forEach((select) => select.addEventListener("change", applyFilters));
    applyFilters();
  };

  const initPublicationDetails = () => {
    const toggles = Array.from(document.querySelectorAll(".home-publication__details-toggle"));
    toggles.forEach((toggle) => {
      const panel = document.getElementById(toggle.getAttribute("aria-controls"));
      if (!panel) {
        return;
      }
      toggle.addEventListener("click", () => {
        const isOpen = toggle.getAttribute("aria-expanded") === "true";
        toggle.setAttribute("aria-expanded", String(!isOpen));
        toggle.textContent = isOpen ? "Details" : "Hide details";
        panel.hidden = isOpen;
      });
    });

    const copyButtons = Array.from(document.querySelectorAll(".home-publication__copy"));
    copyButtons.forEach((button) => {
      const target = document.getElementById(button.dataset.copyTarget);
      if (!target) {
        return;
      }
      button.addEventListener("click", async () => {
        const text = target.textContent || "";
        const previousLabel = button.textContent;
        try {
          if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
          } else {
            const textarea = document.createElement("textarea");
            textarea.value = text;
            textarea.setAttribute("readonly", "");
            textarea.style.position = "fixed";
            textarea.style.top = "-1000px";
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand("copy");
            document.body.removeChild(textarea);
          }
          button.textContent = "Copied";
        } catch (error) {
          button.textContent = "Copy failed";
        }
        window.setTimeout(() => {
          button.textContent = previousLabel;
        }, 1400);
      });
    });
  };

  const positionMapPoints = () => {
    const points = Array.from(document.querySelectorAll("[data-map-point]"));
    const positioned = [];

    points.forEach((point) => {
      const lat = Number(point.dataset.lat);
      const lng = Number(point.dataset.lng);
      const markerLabel = point.querySelector("span");
      const title = point.dataset.lifeTitle || point.getAttribute("aria-label") || "";
      point.dataset.lifeTitle = title;
      point.hidden = false;
      point.classList.remove("is-cluster");
      point.dataset.lifeIndexes = point.dataset.lifeIndex || "";
      point.setAttribute("aria-label", title || "Life moment");
      if (markerLabel) {
        markerLabel.textContent = "";
      }
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        point.hidden = true;
        return;
      }
      const x = ((lng + 180) / 360) * 100;
      const y = ((90 - lat) / 180) * 100;
      point.style.left = `${Math.max(2, Math.min(98, x))}%`;
      point.style.top = `${Math.max(4, Math.min(96, y))}%`;
      positioned.push({
        point,
        x,
        y,
        index: point.dataset.lifeIndex,
        title
      });
    });

    const groups = [];
    positioned.forEach((item) => {
      const group = groups.find((candidate) => Math.hypot(candidate.x - item.x, candidate.y - item.y) < 1.2);
      if (group) {
        group.items.push(item);
      } else {
        groups.push({ x: item.x, y: item.y, items: [item] });
      }
    });

    groups.forEach((group) => {
      const anchor = group.items[0].point;
      const indexes = group.items.map((item) => item.index).filter(Boolean);
      const titles = group.items.map((item) => item.title).filter(Boolean);
      anchor.dataset.lifeIndexes = indexes.join(",");
      anchor.setAttribute("aria-label", titles.length > 1 ? `${titles.length} moments: ${titles.join(", ")}` : titles[0] || "Life moment");
      group.items.slice(1).forEach((item) => {
        item.point.hidden = true;
      });
    });
  };

  const initLifeViews = () => {
    const mapPoints = Array.from(document.querySelectorAll("[data-map-point]"));
    const mapCards = Array.from(document.querySelectorAll("[data-map-card]"));
    const mapDetails = Array.from(document.querySelectorAll("[data-map-detail]"));
    const clearButtons = Array.from(document.querySelectorAll("[data-map-clear]"));
    const imageButtons = Array.from(document.querySelectorAll("[data-map-image]"));
    const lightbox = document.querySelector("[data-life-lightbox]");
    const lightboxImage = document.querySelector("[data-life-lightbox-image]");
    const lightboxCaption = document.querySelector("[data-life-lightbox-caption]");
    const lightboxCloseButtons = Array.from(document.querySelectorAll("[data-life-lightbox-close]"));
    const mapViewport = document.querySelector("[data-map-viewport]");
    const mapCanvas = document.querySelector("[data-map-canvas]");
    const zoomInput = document.querySelector("[data-map-zoom]");
    const zoomIn = document.querySelector("[data-map-zoom-in]");
    const zoomOut = document.querySelector("[data-map-zoom-out]");
    const zoomReset = document.querySelector("[data-map-reset]");
    const mapState = {
      scale: 1,
      x: 0,
      y: 0,
      activeIndex: ""
    };

    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
    const getPointIndexes = (point) => String(point.dataset.lifeIndexes || point.dataset.lifeIndex || "").split(",").filter(Boolean);
    const pointIncludesIndex = (point, index) => getPointIndexes(point).includes(String(index));
    const findPointForIndex = (index) => mapPoints.find((point) => !point.hidden && pointIncludesIndex(point, index));

    const clampMapPan = () => {
      if (!mapViewport || mapState.scale <= 1) {
        mapState.x = 0;
        mapState.y = 0;
        return;
      }
      const width = mapViewport.clientWidth;
      const height = mapViewport.clientHeight;
      const minX = width - (width * mapState.scale);
      const minY = height - (height * mapState.scale);
      mapState.x = clamp(mapState.x, minX, 0);
      mapState.y = clamp(mapState.y, minY, 0);
    };

    const applyMapTransform = () => {
      if (!mapCanvas) {
        return;
      }
      clampMapPan();
      mapCanvas.style.transform = `translate(${mapState.x}px, ${mapState.y}px) scale(${mapState.scale})`;
      if (zoomInput) {
        zoomInput.value = String(mapState.scale);
      }
    };

    const setMapZoom = (scale, originX, originY) => {
      if (!mapViewport) {
        return;
      }
      const previousScale = mapState.scale;
      const nextScale = clamp(scale, 1, 4);
      const rect = mapViewport.getBoundingClientRect();
      const activePoint = findPointForIndex(mapState.activeIndex);
      const activeX = activePoint ? (Number.parseFloat(activePoint.style.left) / 100) * rect.width : rect.width / 2;
      const activeY = activePoint ? (Number.parseFloat(activePoint.style.top) / 100) * rect.height : rect.height / 2;
      const focusX = Number.isFinite(originX) ? originX : activeX;
      const focusY = Number.isFinite(originY) ? originY : activeY;
      mapState.x = focusX - ((focusX - mapState.x) * nextScale) / previousScale;
      mapState.y = focusY - ((focusY - mapState.y) * nextScale) / previousScale;
      mapState.scale = nextScale;
      applyMapTransform();
    };

    const centerMapOnPoint = (index) => {
      if (!mapViewport || mapState.scale <= 1) {
        return;
      }
      const point = findPointForIndex(index);
      if (!point) {
        return;
      }
      const width = mapViewport.clientWidth;
      const height = mapViewport.clientHeight;
      const pointX = (Number.parseFloat(point.style.left) / 100) * width;
      const pointY = (Number.parseFloat(point.style.top) / 100) * height;
      mapState.x = (width / 2) - (pointX * mapState.scale);
      mapState.y = (height / 2) - (pointY * mapState.scale);
      applyMapTransform();
    };

    const clearActiveMoment = () => {
      mapState.activeIndex = "";
      mapPoints.forEach((point) => point.classList.remove("is-active"));
      mapCards.forEach((card) => card.classList.remove("is-active"));
      mapDetails.forEach((detail) => {
        detail.hidden = true;
      });
    };

    const setActiveMoment = (index) => {
      mapState.activeIndex = index;
      mapPoints.forEach((point) => {
        point.classList.toggle("is-active", !point.hidden && pointIncludesIndex(point, index));
      });
      mapCards.forEach((card) => {
        card.classList.toggle("is-active", card.dataset.lifeIndex === index);
      });
      mapDetails.forEach((detail) => {
        detail.hidden = detail.dataset.lifeIndex !== index;
      });
      centerMapOnPoint(index);
    };

    positionMapPoints();
    applyMapTransform();

    mapPoints.forEach((point) => {
      point.addEventListener("click", () => {
        const indexes = getPointIndexes(point);
        const targetIndex = indexes[0] || point.dataset.lifeIndex;
        setActiveMoment(targetIndex);
        const card = mapCards.find((item) => item.dataset.lifeIndex === targetIndex);
        if (card) {
          card.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
      });
    });

    mapCards.forEach((card) => {
      card.addEventListener("click", () => setActiveMoment(card.dataset.lifeIndex));
    });

    clearButtons.forEach((button) => {
      button.addEventListener("click", clearActiveMoment);
    });

    const closeLightbox = () => {
      if (!lightbox || !lightboxImage) {
        return;
      }
      lightbox.hidden = true;
      lightboxImage.removeAttribute("src");
      lightboxImage.alt = "";
      if (lightboxCaption) {
        lightboxCaption.textContent = "";
      }
    };

    imageButtons.forEach((button) => {
      button.addEventListener("click", () => {
        if (!lightbox || !lightboxImage) {
          return;
        }
        const image = button.querySelector("img");
        lightboxImage.src = button.dataset.imageSrc || (image ? image.src : "");
        lightboxImage.alt = image ? image.alt : "";
        if (lightboxCaption) {
          const detail = button.closest("[data-map-detail]");
          lightboxCaption.textContent = detail ? detail.querySelector("h3").textContent : "";
        }
        lightbox.hidden = false;
      });
    });

    lightboxCloseButtons.forEach((button) => {
      button.addEventListener("click", closeLightbox);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && lightbox && !lightbox.hidden) {
        closeLightbox();
      }
    });

    if (zoomInput) {
      zoomInput.addEventListener("input", () => {
        setMapZoom(Number(zoomInput.value));
        centerMapOnPoint(mapState.activeIndex);
      });
    }
    if (zoomIn) {
      zoomIn.addEventListener("click", () => {
        setMapZoom(mapState.scale + 0.25);
        centerMapOnPoint(mapState.activeIndex);
      });
    }
    if (zoomOut) {
      zoomOut.addEventListener("click", () => {
        setMapZoom(mapState.scale - 0.25);
        centerMapOnPoint(mapState.activeIndex);
      });
    }
    if (zoomReset) {
      zoomReset.addEventListener("click", () => {
        mapState.scale = 1;
        mapState.x = 0;
        mapState.y = 0;
        applyMapTransform();
      });
    }

    if (mapViewport) {
      let dragStart = null;
      mapViewport.addEventListener("wheel", (event) => {
        event.preventDefault();
        const rect = mapViewport.getBoundingClientRect();
        const delta = event.deltaY < 0 ? 0.25 : -0.25;
        setMapZoom(mapState.scale + delta, event.clientX - rect.left, event.clientY - rect.top);
      }, { passive: false });

      mapViewport.addEventListener("pointerdown", (event) => {
        if (mapState.scale <= 1 || event.target.closest("[data-map-point]")) {
          return;
        }
        dragStart = {
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          mapX: mapState.x,
          mapY: mapState.y
        };
        mapViewport.classList.add("is-dragging");
        mapViewport.setPointerCapture(event.pointerId);
      });

      mapViewport.addEventListener("pointermove", (event) => {
        if (!dragStart || dragStart.pointerId !== event.pointerId) {
          return;
        }
        mapState.x = dragStart.mapX + event.clientX - dragStart.startX;
        mapState.y = dragStart.mapY + event.clientY - dragStart.startY;
        applyMapTransform();
      });

      ["pointerup", "pointercancel"].forEach((eventName) => {
        mapViewport.addEventListener(eventName, (event) => {
          if (dragStart && dragStart.pointerId === event.pointerId) {
            dragStart = null;
            mapViewport.classList.remove("is-dragging");
          }
        });
      });

      window.addEventListener("resize", applyMapTransform);
    }
  };

  initPublicationFilters();
  initPublicationDetails();
  initLifeViews();
})();
