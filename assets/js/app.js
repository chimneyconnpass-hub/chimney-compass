(async function () {
  const dayLabels = ["日", "月", "火", "水", "木", "金", "土"];

  let data = {
    pickups: [],
    events: [],
    townMap: window.CHIMNEY_STATIC_DATA.townMap,
    projects: [],
    projectError: "",
    movieSchedules: [],
    movieScheduleError: "",
    screeningEvents: [],
    screeningScheduleError: ""
  };

  function byDate(a, b) {
    return a.dateObject - b.dateObject;
  }

  function byUpcomingStatus(a, b) {
    const todayTime = todayLocal().getTime();
    const rank = (event) => {
      const time = event.dateObject instanceof Date ? event.dateObject.getTime() : Number.POSITIVE_INFINITY;
      if (time === todayTime) return 0;
      if (time > todayTime) return 1;
      return 2;
    };
    return rank(a) - rank(b) || byDate(a, b);
  }

  function isPastEvent(event) {
    return event.dateObject instanceof Date &&
      !Number.isNaN(event.dateObject.getTime()) &&
      event.dateObject < todayLocal();
  }

  function todayLocal() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  function formatMonthDay(event) {
    return event.dateLabel || "";
  }

  function compactArea(area) {
    return String(area || "").replace(/[【】]/g, "").trim();
  }

  function tapeColorIndex(event, eventIndex) {
    const calendarColors = [1, 2, 4, 5];
    const seed = `${event.date}-${event.area}-${event.title}-${eventIndex}`;
    const total = Array.from(seed).reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return calendarColors[total % calendarColors.length];
  }

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[char]));
  }

  function safeHref(value) {
    return value ? escapeHtml(value) : "#";
  }

  function isHttpUrl(value) {
    return /^https?:\/\//.test(String(value || ""));
  }

  function externalLinkAttrs(value) {
    return isHttpUrl(value) ? ` target="_blank" rel="noopener noreferrer"` : "";
  }

  function formatDateValue(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
  }

  function formatScreeningDate(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
    return `${formatDateValue(date)}(${dayLabels[date.getDay()]})`;
  }

  function formatShortDate(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
    return `${date.getMonth() + 1}/${date.getDate()}`;
  }

  function formatMoviePeriod(item) {
    return `${formatShortDate(item.startDate)} ～ ${item.endDate ? formatShortDate(item.endDate) : "終了日未定"}`;
  }

  function isMovieShowingNow(item, today) {
    return item.startDate <= today && (!item.endDate || item.endDate >= today);
  }

  function formatMovieBarLabel(item, today) {
    const endLabel = item.endDate ? formatShortDate(item.endDate) : "終了日未定";
    if (isMovieShowingNow(item, today)) {
      return `▶️上映中 ～${endLabel}`;
    }
    return `📅 ${formatShortDate(item.startDate)}～${endLabel}`;
  }

  function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  function daysBetween(start, end) {
    return Math.round((end - start) / 86400000);
  }

  function screeningCalendarLabel(event) {
    return compactArea(event.area);
  }

  function screeningCalendarMarkup(event) {
    return `
      <span class="screening-ticket-icon" aria-hidden="true">🎞️</span>
      <span class="screening-ticket-label">イベント上映</span>
      <span class="screening-ticket-title">${escapeHtml(screeningCalendarLabel(event))}</span>
    `;
  }

  function calendarPreviewAttributes(event) {
    return ` data-preview-title="${escapeHtml(event.title || "イベント")}" data-preview-place="${escapeHtml(event.place || "場所未定")}" data-preview-time="${escapeHtml(event.time || "時間未定")}"`;
  }

  function handleCalendarEvent(event) {
    if (event.source === "screening") {
      window.location.href = `./screening-schedule.html?date=${encodeURIComponent(event.date)}`;
      return;
    }
    openEventDetail(event);
  }

  function showLoading() {
    document.querySelectorAll("[data-pickups], [data-home-calendar], [data-calendar-list], [data-schedule-cards], [data-home-three-day-panel], [data-project-map], [data-town-map], [data-movie-schedule], [data-screening-schedule]")
      .forEach((target) => {
        let message = "予定を準備しています…";
        if (target.matches("[data-project-map]")) message = "Projectを準備しています…";
        if (target.matches("[data-town-map]")) message = "案内板を準備しています…";
        target.innerHTML = `<p class="status-message">${message}</p>`;
      });
  }

  function showError() {
    const message = "データを読み込めませんでした。時間をおいて再度お試しください。";
    document.querySelectorAll("[data-pickups], [data-home-calendar], [data-calendar-list], [data-schedule-cards], [data-home-three-day-panel], [data-project-map], [data-town-map], [data-movie-schedule], [data-screening-schedule]")
      .forEach((target) => {
        target.innerHTML = `<p class="status-message status-error">${escapeHtml(message)}</p>`;
      });
  }

  function renderPickups() {
    const target = document.querySelector("[data-pickups]");
    if (!target) return;

    if (!data.pickups.length) {
      target.innerHTML = `<p class="status-message">Pick Upの表示データがありません。</p>`;
      return;
    }

    target.innerHTML = data.pickups
      .map((item) => `
        <a class="pickup-card tape-${item.position}" href="${safeHref(item.link)}"${externalLinkAttrs(item.link)}>
          <span class="pickup-icon" aria-hidden="true">${item.icon}</span>
          <strong>${escapeHtml(item.title)}</strong>
          <span>${escapeHtml(item.description)}</span>
        </a>
      `)
      .join("");
  }

  function groupEventsByDate(events) {
    return events.reduce((groups, event) => {
      if (!groups.has(event.date)) groups.set(event.date, []);
      groups.get(event.date).push(event);
      return groups;
    }, new Map());
  }

  function renderHomeCalendar() {
    const target = document.querySelector("[data-home-calendar]");
    if (!target) return;

    const today = todayLocal();
    const eventsByDate = groupEventsByDate(data.events);
    const homeEvents = [];
    const weekdayHeader = dayLabels.map((day) => `<span class="calendar-weekday">${day}</span>`).join("");
    const days = Array.from({ length: 14 }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() + index);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      const events = eventsByDate.get(key) || [];
      const eventItems = events.map((event, eventIndex) => {
        const area = compactArea(event.area);
        const homeEventIndex = homeEvents.push(event) - 1;
        if (event.source === "screening") {
          return `
            <button class="day-event screening-calendar-event" type="button" data-home-event-index="${homeEventIndex}"${calendarPreviewAttributes(event)}>
              ${screeningCalendarMarkup(event)}
            </button>
          `;
        }
        return `
        <button class="day-event tape-label tape-${tapeColorIndex(event, eventIndex)}" type="button" data-home-event-index="${homeEventIndex}"${calendarPreviewAttributes(event)}>
          ${area ? `<strong class="day-area">${escapeHtml(area)}</strong>` : ""}
          <strong class="day-title">${escapeHtml(event.title)}</strong>
        </button>
      `;
      }).join("");

      const mobileOrder = index < 7 ? index * 2 : (index - 7) * 2 + 1;

      return `
        <article class="day-card ${events.length ? "has-event" : ""}" aria-label="${date.getMonth() + 1}月${date.getDate()}日" style="--mobile-order: ${mobileOrder}">
          <strong class="day-date">
            <span>${date.getMonth() + 1}/${date.getDate()}</span><span class="mobile-weekday">（${dayLabels[date.getDay()]}）</span>
          </strong>
          <span class="day-events">${eventItems}</span>
        </article>
      `;
    });

    target._homeCalendarEvents = homeEvents;
    target.innerHTML = `<div class="calendar-weekdays">${weekdayHeader}</div><div class="calendar-days">${days.join("")}</div>`;

    if (!target.dataset.homeCalendarBound) {
      target.addEventListener("click", (event) => {
        const button = event.target.closest("[data-home-event-index]");
        if (!button) return;

        const selected = target._homeCalendarEvents[Number(button.dataset.homeEventIndex)];
        if (selected) handleCalendarEvent(selected);
      });
      target.dataset.homeCalendarBound = "true";
    }

    const legend = document.querySelector("[data-calendar-legend]");
    if (legend) {
      legend.innerHTML = "";
    }
  }

  function renderTownMap() {
    const target = document.querySelector("[data-town-map]");
    if (!target) return;

    const townItems = data.townMap
      .map((group) => {
        const links = Array.isArray(group.links) ? group.links.filter((link) => link.label && link.url) : [];
        const noteLinks = links.length ? links : [{ label: group.label || group.title, url: group.url }];
        const noteData = escapeHtml(encodeURIComponent(JSON.stringify(noteLinks)));
        const heading = `
          <span class="town-heading">
            <span class="town-icon" aria-hidden="true">${group.icon}</span>
            <span class="town-title">${escapeHtml(group.title)}</span>
          </span>
        `;

        return `
          <button class="town-card ${links.length ? "town-card-multi" : ""} ${group.color}" type="button" aria-expanded="false" data-town-title="${escapeHtml(group.title)}" data-town-icon="${escapeHtml(group.icon)}" data-town-description="${escapeHtml(group.noteDescription || "")}" data-town-note-links="${noteData}">
            ${heading}
          </button>
        `;
      })
      .join("");

    target.innerHTML = `
      <div class="town-card-grid">
        ${townItems}
      </div>
      <aside class="town-note" data-town-note>
        <span class="town-note-clip" aria-hidden="true"></span>
        <h3>🧭 案内所</h3>
        <p class="town-note-empty">気になる場所を選んでください。</p>
      </aside>
    `;

    if (!target.dataset.townBound) {
      const resetTownNote = () => {
        const note = target.querySelector("[data-town-note]");
        if (!note) return;
        note.innerHTML = `
          <span class="town-note-clip" aria-hidden="true"></span>
          <h3>🧭 案内所</h3>
          <p class="town-note-empty">気になる場所を選んでください。</p>
        `;
        note.classList.remove("has-project-preview");
        target.querySelectorAll(".town-card[aria-expanded='true']").forEach((item) => {
          item.setAttribute("aria-expanded", "false");
        });
      };

      const writeTownNote = (card) => {
        const note = target.querySelector("[data-town-note]");
        if (!note) return;
        const title = card.dataset.townTitle || card.querySelector(".town-title")?.textContent?.trim() || "Town Map";
        const icon = card.dataset.townIcon || "🧭";
        const description = card.dataset.townDescription || "";
        const isProjectMap = title === "Project Map";
        const projectNames = isProjectMap
          ? data.projects.map((project) => project.title).filter(Boolean).slice(0, 10)
          : [];
        let links = [];
        try {
          links = JSON.parse(decodeURIComponent(card.dataset.townNoteLinks || "[]"));
        } catch (_error) {
          links = [];
        }
        if (!links.length) return;

        target.querySelectorAll(".town-card[aria-expanded='true']").forEach((item) => {
          if (item !== card) item.setAttribute("aria-expanded", "false");
        });
        card.setAttribute("aria-expanded", "true");
        note.classList.toggle("has-project-preview", Boolean(projectNames.length));
        note.innerHTML = `
          <span class="town-note-clip" aria-hidden="true"></span>
          <h3>${escapeHtml(icon)} ${escapeHtml(title)}</h3>
          ${description ? `<p class="town-note-description">${escapeHtml(description)}</p>` : ""}
          <div class="town-note-links">
            ${links.map((link) => {
              const label = String(link.label || "");
              const prefix = label.trim().startsWith("▶") ? "" : "▶ ";
              return `<a class="town-note-link" href="${safeHref(link.url)}"${externalLinkAttrs(link.url)}>${prefix}${escapeHtml(label)}</a>`;
            }).join("")}
          </div>
          ${projectNames.length ? `
            <div class="town-project-watermark" aria-hidden="true">
              ${projectNames.map((name, index) => `<span style="--watermark-index:${index};">${escapeHtml(name)}</span>`).join("")}
            </div>
          ` : ""}
        `;
      };

      target.addEventListener("click", (event) => {
        if (event.target.closest(".town-note-link")) return;
        const card = event.target.closest(".town-card");
        if (!card || !target.contains(card)) return;

        event.preventDefault();
        const isOpen = card.getAttribute("aria-expanded") === "true";
        if (isOpen) {
          resetTownNote();
        } else {
          writeTownNote(card);
        }
      });
      target.dataset.townBound = "true";
    }
  }

  function renderCoffeeList() {
    const target = document.querySelector("[data-coffee-list]");
    if (!target) return;

    const coffee = data.townMap.find((item) => item.title === "CHIMNEY COFFEE");
    if (!coffee || !coffee.addresses) {
      target.innerHTML = `<p class="status-message">店舗住所がありません。</p>`;
      return;
    }

    target.innerHTML = coffee.addresses
      .map((shop) => `
        <article class="coffee-card">
          <span class="coffee-icon" aria-hidden="true">☕</span>
          <div>
            <h2>${escapeHtml(shop.name)}</h2>
            <p>${escapeHtml(shop.postalCode)}</p>
            <p>${escapeHtml(shop.address)}</p>
          </div>
        </article>
      `)
      .join("");
  }

  function renderCalendarList() {
    const target = document.querySelector("[data-calendar-list]");
    if (!target) return;

    const sortedEvents = data.events
      .slice()
      .filter((event) => event.dateObject instanceof Date && !Number.isNaN(event.dateObject.getTime()))
      .sort(byDate);
    const today = todayLocal();
    const startYear = today.getFullYear();
    const startMonth = today.getMonth();
    const visibleMonths = Array.from({ length: 12 }, (_, offset) =>
      new Date(startYear, startMonth + offset, 1)
    );

    function renderMonth(offset, direction = "") {
      offset = Math.min(visibleMonths.length - 1, Math.max(0, offset));
      const activeDate = visibleMonths[offset];
      const year = activeDate.getFullYear();
      const month = activeDate.getMonth();
      const firstDay = new Date(year, month, 1);
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const monthEvents = sortedEvents.filter((event) =>
        event.dateObject.getFullYear() === year && event.dateObject.getMonth() === month
      );
      const eventIndexes = new Map(monthEvents.map((event, index) => [event, index]));
      const eventsByDate = groupEventsByDate(monthEvents);

      const weekdayHeader = dayLabels.map((day) => `<span class="month-weekday">${day}</span>`).join("");
      const monthTabs = visibleMonths.map((date, index) => {
        const label = date.getMonth() === 0 && date.getFullYear() !== startYear
          ? `${date.getFullYear()}年1月`
          : `${date.getMonth() + 1}月`;
        return `
          <button class="month-tab ${date.getMonth() === 0 && date.getFullYear() !== startYear ? "month-tab-year" : ""} ${index === offset ? "is-active" : ""}" type="button" data-calendar-month="${index}" ${index === offset ? `aria-current="true"` : ""}>${label}</button>
        `;
      }).join("");
      const blankDays = Array.from({ length: firstDay.getDay() }, () => `<div class="month-day month-day-empty" aria-hidden="true"></div>`);
      const dayCards = Array.from({ length: daysInMonth }, (_, index) => {
        const day = index + 1;
        const date = new Date(year, month, day);
        const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        const events = eventsByDate.get(key) || [];
        const items = events.map((event) => {
          const area = compactArea(event.area);
          const eventIndex = eventIndexes.get(event);

          if (event.source === "screening") {
            return `
              <button class="month-event screening-calendar-event" type="button" data-event-index="${eventIndex}"${calendarPreviewAttributes(event)}>
                ${screeningCalendarMarkup(event)}
              </button>
            `;
          }

          return `
            <button class="month-event tape-label tape-${tapeColorIndex(event, eventIndex)}" type="button" data-event-index="${eventIndex}"${calendarPreviewAttributes(event)}>
              ${area ? `<span class="month-event-area">${escapeHtml(area)}</span>` : ""}
              <span class="month-event-title">${escapeHtml(event.title)}</span>
            </button>
          `;
        }).join("");

        return `
          <article class="month-day ${events.length ? "has-event" : ""}">
            <time class="month-date" datetime="${key}">
              <span class="month-date-day">${month + 1}/${day}</span><span class="month-mobile-weekday">（${dayLabels[date.getDay()]}）</span>
            </time>
            <div class="month-events">${items}</div>
          </article>
        `;
      });

      const calendarHtml = `
        <div class="month-calendar">
          <div class="month-calendar-header">
            <div class="month-tabs" aria-label="月を選択">${monthTabs}</div>
            <div class="month-calendar-top">
              <h2>${year}年${month + 1}月</h2>
            </div>
          </div>
          <div class="month-weekdays">${weekdayHeader}</div>
          <div class="month-grid">${blankDays.join("")}${dayCards.join("")}</div>
        </div>
      `;

      const commitMonth = () => {
        target.innerHTML = calendarHtml;
        target._calendarEvents = monthEvents;
        target._calendarMonth = offset;

        if (direction) {
          const calendar = target.querySelector(".month-calendar");
          calendar.classList.add(`page-curl-${direction}`);
          window.setTimeout(() => {
            calendar.classList.remove(`page-curl-${direction}`);
            target.dataset.calendarAnimating = "";
          }, 220);
        } else {
          target.dataset.calendarAnimating = "";
        }
      };

      if (direction) {
        target.dataset.calendarAnimating = "true";
      }

      commitMonth();
    }

    target._renderCalendarMonth = renderMonth;
    renderMonth(typeof target._calendarMonth === "number" ? target._calendarMonth : 0);

    if (!target.dataset.calendarBound) {
      target.addEventListener("click", (event) => {
        const shiftButton = event.target.closest("[data-calendar-shift]");
        if (shiftButton) {
          if (target.dataset.calendarAnimating === "true") return;
          const nextMonth = Math.min(visibleMonths.length - 1, Math.max(0, target._calendarMonth + Number(shiftButton.dataset.calendarShift)));
          const direction = nextMonth > target._calendarMonth ? "left" : "right";
          target._renderCalendarMonth(nextMonth, direction);
          return;
        }

        const monthButton = event.target.closest("[data-calendar-month]");
        if (monthButton) {
          if (target.dataset.calendarAnimating === "true") return;
          const nextMonth = Number(monthButton.dataset.calendarMonth);
          if (nextMonth === target._calendarMonth) return;
          const direction = nextMonth > target._calendarMonth ? "left" : "right";
          target._renderCalendarMonth(nextMonth, direction);
          return;
        }

        const button = event.target.closest("[data-event-index]");
        if (!button) return;

        const selected = target._calendarEvents[Number(button.dataset.eventIndex)];
        if (selected) handleCalendarEvent(selected);
      });

      const swipeMonth = (deltaX, deltaY) => {
        if (target.dataset.calendarAnimating === "true") return;
        if (Math.abs(deltaX) < 48 || Math.abs(deltaX) < Math.abs(deltaY) * 1.25) return;

        if (deltaX < 0 && target._calendarMonth > 0) {
          target._renderCalendarMonth(target._calendarMonth - 1, "right");
        } else if (deltaX > 0 && target._calendarMonth < visibleMonths.length - 1) {
          target._renderCalendarMonth(target._calendarMonth + 1, "left");
        }
      };

      let touchStartX = 0;
      let touchStartY = 0;
      target.addEventListener("touchstart", (event) => {
        if (event.target.closest("[data-event-index], [data-calendar-month]")) return;
        const touch = event.touches[0];
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
      }, { passive: true });

      target.addEventListener("touchend", (event) => {
        if (!touchStartX || target.dataset.calendarAnimating === "true") return;
        const touch = event.changedTouches[0];
        const deltaX = touch.clientX - touchStartX;
        const deltaY = touch.clientY - touchStartY;
        touchStartX = 0;
        touchStartY = 0;

        swipeMonth(deltaX, deltaY);
      }, { passive: true });

      let pointerStartX = 0;
      let pointerStartY = 0;
      target.addEventListener("pointerdown", (event) => {
        if (event.target.closest("[data-event-index], [data-calendar-month]")) return;
        pointerStartX = event.clientX;
        pointerStartY = event.clientY;
      });

      target.addEventListener("pointerup", (event) => {
        if (!pointerStartX) return;
        const deltaX = event.clientX - pointerStartX;
        const deltaY = event.clientY - pointerStartY;
        pointerStartX = 0;
        pointerStartY = 0;
        swipeMonth(deltaX, deltaY);
      });
      target.dataset.calendarBound = "true";
    }
  }

  function getEventDialog() {
    let dialog = document.querySelector("[data-event-dialog]");
    if (dialog) return dialog;

    dialog = document.createElement("div");
    dialog.className = "event-dialog";
    dialog.setAttribute("data-event-dialog", "");
    dialog.hidden = true;
    dialog.innerHTML = `
      <div class="event-dialog-backdrop" data-close-event-dialog></div>
      <section class="event-dialog-panel" role="dialog" aria-modal="true" aria-labelledby="event-dialog-title">
        <button class="event-dialog-close" type="button" data-close-event-dialog aria-label="閉じる">×</button>
        <div data-event-dialog-content></div>
      </section>
    `;
    document.body.appendChild(dialog);

    const closeDialog = () => {
      dialog.classList.remove("is-open");
      window.setTimeout(() => {
        if (!dialog.classList.contains("is-open")) {
          dialog.hidden = true;
        }
      }, 180);
    };

    dialog.addEventListener("click", (event) => {
      if (event.target.closest("[data-close-event-dialog]")) {
        closeDialog();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !dialog.hidden) closeDialog();
    });

    return dialog;
  }

  function openEventDetail(event) {
    const dialog = getEventDialog();
    const content = dialog.querySelector("[data-event-dialog-content]");
    const area = compactArea(event.area);

    content.innerHTML = `
      <p class="event-dialog-date">${escapeHtml(formatMonthDay(event))}${area ? ` / ${escapeHtml(area)}` : ""}</p>
      <h2 id="event-dialog-title">${escapeHtml(event.title)}</h2>
      <dl class="event-dialog-details">
        <div><dt>場所</dt><dd>${escapeHtml(event.place || "-")}</dd></div>
        <div><dt>時間</dt><dd>${escapeHtml(event.time || "-")}</dd></div>
        <div><dt>メモ</dt><dd>${escapeHtml(event.memo || "-")}</dd></div>
      </dl>
      ${event.ticketUrl ? `<a class="button event-dialog-button" href="${safeHref(event.ticketUrl)}"${externalLinkAttrs(event.ticketUrl)}>詳細はこちら</a>` : ""}
    `;

    dialog.hidden = false;
    window.requestAnimationFrame(() => dialog.classList.add("is-open"));
  }

  function setupCalendarPreview() {
    const calendars = [
      {
        target: document.querySelector("[data-calendar-list]"),
        eventSelector: ".month-event[data-event-index]"
      },
      {
        target: document.querySelector("[data-home-calendar]"),
        eventSelector: ".day-event[data-home-event-index]"
      }
    ].filter(({ target }) => target);

    if (!calendars.length || document.querySelector("[data-calendar-preview]")) return;

    const preview = document.createElement("aside");
    preview.className = "calendar-event-preview";
    preview.setAttribute("data-calendar-preview", "");
    preview.setAttribute("role", "tooltip");
    preview.hidden = true;
    document.body.appendChild(preview);

    const hidePreview = () => {
      preview.hidden = true;
      preview.classList.remove("is-visible", "is-left");
    };

    const showPreview = (button, calendar) => {
      if (!window.matchMedia("(min-width: 621px)").matches) return;

      preview.innerHTML = `
        <strong><span aria-hidden="true">🎬</span>${escapeHtml(button.dataset.previewTitle || "イベント")}</strong>
        <span><span aria-hidden="true">📍</span>${escapeHtml(button.dataset.previewPlace || "場所未定")}</span>
        <span><span aria-hidden="true">🕒</span>${escapeHtml(button.dataset.previewTime || "時間未定")}</span>
      `;
      preview.hidden = false;
      preview.classList.add("is-visible");

      const anchor = button.getBoundingClientRect();
      const box = preview.getBoundingClientRect();
      const gap = 8;
      const edge = 10;
      let left = anchor.right + gap;
      let top = anchor.top - box.height + 8;

      if (left + box.width > window.innerWidth - edge) {
        left = anchor.left - box.width - gap;
        preview.classList.add("is-left");
      } else {
        preview.classList.remove("is-left");
      }

      preview.style.left = `${Math.max(edge, Math.min(left, window.innerWidth - box.width - edge))}px`;
      preview.style.top = `${Math.max(edge, Math.min(top, window.innerHeight - box.height - edge))}px`;
    };

    calendars.forEach((calendar) => {
      calendar.target.addEventListener("pointerover", (event) => {
        const button = event.target.closest(calendar.eventSelector);
        if (!button || !calendar.target.contains(button)) return;
        if (event.relatedTarget && button.contains(event.relatedTarget)) return;
        showPreview(button, calendar);
      });

      calendar.target.addEventListener("pointerout", (event) => {
        const button = event.target.closest(calendar.eventSelector);
        if (!button || !calendar.target.contains(button)) return;
        if (event.relatedTarget && button.contains(event.relatedTarget)) return;
        hidePreview();
      });

      calendar.target.addEventListener("click", hidePreview);
    });

    window.addEventListener("scroll", hidePreview, { passive: true });
    window.addEventListener("resize", hidePreview);
  }

  function openCoffeeAddresses() {
    const coffee = data.townMap.find((item) => item.title === "CHIMNEY COFFEE");
    if (!coffee || !coffee.addresses) return;

    const dialog = getEventDialog();
    const content = dialog.querySelector("[data-event-dialog-content]");
    content.innerHTML = `
      <p class="event-dialog-date">店舗住所</p>
      <h2 id="event-dialog-title">CHIMNEY COFFEE</h2>
      <div class="coffee-dialog-list">
        ${coffee.addresses.map((shop) => `
          <article class="coffee-dialog-card">
            <h3>${escapeHtml(shop.name)}</h3>
            <p>${escapeHtml(shop.postalCode)}<br>${escapeHtml(shop.address)}</p>
          </article>
        `).join("")}
      </div>
    `;

    dialog.hidden = false;
    window.requestAnimationFrame(() => dialog.classList.add("is-open"));
  }

  function projectAction(project) {
    if (!project.links.length) return "";

    const tapeClasses = ["tape-pink", "tape-mint", "tape-cream"];
    const links = project.links
      .map((link, index) => `
        <a class="project-tape-link ${tapeClasses[index % tapeClasses.length]}" href="${safeHref(link.url)}"${externalLinkAttrs(link.url)}>📌 ${escapeHtml(link.label)}</a>
      `)
      .join("");

    return `
      <div class="project-actions ${project.links.length > 1 ? "has-multiple-links" : ""}">
        <button class="project-detail-trigger" type="button" aria-expanded="false">
          詳細はこちら<span class="project-detail-arrow" aria-hidden="true"> ▼</span>
        </button>
        <div class="project-link-group" aria-label="${escapeHtml(project.title)}のリンク">
          ${links}
        </div>
      </div>
    `;
  }

  function renderScheduleCards() {
    const cardTarget = document.querySelector("[data-schedule-cards]");
    if (!cardTarget) return;

    if (!data.events.length) {
      cardTarget.innerHTML = `<p class="status-message">スケジュールデータがありません。</p>`;
      return;
    }

    const sortedEvents = data.events
      .slice()
      .sort(byUpcomingStatus);

    cardTarget.innerHTML = sortedEvents
      .map((event) => {
        const date = event.dateObject instanceof Date && !Number.isNaN(event.dateObject.getTime())
          ? `${formatMonthDay(event)}（${dayLabels[event.dateObject.getDay()]}）`
          : formatMonthDay(event);
        const area = compactArea(event.area);
        const detailRows = [
          event.type ? ["種別", event.type] : null,
          area ? ["地域", area] : null,
          event.place ? ["場所", event.place] : null,
          event.time ? ["時間", event.time] : null,
          event.memo ? ["メモ", event.memo] : null
        ].filter(Boolean);

        return `
          <article class="schedule-card ${isPastEvent(event) ? "is-past" : ""}">
            <p class="schedule-card-date">${escapeHtml(date)}</p>
            <h2>${escapeHtml(event.title)}</h2>
            <div class="schedule-card-actions">
              ${event.ticketUrl ? `<a class="schedule-link-button schedule-ticket-button" href="${safeHref(event.ticketUrl)}"${externalLinkAttrs(event.ticketUrl)}>🎫 詳細・申込</a>` : ""}
              ${isHttpUrl(event.official) ? `<a class="schedule-link-button schedule-official-button" href="${safeHref(event.official)}"${externalLinkAttrs(event.official)}>🌐公式</a>` : ""}
            </div>
            <dl>
              ${detailRows.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}
            </dl>
          </article>
        `;
      })
      .join("");
  }

  function eventTimeSortValue(value) {
    const match = String(value || "").match(/(\d{1,2})[:：](\d{2})/);
    if (!match) return Number.POSITIVE_INFINITY;
    return Number(match[1]) * 60 + Number(match[2]);
  }

  function isoDateFor(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  function formatAdminDate(date) {
    return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}（${dayLabels[date.getDay()]}）`;
  }

  function movieStatusForDate(item, date) {
    const targetTime = date.getTime();
    const startTime = item.startDate?.getTime();
    const endTime = item.endDate?.getTime();
    if (startTime === targetTime) return "上映開始";
    if (Number.isFinite(endTime) && endTime === targetTime) return "上映最終日";
    return "上映中";
  }

  function placeTimeLine(place, time) {
    const placeText = String(place || "").trim() || "場所未定";
    const timeText = String(time || "").trim() || "時間未定";
    return `${placeText}・${timeText}`;
  }

  function normalizeHashtag(value) {
    return String(value || "")
      .replace(/https?:\/\/\S+/g, "")
      .replace(/[\p{Extended_Pictographic}]/gu, "")
      .replace(/[\uFE0E\uFE0F]/g, "")
      .replace(/[＃#]/g, "")
      .replace(/[&＆]/g, "")
      .replace(/[\s\u3000]+/g, "")
      .replace(/[!"$%'\(\)\*\+,\.\/:;<=>\?@\[\\\]\^`\{\|\}~]/g, "")
      .replace(/[、。，．・「」『』【】（）［］｛｝〈〉《》？！…〜～ー]+$/g, "")
      .trim();
  }

  function addHashtag(tags, value) {
    const tag = normalizeHashtag(value);
    if (!tag || tag.length < 2) return;
    if (tags.includes(tag)) return;
    tags.push(tag.slice(0, 32));
  }

  function buildAdminHashtags({ regularEvents, movieEvents, screeningEvents, today }) {
    const tags = [];
    addHashtag(tags, "西野亮廣");
    addHashtag(tags, "えんとつ町のプペル");

    regularEvents.forEach((event) => {
      addHashtag(tags, event.title);
      addHashtag(tags, event.type);
    });

    if (movieEvents.length) {
      addHashtag(tags, "映画館上映");
      addHashtag(tags, "映画えんとつ町のプペル");
      movieEvents.forEach((event) => {
        addHashtag(tags, movieStatusForDate(event, today));
      });
    }

    if (screeningEvents.length) {
      addHashtag(tags, "イベント上映");
      screeningEvents.forEach((event) => {
        addHashtag(tags, event.displayTitle);
      });
    }

    const dynamicTags = tags.filter((tag) => tag !== "ChimneyCompass").slice(0, 9);
    return [...dynamicTags, "ChimneyCompass"].map((tag) => `#${tag}`);
  }

  function buildAdminSinglePostText(targetDate) {
    const targetIso = isoDateFor(targetDate);
    const targetTime = targetDate.getTime();
    const lines = [
      "🧭 Chimney Compass｜本日の予定",
      formatAdminDate(targetDate),
      ""
    ];

    const regularEvents = data.events
      .filter((event) => event.source !== "screening" && event.date === targetIso)
      .sort((a, b) => eventTimeSortValue(a.time) - eventTimeSortValue(b.time) || a.title.localeCompare(b.title, "ja"));

    const movieEvents = data.movieSchedules
      .filter((item) => {
        const startTime = item.startDate?.getTime();
        const endTime = item.endDate?.getTime();
        return Number.isFinite(startTime) && startTime <= targetTime && (!Number.isFinite(endTime) || endTime >= targetTime);
      })
      .sort((a, b) => a.theater.localeCompare(b.theater, "ja"));

    const screeningEvents = data.screeningEvents
      .filter((event) => event.date === targetIso)
      .sort((a, b) => eventTimeSortValue(a.time) - eventTimeSortValue(b.time) || a.displayTitle.localeCompare(b.displayTitle, "ja"));

    if (!regularEvents.length && !movieEvents.length && !screeningEvents.length) {
      lines.push("この日の予定は見つかりませんでした。");
      lines.push("");
      lines.push("▼詳しくはこちら");
      lines.push("https://chimneyconnpass-hub.github.io/chimney-compass/");
      lines.push("");
      lines.push(...buildAdminHashtags({ regularEvents, movieEvents, screeningEvents, today: targetDate }));
      return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
    }

    if (regularEvents.length) {
      lines.push("【通常イベント】");
      regularEvents.forEach((event) => {
        lines.push(event.title);
        lines.push(placeTimeLine(event.place || compactArea(event.area), event.time));
        lines.push("");
      });
    }

    if (movieEvents.length) {
      lines.push("【映画館上映】");
      movieEvents.forEach((event) => {
        lines.push(event.theater);
        lines.push(movieStatusForDate(event, targetDate));
        lines.push("");
      });
    }

    if (screeningEvents.length) {
      lines.push("【イベント上映】");
      screeningEvents.forEach((event) => {
        lines.push(event.displayTitle);
        lines.push(placeTimeLine(event.place || compactArea(event.area), event.time));
        lines.push("");
      });
    }

    lines.push("▼詳しくはこちら");
    lines.push("https://chimneyconnpass-hub.github.io/chimney-compass/");
    lines.push("");
    lines.push(...buildAdminHashtags({ regularEvents, movieEvents, screeningEvents, today: targetDate }));
    return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  }

  async function copyText(value, sourceElement = null) {
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(value);
        return;
      } catch (_error) {
        // Browser permissions can reject clipboard access; fall back to the older copy path.
      }
    }

    if (sourceElement) {
      sourceElement.focus();
      sourceElement.select();
      const copied = document.execCommand("copy");
      sourceElement.setSelectionRange(0, 0);
      if (!copied) throw new Error("Copy command failed");
      return;
    }

    const helper = document.createElement("textarea");
    helper.value = value;
    helper.setAttribute("readonly", "");
    helper.style.position = "fixed";
    helper.style.inset = "0 auto auto 0";
    helper.style.opacity = "0";
    document.body.appendChild(helper);
    helper.select();
    const copied = document.execCommand("copy");
    helper.remove();
    if (!copied) throw new Error("Copy command failed");
  }

  function renderAdminPost() {
    const tomorrowTextarea = document.querySelector('[data-admin-post="tomorrow"]');
    const todayTextarea = document.querySelector('[data-admin-post="today"]');
    const status = document.querySelector('[data-admin-copy-status="today"]');
    const inlineStatus = document.querySelector('[data-admin-copy-status="tomorrow"]');
    const copyButtons = document.querySelectorAll("[data-admin-copy]");
    if (!tomorrowTextarea || !todayTextarea || !copyButtons.length) return;

    const today = todayLocal();
    tomorrowTextarea.value = buildAdminSinglePostText(addDays(today, 1));
    todayTextarea.value = buildAdminSinglePostText(today);
    if (status) status.textContent = "";
    if (inlineStatus) inlineStatus.textContent = "";

    copyButtons.forEach((copyButton) => {
      if (copyButton.dataset.copyBound) return;
      copyButton.addEventListener("click", async () => {
        const target = document.querySelector(`[data-admin-post="${copyButton.dataset.adminCopy}"]`);
        if (!target) return;
        const activeStatus = copyButton.dataset.adminCopy === "tomorrow" ? inlineStatus : status;
        if (status) status.textContent = "";
        if (inlineStatus) inlineStatus.textContent = "";
        try {
          await copyText(target.value, target);
          if (activeStatus) activeStatus.textContent = "コピーしました";
        } catch (_error) {
          if (activeStatus) activeStatus.textContent = "コピーできませんでした。本文を選択してコピーしてください。";
        }
      });
      copyButton.dataset.copyBound = "true";
    });
  }

  function homeEventsForGuideDate(date) {
    const isoDate = isoDateFor(date);
    const targetTime = date.getTime();

    const regularEvents = data.events
      .filter((event) => event.source !== "screening" && event.date === isoDate)
      .map((event) => ({
        category: "出没イベント",
        categoryClass: "is-appearance",
        venue: event.place || compactArea(event.area) || event.title,
        eventName: event.title,
        area: compactArea(event.area),
        time: event.time,
        memo: event.memo
      }));

    const screeningEvents = data.screeningEvents
      .filter((event) => event.date === isoDate)
      .map((event) => ({
        category: "イベント上映",
        categoryClass: "is-screening",
        venue: event.place || compactArea(event.area) || event.displayTitle,
        eventName: event.displayTitle,
        area: compactArea(event.area),
        time: event.time,
        memo: event.memo
      }));

    const movieEvents = data.movieSchedules
      .filter((event) => {
        const startTime = event.startDate?.getTime();
        const endTime = event.endDate?.getTime();
        return Number.isFinite(startTime) && startTime <= targetTime && (!Number.isFinite(endTime) || endTime >= targetTime);
      })
      .map((event) => {
        const startTime = event.startDate?.getTime();
        const endTime = event.endDate?.getTime();
        const isStart = startTime === targetTime;
        const isEnd = Number.isFinite(endTime) && endTime === targetTime;
        return {
          category: isStart ? "上映開始" : isEnd ? "上映最終日" : "上映中",
          categoryClass: isStart ? "is-movie-start" : isEnd ? "is-movie-end" : "is-movie-showing",
          venue: event.theater,
          eventName: "",
          area: compactArea(event.area),
          time: "",
          memo: event.memo
        };
      });

    return [...regularEvents, ...screeningEvents, ...movieEvents]
      .sort((a, b) => eventTimeSortValue(a.time) - eventTimeSortValue(b.time) || a.venue.localeCompare(b.venue, "ja"));
  }

  function renderHomeThreeDayGuide() {
    const guide = document.querySelector("[data-home-three-day-guide]");
    const tabs = document.querySelector("[data-home-guide-tabs]");
    const panel = document.querySelector("[data-home-three-day-panel]");
    if (!guide || !tabs || !panel) return;

    const labels = ["本日", "明日", "翌々日"];
    const dates = labels.map((label, index) => {
      const date = addDays(todayLocal(), index);
      return {
        label,
        date,
        displayDate: `${date.getMonth() + 1}/${date.getDate()}（${dayLabels[date.getDay()]}）`
      };
    });

    const renderDay = (selectedIndex) => {
      const selected = dates[selectedIndex];
      const events = homeEventsForGuideDate(selected.date);

      tabs.querySelectorAll("[data-home-guide-day]").forEach((button, index) => {
        const isSelected = index === selectedIndex;
        button.classList.toggle("is-active", isSelected);
        button.setAttribute("aria-selected", String(isSelected));
        button.tabIndex = isSelected ? 0 : -1;
      });

      panel.setAttribute("aria-labelledby", `home-guide-tab-${selectedIndex}`);
      panel.innerHTML = events.length ? `
        <div class="home-guide-list">
          ${events.map((event) => `
            <article class="home-guide-item ${event.categoryClass}">
              <div class="home-guide-content">
                <div class="home-guide-heading">
                  <span class="home-guide-category">${escapeHtml(event.category)}</span>
                  <strong>🎬 ${escapeHtml(event.venue)}</strong>
                </div>
                ${event.eventName && event.eventName !== event.venue ? `<p class="home-guide-event-name">${escapeHtml(event.eventName)}</p>` : ""}
                <p><span aria-hidden="true">📍</span>${escapeHtml(event.area || "地域未定")}</p>
                <p><span aria-hidden="true">🕒</span>${escapeHtml(event.time || "時間未定")}</p>
                <p><span aria-hidden="true">📝</span>${escapeHtml(event.memo || "—")}</p>
              </div>
            </article>
          `).join("")}
        </div>
      ` : `<p class="home-guide-empty">この日の予定はありません</p>`;
    };

    tabs.innerHTML = dates.map((item, index) => `
      <button class="home-guide-tab ${index === 0 ? "is-active" : ""}" id="home-guide-tab-${index}" type="button"
        role="tab" aria-selected="${index === 0 ? "true" : "false"}" data-home-guide-day="${index}">
        <strong>${escapeHtml(item.label)}</strong>
        <span>${escapeHtml(item.displayDate)}</span>
      </button>
    `).join("");

    if (!guide.dataset.homeGuideBound) {
      tabs.addEventListener("click", (event) => {
        const button = event.target.closest("[data-home-guide-day]");
        if (!button) return;
        renderDay(Number(button.dataset.homeGuideDay));
      });
      guide.dataset.homeGuideBound = "true";
    }

    renderDay(0);
  }

  function renderProjects() {
    const target = document.querySelector("[data-project-map]");
    if (!target) return;

    if (data.projectError) {
      target.innerHTML = `<p class="status-message status-error">データを読み込めませんでした。時間をおいて再度お試しください。</p>`;
      return;
    }

    if (!data.projects.length) {
      target.innerHTML = `<p class="status-message">現在表示できるProjectはありません。</p>`;
      return;
    }

    target.innerHTML = data.projects
      .map((project, index) => `
        <article class="project-spot ${project.tone || "cream"} ${project.isFeatured ? "is-featured" : ""}" style="--spot-index: ${index};">
          <span class="project-icon" aria-hidden="true">${project.icon}</span>
          <div>
            <h2>${escapeHtml(project.title)}</h2>
            <p>${escapeHtml(project.description)}</p>
          </div>
          ${projectAction(project)}
        </article>
      `)
      .join("");

    if (!target.dataset.projectBound) {
      target.addEventListener("click", (event) => {
        if (!window.matchMedia("(max-width: 620px)").matches) return;
        const trigger = event.target.closest(".project-detail-trigger");
        if (!trigger) return;

        const actions = trigger.closest(".project-actions");
        const shouldOpen = !actions.classList.contains("is-open");
        target.querySelectorAll(".project-actions.is-open").forEach((item) => {
          item.classList.remove("is-open");
          item.querySelector(".project-detail-trigger")?.setAttribute("aria-expanded", "false");
        });
        actions.classList.toggle("is-open", shouldOpen);
        trigger.setAttribute("aria-expanded", String(shouldOpen));
      });
      target.dataset.projectBound = "true";
    }
  }

  function renderMovieSchedule() {
    const target = document.querySelector("[data-movie-schedule]");
    if (!target) return;

    if (data.movieScheduleError) {
      target.innerHTML = `<p class="status-message status-error">データを読み込めませんでした。時間をおいて再度お試しください。</p>`;
      return;
    }

    if (!data.movieSchedules.length) {
      target.innerHTML = `<p class="status-message">現在表示できる上映スケジュールはありません。</p>`;
      return;
    }

    const schedules = data.movieSchedules;
    const today = todayLocal();
    const timelineSchedules = schedules.filter((item) => !item.endDate || item.endDate >= today);
    const minDate = today;
    const latestStart = timelineSchedules.length
      ? new Date(Math.max(...timelineSchedules.map((item) => item.startDate.getTime())))
      : today;
    const finiteEnds = timelineSchedules.filter((item) => item.endDate).map((item) => item.endDate.getTime());
    const maxDate = new Date(Math.max(
      addDays(latestStart, 30).getTime(),
      finiteEnds.length ? Math.max(...finiteEnds) : 0
    ));
    const totalDays = Math.max(1, daysBetween(minDate, maxDate) + 1);
    const dayWidth = 28;
    const timelineWidth = Math.max(760, totalDays * dayWidth);
    const ticks = [];

    for (let date = new Date(minDate), index = 0; date <= maxDate; date = addDays(date, 7), index += 1) {
      const offset = daysBetween(minDate, date);
      ticks.push(`
        <span class="movie-gantt-tick" style="left:${(offset / totalDays) * 100}%">
          ${escapeHtml(`${date.getMonth() + 1}/${date.getDate()}`)}
        </span>
      `);
    }

    const ganttRows = timelineSchedules.map((item, index) => {
      const startOffset = Math.max(0, daysBetween(minDate, item.startDate));
      const displayEnd = item.endDate || maxDate;
      const visibleStart = item.startDate < minDate ? minDate : item.startDate;
      const duration = Math.max(1, daysBetween(visibleStart, displayEnd) + 1);
      const left = (startOffset / totalDays) * 100;
      const width = Math.max(2.5, (duration / totalDays) * 100);
      const period = `${formatDateValue(item.startDate)}〜${item.endDate ? formatDateValue(item.endDate) : "終了日未定"}`;
      const displayPeriod = formatMoviePeriod(item);
      const barLabel = formatMovieBarLabel(item, today);
      const isShowing = isMovieShowingNow(item, today);

      return `
        <div class="movie-gantt-label">
          <strong>${escapeHtml(item.theater)}</strong>
          ${item.area ? `<span>${escapeHtml(item.area)}</span>` : ""}
          <span class="movie-gantt-period">上映期間 ${escapeHtml(displayPeriod)}</span>
        </div>
        <div class="movie-gantt-lane">
          <a class="movie-gantt-bar tape-${(index % 5) + 1} ${isShowing ? "is-showing" : ""} ${item.endDate ? "" : "is-open-ended"}"
             style="left:${left}%;width:${width}%"
             href="${safeHref(item.url)}"${externalLinkAttrs(item.url)}
             title="${escapeHtml(`${item.theater} ${period}`)}">
            <span>${escapeHtml(barLabel)}</span>
          </a>
        </div>
      `;
    }).join("");

    const cards = schedules.map((item) => `
      <article class="movie-schedule-card">
        <span class="movie-status-label ${isMovieShowingNow(item, today) ? "is-showing" : "is-upcoming"}">
          ${isMovieShowingNow(item, today) ? "▶️上映中" : "📅上映予定"}
        </span>
        <div class="movie-schedule-card-heading">
          <span aria-hidden="true">🎬</span>
          <h2>${escapeHtml(item.theater)}</h2>
        </div>
        ${item.area ? `<p class="movie-schedule-area">${escapeHtml(item.area)}</p>` : ""}
        <dl>
          <div><dt>上映期間</dt><dd>${escapeHtml(formatMoviePeriod(item))}</dd></div>
          ${item.memo ? `<div><dt>メモ</dt><dd>${escapeHtml(item.memo)}</dd></div>` : ""}
        </dl>
        ${item.url ? `<a class="movie-official-link" href="${safeHref(item.url)}"${externalLinkAttrs(item.url)}>公式サイトを見る</a>` : ""}
      </article>
    `).join("");

    target.innerHTML = `
      <div class="movie-gantt-wrap">
        <div class="movie-gantt" style="--movie-timeline-width:${timelineWidth}px">
          <div class="movie-gantt-corner">映画館</div>
          <div class="movie-gantt-axis">${ticks.join("")}</div>
          ${ganttRows}
        </div>
      </div>
      <div class="movie-schedule-cards">${cards}</div>
    `;
  }

  function renderScreeningSchedule() {
    const target = document.querySelector("[data-screening-schedule]");
    if (!target) return;

    if (data.screeningScheduleError) {
      target.innerHTML = `<p class="status-message status-error">データを読み込めませんでした。時間をおいて再度お試しください。</p>`;
      return;
    }

    if (!data.screeningEvents.length) {
      target.innerHTML = `<p class="status-message">現在表示できるイベント上映はありません。</p>`;
      return;
    }

    const today = todayLocal();
    const selectedDate = new URLSearchParams(window.location.search).get("date") || "";
    const sorted = data.screeningEvents.slice().sort(byUpcomingStatus);

    target.innerHTML = sorted.map((event) => {
      const isPast = event.dateObject < today;
      const isToday = event.dateObject.getTime() === today.getTime();
      const isSelected = selectedDate && event.date === selectedDate;
      return `
        <article class="screening-card ${isPast ? "is-past" : ""} ${isToday ? "is-today" : ""} ${isSelected ? "is-selected" : ""}">
          <div class="screening-card-date">
            <span aria-hidden="true">🎞️</span>
            <time datetime="${escapeHtml(event.date)}">${escapeHtml(formatScreeningDate(event.dateObject))}</time>
            ${isPast ? `<em>終了済み</em>` : isToday ? `<em>本日</em>` : ""}
          </div>
          <h2>${escapeHtml(event.displayTitle)}</h2>
          <dl>
            ${event.time ? `<div><dt>時間</dt><dd>${escapeHtml(event.time)}</dd></div>` : ""}
            ${event.area ? `<div class="screening-area-row"><dt>都道府県</dt><dd>${escapeHtml(event.area)}</dd></div>` : ""}
            ${event.place ? `<div><dt>場所</dt><dd>${escapeHtml(event.place)}</dd></div>` : ""}
            ${event.memo ? `<div><dt>メモ</dt><dd>${escapeHtml(event.memo)}</dd></div>` : ""}
          </dl>
          ${event.url ? `<a class="screening-detail-link" href="${safeHref(event.url)}"${externalLinkAttrs(event.url)}>詳細を見る</a>` : ""}
        </article>
      `;
    }).join("");
  }

  function setupSubpageNavigation() {
    const header = document.querySelector(".site-header.compact");
    if (!header || header.querySelector(".subpage-utility-nav")) return;

    header.querySelector(".back-link")?.remove();

    const utilityNav = document.createElement("nav");
    utilityNav.className = "subpage-utility-nav";
    utilityNav.setAttribute("aria-label", "ページ移動");
    utilityNav.innerHTML = `
      <a class="utility-note-link" href="./index.html">🧭 トップページ</a>
      <button class="utility-note-link" type="button" data-history-back>← 戻る</button>
    `;
    header.prepend(utilityNav);

    utilityNav.querySelector("[data-history-back]")?.addEventListener("click", () => {
      window.history.back();
    });
  }

  function setupMenu() {
    const button = document.querySelector(".menu-toggle");
    const nav = document.querySelector(".site-nav");
    if (!button || !nav) return;

    button.addEventListener("click", () => {
      const expanded = button.getAttribute("aria-expanded") === "true";
      button.setAttribute("aria-expanded", String(!expanded));
      nav.classList.toggle("is-open", !expanded);
    });
  }

  function renderAll() {
    renderPickups();
    renderHomeCalendar();
    renderTownMap();
    renderCalendarList();
    renderScheduleCards();
    renderHomeThreeDayGuide();
    renderProjects();
    renderMovieSchedule();
    renderScreeningSchedule();
    renderCoffeeList();
    renderAdminPost();
  }

  setupSubpageNavigation();
  setupMenu();
  setupCalendarPreview();
  renderTownMap();
  renderProjects();
  renderCoffeeList();
  showLoading();

  try {
    data = await window.loadChimneyData();
    renderAll();
  } catch (error) {
    showError(error);
    renderTownMap();
    renderProjects();
    renderCoffeeList();
  }
}());
