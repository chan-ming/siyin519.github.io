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
    const lifeMap = document.querySelector("[data-life-view='map']");
    const homepageDataNode = document.getElementById("homepage-data");
    const lightbox = document.querySelector("[data-life-lightbox]");
    const lightboxImage = document.querySelector("[data-life-lightbox-image]");
    const lightboxCaption = document.querySelector("[data-life-lightbox-caption]");
    const lightboxCloseButtons = Array.from(document.querySelectorAll("[data-life-lightbox-close]"));
    const lightboxPrev = document.querySelector("[data-life-image-prev]");
    const lightboxNext = document.querySelector("[data-life-image-next]");
    const lightboxCount = document.querySelector("[data-life-image-count]");
    const momentSwitcher = document.querySelector("[data-map-switcher]");
    const momentSwitcherCount = document.querySelector("[data-map-switcher-count]");
    const momentPrev = document.querySelector("[data-map-prev]");
    const momentNext = document.querySelector("[data-map-next]");
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
      activeIndex: "",
      activeGroupIndexes: [],
      activeGroupPosition: 0
    };
    const galleryState = {
      lifeIndex: "",
      imageIndex: 0
    };

    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
    const basePath = lifeMap ? lifeMap.dataset.basePath || "" : "";
    let homepageData = {};
    try {
      homepageData = homepageDataNode ? JSON.parse(homepageDataNode.textContent || "{}") : {};
    } catch (error) {
      homepageData = {};
    }

    const resolveImageSrc = (src) => {
      const value = String(src || "").trim();
      if (!value) {
        return "";
      }
      if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(value)) {
        return value;
      }
      const normalizedBase = basePath.endsWith("/") ? basePath.slice(0, -1) : basePath;
      if (value.startsWith("/")) {
        return `${normalizedBase}${value}`;
      }
      return `${normalizedBase}/${value}`;
    };

    const normalizeGalleryItem = (entry, fallbackAlt) => {
      if (typeof entry === "string") {
        return {
          src: resolveImageSrc(entry),
          alt: fallbackAlt
        };
      }
      const image = entry || {};
      return {
        src: resolveImageSrc(image.src || image.image || image.url),
        alt: image.alt || fallbackAlt
      };
    };

    const lifeGalleries = Array.isArray(homepageData.life)
      ? homepageData.life.map((item) => {
        const fallbackAlt = item.alt || item.title || "";
        const configuredImages = Array.isArray(item.images) ? item.images : [];
        const gallery = configuredImages.map((entry) => normalizeGalleryItem(entry, fallbackAlt)).filter((entry) => entry.src);
        if (gallery.length) {
          return gallery;
        }
        return item.image ? [normalizeGalleryItem({ src: item.image, alt: fallbackAlt }, fallbackAlt)] : [];
      })
      : [];
    const getPointIndexes = (point) => String(point.dataset.lifeIndexes || point.dataset.lifeIndex || "").split(",").filter(Boolean);
    const pointIncludesIndex = (point, index) => getPointIndexes(point).includes(String(index));
    const findPointForIndex = (index) => mapPoints.find((point) => !point.hidden && pointIncludesIndex(point, index));
    const getGroupIndexesForIndex = (index) => {
      const point = findPointForIndex(index);
      const indexes = point ? getPointIndexes(point) : [String(index)];
      return indexes.length ? indexes : [String(index)];
    };

    const updateMomentSwitcher = () => {
      if (!momentSwitcher) {
        return;
      }
      const indexes = mapState.activeGroupIndexes;
      const hasChoices = indexes.length > 1;
      momentSwitcher.hidden = !hasChoices;
      if (!hasChoices) {
        return;
      }
      const position = Math.max(0, indexes.indexOf(String(mapState.activeIndex)));
      mapState.activeGroupPosition = position;
      if (momentSwitcherCount) {
        momentSwitcherCount.textContent = `${position + 1} / ${indexes.length}`;
      }
    };

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
      mapState.activeGroupIndexes = [];
      mapState.activeGroupPosition = 0;
      mapPoints.forEach((point) => point.classList.remove("is-active"));
      mapCards.forEach((card) => card.classList.remove("is-active"));
      mapDetails.forEach((detail) => {
        detail.hidden = true;
      });
      if (momentSwitcher) {
        momentSwitcher.hidden = true;
      }
    };

    const setActiveMoment = (index) => {
      const nextIndex = String(index);
      mapState.activeIndex = nextIndex;
      mapState.activeGroupIndexes = getGroupIndexesForIndex(nextIndex);
      mapPoints.forEach((point) => {
        point.classList.toggle("is-active", !point.hidden && pointIncludesIndex(point, nextIndex));
      });
      mapCards.forEach((card) => {
        card.classList.toggle("is-active", card.dataset.lifeIndex === nextIndex);
      });
      mapDetails.forEach((detail) => {
        detail.hidden = detail.dataset.lifeIndex !== nextIndex;
      });
      updateMomentSwitcher();
      centerMapOnPoint(nextIndex);
    };

    const switchMomentAtPlace = (direction) => {
      const indexes = mapState.activeGroupIndexes;
      if (indexes.length <= 1) {
        return;
      }
      const currentPosition = indexes.indexOf(String(mapState.activeIndex));
      const position = currentPosition === -1 ? 0 : currentPosition;
      const nextPosition = (position + direction + indexes.length) % indexes.length;
      setActiveMoment(indexes[nextPosition]);
    };

    const updateDetailImage = (lifeIndex, imageIndex) => {
      const gallery = lifeGalleries[Number(lifeIndex)] || [];
      const image = gallery[imageIndex];
      const button = imageButtons.find((item) => item.dataset.lifeIndex === String(lifeIndex));
      if (!image || !button) {
        return;
      }
      const img = button.querySelector("img");
      button.dataset.imageIndex = String(imageIndex);
      button.dataset.imageSrc = image.src;
      if (img) {
        img.src = image.src;
        img.alt = image.alt || "";
      }
    };

    const updateLightboxControls = () => {
      const gallery = lifeGalleries[Number(galleryState.lifeIndex)] || [];
      const hasChoices = gallery.length > 1;
      [lightboxPrev, lightboxNext].forEach((button) => {
        if (button) {
          button.hidden = !hasChoices;
        }
      });
      if (lightboxCount) {
        lightboxCount.hidden = !hasChoices;
        lightboxCount.textContent = hasChoices ? `${galleryState.imageIndex + 1} / ${gallery.length}` : "1 / 1";
      }
    };

    const showGalleryImage = (lifeIndex, imageIndex) => {
      const gallery = lifeGalleries[Number(lifeIndex)] || [];
      if (!gallery.length || !lightbox || !lightboxImage) {
        return;
      }
      const nextIndex = (Number(imageIndex) + gallery.length) % gallery.length;
      const image = gallery[nextIndex];
      galleryState.lifeIndex = String(lifeIndex);
      galleryState.imageIndex = nextIndex;
      updateDetailImage(lifeIndex, nextIndex);
      lightboxImage.src = image.src;
      lightboxImage.alt = image.alt || "";
      if (lightboxCaption) {
        lightboxCaption.textContent = image.alt || "";
      }
      lightbox.hidden = false;
      updateLightboxControls();
    };

    const switchGalleryImage = (direction) => {
      const gallery = lifeGalleries[Number(galleryState.lifeIndex)] || [];
      if (gallery.length <= 1) {
        return;
      }
      showGalleryImage(galleryState.lifeIndex, galleryState.imageIndex + direction);
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

    if (momentPrev) {
      momentPrev.addEventListener("click", () => switchMomentAtPlace(-1));
    }
    if (momentNext) {
      momentNext.addEventListener("click", () => switchMomentAtPlace(1));
    }

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
      if (lightboxCount) {
        lightboxCount.hidden = true;
      }
    };

    imageButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const detail = button.closest("[data-map-detail]");
        const lifeIndex = button.dataset.lifeIndex || (detail ? detail.dataset.lifeIndex : "");
        showGalleryImage(lifeIndex, Number(button.dataset.imageIndex || 0));
      });
    });

    if (lightboxPrev) {
      lightboxPrev.addEventListener("click", () => switchGalleryImage(-1));
    }
    if (lightboxNext) {
      lightboxNext.addEventListener("click", () => switchGalleryImage(1));
    }

    lightboxCloseButtons.forEach((button) => {
      button.addEventListener("click", closeLightbox);
    });

    document.addEventListener("keydown", (event) => {
      if (!lightbox || lightbox.hidden) {
        return;
      }
      if (event.key === "Escape") {
        closeLightbox();
      }
      if (event.key === "ArrowLeft") {
        switchGalleryImage(-1);
      }
      if (event.key === "ArrowRight") {
        switchGalleryImage(1);
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
