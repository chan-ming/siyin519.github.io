(function () {
  const script = document.currentScript;
  const trackPath = script ? script.dataset.visitorTrackPath : "";
  const displayPath = script ? script.dataset.visitorDisplayPath : "";
  const countNode = document.querySelector("[data-visitor-count]");
  const locationNode = document.querySelector("[data-visitor-location]");
  const noteNode = document.querySelector("[data-visitor-note]");
  const countryStatsOpen = document.querySelector("[data-country-stats-open]");
  const countryStatsDialog = document.querySelector("[data-country-stats-dialog]");
  const countryStatsBody = document.querySelector("[data-country-stats-body]");
  const countryStatsStatus = document.querySelector("[data-country-stats-status]");
  const countryStatsCloseButtons = Array.from(document.querySelectorAll("[data-country-stats-close]"));
  const countryCodes = [
    "AD", "AE", "AF", "AG", "AI", "AL", "AM", "AO", "AQ", "AR", "AS", "AT", "AU", "AW", "AX", "AZ",
    "BA", "BB", "BD", "BE", "BF", "BG", "BH", "BI", "BJ", "BL", "BM", "BN", "BO", "BQ", "BR", "BS",
    "BT", "BV", "BW", "BY", "BZ", "CA", "CC", "CD", "CF", "CG", "CH", "CI", "CK", "CL", "CM", "CN",
    "CO", "CR", "CU", "CV", "CW", "CX", "CY", "CZ", "DE", "DJ", "DK", "DM", "DO", "DZ", "EC", "EE",
    "EG", "EH", "ER", "ES", "ET", "FI", "FJ", "FK", "FM", "FO", "FR", "GA", "GB", "GD", "GE", "GF",
    "GG", "GH", "GI", "GL", "GM", "GN", "GP", "GQ", "GR", "GS", "GT", "GU", "GW", "GY", "HK", "HM",
    "HN", "HR", "HT", "HU", "ID", "IE", "IL", "IM", "IN", "IO", "IQ", "IR", "IS", "IT", "JE", "JM",
    "JO", "JP", "KE", "KG", "KH", "KI", "KM", "KN", "KP", "KR", "KW", "KY", "KZ", "LA", "LB", "LC",
    "LI", "LK", "LR", "LS", "LT", "LU", "LV", "LY", "MA", "MC", "MD", "ME", "MF", "MG", "MH", "MK",
    "ML", "MM", "MN", "MO", "MP", "MQ", "MR", "MS", "MT", "MU", "MV", "MW", "MX", "MY", "MZ", "NA",
    "NC", "NE", "NF", "NG", "NI", "NL", "NO", "NP", "NR", "NU", "NZ", "OM", "PA", "PE", "PF", "PG",
    "PH", "PK", "PL", "PM", "PN", "PR", "PS", "PT", "PW", "PY", "QA", "RE", "RO", "RS", "RU", "RW",
    "SA", "SB", "SC", "SD", "SE", "SG", "SH", "SI", "SJ", "SK", "SL", "SM", "SN", "SO", "SR", "SS",
    "ST", "SV", "SX", "SY", "SZ", "TC", "TD", "TF", "TG", "TH", "TJ", "TK", "TL", "TM", "TN", "TO",
    "TR", "TT", "TV", "TW", "TZ", "UA", "UG", "UM", "US", "UY", "UZ", "VA", "VC", "VE", "VG", "VI",
    "VN", "VU", "WF", "WS", "YE", "YT", "ZA", "ZM", "ZW"
  ];
  const countryNameFormatter = typeof Intl !== "undefined" && Intl.DisplayNames
    ? new Intl.DisplayNames(["en"], { type: "region" })
    : null;
  const countries = countryCodes.map((code) => ({
    code: code.toLowerCase(),
    name: countryNameFormatter ? countryNameFormatter.of(code) : code
  })).concat([{ code: "unknown", name: "Unknown" }]);
  let locationRequest = null;
  let countryStatsLoaded = false;
  let countryStatsCache = [];
  let lastFocusedElement = null;

  const setText = (node, text) => {
    if (node) {
      node.textContent = text;
    }
  };

  const fetchJson = async (url, timeoutMs = 6500) => {
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timeout = window.setTimeout(() => {
      if (controller) {
        controller.abort();
      }
    }, timeoutMs);

    try {
      const response = await fetch(url, {
        cache: "no-store",
        signal: controller ? controller.signal : undefined
      });
      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }
      return await response.json();
    } finally {
      window.clearTimeout(timeout);
    }
  };

  const fetchJsonp = (url, callbackParam = "callback") => new Promise((resolve, reject) => {
    const callbackName = `__visitorStatsCallback${Date.now()}${Math.floor(Math.random() * 100000)}`;
    const jsonpScript = document.createElement("script");
    const separator = url.includes("?") ? "&" : "?";
    let timeout = null;

    const cleanup = () => {
      if (timeout) {
        window.clearTimeout(timeout);
      }
      if (jsonpScript.parentNode) {
        jsonpScript.parentNode.removeChild(jsonpScript);
      }
      try {
        delete window[callbackName];
      } catch (error) {
        window[callbackName] = undefined;
      }
    };

    window[callbackName] = (data) => {
      cleanup();
      resolve(data);
    };
    jsonpScript.onerror = () => {
      cleanup();
      reject(new Error("JSONP request failed"));
    };
    timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("JSONP request timed out"));
    }, 6500);
    jsonpScript.src = `${url}${separator}${callbackParam}=${callbackName}`;
    document.head.appendChild(jsonpScript);
  });

  const getCounterKey = (path) => {
    const host = window.location.hostname || "siyin519.github.io";
    const normalizedPath = String(path || "/").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "home";
    return {
      namespace: host.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "siyin519-github-io",
      key: normalizedPath
    };
  };

  const counterUrl = (path, action) => {
    const counter = getCounterKey(path);
    const suffix = action ? `/${action}` : "/";
    return `https://api.counterapi.dev/v1/${counter.namespace}/${counter.key}${suffix}`;
  };

  const countryCounterPath = (path, countryCode) => `${getCounterKey(path).key}-country-${countryCode}`;

  const getLocation = async () => {
    if (locationRequest) {
      return locationRequest;
    }
    const locationEndpoints = [
      { url: "https://reallyfreegeoip.org/json/", jsonp: true },
      { url: "https://geoapi.info/api/geo" },
      { url: "https://geo.kamero.ai/api/geo" }
    ];

    locationRequest = (async () => {
      for (const endpoint of locationEndpoints) {
        try {
          const data = endpoint.jsonp ? await fetchJsonp(endpoint.url) : await fetchJson(endpoint.url);
          if (data && data.success !== false) {
            return data;
          }
        } catch (error) {
          // Try the next geolocation provider.
        }
      }
      return null;
    })();
    return locationRequest;
  };

  const normalizeCountry = (location) => {
    if (!location) {
      return { code: "unknown", name: "Unknown" };
    }
    const codeCandidate = location.country_code || location.countryCode || "";
    const countryValue = location.country_name || location.country || "";
    const code = String(codeCandidate || (String(countryValue).length === 2 ? countryValue : "")).trim().toLowerCase();
    const knownCountry = code ? countries.find((country) => country.code === code) : null;
    return {
      code: knownCountry ? knownCountry.code : "unknown",
      name: knownCountry ? knownCountry.name : String(countryValue || "Unknown")
    };
  };

  const incrementCountryVisit = async (path, location) => {
    const country = normalizeCountry(location);
    try {
      await fetchJson(counterUrl(countryCounterPath(path, country.code), "up"));
    } catch (error) {
      // Country-level tracking is best effort.
    }
  };

  const trackVisit = async (path) => {
    if (!path) {
      return;
    }
    try {
      await fetchJson(counterUrl(path, "up"));
    } catch (error) {
      // Visitor tracking should never interrupt the page.
    }
    try {
      const location = await getLocation();
      await incrementCountryVisit(path, location);
    } catch (error) {
      await incrementCountryVisit(path, null);
    }
  };

  const updateCount = async (path) => {
    if (!countNode || !path) {
      return;
    }
    try {
      const data = await fetchJson(counterUrl(path));
      const value = Number(data && (data.value || data.count));
      setText(countNode, Number.isFinite(value) ? value.toLocaleString() : "Unavailable");
    } catch (error) {
      setText(countNode, "Unavailable");
    }
  };

  const updateLocation = async () => {
    if (!locationNode) {
      return;
    }

    try {
      const location = await getLocation();
      if (!location) {
        throw new Error("Location unavailable");
      }
      const hasCountryRegion = Object.prototype.hasOwnProperty.call(location, "countryRegion");
      const region = location.region_name || location.regionName || location.countryRegion || (hasCountryRegion ? "" : location.region);
      const country = location.country_name || location.country || location.country_code;
      const locationParts = [location.city, region, country].filter(Boolean);
      setText(locationNode, locationParts.length ? locationParts.join(", ") : "Unknown");
      if (noteNode) {
        noteNode.textContent = "Location is approximate and shown only for the current visit.";
      }
    } catch (error) {
      setText(locationNode, "Unknown");
    }
  };

  const fetchCountryCount = async (path, country, timeoutMs = 1200) => {
    try {
      const data = await fetchJson(counterUrl(countryCounterPath(path, country.code)), timeoutMs);
      const value = Number(data && (data.value || data.count));
      return Number.isFinite(value) && value > 0 ? { ...country, count: value } : null;
    } catch (error) {
      return null;
    }
  };

  const fetchCountryCounts = async (path, priorityCountry, onProgress) => {
    const results = [];
    const visited = new Set();
    const addResult = (result) => {
      if (!result || visited.has(result.code)) {
        return;
      }
      visited.add(result.code);
      results.push(result);
      results.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
    };

    if (priorityCountry) {
      addResult(await fetchCountryCount(path, priorityCountry, 2500));
      if (onProgress) {
        onProgress(results, true);
      }
    }

    const remainingCountries = countries.filter((country) => !priorityCountry || country.code !== priorityCountry.code);
    const batchSize = 18;
    for (let index = 0; index < remainingCountries.length; index += batchSize) {
      const batch = remainingCountries.slice(index, index + batchSize);
      const settled = await Promise.all(batch.map((country) => fetchCountryCount(path, country, 900)));
      results.push(...settled.filter(Boolean));
      results.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
      if (onProgress) {
        onProgress(results, true);
      }
    }
    return results;
  };

  const renderCountryStats = (stats, loading = false) => {
    if (!countryStatsBody) {
      return;
    }
    countryStatsBody.innerHTML = "";
    if (!stats.length) {
      const empty = document.createElement("p");
      empty.className = "home-visitor-country-stats__status";
      empty.textContent = loading ? "Checking country stats..." : "No country-level visit data has been recorded yet.";
      countryStatsBody.appendChild(empty);
      return;
    }

    const list = document.createElement("ol");
    list.className = "home-visitor-country-stats__list";
    stats.forEach((country) => {
      const item = document.createElement("li");
      const name = document.createElement("span");
      const count = document.createElement("strong");
      name.textContent = country.name;
      count.textContent = country.count.toLocaleString();
      item.appendChild(name);
      item.appendChild(count);
      list.appendChild(item);
    });
    countryStatsBody.appendChild(list);
    if (loading) {
      const loadingStatus = document.createElement("p");
      loadingStatus.className = "home-visitor-country-stats__status";
      loadingStatus.textContent = "Checking other countries...";
      countryStatsBody.appendChild(loadingStatus);
    }
  };

  const openCountryStats = async () => {
    if (!countryStatsDialog || !displayPath) {
      return;
    }
    lastFocusedElement = document.activeElement;
    countryStatsDialog.hidden = false;
    if (countryStatsStatus) {
      countryStatsStatus.textContent = countryStatsLoaded ? "Refreshing country stats..." : "Loading country stats...";
    }
    const closeButton = countryStatsDialog.querySelector("[data-country-stats-close]");
    if (closeButton) {
      closeButton.focus();
    }
    try {
      const currentLocation = await getLocation();
      const priorityCountry = normalizeCountry(currentLocation);
      if (countryStatsCache.length) {
        renderCountryStats(countryStatsCache, true);
      }
      const stats = await fetchCountryCounts(displayPath, priorityCountry, (partialStats, loading) => {
        countryStatsCache = partialStats.slice();
        renderCountryStats(countryStatsCache, loading);
      });
      countryStatsLoaded = true;
      countryStatsCache = stats.slice();
      renderCountryStats(countryStatsCache);
    } catch (error) {
      if (countryStatsBody) {
        countryStatsBody.innerHTML = "";
        const failed = document.createElement("p");
        failed.className = "home-visitor-country-stats__status";
        failed.textContent = "Country stats are unavailable right now.";
        countryStatsBody.appendChild(failed);
      }
    }
  };

  const closeCountryStats = () => {
    if (!countryStatsDialog) {
      return;
    }
    countryStatsDialog.hidden = true;
    if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
      lastFocusedElement.focus();
    }
  };

  trackVisit(trackPath);

  if (displayPath) {
    updateCount(displayPath);
    updateLocation();
  }

  if (countryStatsOpen) {
    countryStatsOpen.addEventListener("click", openCountryStats);
  }
  countryStatsCloseButtons.forEach((button) => {
    button.addEventListener("click", closeCountryStats);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && countryStatsDialog && !countryStatsDialog.hidden) {
      closeCountryStats();
    }
  });
})();
