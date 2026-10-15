/* Nelson Chan — original circuit-frame and terminal interactions.
   Vanilla JavaScript; supplementary to the site's native SVG drawing reveal. */
(() => {
  "use strict";
  if (!document.body) return;

  const SVG_NS = "http://www.w3.org/2000/svg";
  const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  const reduced = () => motionPreference.matches;
  const clamp = (number, min, max) => Math.min(max, Math.max(min, number));
  const svgElement = (tag, attributes = {}) => {
    const element = document.createElementNS(SVG_NS, tag);
    Object.entries(attributes).forEach(([name, value]) => element.setAttribute(name, String(value)));
    return element;
  };

  // These two fine traces occupy the empty margin between the outer paper edge
  // and the content rail. They cannot intercept links, touch scrolling or focus.
  const frame = svgElement("svg", {
    class: "frame-circuit", "aria-hidden": "true", focusable: "false",
    preserveAspectRatio: "none"
  });
  document.body.appendChild(frame);
  let rails = [];
  let lastWidth = 0;
  let lastHeight = 0;
  let measureFrame = 0;
  let scrollFrame = 0;
  let animationFrame = 0;
  let lastTick = 0;
  const terminalStates = [];
  const signals = [];

  const updateTrace = () => {
    scrollFrame = 0;
    const progress = reduced() ? 1 : clamp(
      (window.scrollY + window.innerHeight) / Math.max(lastHeight, 1), 0, 1
    );
    rails.forEach((rail) => {
      rail.trace.style.strokeDashoffset = String(rail.length * (1 - progress));
    });
  };
  const requestTrace = () => {
    if (!scrollFrame) scrollFrame = window.requestAnimationFrame(updateTrace);
  };

  const measure = () => {
    measureFrame = 0;
    const width = Math.round(document.body.getBoundingClientRect().width);
    // offsetHeight deliberately excludes this absolutely positioned SVG, so
    // rebuilding it cannot create a ResizeObserver / scroll-height feedback loop.
    const height = Math.max(document.body.offsetHeight, window.innerHeight);
    if (width === lastWidth && height === lastHeight) return;
    lastWidth = width;
    lastHeight = height;
    frame.setAttribute("viewBox", `0 0 ${width} ${height}`);
    frame.setAttribute("width", String(width));
    frame.setAttribute("height", String(height));
    frame.style.height = `${height}px`;
    frame.replaceChildren();
    rails = [];

    const mobile = width <= 760;
    const margin = mobile ? 14 : 27;
    const jog = mobile ? 2 : 5;
    const start = mobile ? 94 : 112;
    const end = Math.max(start + 1, height - 38);
    [margin, width - margin].forEach((x, index) => {
      const direction = index ? -1 : 1;
      let pathData = `M ${x} ${start}`;
      const nodes = [];
      for (let y = start + 200 + index * 140; y < end - 80; y += 560) {
        pathData += ` V ${y} l ${direction * jog} ${jog} v 24 l ${-direction * jog} ${jog}`;
        nodes.push([x + direction * jog, y + jog + 12]);
      }
      pathData += ` V ${end}`;
      const base = svgElement("path", { d: pathData, class: "frame-circuit__base" });
      const trace = svgElement("path", { d: pathData, class: "frame-circuit__trace" });
      frame.append(base, trace);
      nodes.forEach(([cx, cy]) => frame.appendChild(svgElement("circle", {
        class: "frame-circuit__node", cx, cy, r: mobile ? 1.5 : 2
      })));
      const pulse = svgElement("circle", {
        class: "frame-circuit__pulse", r: mobile ? 1.3 : 1.7, cx: x, cy: start
      });
      frame.appendChild(pulse);
      const length = trace.getTotalLength();
      trace.style.strokeDasharray = String(length);
      rails.push({ trace, pulse, length, index });
    });
    updateTrace();
  };
  const requestMeasure = () => {
    if (!measureFrame) measureFrame = window.requestAnimationFrame(measure);
  };

  // A computer can be awakened with a pointer, or pinned open with a genuine
  // button on touch and keyboard. No user-entered text is handled or evaluated.
  document.querySelectorAll("[data-inspect]").forEach((area) => {
    const drawing = area.querySelector(".architectural-scene");
    const code = area.querySelector("[data-screen-code]");
    const button = area.querySelector("[data-screen-toggle]");
    if (!drawing || !code || !button) return;
    const lines = [...code.querySelectorAll("[data-code-line]")];
    const caret = code.querySelector("[data-code-caret]");
    const defaults = ["const idea = 'build';", "learn('HTML', 'CSS');", "next('JavaScript');"];
    const content = lines.map((line, index) => line.dataset.code || line.textContent || defaults[index] || "");
    const state = { awake: false, pinned: false, hovered: false, timer: 0 };
    lines.forEach((line) => { line.textContent = ""; });
    const stopTyping = () => {
      window.clearTimeout(state.timer);
      state.timer = 0;
      area.classList.remove("is-typing");
    };
    const positionCaret = (line) => {
      if (!caret || !line) return;
      // The caret shares the terminal's own perspective transform.
      const length = typeof line.getComputedTextLength === "function"
        ? line.getComputedTextLength() : line.textContent.length * 6.6;
      caret.setAttribute("x", String(Number(line.getAttribute("x") || 0) + length + 2));
      caret.setAttribute("y", String(Number(line.getAttribute("y") || 0) - 9));
    };
    const showCompleteCode = () => {
      stopTyping();
      lines.forEach((line, index) => { line.textContent = content[index]; });
      positionCaret(lines[lines.length - 1]);
    };
    const typeCode = () => {
      stopTyping();
      lines.forEach((line) => { line.textContent = ""; });
      if (reduced()) { showCompleteCode(); return; }
      let row = 0;
      let column = 0;
      area.classList.add("is-typing");
      const step = () => {
        if (!state.awake || document.hidden) { stopTyping(); return; }
        if (row >= lines.length) { stopTyping(); return; }
        lines[row].textContent = content[row].slice(0, column);
        positionCaret(lines[row]);
        if (column < content[row].length) {
          column += 1;
          state.timer = window.setTimeout(step, 48);
        } else {
          row += 1;
          column = 0;
          state.timer = window.setTimeout(step, 190);
        }
      };
      step();
    };
    const sync = () => {
      const awake = state.pinned || state.hovered;
      if (awake === state.awake) return;
      state.awake = awake;
      area.classList.toggle("screen-awake", awake);
      if (awake) typeCode();
      else stopTyping();
    };
    drawing.addEventListener("pointerenter", (event) => {
      if (!finePointer.matches || event.pointerType === "touch") return;
      state.hovered = true;
      sync();
    });
    drawing.addEventListener("pointerleave", () => {
      state.hovered = false;
      sync();
    });
    button.addEventListener("click", () => {
      state.pinned = !state.pinned;
      button.setAttribute("aria-pressed", String(state.pinned));
      button.setAttribute("aria-label", state.pinned ? "Let the computer terminal sleep" : "Wake the computer terminal");
      const arrow = document.createElement("span");
      arrow.setAttribute("aria-hidden", "true");
      arrow.textContent = state.pinned ? "↙" : "↗";
      button.replaceChildren(document.createTextNode(state.pinned ? "Sleep terminal " : "Wake terminal "), arrow);
      sync();
    });
    window.addEventListener("blur", () => {
      state.hovered = false;
      sync();
    });
    terminalStates.push({ state, sync, stopTyping, showCompleteCode });

    drawing.querySelectorAll("[data-signal-route]").forEach((route) => {
      const key = route.getAttribute("data-signal-route");
      const dot = [...drawing.querySelectorAll("[data-signal-dot]")]
        .find((element) => element.getAttribute("data-signal-dot") === key);
      if (!dot || typeof route.getTotalLength !== "function") return;
      signals.push({ route, dot, length: route.getTotalLength(), visible: true, phase: signals.length * .43 });
    });
    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver(([entry]) => {
        signals.forEach((signal) => {
          if (drawing.contains(signal.dot)) signal.visible = entry.isIntersecting;
        });
      }, { rootMargin: "40px" });
      observer.observe(drawing);
    }
  });

  // Two margin dots and the small board signals share a capped 30fps loop.
  // SVG point sampling is bounded, and all loops stop for reduced motion or a
  // hidden tab. Nothing animates layout, document height or the reader's scroll.
  const animate = (now) => {
    animationFrame = 0;
    if (reduced() || document.hidden) return;
    if (now - lastTick >= 1000 / 30) {
      lastTick = now;
      const top = clamp((window.scrollY + 100) / Math.max(lastHeight, 1), 0, 1);
      const bottom = clamp((window.scrollY + window.innerHeight - 40) / Math.max(lastHeight, 1), top, 1);
      rails.forEach((rail) => {
        const phase = (now * .000045 + rail.index * .53) % 1;
        const fraction = top + (bottom - top) * phase;
        const point = rail.trace.getPointAtLength(rail.length * fraction);
        rail.pulse.setAttribute("cx", point.x.toFixed(2));
        rail.pulse.setAttribute("cy", point.y.toFixed(2));
      });
      signals.forEach((signal) => {
        signal.dot.classList.toggle("signal-active", signal.visible);
        if (!signal.visible) return;
        const point = signal.route.getPointAtLength(((now * .000075 + signal.phase) % 1) * signal.length);
        signal.dot.setAttribute("cx", point.x.toFixed(2));
        signal.dot.setAttribute("cy", point.y.toFixed(2));
      });
    }
    animationFrame = window.requestAnimationFrame(animate);
  };
  const refreshMotion = () => {
    if (animationFrame) window.cancelAnimationFrame(animationFrame);
    animationFrame = 0;
    updateTrace();
    if (reduced()) {
      signals.forEach((signal) => signal.dot.classList.remove("signal-active"));
      terminalStates.forEach((terminal) => {
        if (terminal.state.awake) terminal.showCompleteCode();
        else terminal.stopTyping();
      });
    } else if (!document.hidden) {
      lastTick = 0;
      animationFrame = window.requestAnimationFrame(animate);
    }
  };
  const observePreference = (query, handler) => {
    if (query.addEventListener) query.addEventListener("change", handler);
    else if (query.addListener) query.addListener(handler);
  };
  observePreference(motionPreference, refreshMotion);
  observePreference(finePointer, () => {
    if (!finePointer.matches) terminalStates.forEach((terminal) => {
      terminal.state.hovered = false;
      terminal.sync();
    });
  });
  document.addEventListener("visibilitychange", () => {
    terminalStates.forEach((terminal) => {
      if (document.hidden) terminal.stopTyping();
      else if (terminal.state.awake) terminal.showCompleteCode();
    });
    refreshMotion();
  });
  window.addEventListener("scroll", requestTrace, { passive: true });
  window.addEventListener("resize", requestMeasure, { passive: true });
  window.addEventListener("load", requestMeasure, { once: true });
  window.addEventListener("pageshow", refreshMotion);
  if ("ResizeObserver" in window) new ResizeObserver(requestMeasure).observe(document.body);
  measure();
  refreshMotion();
})();
