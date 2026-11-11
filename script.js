// ==========================================
// EduNews — Main Script
// Theme · Search · Interests · Submit Post
// Contact · Comments · Modal · Newsletter · Nav
// ==========================================

const THEME_STORAGE_KEY   = "edunews-theme";
const POSTS_STORAGE_KEY   = "edunews-user-posts";
const COMMENTS_STORAGE_KEY = "edunews-comments";

// ── DOM refs ──────────────────────────────
const searchForm      = document.querySelector(".search");
const searchInput     = searchForm?.querySelector("input");
const menuToggle      = document.querySelector(".menu-toggle");
const navigation      = document.querySelector("#primary-nav");
const newsletterForm  = document.querySelector(".newsletter form");
const modal           = document.querySelector("#article-reader");
const modalTitle      = document.querySelector("#modal-title");
const modalContent    = document.querySelector("#modal-content");
const modalReadPage   = document.querySelector("#modal-read-page");
const commentCountEl  = document.querySelector("#comment-count");
const commentList     = document.querySelector("#comment-list");
const commentForm     = document.querySelector("#comment-form");
const commentAlert    = document.querySelector("#comment-alert");

let interestButtons   = [...document.querySelectorAll(".interest-btn")];
let searchableCards   = [...document.querySelectorAll(".news-card")];
let educationArticles = [...document.querySelectorAll(".article")];
let allContent        = [...searchableCards, ...educationArticles];

// track which article is open in the modal (for comments)
let currentModalKey = "";


// ==========================================
// 1. THEME SWITCHER
// ==========================================

function getSavedOrPreferredTheme() {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === "dark" || saved === "light") return saved;
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme) {
    const isDark = theme === "dark";
    document.documentElement.setAttribute("data-theme", isDark ? "dark" : "");
    document.body.classList.toggle("dark-theme", isDark);

    document.querySelectorAll("#theme-toggle, #hero-theme-toggle").forEach((btn) => {
        btn?.setAttribute("aria-checked", String(isDark));

        const label = btn?.querySelector(".theme-toggle-label, .pill-text");
        if (label) {
            const isMoon = btn.classList.contains("hero-theme-pill");
            label.textContent = isDark
                ? (isMoon ? "Dark Mode (បើក)" : "ងងឹត")
                : (isMoon ? "Light Mode (បើក)" : "ពន្លឺ");
        }
    });
}

function toggleTheme() {
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    const next   = isDark ? "light" : "dark";
    try { localStorage.setItem(THEME_STORAGE_KEY, next); } catch (_) {}
    applyTheme(next);
}

applyTheme(getSavedOrPreferredTheme());
document.querySelectorAll("#theme-toggle, #hero-theme-toggle").forEach((btn) =>
    btn?.addEventListener("click", toggleTheme)
);
window.matchMedia?.("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
    if (!localStorage.getItem(THEME_STORAGE_KEY)) applyTheme(e.matches ? "dark" : "light");
});


// ==========================================
// 2. SEARCH & INTEREST FILTERING
// ==========================================

function refreshContentArrays() {
    searchableCards   = [...document.querySelectorAll(".news-card")];
    educationArticles = [...document.querySelectorAll(".article")];
    allContent        = [...searchableCards, ...educationArticles];
}

function updateInterestButtons(query) {
    const q = query.trim().toLocaleLowerCase();
    interestButtons.forEach((btn) => {
        const topic = (btn.dataset.topic || "").trim().toLocaleLowerCase();
        const active = (!q && !topic) || (q && topic && (q.includes(topic) || topic.includes(q)));
        btn.classList.toggle("active", active);
    });
}

function showSearchResults(query) {
    refreshContentArrays();
    const q = query.trim().toLocaleLowerCase();
    let count = 0;

    allContent.forEach((item) => {
        const show = !q || item.textContent.toLocaleLowerCase().includes(q);
        item.hidden = !show;
        if (show) count++;
    });

    document.querySelector("#news")?.classList.toggle("has-search-results", Boolean(q));
    document.querySelector("#education")?.classList.toggle("has-search-results", Boolean(q));
    document.querySelector("#search-empty")?.remove();

    if (q && count === 0) {
        const msg = document.createElement("p");
        msg.id = "search-empty";
        msg.className = "search-empty";
        msg.textContent = `មិនមានអត្ថបទសម្រាប់ "${query.trim()}" ទេ។`;
        document.querySelector("#news .container")?.append(msg);
    }

    updateInterestButtons(query);
}

searchForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    showSearchResults(searchInput.value);
    document.querySelector("#news")?.scrollIntoView({ behavior: "smooth" });
});
searchInput?.addEventListener("input", () => showSearchResults(searchInput.value));

document.querySelector("#show-all-news")?.addEventListener("click", () => {
    if (searchInput) searchInput.value = "";
    showSearchResults("");
});

function bindInterestButtons() {
    interestButtons = [...document.querySelectorAll(".interest-btn")];
    interestButtons.forEach((btn) => {
        btn.addEventListener("click", () => {
            const topic = btn.dataset.topic || "";
            if (searchInput) searchInput.value = topic;
            showSearchResults(topic);
            if (topic) document.querySelector("#news")?.scrollIntoView({ behavior: "smooth" });
        });
    });
}
bindInterestButtons();

function bindTopicFilters() {
    document.querySelectorAll(".topic-filter").forEach((el) => {
        el.addEventListener("click", () => {
            if (searchInput) searchInput.value = el.textContent.trim();
            showSearchResults(el.textContent);
            document.querySelector("#news")?.scrollIntoView({ behavior: "smooth" });
        });
        el.addEventListener("keydown", (ev) => {
            if (ev.key === "Enter" || ev.key === " ") {
                if (searchInput) searchInput.value = el.textContent.trim();
                showSearchResults(el.textContent);
                document.querySelector("#news")?.scrollIntoView({ behavior: "smooth" });
            }
        });
    });
}
bindTopicFilters();


// ==========================================
// 3. MODAL + COMMENTS
// ==========================================

function showAlert(el, msg, type = "success") {
    if (!el) return;
    el.className = `submit-alert ${type}`;
    el.textContent = msg;
    el.hidden = false;
    setTimeout(() => { el.hidden = true; }, 5000);
}

// ── Load & save comments ──
function loadComments() {
    try { return JSON.parse(localStorage.getItem(COMMENTS_STORAGE_KEY) || "{}"); } catch (_) { return {}; }
}
function saveComments(data) {
    try { localStorage.setItem(COMMENTS_STORAGE_KEY, JSON.stringify(data)); } catch (_) {}
}

function getInitials(name) {
    return name.trim().split(/\s+/).map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

function formatTime(ts) {
    const d = new Date(ts);
    return d.toLocaleDateString("km-KH", { year: "numeric", month: "short", day: "numeric" }) +
           " " + d.toLocaleTimeString("km-KH", { hour: "2-digit", minute: "2-digit" });
}

function renderComments(key) {
    if (!commentList) return;
    const all = loadComments();
    const list = all[key] || [];

    if (list.length === 0) {
        commentList.innerHTML = `<p class="no-comments">មិនទាន់មានមតិយោបល់នៅឡើយទេ។ សូមក្លាយជាអ្នកដំបូងដែលបញ្ចេញមតិ!</p>`;
    } else {
        commentList.innerHTML = list.map((c) => `
            <div class="comment-item">
                <div class="comment-header">
                    <div class="comment-avatar">${getInitials(c.author)}</div>
                    <div class="comment-meta">
                        <div class="comment-author">${escHtml(c.author)}</div>
                        <div class="comment-time">${formatTime(c.ts)}</div>
                    </div>
                </div>
                <div class="comment-body">${escHtml(c.text)}</div>
            </div>
        `).join("");
    }

    if (commentCountEl) commentCountEl.textContent = list.length;
}

function escHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
              .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// ── Open modal ──
function openModal(title, content, page, key) {
    if (!modal) return;
    currentModalKey = key || title.trim().slice(0, 40);
    if (modalTitle)   modalTitle.textContent   = title;
    if (modalContent) modalContent.textContent = content;
    if (modalReadPage) modalReadPage.href      = page || "article.html";
    modal.hidden = false;
    document.body.classList.add("modal-open");
    modal.querySelector(".modal-close")?.focus();
    renderComments(currentModalKey);
}

function closeModal() {
    if (!modal) return;
    modal.hidden = true;
    document.body.classList.remove("modal-open");
    currentModalKey = "";
}

function bindReadArticleLinks() {
    document.querySelectorAll(".read-article").forEach((link) => {
        link.addEventListener("click", (e) => {
            e.preventDefault();
            openModal(
                link.dataset.title   || "",
                link.dataset.content || "",
                link.dataset.page    || "article.html",
                link.dataset.key     || link.dataset.title
            );
        });
    });
}
bindReadArticleLinks();

modal?.addEventListener("click", (e) => {
    if (e.target.closest("[data-close-modal]")) closeModal();
});
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal && !modal.hidden) closeModal();
});

