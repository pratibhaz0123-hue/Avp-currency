(() => {
  "use strict";

  const STORAGE_KEY = "avpDigitalCurrency_v1";
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  const uid = (prefix = "id") => prefix + "_" + Math.random().toString(36).slice(2) + Date.now().toString(36);

  const today = () => new Date().toISOString().slice(0, 10);
  const money = n => `${Number(n).toLocaleString()} AVP`;
  const dateTime = iso => new Date(iso).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });

  const defaultData = () => ({
    settings: { currencyName: "AVP", disclaimer: "AVP is an internal digital reward currency and has no real-world monetary value." },
    users: [
      { id: "admin", name: "Aaditya", password: "admin123", role: "admin", balance: 0, totalEarned: 0, totalSpent: 0 },
      { id: "student", name: "Student", password: "student123", role: "student", balance: 250, totalEarned: 250, totalSpent: 0 }
    ],
    rewards: [
      { id: "badge", icon: "🏅", name: "Profile Badge", description: "A special badge for your profile.", price: 30 },
      { id: "gold-theme", icon: "✨", name: "Gold Profile Theme", description: "Unlock a premium gold look.", price: 75 },
      { id: "champion", icon: "🏆", name: "Study Champion Badge", description: "Show that you are a study champion.", price: 100 },
      { id: "avatar", icon: "😎", name: "Premium Avatar", description: "A premium avatar cosmetic.", price: 150 },
      { id: "title", icon: "👑", name: "Special Title", description: "Display a special title.", price: 200 }
    ],
    activities: [
      { id: "daily", icon: "☀️", name: "Daily Login", description: "Check in once every day.", amount: 2, daily: true },
      { id: "assignment", icon: "📝", name: "Complete Assignment", description: "Finish an assignment.", amount: 10 },
      { id: "homework", icon: "⏰", name: "Submit Homework on Time", description: "Submit homework before the deadline.", amount: 5 },
      { id: "study", icon: "📚", name: "Complete Study Task", description: "Complete a focused study task.", amount: 10 },
      { id: "help", icon: "🤝", name: "Help Another Student", description: "Help a fellow student.", amount: 5 },
      { id: "quiz", icon: "🧠", name: "Quiz Achievement", description: "Achieve a quiz milestone.", amount: 20 },
      { id: "streak", icon: "🔥", name: "Study Streak", description: "Maintain your study streak.", amount: 5 }
    ],
    transactions: [
      { id: uid("tx"), userId: "student", description: "Starting AVP balance", amount: 250, type: "earned", balanceAfter: 250, createdAt: new Date().toISOString() }
    ],
    inventory: [],
    dailyClaims: {},
    activityClaims: {}
  });

  let data = loadData();
  let sessionUserId = null;
  let currentPage = "dashboard";

  function loadData() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return normalize(parsed);
      }
    } catch (e) {}
    const fresh = defaultData();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
    return fresh;
  }

  function normalize(d) {
    const base = defaultData();
    return {
      settings: { ...base.settings, ...(d.settings || {}) },
      users: Array.isArray(d.users) ? d.users : base.users,
      rewards: Array.isArray(d.rewards) ? d.rewards : base.rewards,
      activities: Array.isArray(d.activities) ? d.activities : base.activities,
      transactions: Array.isArray(d.transactions) ? d.transactions : base.transactions,
      inventory: Array.isArray(d.inventory) ? d.inventory : base.inventory,
      dailyClaims: d.dailyClaims || {},
      activityClaims: d.activityClaims || {}
    };
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function user() {
    return data.users.find(u => u.id === sessionUserId);
  }

  function students() {
    return data.users.filter(u => u.role === "student");
  }

  function getStudent(id) {
    return data.users.find(u => u.id === id && u.role === "student");
  }

  function escapeHtml(s) {
    return String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;" }[c]));
  }

  function toast(message, type = "success") {
    const el = document.createElement("div");
    el.className = `toast ${type}`;
    el.textContent = message;
    $("#toast-root").appendChild(el);
    setTimeout(() => el.remove(), 2800);
  }

  function transaction(userId, description, amount, type) {
    const u = getStudent(userId) || data.users.find(x => x.id === userId);
    if (!u) return false;
    const next = u.balance + amount;
    if (next < 0) return false;
    u.balance = next;
    if (amount > 0) u.totalEarned += amount;
    if (amount < 0) u.totalSpent += Math.abs(amount);
    data.transactions.unshift({
      id: uid("tx"), userId, description, amount,
      type: amount >= 0 ? "earned" : "spent",
      balanceAfter: u.balance, createdAt: new Date().toISOString()
    });
    save();
    return true;
  }

  function login(name, password) {
    const found = data.users.find(u => u.name.toLowerCase() === name.trim().toLowerCase() && u.password === password);
    if (!found) return toast("Invalid name or password.", "error");
    sessionUserId = found.id;
    currentPage = found.role === "admin" ? "admin" : "dashboard";
    render();
  }

  function logout() {
    sessionUserId = null;
    render();
  }

  function claimActivity(activityId) {
    const u = user();
    const a = data.activities.find(x => x.id === activityId);
    if (!u || !a || u.role !== "student") return;
    const claimKey = `${u.id}:${a.id}`;
    if (a.daily) {
      if (data.dailyClaims[claimKey] === today()) return toast("You already claimed this today.", "error");
      data.dailyClaims[claimKey] = today();
    } else {
      if (data.activityClaims[claimKey]) return toast("This activity has already been claimed.", "error");
      data.activityClaims[claimKey] = true;
    }
    transaction(u.id, a.name, a.amount, "earned");
    toast(`+${a.amount} AVP earned!`);
    render();
  }

  function buyReward(rewardId) {
    const u = user();
    const r = data.rewards.find(x => x.id === rewardId);
    if (!u || !r) return;
    if (u.balance < r.price) return toast("Not enough AVP.", "error");
    openModal(`Buy ${r.name}?`, `This will spend ${r.price} AVP.`, () => {
      if (u.balance < r.price) return toast("Not enough AVP.", "error");
      transaction(u.id, r.name, -r.price, "spent");
      data.inventory.push({ id: uid("inv"), userId: u.id, rewardId: r.id, purchasedAt: new Date().toISOString(), equipped: false });
      save();
      closeModal();
      toast(`${r.name} purchased!`);
      render();
    });
  }

  function equipInventory(invId) {
    const item = data.inventory.find(x => x.id === invId && x.userId === sessionUserId);
    if (!item) return;
    const reward = data.rewards.find(r => r.id === item.rewardId);
    const cosmetic = reward && /badge|theme|avatar|title/i.test(reward.name);
    if (!cosmetic) return toast("This reward cannot be equipped.", "error");
    data.inventory.filter(x => x.userId === sessionUserId).forEach(x => x.equipped = false);
    item.equipped = true;
    save();
    toast(`${reward.name} equipped!`);
    render();
  }

  function openModal(title, text, confirmAction) {
    const root = document.createElement("div");
    root.className = "modal-backdrop";
    root.id = "modal";
    root.innerHTML = `<div class="modal">
      <h3>${escapeHtml(title)}</h3>
      <p class="muted">${escapeHtml(text)}</p>
      <div class="modal-actions">
        <button class="btn" id="modal-cancel">Cancel</button>
        <button class="btn btn-primary" id="modal-confirm">Confirm</button>
      </div>
    </div>`;
    document.body.appendChild(root);
    $("#modal-cancel").onclick = closeModal;
    $("#modal-confirm").onclick = confirmAction;
  }
  function closeModal() { $("#modal")?.remove(); }

  function pageButton(page, icon, label) {
    return `<button class="${currentPage === page ? "active" : ""}" data-page="${page}"><span>${icon}</span>${label}</button>`;
  }

  function render() {
    const root = $("#app");
    if (!sessionUserId) {
      root.innerHTML = loginView();
      $("#login-form").onsubmit = e => {
        e.preventDefault();
        login($("#login-name").value, $("#login-password").value);
      };
      return;
    }
    const u = user();
    root.innerHTML = shell(u);
    bindNavigation();
    bindPage();
  }

  function loginView() {
    return `<div class="login-wrap"><div class="login-card">
      <div class="brand"><div class="brand-mark">AVP</div><h1>AVP</h1><div class="muted">Digital Currency</div></div>
      <form id="login-form">
        <div class="form-group"><label class="label">Name</label><input class="input" id="login-name" autocomplete="username" required></div>
        <div class="form-group"><label class="label">Password</label><input class="input" id="login-password" type="password" autocomplete="current-password" required></div>
        <button class="btn btn-primary btn-full" type="submit">Login</button>
      </form>
      <div class="demo"><b>Demo accounts</b><br>Admin: Aaditya / admin123<br>Student: Student / student123</div>
      <div class="notice">${escapeHtml(data.settings.disclaimer)}</div>
    </div></div>`;
  }

  function shell(u) {
    const nav = u.role === "admin"
      ? [pageButton("admin","⚙️","Admin"), pageButton("leaderboard","🏆","Leaderboard")]
      : [pageButton("dashboard","⌂","Dashboard"),pageButton("earn","＋","Earn"),pageButton("store","🛍","Store"),pageButton("transactions","↕","Transactions"),pageButton("inventory","🎒","Inventory"),pageButton("leaderboard","🏆","Leaderboard")];

    const mobile = u.role === "admin"
      ? [pageButton("admin","⚙️","Admin"),pageButton("leaderboard","🏆","Board")]
      : [pageButton("dashboard","⌂","Home"),pageButton("earn","＋","Earn"),pageButton("store","🛍","Store"),pageButton("inventory","🎒","Items"),pageButton("leaderboard","🏆","Board")];

    return `<div class="app"><aside class="sidebar">
      <div class="side-brand"><div class="side-logo">A</div><div><b>AVP</b><div class="muted" style="font-size:11px">Digital Currency</div></div></div>
      <nav class="nav">${nav.join("")}<button id="logout">↪ Logout</button></nav>
    </aside>
    <main class="main">
      <div class="topbar"><div><div class="eyebrow">${u.role === "admin" ? "Administration" : "Student wallet"}</div><h2>${pageTitle()}</h2></div>
        <div class="user-pill"><div class="avatar">${escapeHtml(u.name[0])}</div><div class="user-meta"><b>${escapeHtml(u.name)}</b><div class="muted" style="font-size:11px">${u.role}</div></div></div>
      </div>
      ${pageContent(u)}
    </main>
    <nav class="mobile-nav">${mobile.join("")}</nav></div>`;
  }

  function pageTitle() {
    return ({dashboard:"Your Dashboard",earn:"Earn AVP",store:"AVP Store",transactions:"Transactions",inventory:"Inventory",leaderboard:"Leaderboard",admin:"Admin Dashboard"})[currentPage] || "AVP";
  }

  function pageContent(u) {
    if (u.role === "admin" && currentPage === "admin") return adminView();
    if (currentPage === "dashboard") return dashboardView(u);
    if (currentPage === "earn") return earnView(u);
    if (currentPage === "store") return storeView(u);
    if (currentPage === "transactions") return transactionView(u);
    if (currentPage === "inventory") return inventoryView(u);
    if (currentPage === "leaderboard") return leaderboardView();
    return dashboardView(u);
  }

  function dashboardView(u) {
    return `<div class="grid grid-2">
      <div class="card balance-card"><div class="eyebrow">Your AVP Balance</div><div class="balance">${money(u.balance)}</div><div class="muted">${escapeHtml(data.settings.disclaimer)}</div></div>
      <div class="grid grid-3">
        <div class="card"><div class="eyebrow">Total earned</div><div class="stat">${u.totalEarned}</div></div>
        <div class="card"><div class="eyebrow">Total spent</div><div class="stat">${u.totalSpent}</div></div>
        <div class="card"><div class="eyebrow">Current balance</div><div class="stat">${u.balance}</div></div>
      </div>
    </div>
    <div class="section-title"><h3>Quick actions</h3></div>
    <div class="grid grid-3">
      <div class="card"><div class="icon-box">＋</div><h3>Earn AVP</h3><p class="muted">Complete useful activities and build your balance.</p><button class="btn btn-primary" data-page="earn">View activities</button></div>
      <div class="card"><div class="icon-box">🛍</div><h3>Spend AVP</h3><p class="muted">Use your balance for digital rewards.</p><button class="btn btn-primary" data-page="store">Open store</button></div>
      <div class="card"><div class="icon-box">🏆</div><h3>Leaderboard</h3><p class="muted">See the internal AVP community leaderboard.</p><button class="btn btn-primary" data-page="leaderboard">View board</button></div>
    </div>`;
  }

  function earnView(u) {
    return `<div class="card"><div class="eyebrow">EARN → SAVE → SPEND → REWARD</div><h3>Available activities</h3>
      ${data.activities.map(a => {
        const key = `${u.id}:${a.id}`;
        const claimed = a.daily ? data.dailyClaims[key] === today() : !!data.activityClaims[key];
        return `<div class="activity"><div class="row-left"><div class="icon-box">${a.icon}</div><div><div class="name">${escapeHtml(a.name)}</div><div class="desc">${escapeHtml(a.description)}</div></div></div><div class="row-right"><span class="amount-plus">+${a.amount} AVP</span><button class="btn ${claimed ? "" : "btn-primary"}" data-claim="${a.id}" ${claimed ? "disabled" : ""}>${claimed ? "Claimed" : "Claim"}</button></div></div>`;
      }).join("")}
    </div>`;
  }

  function storeView(u) {
    return `<div class="grid grid-3">${data.rewards.map(r => `<div class="card">
      <div class="icon-box">${r.icon}</div><h3>${escapeHtml(r.name)}</h3><p class="muted">${escapeHtml(r.description)}</p>
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:18px"><b>${r.price} AVP</b><button class="btn btn-primary" data-buy="${r.id}">Buy</button></div>
    </div>`).join("")}</div>`;
  }

  function transactionView(u) {
    const txs = data.transactions.filter(t => t.userId === u.id);
    return `<div class="card"><div class="section-title" style="margin-top:0"><h3>Transaction history</h3><span class="badge">${txs.length} transactions</span></div>
      ${txs.length ? txs.map(t => `<div class="transaction"><div><div class="name">${escapeHtml(t.description)}</div><div class="desc">${dateTime(t.createdAt)} · Balance after: ${t.balanceAfter} AVP</div></div><div class="${t.amount >= 0 ? "amount-plus" : "amount-minus"}">${t.amount >= 0 ? "+" : ""}${t.amount} AVP</div></div>`).join("") : `<div class="empty">No transactions yet.</div>`}
    </div>`;
  }

  function inventoryView(u) {
    const items = data.inventory.filter(i => i.userId === u.id);
    return `<div class="card"><div class="section-title" style="margin-top:0"><h3>Your inventory</h3><span class="badge">${items.length} owned</span></div>
      ${items.length ? items.map(i => { const r = data.rewards.find(x => x.id === i.rewardId); return r ? `<div class="inventory-item"><div class="row-left"><div class="icon-box">${r.icon}</div><div><div class="name">${escapeHtml(r.name)}</div><div class="desc">Purchased ${dateTime(i.purchasedAt)}</div></div></div><div>${i.equipped ? '<span class="badge">Equipped</span>' : `<button class="btn btn-primary" data-equip="${i.id}">Equip</button>`}</div></div>` : ""}).join("") : `<div class="empty">You have not purchased any rewards yet.</div>`}
    </div>`;
  }

  function leaderboardView() {
    const rows = [...students()].sort((a,b) => b.totalEarned - a.totalEarned || b.balance - a.balance);
    return `<div class="card"><div class="section-title" style="margin-top:0"><h3>Internal AVP Leaderboard</h3><span class="badge">Sorted by total earned</span></div>
      <div class="table-head"><span>#</span><span>Name</span><span>Balance</span><span>Total earned</span></div>
      ${rows.map((s,i) => `<div class="leader-row"><b>${i+1}</b><div class="row-left"><div class="avatar">${escapeHtml(s.name[0])}</div><b>${escapeHtml(s.name)}</b></div><b>${s.balance} AVP</b><b class="leader-earned">${s.totalEarned} AVP</b></div>`).join("")}
    </div>`;
  }

  function adminView() {
    const totalCirculation = students().reduce((sum,u) => sum + u.balance, 0);
    const totalEarned = data.transactions.filter(t => t.amount > 0).reduce((s,t) => s+t.amount,0);
    const totalSpent = data.transactions.filter(t => t.amount < 0).reduce((s,t) => s+Math.abs(t.amount),0);
    return `<div class="grid grid-4">
      ${[["Total AVP in circulation",totalCirculation],["Total users",data.users.length],["Total transactions",data.transactions.length],["Total AVP earned",totalEarned],["Total AVP spent",totalSpent]].map(x=>`<div class="card admin-stat"><div class="eyebrow">${x[0]}</div><div class="stat">${x[1]}</div></div>`).join("")}
    </div>
    <div class="section-title"><h3>Give / Remove AVP</h3></div>
    <div class="grid grid-2"><div class="card">${adminTransferForm("give")}</div><div class="card">${adminTransferForm("remove")}</div></div>
    <div class="section-title"><h3>Create content</h3></div>
    <div class="grid grid-2"><div class="card">${rewardForm()}</div><div class="card">${activityForm()}</div></div>
    <div class="section-title"><h3>User management</h3></div>
    <div class="card">${students().map(s=>`<div class="user-row"><div><b>${escapeHtml(s.name)}</b><div class="desc">Balance ${s.balance} AVP · Earned ${s.totalEarned} · Spent ${s.totalSpent}</div></div><span class="badge">Student</span></div>`).join("")}</div>
    <div class="section-title"><h3>Recent system transactions</h3></div>
    <div class="card">${data.transactions.slice(0,20).map(t=>{const u=data.users.find(x=>x.id===t.userId);return `<div class="transaction"><div><div class="name">${escapeHtml(t.description)}</div><div class="desc">${escapeHtml(u?.name || "Unknown")} · ${dateTime(t.createdAt)}</div></div><div class="${t.amount>=0?"amount-plus":"amount-minus"}">${t.amount>=0?"+":""}${t.amount} AVP</div></div>`}).join("") || `<div class="empty">No transactions.</div>`}</div>`;
  }

  function adminTransferForm(mode) {
    return `<h3>${mode === "give" ? "Give AVP" : "Remove AVP"}</h3>
      <div class="form-group"><label class="label">Student</label><select class="select" id="${mode}-student">${students().map(s=>`<option value="${s.id}">${escapeHtml(s.name)} — ${s.balance} AVP</option>`).join("")}</select></div>
      <div class="form-group"><label class="label">Amount</label><input class="input" id="${mode}-amount" type="number" min="1" step="1"></div>
      <div class="form-group"><label class="label">Reason</label><input class="input" id="${mode}-reason" placeholder="Achievement Award"></div>
      <button class="btn ${mode==="give"?"btn-primary":"btn-danger"}" id="${mode}-btn">${mode==="give"?"Give AVP":"Remove AVP"}</button>`;
  }

  function rewardForm() {
    return `<h3>New store reward</h3><div class="form-grid"><input class="input" id="reward-name" placeholder="Reward name"><input class="input" id="reward-icon" placeholder="Icon e.g. 🎁"><input class="input" id="reward-price" type="number" min="1" placeholder="Price"></div><div class="form-group"><textarea class="textarea" id="reward-desc" placeholder="Description"></textarea></div><button class="btn btn-primary" id="create-reward">Create Reward</button>`;
  }

  function activityForm() {
    return `<h3>New earning activity</h3><div class="form-grid"><input class="input" id="activity-name" placeholder="Activity name"><input class="input" id="activity-amount" type="number" min="1" placeholder="AVP reward"></div><div class="form-group"><textarea class="textarea" id="activity-desc" placeholder="Description"></textarea></div><button class="btn btn-primary" id="create-activity">Create Activity</button>`;
  }

  function bindNavigation() {
    $$("[data-page]").forEach(btn => btn.onclick = () => {
      currentPage = btn.dataset.page;
      render();
    });
    $("#logout")?.addEventListener("click", logout);
  }

  function bindPage() {
    $$("[data-page]").forEach(btn => btn.onclick = () => { currentPage = btn.dataset.page; render(); });
    $$("[data-claim]").forEach(btn => btn.onclick = () => claimActivity(btn.dataset.claim));
    $$("[data-buy]").forEach(btn => btn.onclick = () => buyReward(btn.dataset.buy));
    $$("[data-equip]").forEach(btn => btn.onclick = () => equipInventory(btn.dataset.equip));

    $("#give-btn")?.addEventListener("click", () => adminTransfer("give"));
    $("#remove-btn")?.addEventListener("click", () => adminTransfer("remove"));
    $("#create-reward")?.addEventListener("click", createReward);
    $("#create-activity")?.addEventListener("click", createActivity);
  }

  function adminTransfer(mode) {
    const studentId = $(`#${mode}-student`).value;
    const amount = Number($(`#${mode}-amount`).value);
    const reason = $(`#${mode}-reason`).value.trim() || (mode === "give" ? "Admin award" : "Admin adjustment");
    const s = getStudent(studentId);
    if (!s || !Number.isFinite(amount) || amount <= 0) return toast("Enter a valid amount.", "error");
    if (mode === "remove" && s.balance < amount) return toast("Student does not have enough AVP.", "error");
    const ok = transaction(studentId, reason, mode === "give" ? amount : -amount, mode === "give" ? "earned" : "spent");
    if (!ok) return toast("Transaction could not be completed.", "error");
    toast(`${mode === "give" ? "AVP given" : "AVP removed"} successfully.`);
    render();
  }

  function createReward() {
    const name = $("#reward-name").value.trim(), icon = $("#reward-icon").value.trim() || "🎁", price = Number($("#reward-price").value), description = $("#reward-desc").value.trim();
    if (!name || !description || !Number.isFinite(price) || price <= 0) return toast("Complete all reward fields.", "error");
    data.rewards.push({id:uid("reward"),name,icon,price,description});
    save(); toast("Reward created."); render();
  }

  function createActivity() {
    const name = $("#activity-name").value.trim(), amount = Number($("#activity-amount").value), description = $("#activity-desc").value.trim();
    if (!name || !description || !Number.isFinite(amount) || amount <= 0) return toast("Complete all activity fields.", "error");
    data.activities.push({id:uid("activity"),icon:"⭐",name,amount,description,daily:false});
    save(); toast("Activity created."); render();
  }

  // Expose only a tiny debug/reset helper for local testing.
  window.AVP = {
    resetDemoData() {
      localStorage.removeItem(STORAGE_KEY);
      data = loadData();
      sessionUserId = null;
      render();
    }
  };

  render();
})();