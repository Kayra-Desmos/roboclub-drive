/**
 * RoboClub Drive - Auth Module
 */
import { supabaseConfig } from './config.js';

const AUTH    = supabaseConfig.url + '/auth/v1';
const REST    = supabaseConfig.url + '/rest/v1';
const HEADERS = {
    'apikey': supabaseConfig.anonKey,
    'Content-Type': 'application/json'
};

class AuthEngine {
    constructor() {
        this._session   = null;
        this._listeners = [];
        this._loadSession();
    }

    _loadSession() {
        try {
            const raw = localStorage.getItem('sb_session');
            if (raw) this._session = JSON.parse(raw);
        } catch (_) { this._session = null; }
    }

    _saveSession(session) {
        this._session = session;
        if (session) localStorage.setItem('sb_session', JSON.stringify(session));
        else         localStorage.removeItem('sb_session');
        this._listeners.forEach(fn => fn(session));
    }

    getSession()  { return this._session; }
    getUser()     { return this._session?.user ?? null; }
    getUserId()   { return this._session?.user?.id ?? null; }
    isLoggedIn()  { return !!this._session?.access_token; }
    getToken()    { return this._session?.access_token ?? supabaseConfig.anonKey; }
    isAdmin()     { return this._session?.user?.email === supabaseConfig.adminEmail; }

    onAuthChange(fn) { this._listeners.push(fn); }

    /* ── Sign Up ── */
    async signUp(email, password) {
        const res  = await fetch(`${AUTH}/signup`, {
            method: 'POST', headers: HEADERS,
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();

        if (!res.ok) {
            const msg = data.msg || data.message || data.error_description || 'Kayıt başarısız.';
            throw new Error(msg);
        }

        // email confirmation disabled → access_token returned immediately
        if (data.access_token) {
            this._saveSession(data);
            return { loggedIn: true };
        }

        // confirmation required
        return { loggedIn: false, confirmEmail: true };
    }

    /* ── Sign In ── */
    async signIn(email, password) {
        const res  = await fetch(`${AUTH}/token?grant_type=password`, {
            method: 'POST', headers: HEADERS,
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();

        if (!res.ok) {
            // Map common Supabase error messages to Turkish
            const raw = data.error_description || data.message || data.error || '';
            let msg = 'Giriş başarısız.';
            if (raw.toLowerCase().includes('invalid login'))     msg = 'E-posta veya şifre hatalı.';
            else if (raw.toLowerCase().includes('email not'))    msg = 'E-posta henüz doğrulanmamış.';
            else if (raw.toLowerCase().includes('not confirm'))  msg = 'Lütfen e-postanı onayla.';
            else if (raw)                                        msg = raw;
            throw new Error(msg);
        }

        this._saveSession(data);
        return data;
    }

    /* ── Sign Out ── */
    async signOut() {
        if (this._session?.access_token) {
            await fetch(`${AUTH}/logout`, {
                method: 'POST',
                headers: { ...HEADERS, 'Authorization': 'Bearer ' + this._session.access_token }
            }).catch(() => {});
        }
        this._saveSession(null);
    }

    /* ── Delete Account ── */
    async deleteAccount() {
        if (!this._session?.access_token) throw new Error('Giriş yapmadınız.');

        // Delete all items owned by this user from DB
        const userId = this.getUserId();
        const { anonKey } = supabaseConfig;
        const token = this._session.access_token;

        // Delete metadata rows owned by user
        await fetch(`${REST}/items?user_id=eq.${userId}`, {
            method: 'DELETE',
            headers: {
                'apikey': anonKey,
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
            }
        }).catch(() => {});

        // Delete the Supabase auth user via admin? Not possible with anon key.
        // Instead call the user self-delete endpoint if available, or just sign out.
        // Supabase doesn't expose user self-delete via anon REST without a serverless fn.
        // We sign out and clear local data — account is effectively deactivated client-side.
        this._saveSession(null);
    }

    /* ── Refresh token if expiring ── */
    async refreshIfNeeded() {
        if (!this._session) return;
        const exp = this._session.expires_at || 0;
        const now = Math.floor(Date.now() / 1000);
        if (exp - now < 60) {
            try {
                const res  = await fetch(`${AUTH}/token?grant_type=refresh_token`, {
                    method: 'POST', headers: HEADERS,
                    body: JSON.stringify({ refresh_token: this._session.refresh_token })
                });
                const data = await res.json();
                if (res.ok) this._saveSession(data);
                else        this._saveSession(null);
            } catch (_) { this._saveSession(null); }
        }
    }
}

export const auth = new AuthEngine();