// ── Comment form submit ──
commentForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    const authorEl = document.querySelector("#comment-author");
    const textEl   = document.querySelector("#comment-text");
    const author   = authorEl?.value.trim() || "";
    const text     = textEl?.value.trim()   || "";

    if (!author) { showAlert(commentAlert, "⚠️ សូមបញ្ចូលឈ្មោះរបស់អ្នក។", "error"); authorEl?.focus(); return; }
    if (!text)   { showAlert(commentAlert, "⚠️ សូមសរសេរមតិយោបល់ជាមុនសិន។", "error"); textEl?.focus(); return; }

    const all = loadComments();
    if (!all[currentModalKey]) all[currentModalKey] = [];
    all[currentModalKey].push({ author, text, ts: Date.now() });
    saveComments(all);

    renderComments(currentModalKey);
    if (authorEl) authorEl.value = "";
    if (textEl)   textEl.value   = "";
    showAlert(commentAlert, "✅ បានបញ្ចូលមតិយោបល់ដោយជោគជ័យ!", "success");
});


// ==========================================
// 4. SUBMIT POST FORM
// ==========================================

const createPostForm = document.querySelector("#create-post-form");
const submitAlert    = document.querySelector("#submit-alert");
const newsGrid       = document.querySelector(".news-grid");

// ── Preset image buttons ──
document.querySelectorAll(".preset-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
        const imgInput = document.querySelector("#post-image");
        if (imgInput) imgInput.value = btn.dataset.img || "";
        document.querySelectorAll(".preset-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
    });
    // set first preset image as default
    if (btn.classList.contains("active")) {
        const imgInput = document.querySelector("#post-image");
        if (imgInput && !imgInput.value) imgInput.value = btn.dataset.img || "";
    }
});

// ── Character counter on textarea ──
const postContentArea = document.querySelector("#post-content");
if (postContentArea) {
    const counter = document.createElement("div");
    counter.className = "char-counter";
    postContentArea.insertAdjacentElement("afterend", counter);
    postContentArea.addEventListener("input", () => {
        const len = postContentArea.value.length;
        counter.textContent = `${len} / 1000 តួអក្សរ`;
        counter.classList.toggle("warn", len > 800);
    });
}

// ── Tag colour by category ──
function tagClassForCategory(cat) {
    const map = {
        "បច្ចេកវិទ្យា": "technology",
        "ការអប់រំ":       "school",
        "ការសរសេរកូដ":   "coding",
        "AI និងបច្ចេកវិទ្យា": "ai",
        "គន្លឹះសិក្សា":  "study",
        "អាជីព":          "security",
    };
    return map[cat] || "technology";
}

// ── Load & save user posts ──
function loadUserPosts() {
    try { return JSON.parse(localStorage.getItem(POSTS_STORAGE_KEY) || "[]"); } catch (_) { return []; }
}
function saveUserPosts(posts) {
    try { localStorage.setItem(POSTS_STORAGE_KEY, JSON.stringify(posts)); } catch (_) {}
}

