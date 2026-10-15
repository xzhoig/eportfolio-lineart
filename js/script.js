/* Nelson Chan · CIS222 portfolio
   Shared, dependency-free enhancements. The links, content and native controls
   remain usable without JavaScript; optional components are checked first. */
(() => {
  "use strict";

  const root = document.documentElement;
  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const pointerQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
  const mobileQuery = window.matchMedia("(max-width: 960px)");
  const reduceMotion = () => motionQuery.matches;
  const watchQuery = (query, handler) => {
    if (query.addEventListener) query.addEventListener("change", handler);
    else if (query.addListener) query.addListener(handler);
  };
  root.classList.add("js");

  // The intro is a brief visual entrance, never a content-loading dependency.
  // A separate fail-safe always uncovers the page, even if an optional feature fails.
  const intro = document.querySelector(".intro-screen");
  const introNumber = intro && intro.querySelector(".intro-number");
  const introRule = intro && intro.querySelector(".intro-rule");
  let introFrame = 0;
  let introComplete = false;
  let introFailsafe = 0;
  const finishIntro = () => {
    if (introComplete) return;
    introComplete = true;
    if (introFrame) window.cancelAnimationFrame(introFrame);
    if (introFailsafe) window.clearTimeout(introFailsafe);
    if (introNumber) introNumber.textContent = "100";
    if (introRule) introRule.style.transform = "scaleX(1)";
    root.classList.add("is-ready");
    if (intro) intro.setAttribute("aria-hidden", "true");
  };
  introFailsafe = window.setTimeout(finishIntro, 1800);
  const homePage = /(?:^|\/)index\.html$/i.test(window.location.pathname) ||
    window.location.pathname.endsWith("/");
  let seenHomeIntro = false;
  try {
    seenHomeIntro = window.sessionStorage.getItem("nelson-paper-intro") === "seen";
    if (homePage) window.sessionStorage.setItem("nelson-paper-intro", "seen");
  } catch (_) { /* Local-file/privacy modes may intentionally disable session storage. */ }
  if (!intro || reduceMotion()) {
    finishIntro();
  } else {
    const duration = homePage && !seenHomeIntro ? 1250 : 300;
    let started = null;
    const animateIntro = (now) => {
      if (introComplete) return;
      if (started === null) started = now;
      const progress = Math.min((now - started) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 2);
      if (introNumber) introNumber.textContent = String(Math.round(eased * 100)).padStart(3, "0");
      if (introRule) introRule.style.transform = `scaleX(${eased.toFixed(4)})`;
      if (progress >= 1) finishIntro();
      else introFrame = window.requestAnimationFrame(animateIntro);
    };
    introFrame = window.requestAnimationFrame(animateIntro);
  }
  watchQuery(motionQuery, () => { if (reduceMotion()) finishIntro(); });

  // Mobile navigation: native links, an explicit expanded state and keyboard exit.
  const menuToggle = document.querySelector("[data-menu-toggle]");
  const nav = document.getElementById("primary-nav");
  const header = document.querySelector(".site-header");
  if (menuToggle && nav) {
    const menuIsOpen = () => menuToggle.getAttribute("aria-expanded") === "true";
    const setMenu = (open, restoreFocus = false) => {
      menuToggle.setAttribute("aria-expanded", String(open));
      menuToggle.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
      nav.classList.toggle("is-open", open);
      menuToggle.classList.toggle("is-open", open);
      if (header) header.classList.toggle("menu-open", open);
      document.body.classList.toggle("menu-open", open);
      if (restoreFocus) menuToggle.focus({ preventScroll: true });
    };
    menuToggle.addEventListener("click", () => setMenu(!menuIsOpen()));
    nav.addEventListener("click", (event) => {
      if (event.target.closest("a")) setMenu(false);
    });
    document.addEventListener("click", (event) => {
      if (menuIsOpen() && !nav.contains(event.target) && !menuToggle.contains(event.target)) {
        setMenu(false);
      }
    });
    document.addEventListener("keydown", (event) => {
      if (!menuIsOpen() || !mobileQuery.matches) return;
      if (event.key === "Escape") {
        event.preventDefault();
        setMenu(false, true);
      }
      // Keep the open mobile overlay's keyboard focus on its visible controls.
      if (event.key === "Tab") {
        const links = [...nav.querySelectorAll("a[href], button:not([disabled])")];
        const last = links[links.length - 1] || menuToggle;
        if (event.shiftKey && document.activeElement === menuToggle) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          menuToggle.focus();
        }
      }
    });
    watchQuery(mobileQuery, () => {
      if (!mobileQuery.matches) setMenu(false);
    });
  }

  // Scroll reveals run once. Reduced-motion and older-browser paths show all.
  const revealItems = [...document.querySelectorAll(".reveal")];
  let revealObserver;
  const revealAll = () => {
    revealItems.forEach((item) => item.classList.add("is-visible"));
    if (revealObserver) revealObserver.disconnect();
  };
  if (reduceMotion() || !("IntersectionObserver" in window)) {
    revealAll();
  } else {
    revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.06, rootMargin: "0px 0px -24px 0px" });
    revealItems.forEach((item) => revealObserver.observe(item));
  }
  watchQuery(motionQuery, () => { if (reduceMotion()) revealAll(); });

  // Technical engraving: native SVG linework, replay, and a measured inspection cursor.
  // All geometry remains visible if JavaScript or motion support is unavailable.
  const drawings = [...document.querySelectorAll(".architectural-scene")];
  drawings.forEach((drawing) => {
    const lines = [...drawing.querySelectorAll("[data-draw]")];
    lines.forEach((line, index) => {
      // pathLength=1 keeps every stroke normalized, including SVG line and polyline.
      line.setAttribute("pathLength", "1");
      line.style.setProperty("--draw-delay", `${Math.round(index / Math.max(lines.length - 1, 1) * 650)}ms`);
    });
    drawing.querySelectorAll("[data-ink]").forEach((detail, index) => {
      detail.style.setProperty("--ink-delay", `${900 + Math.min(index * 70, 500)}ms`);
    });
  });
  root.classList.add("draw-ready");

  const inspectionAreas = [...document.querySelectorAll("[data-inspect]")];
  const pointerEffectsEnabled = () => pointerQuery.matches && !reduceMotion();
  const resetInspectionPointer = (area) => {
    area.classList.remove("has-inspection-pointer", "is-dragging");
    area.removeAttribute("data-dragging");
  };
  const refreshPointerEffects = () => {
    const enabled = pointerEffectsEnabled();
    root.classList.toggle("has-fine-pointer", enabled);
    if (!enabled) inspectionAreas.forEach(resetInspectionPointer);
  };
  refreshPointerEffects();
  watchQuery(pointerQuery, refreshPointerEffects);
  watchQuery(motionQuery, refreshPointerEffects);

  inspectionAreas.forEach((area) => {
    const toggle = area.querySelector("[data-trace-toggle]");
    const coordinateX = area.querySelector("[data-coordinate-x]");
    const coordinateY = area.querySelector("[data-coordinate-y]");
    let pointerFrame = 0;
    let activePointer = null;
    let pointerX = 0;
    let pointerY = 0;
    const setInspecting = (enabled) => {
      area.classList.toggle("is-inspecting", enabled);
      if (toggle) toggle.setAttribute("aria-pressed", String(enabled));
    };
    const updateInspection = () => {
      const rect = area.getBoundingClientRect();
      const x = Math.min(1, Math.max(0, (pointerX - rect.left) / Math.max(rect.width, 1)));
      const y = Math.min(1, Math.max(0, (pointerY - rect.top) / Math.max(rect.height, 1)));
      area.style.setProperty("--inspect-x", `${(x * 100).toFixed(2)}%`);
      area.style.setProperty("--inspect-y", `${(y * 100).toFixed(2)}%`);
      area.style.setProperty("--cursor-x", `${(x * rect.width).toFixed(1)}px`);
      area.style.setProperty("--cursor-y", `${(y * rect.height).toFixed(1)}px`);
      if (coordinateX) coordinateX.textContent = String(Math.round(x * 100)).padStart(3, "0");
      if (coordinateY) coordinateY.textContent = String(Math.round(y * 100)).padStart(3, "0");
      pointerFrame = 0;
    };
    const moveInspection = (event) => {
      if (!pointerEffectsEnabled() || event.pointerType === "touch") return;
      // Keep the native cursor and click affordances on controls and project links.
      const overControl = event.target.closest("a, button, input, select, textarea, summary");
      area.classList.toggle("has-inspection-pointer", !overControl || activePointer !== null);
      pointerX = event.clientX;
      pointerY = event.clientY;
      if (!pointerFrame) pointerFrame = window.requestAnimationFrame(updateInspection);
    };
    if (toggle) {
      toggle.addEventListener("click", () => setInspecting(!area.classList.contains("is-inspecting")));
    }
    area.addEventListener("pointermove", moveInspection, { passive: true });
    area.addEventListener("pointerenter", moveInspection, { passive: true });
    area.addEventListener("pointerdown", (event) => {
      if (!pointerEffectsEnabled() || event.pointerType === "touch" || event.button !== 0 ||
          event.target.closest("a, button, input, select, textarea, summary")) return;
      activePointer = event.pointerId;
      setInspecting(true);
      area.classList.add("is-dragging", "has-inspection-pointer");
      area.setAttribute("data-dragging", "true");
      // Capture is confined to the illustration; touch scrolling remains native.
      if (area.setPointerCapture) area.setPointerCapture(activePointer);
      event.preventDefault();
      moveInspection(event);
    });
    const releaseInspection = (event) => {
      if (activePointer === null || (event && event.pointerId !== activePointer)) return;
      const previousPointer = activePointer;
      activePointer = null;
      area.classList.remove("is-dragging");
      area.removeAttribute("data-dragging");
      if (area.hasPointerCapture && area.hasPointerCapture(previousPointer)) {
        area.releasePointerCapture(previousPointer);
      }
    };
    area.addEventListener("pointerup", releaseInspection);
    area.addEventListener("pointercancel", releaseInspection);
    area.addEventListener("lostpointercapture", releaseInspection);
    area.addEventListener("pointerleave", () => {
      if (activePointer === null) area.classList.remove("has-inspection-pointer");
    });
    area.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && area.classList.contains("is-inspecting")) {
        setInspecting(false);
        resetInspectionPointer(area);
        if (toggle) toggle.focus({ preventScroll: true });
      }
    });
    area.querySelectorAll("[data-hotspot]").forEach((hotspot) => {
      // Inspection links are also revealed for keyboard users without a pointer.
      hotspot.addEventListener("focus", () => setInspecting(true));
    });
    area.querySelectorAll("[data-replay-drawing]").forEach((button) => {
      button.addEventListener("click", () => {
        const drawing = area.querySelector(".architectural-scene");
        if (!drawing || reduceMotion()) return;
        drawing.classList.add("is-replaying");
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => drawing.classList.remove("is-replaying"));
        });
      });
    });
    window.addEventListener("blur", () => {
      releaseInspection();
      resetInspectionPointer(area);
    });
  });

  // A short paper fade connects local HTML pages. Links retain native browser
  // behavior for downloads, anchors, new tabs, external destinations and modifiers.
  let navigationTimer = 0;
  document.addEventListener("click", (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey ||
        event.shiftKey || event.altKey || reduceMotion()) return;
    const link = event.target.closest("a[href]");
    if (!link || link.hasAttribute("download") || (link.target && link.target !== "_self")) return;
    const rawHref = link.getAttribute("href");
    if (!rawHref || rawHref.startsWith("#")) return;
    let next;
    try { next = new URL(link.href, window.location.href); } catch (_) { return; }
    const current = new URL(window.location.href);
    const samePlace = next.protocol === current.protocol && next.host === current.host;
    if (!samePlace || !["http:", "https:", "file:"].includes(next.protocol) ||
        !/\.html$/i.test(next.pathname) ||
        (next.pathname === current.pathname && next.search === current.search)) return;
    event.preventDefault();
    if (navigationTimer) window.clearTimeout(navigationTimer);
    root.classList.add("is-leaving");
    navigationTimer = window.setTimeout(() => window.location.assign(next.href), 130);
  });
  window.addEventListener("pageshow", (event) => {
    root.classList.remove("is-leaving");
    if (event.persisted) finishIntro();
  });

  // Project filters support multiple categories on each card and live feedback.
  const filterButtons = [...document.querySelectorAll("[data-filter]")];
  const projectCards = [...document.querySelectorAll(".project-card[data-category]")];
  const projectCount = document.getElementById("project-count");
  if (filterButtons.length && projectCards.length) {
    const applyFilter = (category) => {
      let visible = 0;
      filterButtons.forEach((button) => {
        button.setAttribute("aria-pressed", String(button.dataset.filter === category));
      });
      projectCards.forEach((card) => {
        const categories = card.dataset.category.split(/\s+/);
        const show = category === "all" || categories.includes(category);
        card.hidden = !show;
        if (show) {
          visible += 1;
          card.classList.add("is-visible");
        }
      });
      if (projectCount) {
        projectCount.textContent = category === "all"
          ? `Showing all ${visible} projects`
          : `Showing ${visible} of ${projectCards.length} projects`;
      }
    };
    filterButtons.forEach((button) => {
      button.addEventListener("click", () => applyFilter(button.dataset.filter));
    });
    applyFilter("all");
    // Deep links always remain useful, including after a visitor applies a filter.
    window.addEventListener("hashchange", () => {
      const target = document.getElementById(window.location.hash.slice(1));
      if (target && projectCards.includes(target) && target.hidden) {
        applyFilter("all");
        target.scrollIntoView({ behavior: reduceMotion() ? "auto" : "smooth", block: "start" });
      }
    });
  }

  // Native dialog supplies focus containment and Escape handling automatically.
  const dialog = document.getElementById("project-dialog");
  const dialogContent = dialog && dialog.querySelector("[data-dialog-content]");
  if (dialog && dialogContent) {
    let dialogTrigger = null;
    document.querySelectorAll("[data-project-open]").forEach((button) => {
      button.addEventListener("click", () => {
        const projectId = button.dataset.projectOpen;
        const template = document.getElementById(`project-${projectId}`);
        if (!template || !(template instanceof HTMLTemplateElement)) return;
        if (typeof dialog.showModal !== "function") {
          const notes = document.getElementById(`notes-${projectId}`);
          if (notes) {
            notes.open = true;
            notes.scrollIntoView({ behavior: reduceMotion() ? "auto" : "smooth", block: "start" });
            const summary = notes.querySelector("summary");
            if (summary) summary.focus({ preventScroll: true });
          }
          return;
        }
        dialogTrigger = button;
        dialogContent.replaceChildren(template.content.cloneNode(true));
        dialog.showModal();
        root.classList.add("dialog-open");
        const closeButton = dialog.querySelector("[data-close-dialog]");
        if (closeButton) closeButton.focus({ preventScroll: true });
      });
    });
    dialog.querySelectorAll("[data-close-dialog]").forEach((button) => {
      button.addEventListener("click", () => dialog.close());
    });
    dialog.addEventListener("click", (event) => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      const outside = event.clientX < rect.left || event.clientX > rect.right ||
        event.clientY < rect.top || event.clientY > rect.bottom;
      if (outside) dialog.close();
    });
    dialog.addEventListener("close", () => {
      root.classList.remove("dialog-open");
      if (dialogTrigger && dialogTrigger.isConnected) dialogTrigger.focus({ preventScroll: true });
    });
  }

  // Clipboard API on HTTPS; a local-file compatible fallback for the ZIP.
  const copyText = async (value) => {
    if (window.isSecureContext && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(value);
        return true;
      } catch (_) { /* Fall through if browser clipboard permission is unavailable. */ }
    }
    const focused = document.activeElement;
    const field = document.createElement("textarea");
    field.value = value;
    field.readOnly = true;
    field.setAttribute("aria-label", "Email address to copy");
    field.style.cssText = "position:fixed;top:0;left:-9999px;font-size:16px;opacity:0;";
    document.body.append(field);
    field.select();
    field.setSelectionRange(0, value.length);
    let copied = false;
    try { copied = document.execCommand("copy"); } catch (_) { copied = false; }
    field.remove();
    if (focused && typeof focused.focus === "function") focused.focus({ preventScroll: true });
    return copied;
  };
  document.querySelectorAll("[data-copy-email]").forEach((button) => {
    button.addEventListener("click", async () => {
      const container = button.closest("section, article, .contact-panel") || document;
      const status = container.querySelector(".copy-status");
      if (status) status.textContent = "";
      const copied = await copyText(button.dataset.copyEmail);
      if (status) {
        status.textContent = copied
          ? "Email address copied. Ready when you are."
          : `Select and copy this address: ${button.dataset.copyEmail}`;
      }
    });
  });

  // One passive, frame-limited scroll listener drives the header and page progress.
  const backToTop = document.querySelector("[data-back-to-top]");
  const progress = document.querySelector(".scroll-progress");
  let scrollFrame = 0;
  const updateScroll = () => {
    const y = window.scrollY || root.scrollTop;
    if (header) header.classList.toggle("is-scrolled", y > 16);
    if (backToTop) backToTop.hidden = y < 600;
    if (progress) {
      const distance = root.scrollHeight - window.innerHeight;
      const ratio = distance > 0 ? Math.min(1, Math.max(0, y / distance)) : 0;
      progress.style.transform = `scaleX(${ratio})`;
    }
    scrollFrame = 0;
  };
  const scheduleScroll = () => {
    if (!scrollFrame) scrollFrame = window.requestAnimationFrame(updateScroll);
  };
  window.addEventListener("scroll", scheduleScroll, { passive: true });
  window.addEventListener("resize", scheduleScroll, { passive: true });
  window.addEventListener("load", scheduleScroll);
  updateScroll();
  if (backToTop) {
    backToTop.addEventListener("click", () => {
      const focusTarget = document.querySelector(".site-header .brand") || document.getElementById("main");
      if (focusTarget) focusTarget.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: reduceMotion() ? "auto" : "smooth" });
    });
  }
  document.querySelectorAll("[data-year]").forEach((item) => {
    item.textContent = String(new Date().getFullYear());
  });

  // Photo and abstract fallback are mutually exclusive; no initials are overlaid.
  document.querySelectorAll("[data-profile-image]").forEach((image) => {
    const portrait = image.closest("[data-portrait]");
    const fallback = portrait && portrait.querySelector(".portrait-fallback");
    const setPhoto = (loaded) => {
      image.hidden = !loaded;
      if (portrait) portrait.classList.toggle("has-photo", loaded);
      if (fallback) fallback.hidden = loaded;
    };
    image.addEventListener("load", () => setPhoto(image.naturalWidth > 0));
    image.addEventListener("error", () => setPhoto(false));
    if (image.complete) setPhoto(image.naturalWidth > 0);
  });

  // Tutorial form demonstrations validate locally and never send or store data.
  document.querySelectorAll("form[data-demo-form]").forEach((form) => {
    const status = form.querySelector("[data-demo-status]");
    const password = form.querySelector('input[name="password"]');
    const confirmation = form.querySelector('input[name="confirmation"]');
    const matchPasswords = () => {
      if (!password || !confirmation) return;
      confirmation.setCustomValidity(confirmation.value && confirmation.value !== password.value
        ? "Please enter the same sample password in both fields." : "");
    };
    if (password && confirmation) {
      password.addEventListener("input", matchPasswords);
      confirmation.addEventListener("input", matchPasswords);
    }
    form.addEventListener("input", () => {
      if (status) status.textContent = "";
    });
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      matchPasswords();
      if (!form.reportValidity()) return;
      if (status) status.textContent = "Demo validated successfully. Nothing was sent or stored.";
    });
    form.addEventListener("reset", () => {
      if (confirmation) confirmation.setCustomValidity("");
      if (status) status.textContent = "Form reset. You can try another set of sample details.";
    });
    // HTML keeps these disabled until the local-only submit guard is installed.
    form.querySelectorAll('[type="submit"]').forEach((button) => { button.disabled = false; });
  });
})();
