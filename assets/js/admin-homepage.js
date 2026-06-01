(function () {
  const REPO = "chan-ming/siyin519.github.io";
  const BRANCH = "master";
  const FILE_PATH = "_data/homepage.json";
  const API_URL = `https://api.github.com/repos/${REPO}/contents/${FILE_PATH}`;

  const dataNode = document.getElementById("homepage-data");
  const editor = document.getElementById("admin-editor");
  const preview = document.getElementById("admin-preview");
  const form = document.getElementById("homepage-admin-form");
  const tokenInput = document.getElementById("github-token");
  const messageInput = document.getElementById("commit-message");
  const resetButton = document.getElementById("reset-draft");
  const saveLocalButton = document.getElementById("save-local");
  const downloadButton = document.getElementById("download-json");
  const statusNode = document.querySelector("[data-status]");

  if (!dataNode || !editor || !preview || !form) {
    return;
  }

  const clone = (value) => JSON.parse(JSON.stringify(value));
  const sectionConfig = [
    { key: "about", label: "About", emoji: "👋", kicker: "Profile", title: "About Me", titleFontSize: "1.65rem", bodyFontSize: "1rem" },
    { key: "news", label: "News", emoji: "✨", kicker: "Updates", title: "News", titleFontSize: "1.65rem", bodyFontSize: "1rem" },
    { key: "publications", label: "Publications", emoji: "📚", kicker: "Research", title: "Featured Publications", filteredTitle: "Publications", titleFontSize: "1.65rem", bodyFontSize: "1rem" },
    { key: "education", label: "Education", emoji: "🎓", kicker: "Training", title: "Education", titleFontSize: "1.65rem", bodyFontSize: "1rem" },
    { key: "experience", label: "Experience", emoji: "💼", kicker: "Work", title: "Experience", titleFontSize: "1.65rem", bodyFontSize: "1rem" },
    { key: "service", label: "Academic Service", emoji: "🤝", kicker: "Service", title: "Academic Service", titleFontSize: "1.65rem", bodyFontSize: "1rem" },
    { key: "life", label: "Life & Moments", emoji: "📷", kicker: "Beyond Research", title: "Life & Moments", titleFontSize: "1.65rem", bodyFontSize: "1rem" }
  ];
  const sectionDefaults = Object.fromEntries(sectionConfig.map((section) => [section.key, {
    emoji: section.emoji,
    kicker: section.kicker,
    title: section.title,
    ...(section.filteredTitle ? { filteredTitle: section.filteredTitle } : {}),
    titleFontSize: section.titleFontSize,
    bodyFontSize: section.bodyFontSize
  }]));
  const withSectionDefaults = (data) => {
    const next = clone(data);
    next.sections = next.sections || {};
    sectionConfig.forEach((section) => {
      next.sections[section.key] = {
        ...sectionDefaults[section.key],
        ...(next.sections[section.key] || {})
      };
    });
    return next;
  };
  const initial = withSectionDefaults(JSON.parse(dataNode.textContent));
  let initialData = clone(initial);
  let model = clone(initialData);
  let isSaving = false;

  const defaults = {
    links: { label: "", url: "" },
    about: "",
    news: { date: "", text: "", url: "" },
    publications: {
      title: "",
      authors: "",
      venue: "",
      year: "",
      summary: "",
      url: "",
      codeUrl: "",
      tags: [],
      featured: false
    },
    education: { period: "", title: "", institution: "", description: "", advisor: { name: "", url: "" } },
    experience: { period: "", title: "", institution: "", description: "" },
    service: { title: "", description: "" },
    life: { title: "", date: "", description: "", image: "", alt: "" }
  };
  const html = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  }[char]));

  const splitTags = (value) => String(value || "").split(",").map((item) => item.trim()).filter(Boolean);

  const parsePath = (path) => path.split(".").map((part) => (/^\d+$/.test(part) ? Number(part) : part));

  const getValue = (path) => {
    let current = model;
    for (const part of parsePath(path)) {
      if (current == null) {
        return "";
      }
      current = current[part];
    }
    return current;
  };

  const setValue = (path, value) => {
    const parts = parsePath(path);
    let current = model;
    parts.slice(0, -1).forEach((part) => {
      if (current[part] == null) {
        current[part] = {};
      }
      current = current[part];
    });
    current[parts[parts.length - 1]] = value;
  };

  const renderField = ({ path, label, type = "text", wide = false, textarea = false, dataType = "" }) => {
    const rawValue = getValue(path);
    const value = dataType === "tags" && Array.isArray(rawValue) ? rawValue.join(", ") : (rawValue ?? "");
    const wideClass = wide ? " admin-field--wide" : "";
    const typeAttr = dataType ? ` data-type="${html(dataType)}"` : "";

    if (type === "checkbox") {
      return `
        <label class="admin-checkbox${wideClass}">
          <input type="checkbox" data-path="${html(path)}"${rawValue ? " checked" : ""}>
          <span>${html(label)}</span>
        </label>
      `;
    }

    if (textarea) {
      return `
        <label class="admin-field${wideClass}">
          <span>${html(label)}</span>
          <textarea data-path="${html(path)}"${typeAttr}>${html(value)}</textarea>
        </label>
      `;
    }

    return `
      <label class="admin-field${wideClass}">
        <span>${html(label)}</span>
        <input type="${html(type)}" data-path="${html(path)}"${typeAttr} value="${html(value)}">
      </label>
    `;
  };

  const renderControls = (section, index, count) => `
    <div class="admin-item__controls">
      <button class="admin-button" type="button" data-action="up" data-section="${html(section)}" data-index="${index}"${index === 0 ? " disabled" : ""}>Up</button>
      <button class="admin-button" type="button" data-action="down" data-section="${html(section)}" data-index="${index}"${index === count - 1 ? " disabled" : ""}>Down</button>
      <button class="admin-button" type="button" data-action="remove" data-section="${html(section)}" data-index="${index}">Remove</button>
    </div>
  `;

  const renderTextList = (title, section) => {
    const items = model[section] || [];
    const rows = items.map((item, index) => `
      <div class="admin-item">
        <div class="admin-item__header">
          <p class="admin-item__title">${html(title)} ${index + 1}</p>
          ${renderControls(section, index, items.length)}
        </div>
        ${renderField({ path: `${section}.${index}`, label: "Text", textarea: true, wide: true })}
      </div>
    `).join("");

    return `
      <section class="admin-section">
        <h2>${html(title)}</h2>
        ${rows}
        <button class="admin-button" type="button" data-action="add" data-section="${html(section)}">Add ${html(title)}</button>
      </section>
    `;
  };

  const renderObjectList = (title, section, fields) => {
    const items = model[section] || [];
    const rows = items.map((item, index) => {
      const fallbackTitle = item.title || item.text || item.label || `${title} ${index + 1}`;
      return `
        <div class="admin-item">
          <div class="admin-item__header">
            <p class="admin-item__title">${html(fallbackTitle)}</p>
            ${renderControls(section, index, items.length)}
          </div>
          <div class="admin-fields">
            ${fields.map((field) => renderField({ ...field, path: `${section}.${index}.${field.name}` })).join("")}
          </div>
        </div>
      `;
    }).join("");

    return `
      <section class="admin-section">
        <h2>${html(title)}</h2>
        ${rows}
        <button class="admin-button" type="button" data-action="add" data-section="${html(section)}">Add ${html(title)}</button>
      </section>
    `;
  };

  const renderProfile = () => `
    <section class="admin-section">
      <h2>Profile</h2>
      <div class="admin-fields">
        ${renderField({ path: "profile.name", label: "Name" })}
        ${renderField({ path: "profile.chineseName", label: "Chinese name" })}
        ${renderField({ path: "profile.role", label: "Role" })}
        ${renderField({ path: "profile.affiliation", label: "Affiliation" })}
        ${renderField({ path: "profile.location", label: "Location" })}
        ${renderField({ path: "profile.email", label: "Email", type: "email" })}
        ${renderField({ path: "profile.avatar", label: "Avatar path", wide: true })}
        ${renderField({ path: "profile.tagline", label: "Tagline", textarea: true, wide: true })}
        ${renderField({ path: "profile.researchInterests", label: "Research interests", dataType: "tags", wide: true })}
      </div>
    </section>
  `;

  const renderSectionSettings = () => {
    const rows = sectionConfig.map((section) => {
      const fields = [
        { name: "emoji", label: "Emoji" },
        { name: "kicker", label: "Small heading (blank hides it)" },
        { name: "title", label: "Section title" },
        { name: "titleFontSize", label: "Title font size" },
        { name: "bodyFontSize", label: "Body font size" }
      ];
      if (section.key === "publications") {
        fields.splice(2, 0, { name: "filteredTitle", label: "Title while filtering" });
      }

      return `
        <div class="admin-item">
          <div class="admin-item__header">
            <p class="admin-item__title">${html(section.label)}</p>
          </div>
          <div class="admin-fields">
            ${fields.map((field) => renderField({ ...field, path: `sections.${section.key}.${field.name}` })).join("")}
          </div>
        </div>
      `;
    }).join("");

    return `
      <section class="admin-section">
        <h2>Section Titles & Typography</h2>
        ${rows}
      </section>
    `;
  };

  const renderEditor = () => {
    editor.innerHTML = [
      renderProfile(),
      renderSectionSettings(),
      renderObjectList("Links", "links", [
        { name: "label", label: "Label" },
        { name: "url", label: "URL" }
      ]),
      renderTextList("About", "about"),
      renderObjectList("News", "news", [
        { name: "date", label: "Date" },
        { name: "url", label: "URL" },
        { name: "text", label: "Text", textarea: true, wide: true }
      ]),
      renderObjectList("Publications", "publications", [
        { name: "title", label: "Title", wide: true },
        { name: "authors", label: "Authors", textarea: true, wide: true },
        { name: "venue", label: "Venue" },
        { name: "year", label: "Year" },
        { name: "summary", label: "Summary", textarea: true, wide: true },
        { name: "url", label: "Paper URL" },
        { name: "codeUrl", label: "Code URL" },
        { name: "tags", label: "Tags", dataType: "tags", wide: true },
        { name: "featured", label: "Featured publication", type: "checkbox", wide: true }
      ]),
      renderObjectList("Education", "education", [
        { name: "period", label: "Period" },
        { name: "title", label: "Title" },
        { name: "institution", label: "Institution", wide: true },
        { name: "description", label: "Description", textarea: true, wide: true },
        { name: "advisor.name", label: "Advisor name" },
        { name: "advisor.url", label: "Advisor URL" }
      ]),
      renderObjectList("Experience", "experience", [
        { name: "period", label: "Period" },
        { name: "title", label: "Title" },
        { name: "institution", label: "Institution", wide: true },
        { name: "description", label: "Description", textarea: true, wide: true }
      ]),
      renderObjectList("Academic Service", "service", [
        { name: "title", label: "Title", wide: true },
        { name: "description", label: "Description", textarea: true, wide: true }
      ]),
      renderObjectList("Life & Moments", "life", [
        { name: "title", label: "Title" },
        { name: "date", label: "Date" },
        { name: "image", label: "Image path", wide: true },
        { name: "alt", label: "Image alt text", wide: true },
        { name: "description", label: "Description", textarea: true, wide: true }
      ])
    ].join("");
  };

  const itemHasContent = (item) => {
    if (typeof item === "string") {
      return item.trim() !== "";
    }
    return Object.values(item || {}).some((value) => {
      if (Array.isArray(value)) {
        return value.length > 0;
      }
      if (value && typeof value === "object") {
        return itemHasContent(value);
      }
      if (typeof value === "boolean") {
        return value;
      }
      return String(value ?? "").trim() !== "";
    });
  };

  const normalizeFontSize = (value, fallback) => {
    const text = String(value || "").trim();
    if (/^\d+(\.\d+)?(px|rem|em|%)$/.test(text)) {
      return text;
    }
    return fallback;
  };

  const normalize = (data) => {
    const next = withSectionDefaults(data);
    next.profile.researchInterests = splitTags(Array.isArray(next.profile.researchInterests) ? next.profile.researchInterests.join(",") : next.profile.researchInterests);
    next.sections = {};
    sectionConfig.forEach((section) => {
      const incoming = data.sections && data.sections[section.key] ? data.sections[section.key] : {};
      next.sections[section.key] = {
        emoji: String(incoming.emoji ?? section.emoji).trim(),
        kicker: String(incoming.kicker ?? section.kicker).trim(),
        title: String(incoming.title ?? section.title).trim() || section.title,
        titleFontSize: normalizeFontSize(incoming.titleFontSize, section.titleFontSize),
        bodyFontSize: normalizeFontSize(incoming.bodyFontSize, section.bodyFontSize)
      };
      if (section.key === "publications") {
        next.sections[section.key].filteredTitle = String(incoming.filteredTitle ?? section.filteredTitle).trim() || section.filteredTitle;
      }
    });
    next.links = (next.links || []).filter(itemHasContent);
    next.about = (next.about || []).map((item) => String(item || "").trim()).filter(Boolean);
    next.news = (next.news || []).filter(itemHasContent);
    next.publications = (next.publications || []).filter(itemHasContent).map((paper) => ({
      ...paper,
      tags: splitTags(Array.isArray(paper.tags) ? paper.tags.join(",") : paper.tags),
      featured: Boolean(paper.featured)
    }));
    next.education = (next.education || []).filter(itemHasContent).map((item) => ({
      ...item,
      advisor: {
        name: String(item.advisor?.name || "").trim(),
        url: String(item.advisor?.url || "").trim()
      }
    }));
    next.experience = (next.experience || []).filter(itemHasContent);
    next.service = (next.service || []).filter(itemHasContent);
    next.life = (next.life || []).filter(itemHasContent);
    return next;
  };

  const renderPreview = () => {
    const data = normalize(model);
    const aboutSection = data.sections.about;
    const newsSection = data.sections.news;
    const publicationsSection = data.sections.publications;
    const lifeSection = data.sections.life;
    const links = (data.links || []).map((link) => `<a href="${html(link.url)}">${html(link.label)}</a>`).join(" ");
    const interests = (data.profile.researchInterests || []).map((tag) => `<span>${html(tag)}</span>`).join("");
    const news = (data.news || []).slice(0, 5).map((item) => `<p><strong>${html(item.date)}</strong> ${html(item.text)}</p>`).join("");
    const publications = (data.publications || []).map((paper) => `
      <article class="admin-preview__publication">
        <h3>${html(paper.title)}</h3>
        <p>${html(paper.venue)} ${html(paper.year)}</p>
        <p>${html(paper.authors)}</p>
      </article>
    `).join("");
    const life = (data.life || []).map((item) => `
      <article class="admin-preview__publication">
        ${item.image ? `<p>${html(item.image)}</p>` : ""}
        <h3>${html(item.title)}</h3>
        <p>${html(item.date || "")}</p>
        <p>${html(item.description || "")}</p>
      </article>
    `).join("");

    preview.innerHTML = `
      <h2>${html(data.profile.name || "Name")}</h2>
      <p>${html(data.profile.role || "")} - ${html(data.profile.affiliation || "")}</p>
      <p>${html(data.profile.tagline || "")}</p>
      <p>${links}</p>
      <div class="home-tags">${interests}</div>
      <h3 style="font-size: ${html(aboutSection.titleFontSize)}">${html(aboutSection.emoji)} ${html(aboutSection.title)}</h3>
      ${(data.about || []).map((paragraph) => `<p style="font-size: ${html(aboutSection.bodyFontSize)}">${html(paragraph)}</p>`).join("")}
      <h3 style="font-size: ${html(newsSection.titleFontSize)}">${html(newsSection.emoji)} ${html(newsSection.title)}</h3>
      ${news || "<p>No news items.</p>"}
      <h3 style="font-size: ${html(publicationsSection.titleFontSize)}">${html(publicationsSection.emoji)} ${html(publicationsSection.title)}</h3>
      ${publications || "<p>No publications.</p>"}
      <h3 style="font-size: ${html(lifeSection.titleFontSize)}">${html(lifeSection.emoji)} ${html(lifeSection.title)}</h3>
      ${life || "<p>No life moments.</p>"}
    `;
  };

  const setStatus = (message, kind = "") => {
    if (!statusNode) {
      return;
    }
    statusNode.textContent = message;
    statusNode.dataset.kind = kind;
  };

  const moveItem = (section, index, direction) => {
    const items = model[section] || [];
    const nextIndex = direction === "up" ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= items.length) {
      return;
    }
    [items[index], items[nextIndex]] = [items[nextIndex], items[index]];
  };

  const handleInput = (event) => {
    const target = event.target;
    if (!target || !target.dataset.path) {
      return;
    }

    let value = target.type === "checkbox" ? target.checked : target.value;
    if (target.dataset.type === "tags") {
      value = splitTags(target.value);
    }

    setValue(target.dataset.path, value);
    renderPreview();
    setStatus("Draft updated.");
  };

  editor.addEventListener("input", handleInput);
  editor.addEventListener("change", handleInput);

  editor.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (!button || button.disabled) {
      return;
    }

    const section = button.dataset.section;
    const index = Number(button.dataset.index);
    const action = button.dataset.action;
    model[section] = model[section] || [];

    if (action === "add") {
      model[section].push(clone(defaults[section]));
    }
    if (action === "remove") {
      model[section].splice(index, 1);
    }
    if (action === "up" || action === "down") {
      moveItem(section, index, action);
    }

    renderEditor();
    renderPreview();
    setStatus("Draft updated.");
  });

  const toBase64 = (text) => {
    const bytes = new TextEncoder().encode(text);
    let binary = "";
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    return btoa(binary);
  };

  const readGitHubError = async (response) => {
    try {
      const body = await response.json();
      return body.message || response.statusText;
    } catch (error) {
      return response.statusText || "Unknown GitHub API error";
    }
  };

  const explainGitHubError = (response, message) => {
    if (response.status === 401) {
      return "GitHub rejected the token. Check that the token is valid.";
    }
    if (response.status === 403) {
      return `GitHub denied access. Check that the token has Contents: Read and write. ${message}`;
    }
    if (response.status === 404) {
      return `GitHub could not find the repository, branch, or data file for this token. Confirm the token has access to ${REPO}, the branch is ${BRANCH}, and ${FILE_PATH} exists or can be created.`;
    }
    if (response.status === 409) {
      return "GitHub reported a save conflict. Refresh the page and try again.";
    }
    return `GitHub API error ${response.status}: ${message}`;
  };

  const githubHeaders = (token) => ({
    "Accept": "application/vnd.github+json",
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json",
    "X-GitHub-Api-Version": "2022-11-28"
  });

  const getCleanJson = () => {
    const cleaned = normalize(model);
    if (!cleaned.profile.name || !cleaned.profile.email) {
      throw new Error("Profile name and email are required.");
    }

    const json = `${JSON.stringify(cleaned, null, 2)}\n`;
    JSON.parse(json);
    return { cleaned, json };
  };

  const saveToGitHub = async () => {
    if (isSaving) {
      return;
    }

    const token = tokenInput.value.trim();
    if (!token) {
      setStatus("Enter a GitHub token before saving.", "error");
      return;
    }

    isSaving = true;
    setStatus("Saving to GitHub...");

    try {
      const { cleaned, json } = getCleanJson();
      const currentResponse = await fetch(`${API_URL}?ref=${encodeURIComponent(BRANCH)}`, {
        method: "GET",
        headers: githubHeaders(token)
      });

      let currentSha = "";
      if (currentResponse.ok) {
        const current = await currentResponse.json();
        currentSha = current.sha;
      } else if (currentResponse.status !== 404) {
        const message = await readGitHubError(currentResponse);
        throw new Error(explainGitHubError(currentResponse, message));
      }

      const body = {
        message: messageInput.value.trim() || "Update homepage content",
        content: toBase64(json),
        branch: BRANCH
      };
      if (currentSha) {
        body.sha = currentSha;
      }

      const saveResponse = await fetch(API_URL, {
        method: "PUT",
        headers: githubHeaders(token),
        body: JSON.stringify(body)
      });

      if (!saveResponse.ok) {
        const message = await readGitHubError(saveResponse);
        throw new Error(explainGitHubError(saveResponse, message));
      }

      const result = await saveResponse.json();
      initialData = clone(cleaned);
      model = clone(cleaned);
      renderEditor();
      renderPreview();
      const shortSha = result.commit && result.commit.sha ? result.commit.sha.slice(0, 7) : "created";
      setStatus(`Saved to GitHub. Commit ${shortSha}.`, "success");
    } catch (error) {
      setStatus(error.message, "error");
    } finally {
      isSaving = false;
    }
  };

  const saveLocalJson = async () => {
    try {
      const { cleaned, json } = getCleanJson();

      if (!window.showSaveFilePicker) {
        downloadJson(json);
        setStatus("Your browser cannot write local files directly, so the JSON was downloaded instead.", "error");
        return;
      }

      const handle = await window.showSaveFilePicker({
        suggestedName: "homepage.json",
        types: [
          {
            description: "JSON files",
            accept: { "application/json": [".json"] }
          }
        ]
      });
      const writable = await handle.createWritable();
      await writable.write(json);
      await writable.close();

      initialData = clone(cleaned);
      model = clone(cleaned);
      renderEditor();
      renderPreview();
      setStatus("Saved local JSON. Choose _data/homepage.json to update the local site source.", "success");
    } catch (error) {
      if (error.name === "AbortError") {
        setStatus("Local save canceled.");
      } else {
        setStatus(error.message, "error");
      }
    }
  };

  const downloadJson = (jsonText = "") => {
    try {
      const json = jsonText || getCleanJson().json;
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "homepage.json";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setStatus("Downloaded homepage.json.", "success");
    } catch (error) {
      setStatus(error.message, "error");
    }
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    saveToGitHub();
  });

  resetButton.addEventListener("click", () => {
    model = clone(initialData);
    renderEditor();
    renderPreview();
    setStatus("Draft reset.");
  });

  if (saveLocalButton) {
    saveLocalButton.addEventListener("click", saveLocalJson);
  }

  if (downloadButton) {
    downloadButton.addEventListener("click", () => downloadJson());
  }

  renderEditor();
  renderPreview();
})();