// ── Build a news card element ──
function buildCard(post) {
    const imgClass = tagClassForCategory(post.category);
    const article  = document.createElement("article");
    article.className = "news-card user-post";
    article.dataset.postId = post.id;
    article.innerHTML = `
        <div class="user-post-banner">
            ✍️ ព័ត៌មានពីអ្នកអាន · ${escHtml(post.author)}
            <button class="remove-post-btn" type="button" aria-label="លុប">✕ លុប</button>
        </div>
        <div class="news-image ${imgClass}">
            ${post.image
                ? `<img src="${escHtml(post.image)}" alt="${escHtml(post.title)}" onerror="this.style.display='none'">`
                : ""}
        </div>
        <div class="card-content">
            <span class="tag">${escHtml(post.category)}</span>
            <h3 data-searchable>${escHtml(post.title)}</h3>
            <p data-searchable>${escHtml(post.content.slice(0, 120))}${post.content.length > 120 ? "…" : ""}</p>
            <div class="card-footer-action">
                <a href="#article-reader" class="read-article user-article-link">អានបន្ត →</a>
            </div>
            <div class="meta">
                <span>${formatDateKhmer(post.ts)}</span>
                <span>អាន ${escHtml(post.readtime)}</span>
            </div>
        </div>`;

    // bind remove button
    article.querySelector(".remove-post-btn").addEventListener("click", () => {
        if (!confirm("ចង់លុបព័ត៌មាននេះ?")) return;
        article.remove();
        const posts = loadUserPosts().filter((p) => p.id !== post.id);
        saveUserPosts(posts);
        refreshContentArrays();
        showSearchResults(searchInput?.value || "");
    });

    // bind read-article link on the new card
    const readLink = article.querySelector(".user-article-link");
    readLink.addEventListener("click", (e) => {
        e.preventDefault();
        openModal(post.title, post.content, "#", post.id);
    });

    return article;
}

function formatDateKhmer(ts) {
    const d = new Date(ts);
    return d.toLocaleDateString("km-KH", { year: "numeric", month: "long", day: "numeric" });
}

// ── Inject saved posts on page load ──
function injectSavedPosts() {
    if (!newsGrid) return;
    const posts = loadUserPosts();
    posts.forEach((post) => newsGrid.prepend(buildCard(post)));
    refreshContentArrays();
}
injectSavedPosts();

// ── Handle form submit ──
createPostForm?.addEventListener("submit", (e) => {
    e.preventDefault();

    const titleEl    = document.querySelector("#post-title");
    const catEl      = document.querySelector("#post-category");
    const authorEl   = document.querySelector("#post-author");
    const readtimeEl = document.querySelector("#post-readtime");
    const imageEl    = document.querySelector("#post-image");
    const contentEl  = document.querySelector("#post-content");

    // clear previous errors
    [titleEl, catEl, authorEl, contentEl].forEach((el) => el?.classList.remove("input-error"));

    const title    = titleEl?.value.trim()    || "";
    const category = catEl?.value             || "បច្ចេកវិទ្យា";
    const author   = authorEl?.value.trim()   || "";
    const readtime = readtimeEl?.value.trim() || "៥ នាទី";
    const image    = imageEl?.value.trim()    || "";
    const content  = contentEl?.value.trim()  || "";

    let valid = true;
    if (!title)   { titleEl?.classList.add("input-error");   titleEl?.focus();   valid = false; }
    if (!author)  { authorEl?.classList.add("input-error");  authorEl?.focus();  valid = false; }
    if (!content) { contentEl?.classList.add("input-error"); contentEl?.focus(); valid = false; }

    if (!valid) {
        showAlert(submitAlert, "⚠️ សូមបំពេញព័ត៌មានដែលចាំបាច់ (*) ឱ្យបានពេញលេញ។", "error");
        return;
    }

    const post = {
        id: "post-" + Date.now(),
        title, category, author, readtime, image, content,
        ts: Date.now(),
    };

    // save + render
    const posts = loadUserPosts();
    posts.unshift(post);
    saveUserPosts(posts);

    if (newsGrid) newsGrid.prepend(buildCard(post));
    refreshContentArrays();

    // show success
    showAlert(submitAlert, `🎉 ព័ត៌មាន "${title}" ត្រូវបានបោះពុម្ពភ្លាមៗ! ពិនិត្យមើលក្នុងផ្នែក "ព័ត៌មានចុងក្រោយ" ខាងលើ។`, "success");
    createPostForm.reset();

    // reset preset button active state
    document.querySelectorAll(".preset-btn").forEach((btn, i) => btn.classList.toggle("active", i === 0));
    const imgInput = document.querySelector("#post-image");
    if (imgInput) imgInput.value = document.querySelector(".preset-btn")?.dataset.img || "";

    // scroll to news section
    setTimeout(() => document.querySelector("#news")?.scrollIntoView({ behavior: "smooth" }), 800);
});

