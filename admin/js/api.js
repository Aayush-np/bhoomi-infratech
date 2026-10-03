/* ==========================================================================
   BHOOMI ADMIN — API LAYER
   Supabase client, auth + admin allow-list check, CRUD, storage uploads.
   ========================================================================== */
(function () {
  'use strict';

  var cfg = window.SITE_CONFIG || {};
  var urlOk = cfg.supabaseUrl && /^https?:\/\//i.test(cfg.supabaseUrl) && !/your[-_]|xxx/i.test(cfg.supabaseUrl);
  var enabled = !!(window.supabase && urlOk && cfg.supabaseAnonKey);
  var client = enabled
    ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
        auth: { persistSession: true, autoRefreshToken: true }
      })
    : null;

  var state = { email: '', isAdmin: false };

  function friendly(error) {
    if (!error) return 'Unknown error.';
    if (typeof error === 'string') return error;
    var m = error.message || String(error);
    if (/row level security/i.test(m)) return 'Access denied by site permissions (RLS).';
    if (/invalid (jwt|token)|token expired/i.test(m)) return 'Session expired — please sign in again.';
    if (/fetch failed|network|failed to fetch/i.test(m)) return 'Could not reach the Supabase server. Check your connection.';
    if (/duplicate key/i.test(m)) return 'Record already exists.';
    if (/email.*confirmed|confirm/i.test(m)) return 'Email confirmation required — check your inbox, then sign in.';
    return m || 'Unexpected error.';
  }
  function fail(error, fallback) {
    var msg = error instanceof Error ? (error.message || fallback) : friendly(error);
    return new Error(msg || fallback || 'Something went wrong.');
  }

  var Api = {
    enabled: enabled,
    state: state,
    /* Cloudflare Turnstile site key (optional login CAPTCHA) */
    captchaSiteKey: typeof cfg.captchaSiteKey === 'string' ? cfg.captchaSiteKey.trim() : '',

    /* ---------- auth ---------- */
    session(){
      return client
        ? client.auth.getSession().then(function (r) { return r.data && r.data.session || null; })
        : Promise.resolve(null);
    },
    onAuthChange(cb){
      if (!client) return { unsubscribe: function () {} };
      return client.auth.onAuthStateChange(function (ev, s) { cb(s); });
    },
    async ensureAdmin(){
      var session = await this.session();
      var email = session && session.user && session.user.email;
      if (!email) return false;
      state.email = email;
      var q = await client.from('admin_users').select('email').eq('email', email);
      if (q.error) throw fail(q.error, 'Could not verify admin access.');
      state.isAdmin = Array.isArray(q.data) && q.data.length > 0;
      return state.isAdmin;
    },
    async signIn(email, password, captchaToken){
      var r = await client.auth.signInWithPassword({
        email: email, password: password,
        options: captchaToken ? { captchaToken: captchaToken } : undefined
      });
      if (r.error) throw fail(r.error, 'Sign-in failed.');
      state.email = r.data.user.email;
      if (!(await this.ensureAdmin())) {
        await client.auth.signOut();
        throw new Error('This account is not on the site admin list. Ask the site office to add your email (see README-ADMIN.md).');
      }
      return r.data.user;
    },
    async signUp(email, password, captchaToken){
      var r = await client.auth.signUp({
        email: email, password: password,
        options: captchaToken ? { captchaToken: captchaToken } : undefined
      });
      if (r.error) throw fail(r.error, 'Account creation failed.');
      if (r.data.session) {
        state.email = r.data.user.email;
        if (!(await this.ensureAdmin())) {
          await client.auth.signOut();
          throw new Error('Account created, but this email is not on the site admin list yet.');
        }
        return r.data.user;
      }
      throw new Error('Account created. Check your inbox to confirm the email, then sign in.');
    },
    async signOut(){
      if (client) await client.auth.signOut();
      state.isAdmin = false;
    },

    /* ---------- data ---------- */
    async list(table, orderCol){
      var q = await client.from(table).select('*').order(orderCol || 'sort', { ascending: true });
      if (q.error) throw fail(q.error, 'Could not load records.');
      return q.data || [];
    },
    async count(table){
      var q = await client.from(table).select('*', { count: 'exact', head: true });
      if (q.error) throw fail(q.error, 'Could not count records.');
      return q.count || 0;
    },
    async insert(table, row){
      var q = await client.from(table).insert(row).select().single();
      if (q.error) throw fail(q.error, 'Could not create the record.');
      return q.data;
    },
    async update(table, id, row){
      var q = await client.from(table).update(row).eq('id', id).select().single();
      if (q.error) throw fail(q.error, 'Could not save changes.');
      return q.data;
    },
    async remove(table, id){
      var q = await client.from(table).delete().eq('id', id);
      if (q.error) throw fail(q.error, 'Could not delete the record.');
    },
    async upsertSettings(rows){
      var q = await client.from('site_settings').upsert(rows, { onConflict: 'key' });
      if (q.error) throw fail(q.error, 'Could not save settings.');
    },
    async getSettings(){
      var q = await client.from('site_settings').select('key, value');
      if (q.error) throw fail(q.error, 'Could not load settings.');
      var o = {};
      (q.data || []).forEach(function (r) {
        try { o[r.key] = JSON.parse(r.value); } catch (err) { o[r.key] = r.value; }
      });
      return o;
    },

    /* ---------- storage ---------- */
    storagePath(name){
      var d = new Date();
      var ymd = d.getFullYear() + '-' +
        String(d.getMonth() + 1).padStart(2, '0') + '-' +
        String(d.getDate()).padStart(2, '0');
      var safe = String(name || '').replace(/[^a-zA-Z0-9._-]/g, '-');
      return ymd + '-' + safe;
    },
    async upload(file, onProgress){
      var path = this.storagePath(file.name || ('image-' + Date.now()));
      if (onProgress) onProgress(10);
      var q = await client.storage.from('media').upload(path, file, {
        upsert: true,
        cacheControl: '3600',
        contentType: file.type || 'image/jpeg'
      });
      if (q.error) throw fail(q.error, 'Upload failed.');
      if (onProgress) onProgress(92);
      var pub = client.storage.from('media').getPublicUrl(path);
      if (onProgress) onProgress(100);
      return { url: pub.data.publicUrl, path: path };
    },
    async deleteObject(path){
      if (!path) return;
      var q = await client.storage.from('media').remove([path]);
      if (q.error) console.warn('[admin] storage delete failed', q.error);
    }
  };

  window.AdminApi = Api;
})();
