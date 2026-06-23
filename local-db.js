/* مراح — قاعدة بيانات محلية (IndexedDB) تحاكي واجهة Supabase المستخدمة في app.js
   الهدف: تشغيل التطبيق بالكامل دون إنترنت ولا خادم، مع تخزين دائم على الجهاز.
   عند وجود هذا الملف يعمل التطبيق في «الوضع المحلي» (window.MRAH_LOCAL = true)،
   فيستبدل init() عميل Supabase بعميل محلي بنفس الواجهة (from/rpc/auth...). */
(function () {
  'use strict';
  // ملاحظة: لا نفرض الوضع المحلي هنا — يقرّره app.js حسب اختيار المستخدم
  // (محلي أو مشترك). هذا الملف يكتفي بإتاحة عميل محلي عبر createMrahLocalClient.

  const DB_NAME = 'mrahi_local';
  const DB_VERSION = 1;

  // الجداول المخزّنة محلياً. الإعدادات والعدّادات مفتاحها نصّي 'key'، والبقية رقم تلقائي 'id'.
  const KEY_STORES = { mrahi_settings: 'key', mrahi_counters: 'key' };
  const ID_STORES = [
    'mrahi_animals', 'mrahi_matings', 'mrahi_pregnancies', 'mrahi_births',
    'mrahi_vaccine_types', 'mrahi_vaccinations', 'mrahi_treatments', 'mrahi_treatment_types',
    'mrahi_members', 'mrahi_backups', 'mrahi_trash', 'mrahi_tips', 'mrahi_types',
    // جداول سحابية تبقى فارغة في الوضع المحلي (حتى لا تنكسر استعلامات loadAll)
    'mrahi_herd_shares', 'mrahi_forum_categories', 'mrahi_forum_moderators',
    'mrahi_forum_bans', 'mrahi_forum_topics', 'mrahi_forum_posts', 'mrahi_forum_likes',
  ];

  let _dbPromise = null;
  function openDB() {
    if (_dbPromise) return _dbPromise;
    _dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        ID_STORES.forEach(name => {
          if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath: 'id', autoIncrement: true });
        });
        Object.keys(KEY_STORES).forEach(name => {
          if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath: KEY_STORES[name] });
        });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return _dbPromise;
  }

  const promisify = (req) => new Promise((resolve, reject) => { req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); });

  async function getAll(store) {
    const db = await openDB();
    if (!db.objectStoreNames.contains(store)) return [];
    const tx = db.transaction(store, 'readonly');
    return promisify(tx.objectStore(store).getAll());
  }
  async function writeTx(store, fn) {
    const db = await openDB();
    if (!db.objectStoreNames.contains(store)) return null;
    const tx = db.transaction(store, 'readwrite');
    const os = tx.objectStore(store);
    const out = await fn(os);
    await new Promise((resolve, reject) => { tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error); });
    return out;
  }

  const matchRow = (row, filters) => filters.every(([col, op, v]) => {
    const cell = row[col];
    if (op === 'eq') return cell === v;
    if (op === 'neq') return cell !== v;
    if (op === 'in') return Array.isArray(v) && v.includes(cell);
    return true;
  });

  // باني استعلام يحاكي Supabase: قابل للسَّلسلة و«قابل للانتظار» (thenable) عبر then().
  class Query {
    constructor(store) { this.store = store; this.filters = []; this._op = 'select'; this._payload = null; this._order = null; this._limit = null; this._single = null; this._onConflict = null; }
    select() { return this; }
    insert(payload) { this._op = 'insert'; this._payload = payload; return this; }
    update(payload) { this._op = 'update'; this._payload = payload; return this; }
    upsert(payload, opts) { this._op = 'upsert'; this._payload = payload; this._onConflict = (opts && opts.onConflict) || (KEY_STORES[this.store] || 'id'); return this; }
    delete() { this._op = 'delete'; return this; }
    eq(c, v) { this.filters.push([c, 'eq', v]); return this; }
    neq(c, v) { this.filters.push([c, 'neq', v]); return this; }
    in(c, v) { this.filters.push([c, 'in', v]); return this; }
    order(c, opts) { this._order = { col: c, asc: !opts || opts.ascending !== false }; return this; }
    limit(n) { this._limit = n; return this; }
    single() { this._single = 'one'; return this; }
    maybeSingle() { this._single = 'maybe'; return this; }
    then(resolve, reject) { return this._run().then(resolve, reject); }
    catch(reject) { return this._run().catch(reject); }

    async _run() {
      try { return await this._exec(); }
      catch (e) { return { data: null, error: { message: (e && e.message) || String(e) } }; }
    }
    _shape(arr) {
      let rows = arr;
      if (this._order) { const { col, asc } = this._order; rows = rows.slice().sort((a, b) => { const x = a[col], y = b[col]; if (x === y) return 0; return (x > y ? 1 : -1) * (asc ? 1 : -1); }); }
      if (this._limit != null) rows = rows.slice(0, this._limit);
      if (this._single) return { data: rows.length ? rows[0] : null, error: null };
      return { data: rows, error: null };
    }
    async _exec() {
      const store = this.store;
      if (this._op === 'select') {
        const all = await getAll(store);
        return this._shape(all.filter(r => matchRow(r, this.filters)));
      }
      if (this._op === 'insert') {
        const items = Array.isArray(this._payload) ? this._payload : [this._payload];
        const inserted = [];
        await writeTx(store, async (os) => {
          for (const it of items) {
            const rec = Object.assign({}, it);
            if (rec.created_at == null && !KEY_STORES[store]) rec.created_at = new Date().toISOString();
            const key = await promisify(os.add(rec));
            if (rec.id == null) rec.id = key;
            inserted.push(rec);
          }
        });
        if (this._single) return { data: inserted[0] || null, error: null };
        return { data: inserted, error: null };
      }
      if (this._op === 'update') {
        const all = await getAll(store);
        const targets = all.filter(r => matchRow(r, this.filters));
        await writeTx(store, async (os) => { for (const r of targets) await promisify(os.put(Object.assign({}, r, this._payload))); });
        return { data: null, error: null };
      }
      if (this._op === 'upsert') {
        const conflict = this._onConflict;
        const items = Array.isArray(this._payload) ? this._payload : [this._payload];
        await writeTx(store, async (os) => {
          for (const it of items) {
            const rec = Object.assign({}, it);
            if (rec.created_at == null && !KEY_STORES[store]) rec.created_at = new Date().toISOString();
            await promisify(os.put(rec)); // keyPath = conflict (key) ⇒ put يستبدل أو يضيف
          }
        });
        return { data: null, error: null };
      }
      if (this._op === 'delete') {
        const all = await getAll(store);
        const targets = all.filter(r => matchRow(r, this.filters));
        const kp = KEY_STORES[store] || 'id';
        await writeTx(store, async (os) => { for (const r of targets) await promisify(os.delete(r[kp])); });
        return { data: null, error: null };
      }
      return { data: null, error: null };
    }
  }

  // دوال الخادم (RPC) — في الوضع المحلي ننفّذ ما له معنى محلياً ونُحيّد الباقي.
  async function rpc(name) {
    try {
      if (name === 'mrahi_purge_trash') {
        const cutoff = Date.now() - 30 * 86400000;
        const all = await getAll('mrahi_trash');
        const old = all.filter(r => r.created_at && new Date(r.created_at).getTime() < cutoff);
        await writeTx('mrahi_trash', async (os) => { for (const r of old) await promisify(os.delete(r.id)); });
        return { data: null, error: null };
      }
      // mrahi_resolve_login / mrahi_site_visit / mrahi_invite_to_herd / mrahi_forum_* : لا أثر محلي
      return { data: null, error: null };
    } catch (e) { return { data: null, error: { message: String(e) } }; }
  }

  function createLocalClient() {
    return {
      from(table) { return new Query(table); },
      rpc(name, params) { return rpc(name, params); },
      channel() { const ch = { on() { return ch; }, subscribe() { return ch; } }; return ch; },
      removeChannel() { },
      auth: {
        async getSession() { return { data: { session: null } }; },
        onAuthStateChange() { return { data: { subscription: { unsubscribe() {} } } }; },
        async signInWithPassword() { return { data: {}, error: null }; },
        async signUp() { return { data: {}, error: null }; },
        async signOut() { return { error: null }; },
      },
    };
  }

  window.createMrahLocalClient = createLocalClient;
})();