// ── Reset button clears error states too ──
createPostForm?.addEventListener("reset", () => {
    document.querySelectorAll(".input-error").forEach((el) => el.classList.remove("input-error"));
    if (submitAlert) submitAlert.hidden = true;
    setTimeout(() => {
        document.querySelectorAll(".preset-btn").forEach((b, i) => b.classList.toggle("active", i === 0));
        const imgInput = document.querySelector("#post-image");
        if (imgInput) imgInput.value = document.querySelector(".preset-btn")?.dataset.img || "";
    }, 50);
});


// ==========================================
// 5. CONTACT FORM
// ==========================================

const contactForm  = document.querySelector("#contact-form");
const contactAlert = document.querySelector("#contact-alert");

contactForm?.addEventListener("submit", (e) => {
    e.preventDefault();

    const nameEl    = document.querySelector("#contact-name");
    const emailEl   = document.querySelector("#contact-email");
    const subjectEl = document.querySelector("#contact-subject");
    const msgEl     = document.querySelector("#contact-message");

    [nameEl, emailEl, subjectEl, msgEl].forEach((el) => el?.classList.remove("input-error"));

    const name    = nameEl?.value.trim()    || "";
    const email   = emailEl?.value.trim()   || "";
    const subject = subjectEl?.value.trim() || "";
    const message = msgEl?.value.trim()     || "";

    let valid = true;
    if (!name)    { nameEl?.classList.add("input-error");    nameEl?.focus();    valid = false; }
    if (!email || !emailEl?.checkValidity()) {
        emailEl?.classList.add("input-error"); if (valid) emailEl?.focus(); valid = false;
    }
    if (!subject) { subjectEl?.classList.add("input-error"); if (valid) subjectEl?.focus(); valid = false; }
    if (!message) { msgEl?.classList.add("input-error");     if (valid) msgEl?.focus();     valid = false; }

    if (!valid) {
        showAlert(contactAlert, "⚠️ សូមបំពេញព័ត៌មានចាំបាច់ (*) ឱ្យបានពេញលេញ និងត្រឹមត្រូវ។", "error");
        return;
    }

    // Simulate send success (no backend)
    showAlert(contactAlert,
        `✅ អរគុណ ${name}! សាររបស់អ្នកត្រូវបានទទួលដោយជោគជ័យ។ ក្រុមការងារ EduNews នឹងទំនាក់ទំនងទៅ ${email} ក្នុងរយៈពេល ១-២ ថ្ងៃ។`,
        "success"
    );
    contactForm.reset();
    [nameEl, emailEl, subjectEl, msgEl].forEach((el) => el?.classList.remove("input-error"));
});

contactForm?.addEventListener("reset", () => {
    document.querySelectorAll("#contact-form .input-error").forEach((el) => el.classList.remove("input-error"));
    if (contactAlert) contactAlert.hidden = true;
});


// ==========================================
// 6. NEWSLETTER
// ==========================================

newsletterForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    const emailInput = newsletterForm.querySelector("input");
    const email = emailInput?.value.trim() || "";
    let status = newsletterForm.querySelector(".form-status");

    if (!emailInput?.checkValidity() || !email) {
        emailInput?.focus();
        emailInput?.setCustomValidity("សូមបញ្ចូលអ៊ីមែលដែលត្រឹមត្រូវ");
        emailInput?.reportValidity();
        emailInput?.setCustomValidity("");
        return;
    }

    if (!status) {
        status = document.createElement("p");
        status.className = "form-status";
        newsletterForm.append(status);
    }
    status.textContent = "✅ បានចុះឈ្មោះជោគជ័យ! សូមអរគុណ។";
    emailInput.value = "";
});


// ==========================================
// 7. MOBILE NAVIGATION
// ==========================================

menuToggle?.addEventListener("click", () => {
    const isOpen = navigation.classList.toggle("is-open");
    menuToggle.setAttribute("aria-expanded", String(isOpen));
});

document.querySelectorAll("#primary-nav a").forEach((link) => {
    link.addEventListener("click", () => {
        navigation?.classList.remove("is-open");
        menuToggle?.setAttribute("aria-expanded", "false");
    });
});
