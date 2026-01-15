(function () {
    // Logged-in gate: requires email
    function getEmail() {
        const keys = ["pyr_email", "email", "userEmail", "user_email"];
        for (const k of keys) {
            const v = localStorage.getItem(k) || sessionStorage.getItem(k);
            if (v && String(v).includes("@")) return String(v).toLowerCase();
        }
        return "";
    }

    const email = getEmail();
    const isLoggedIn = !!email;

    const gate = document.getElementById("communityGate");
    const app = document.getElementById("communityApp");
    const badge = document.getElementById("memberBadge");
    const username = localStorage.getItem("pyr_username");
    const displayName = username ? `@${username}` : email;


    if (!gate || !app) return;

    if (!isLoggedIn) {
        gate.style.display = "block";
        app.style.display = "none";
        return;
    }

    gate.style.display = "none";
    app.style.display = "block";
    // ===== Create Post toggle =====
    const createCard = document.getElementById("createPostCard");
    const openCreate = document.getElementById("toggleCreatePostBtn");
    const closeCreate = document.getElementById("closeCreatePostBtn");

    function showCreate(open) {
        if (!createCard) return;
        createCard.style.display = open ? "block" : "none";
        if (open) setTimeout(() => document.getElementById("pTitle")?.focus(), 0);
    }

    if (openCreate) {
        openCreate.addEventListener("click", () => showCreate(true));
    }
    if (closeCreate) {
        closeCreate.addEventListener("click", () => showCreate(false));
    }

    if (badge) badge.textContent = `Logged in: ${email}`;

    // Storage
    const STORAGE_KEY = "pyr_posts_v1";

    function loadPosts() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            const arr = raw ? JSON.parse(raw) : [];
            return Array.isArray(arr) ? arr : [];
        } catch {
            return [];
        }
    }

    function savePosts(posts) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
    }

    function nowISO() {
        return new Date().toISOString();
    }

    function uid() {
        return (crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now());
    }

    function escapeHtml(str) {
        return String(str)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }
    function voteScore(post) {
        if (!post.votes) return 0;
        return Object.values(post.votes).reduce((sum, v) => {
            if (v === "up") return sum + 1;
            if (v === "down") return sum - 1;
            return sum;
        }, 0);
    }

    function voteCounts(post) {
        const counts = { up: 0, down: 0 };
        if (!post.votes) return counts;

        Object.values(post.votes).forEach(v => {
            if (v === "up") counts.up++;
            if (v === "down") counts.down++;
        });

        return counts;
    }

    // Elements
    const titleEl = document.getElementById("pTitle");
    const tickerEl = document.getElementById("pTicker");
    const thumbEl = document.getElementById("pThumb");
    const bodyEl = document.getElementById("pBody");
    const createBtn = document.getElementById("createPostBtn");
    const clearBtn = document.getElementById("clearPostBtn");

    const searchEl = document.getElementById("postSearch");
    const sortEl = document.getElementById("sortPosts");
    const listEl = document.getElementById("postList");
    const detailEl = document.getElementById("postDetail");

    let posts = loadPosts();
    let selectedId = posts[0]?.id || null;

    // Thumbnail -> DataURL
    function fileToDataURL(file) {
        return new Promise((resolve, reject) => {
            const r = new FileReader();
            r.onload = () => resolve(String(r.result || ""));
            r.onerror = reject;
            r.readAsDataURL(file);
        });
    }

    function score(post) {
        return (post.reacts?.up || 0) - (post.reacts?.down || 0);
    }

    function sortPostsView(arr, mode) {
        const copy = [...arr];
        if (mode === "top") {
            copy.sort((a, b) => score(b) - score(a));
        } else {
            // newest
            copy.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
        }
        return copy;
    }

    function filteredPosts() {
        const q = (searchEl.value || "").trim().toLowerCase();
        const mode = sortEl.value || "new";

        const out = posts.filter(p => {
            if (!q) return true;
            const hay = `${p.title} ${p.ticker} ${p.body}`.toLowerCase();
            return hay.includes(q);
        });

        return sortPostsView(out, mode);
    }

    function renderList() {
        const view = filteredPosts();
        listEl.innerHTML = "";

        if (view.length === 0) {
            listEl.innerHTML = `<div class="muted">No posts yet. Be the first to share a setup.</div>`;
            return;
        }

        view.forEach(p => {
            const row = document.createElement("div");
            row.className = "post-row";
            row.style.outline = (p.id === selectedId) ? "2px solid rgba(255,255,255,0.10)" : "none";

            const thumb = document.createElement("div");
            thumb.className = "post-thumb";
            if (p.thumb) {
                thumb.innerHTML = `<img src="${p.thumb}" alt="thumb">`;
            } else {
                thumb.textContent = "No image";
            }

            const mid = document.createElement("div");
            const tkr = p.ticker ? `<span class="tag slate" style="margin:0;">${escapeHtml(p.ticker)}</span>` : "";
            mid.innerHTML = `
        <div>
          <strong>${escapeHtml(p.title)}</strong>
        </div>
        <div class="post-meta">
          ${tkr}
          <span>Score: ${voteScore(p)}</span>
          <span>Comments: ${p.comments?.length || 0}</span>
          <span>${escapeHtml((p.createdAt || "").slice(0, 10))}</span>
        </div>
      `;

            const actions = document.createElement("div");
            actions.className = "post-actions";

            const openBtn = document.createElement("button");
            openBtn.className = "btn small ghost";
            openBtn.textContent = "Open";
            openBtn.onclick = () => {
                selectedId = p.id;
                renderList();
                renderDetail();
            };

            actions.appendChild(openBtn);

            row.appendChild(thumb);
            row.appendChild(mid);
            row.appendChild(actions);

            // click row opens too
            row.onclick = (e) => {
                const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : "";
                if (tag === "button") return;
                selectedId = p.id;
                renderList();
                renderDetail();
            };

            listEl.appendChild(row);
        });
    }

    function renderDetail() {
        const p = posts.find(x => x.id === selectedId);
        if (!p) {
            detailEl.innerHTML = `<div class="muted">Select a post from the left.</div>`;
            return;
            const userVote = p.votes?.[email];

            if (userVote === "up") {
                document.getElementById("upBtn").style.outline = "2px solid rgba(0,255,180,0.6)";
            }

            if (userVote === "down") {
                document.getElementById("downBtn").style.outline = "2px solid rgba(255,60,60,0.6)";
            }

        }

        const thumbHtml = p.thumb
            ? `<div class="post-thumb" style="width:100%; height:220px; border-radius:16px; margin-bottom:12px;">
           <img src="${p.thumb}" alt="thumb">
         </div>`
            : "";

        const isAuthor = p.authorEmail === email;


        detailEl.innerHTML = `
      ${thumbHtml}

      <div style="display:flex; justify-content:space-between; gap:12px; flex-wrap:wrap;">
        <div>
          <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
            <strong style="font-size:18px;">${escapeHtml(p.title)}</strong>
            ${p.ticker ? `<span class="tag slate" style="margin:0;">${escapeHtml(p.ticker)}</span>` : ""}
          </div>
          <div class="muted" style="margin-top:6px; font-size:12px;">
            by ${escapeHtml(p.author)} • ${escapeHtml(p.createdAt.slice(0, 19).replace("T"," "))}
          </div>
        </div>

        ${isAuthor ? `<button class="btn small ghost" id="deletePostBtn">Delete</button>` : ``}
      </div>

      <div style="margin-top:12px; line-height:1.55; color: rgba(255,255,255,0.88);">
        ${escapeHtml(p.body).replaceAll("\n","<br>")}
      </div>

      <div class="reacts">
        <button class="react-btn" id="upBtn">👍 Upvote (${voteCounts(p).up})</button>
        <button class="react-btn" id="downBtn">👎 Downvote (${voteCounts(p).down})</button>
        <div class="muted" style="margin-left:auto;">Score: ${voteScore(p)}</div>
      </div>

      <div style="border-top:1px solid rgba(255,255,255,0.08); padding-top:12px;">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap;">
          <strong>Comments</strong>
          <span class="muted" style="font-size:12px;">Be specific. Critique the plan, not the person.</span>
        </div>

        <div style="margin-top:10px; display:grid; gap:10px;" id="commentList"></div>

        <div style="margin-top:12px;">
          <textarea id="commentInput" rows="3" placeholder="Ask a question or give feedback..."></textarea>
          <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:10px;">
            <button class="btn" id="addCommentBtn">Comment</button>
          </div>
        </div>
      </div>
    `;

        // wire reactions
        document.getElementById("upBtn").onclick = () => react(p.id, "up");
        document.getElementById("downBtn").onclick = () => react(p.id, "down");

        // delete
        const del = document.getElementById("deletePostBtn");
        if (del) del.onclick = () => deletePost(p.id);

        // comments
        renderComments(p.id);
        document.getElementById("addCommentBtn").onclick = () => addComment(p.id);
    }

    function react(id, type) {
        const i = posts.findIndex(p => p.id === id);
        if (i < 0) return;

        const post = posts[i];
        post.votes = post.votes || {};

        const current = post.votes[email];

        if (current === type) {
            // clicking same vote again removes it (optional behavior)
            delete post.votes[email];
        } else {
            // switch or set vote
            post.votes[email] = type;
        }

        savePosts(posts);
        renderList();
        renderDetail();
    }


    function renderComments(id) {
        const p = posts.find(x => x.id === id);
        const list = document.getElementById("commentList");
        if (!p || !list) return;

        const comments = p.comments || [];
        list.innerHTML = "";

        if (comments.length === 0) {
            list.innerHTML = `<div class="muted">No comments yet.</div>`;
            return;
        }

        comments.forEach(c => {
            const div = document.createElement("div");
            div.className = "comment";
            div.innerHTML = `
        <div style="display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap;">
          <strong style="font-size:13px;">${escapeHtml(c.author)}</strong>
          <span class="muted" style="font-size:12px;">${escapeHtml(c.createdAt.slice(0, 19).replace("T"," "))}</span>
        </div>
        <div style="margin-top:6px; color: rgba(255,255,255,0.88);">
          ${escapeHtml(c.text).replaceAll("\n","<br>")}
        </div>
      `;
            list.appendChild(div);
        });
    }

    function addComment(id) {
        const p = posts.find(x => x.id === id);
        const input = document.getElementById("commentInput");
        if (!p || !input) return;

        const text = (input.value || "").trim();
        if (!text) return;

        p.comments = p.comments || [];
        p.comments.push({
            id: uid(),
            author: displayName,
            authorEmail: email,
            text,
            createdAt: nowISO()
        });

        input.value = "";
        savePosts(posts);
        renderList();
        renderDetail();
    }

    function deletePost(id) {
        const p = posts.find(x => x.id === id);
        if (!p) return;
        if (p.author !== email) return;

        posts = posts.filter(x => x.id !== id);
        savePosts(posts);

        selectedId = posts[0]?.id || null;
        renderList();
        renderDetail();
    }

    async function createPost() {
        const title = (titleEl.value || "").trim();
        const ticker = (tickerEl.value || "").trim().toUpperCase();
        const body = (bodyEl.value || "").trim();

        if (!title || !body) return;

        let thumb = "";
        const file = thumbEl.files && thumbEl.files[0] ? thumbEl.files[0] : null;
        if (file) {
            // keep it MVP safe: limit big images
            if (file.size > 800000) {
                alert("Image too large. Keep it under 800KB for now.");
                return;
            }
            thumb = await fileToDataURL(file);
        }

        const post = {
            id: uid(),
            title,
            ticker,
            body,
            thumb,
            author: displayName,
            authorEmail: email,
            createdAt: nowISO(),
            reacts: {},
            comments: []
        };

        posts.unshift(post);
        savePosts(posts);

        titleEl.value = "";
        tickerEl.value = "";
        bodyEl.value = "";
        thumbEl.value = "";

        selectedId = post.id;

        renderList();
        renderDetail();
    }

    createBtn.addEventListener("click", () => { createPost(); });
    clearBtn.addEventListener("click", () => {
        titleEl.value = "";
        tickerEl.value = "";
        bodyEl.value = "";
        thumbEl.value = "";
        titleEl.focus();
    });

    searchEl.addEventListener("input", () => { renderList(); });
    sortEl.addEventListener("change", () => { renderList(); });

    // initial
    renderList();
    renderDetail();
})();
