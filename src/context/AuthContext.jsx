import { createContext, useContext, useMemo, useState, useEffect, useCallback } from 'react';
import {
  authLogin,
  checkBackendHealth,
  createAdminUserApi,
  regenerateUserOtpApi,
  deleteAdminUserApi,
  fetchAdminUsersApi,
} from '../services/api';

const AuthContext = createContext(null);

const STORAGE_KEY_USERS   = 'findit_registered_users_v4';
const STORAGE_KEY_PROFILE = 'findit_active_user_v4';
const STORAGE_KEY_TOKEN   = 'findit_token';

// ── Primary Admin config ─────────────────────────────────────────
const PRIMARY_ADMIN_EMAIL = 'admin@team18.com';
const PRIMARY_ADMIN_NAME  = 'Primary Admin';

const isPrimaryAdmin = (email) =>
  (email || '').trim().toLowerCase() === PRIMARY_ADMIN_EMAIL;

// ── Backend role normalisation ───────────────────────────────────
// Backend: 'student' | 'office_staff' | 'faculty' | 'admin'
// Frontend uses the same; we display 'office_staff' as "Office Staff"
export const displayRole = (role) => {
  if (role === 'office_staff') return 'Office Staff';
  if (role === 'admin') return 'Primary Admin';
  if (role === 'student') return 'Student';
  if (role === 'faculty') return 'Faculty';
  return role || 'Student';
};

// ── Default local fallback accounts (used when backend is offline) ─
const DEFAULT_SYSTEM_ACCOUNTS = [
  {
    id: 'usr_admin_01',
    name: PRIMARY_ADMIN_NAME,
    email: PRIMARY_ADMIN_EMAIL,
    phone: '',
    dept: 'Primary Administration',
    password: '', // Must be obtained from team sheet
    role: 'admin',
    registered_at: '2026-01-01T00:00:00.000Z',
  },
];

// Enforce exactly ONE admin in local registry
export const sanitizeUserList = (rawUsers) => {
  if (!Array.isArray(rawUsers) || rawUsers.length === 0) return [...DEFAULT_SYSTEM_ACCOUNTS];
  let adminAdded = false;
  const result = [];
  for (const u of rawUsers) {
    if (!u) continue;
    const role = (u.role || 'student').toLowerCase();
    const email = (u.email || u.email_id || '').trim().toLowerCase();
    if (role === 'admin' || isPrimaryAdmin(email)) {
      if (!adminAdded) {
        adminAdded = true;
        result.push({
          ...u,
          id: 'usr_admin_01',
          name: PRIMARY_ADMIN_NAME,
          email: PRIMARY_ADMIN_EMAIL,
          role: 'admin',
        });
      }
    } else {
      result.push(u);
    }
  }
  if (!adminAdded) result.unshift({ ...DEFAULT_SYSTEM_ACCOUNTS[0] });
  return result;
};

// Convert a backend AdminUserView → local user object
const backendUserToLocal = (bu) => ({
  id: bu.email_id || bu.id || ('usr_' + Date.now() + Math.random().toString(36).slice(2, 6)),
  name: bu.name,
  email: (bu.email_id || '').toLowerCase(),
  phone: bu.phone_number || '',
  dept: bu.dept || bu.designation || '',
  usn: bu.usn || '',
  designation: bu.designation || '',
  password: bu.otp || '',     // Backend returns the OTP in AdminUserView
  role: bu.role,              // 'student' | 'office_staff'
  registered_at: bu.created_at || new Date().toISOString(),
});

export function AuthProvider({ children }) {
  // Backend health
  const [backendStatus, setBackendStatus] = useState({
    checked: false,
    online: false,
    url: import.meta.env.VITE_API_BASE_URL || 'https://campus-os-backend-8sjf.onrender.com',
  });

  // Local user registry
  const [users, setUsers] = useState(() => {
    try {
      const s = localStorage.getItem(STORAGE_KEY_USERS);
      if (s) {
        const p = JSON.parse(s);
        if (Array.isArray(p) && p.length > 0) return sanitizeUserList(p);
      }
    } catch { /**/ }
    return [...DEFAULT_SYSTEM_ACCOUNTS];
  });

  // Active session profile
  const [profile, setProfile] = useState(() => {
    try {
      const s = localStorage.getItem(STORAGE_KEY_PROFILE);
      if (s) {
        const p = JSON.parse(s);
        if (isPrimaryAdmin(p?.email)) {
          return { ...p, id: 'usr_admin_01', name: PRIMARY_ADMIN_NAME,
                   email: PRIMARY_ADMIN_EMAIL, role: 'admin' };
        }
        return p;
      }
    } catch { /**/ }
    return null;
  });

  const [token, setToken] = useState(() => localStorage.getItem(STORAGE_KEY_TOKEN) || null);

  // Persist users
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users)); }
    catch { /**/ }
  }, [users]);

  // Persist profile
  useEffect(() => {
    try {
      if (profile) localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(profile));
      else localStorage.removeItem(STORAGE_KEY_PROFILE);
    } catch { /**/ }
  }, [profile]);

  // Check backend health on mount
  useEffect(() => {
    checkBackendHealth().then((res) =>
      setBackendStatus((prev) => ({ ...prev, checked: true, online: res.online }))
    );
  }, []);

  // Sync users from backend when admin is logged in and backend is online
  const syncUsersFromBackend = useCallback(async () => {
    if (!backendStatus.online) return;
    try {
      const serverUsers = await fetchAdminUsersApi();
      if (Array.isArray(serverUsers) && serverUsers.length > 0) {
        setUsers((prev) => {
          const merged = [...prev];
          serverUsers.forEach((bu) => {
            const local = backendUserToLocal(bu);
            const idx = merged.findIndex(
              (m) => (m.email || '').toLowerCase() === local.email
            );
            if (idx >= 0) {
              merged[idx] = { ...merged[idx], ...local };
            } else {
              merged.push(local);
            }
          });
          return sanitizeUserList(merged);
        });
      }
    } catch { /**/ }
  }, [backendStatus.online]);

  useEffect(() => {
    if (backendStatus.online && profile?.role === 'admin') {
      syncUsersFromBackend();
    }
  }, [backendStatus.online, profile?.role, syncUsersFromBackend]);

  // ── LOGIN ────────────────────────────────────────────────────────
  const login = async (email, otp, isAdmin = false) => {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanOtp   = (otp || '').trim();

    // Validate: only admin email can use admin login
    if (isAdmin && !isPrimaryAdmin(cleanEmail)) {
      throw new Error(`Only ${PRIMARY_ADMIN_NAME} (${PRIMARY_ADMIN_EMAIL}) can use admin login.`);
    }
    // Validate: admin must use admin login
    if (!isAdmin && isPrimaryAdmin(cleanEmail)) {
      throw new Error(`Admin must check "Sign in as Primary Admin" to log in.`);
    }

    // 1. Try backend
    try {
      const res = await authLogin(cleanEmail, cleanOtp, isAdmin);
      if (res?.access_token) {
        localStorage.setItem(STORAGE_KEY_TOKEN, res.access_token);
        setToken(res.access_token);
        window.dispatchEvent(new Event('findit_token_changed'));

        // Build profile from backend response
        const bp = res.profile;
        const sessionProfile = isPrimaryAdmin(cleanEmail)
          ? {
              id: 'usr_admin_01',
              name: PRIMARY_ADMIN_NAME,
              email: PRIMARY_ADMIN_EMAIL,
              phone: bp?.phone_number || '',
              dept: 'Primary Administration',
              role: 'admin',
              institution_name: bp?.institution_name || '',
              team_id: bp?.team_id || '',
            }
          : {
              id: bp?.email_id || cleanEmail,
              name: bp?.name || cleanEmail.split('@')[0],
              email: (bp?.email_id || cleanEmail).toLowerCase(),
              phone: bp?.phone_number || '',
              dept: bp?.dept || bp?.designation || '',
              usn: bp?.usn || '',
              designation: bp?.designation || '',
              role: bp?.role || 'student',  // 'student' | 'office_staff'
              team_id: bp?.team_id || '',
            };

        setProfile(sessionProfile);

        // Add to local registry if not present
        setUsers((prev) => {
          if (!prev.some((u) => (u.email || '').toLowerCase() === cleanEmail)) {
            return sanitizeUserList([...prev, sessionProfile]);
          }
          return sanitizeUserList(prev.map((u) =>
            (u.email || '').toLowerCase() === cleanEmail ? { ...u, ...sessionProfile } : u
          ));
        });

        return sessionProfile;
      }
    } catch (backendErr) {
      const errCode = backendErr?.response?.data?.error?.code;
      const errMsg  = backendErr?.response?.data?.error?.message || backendErr.message;

      // Re-throw backend errors that are meaningful to the user
      if (errCode === 'INVALID_CREDENTIALS') {
        throw new Error('Invalid email or OTP. Please check your credentials.');
      }
      if (errCode === 'USE_ADMIN_LOGIN') {
        throw new Error('This is an admin account. Please check "Sign in as Primary Admin".');
      }
      if (errCode === 'UNKNOWN_INSTITUTION') {
        throw new Error(`Unknown institution domain. Use your @team18.com email.`);
      }
      // For other backend errors, fall through to local
      console.warn('Backend login note — using local fallback:', errMsg);
    }

    // 2. Local fallback (only works when backend is offline)
    const localUser = users.find(
      (u) => (u.email || '').toLowerCase() === cleanEmail ||
             (isPrimaryAdmin(cleanEmail) && isPrimaryAdmin(u.email))
    );

    if (!localUser) {
      throw new Error(
        `No account found for "${cleanEmail}". Accounts are created by the Primary Admin.`
      );
    }

    if (cleanOtp && localUser.password && localUser.password !== cleanOtp) {
      throw new Error('Incorrect OTP/password.');
    }

    const sessionToken = 'local_' + Date.now();
    localStorage.setItem(STORAGE_KEY_TOKEN, sessionToken);
    setToken(sessionToken);

    const effectiveUser = isPrimaryAdmin(cleanEmail)
      ? { ...localUser, role: 'admin', name: PRIMARY_ADMIN_NAME, email: PRIMARY_ADMIN_EMAIL }
      : localUser;
    setProfile(effectiveUser);
    return effectiveUser;
  };

  // ── ADMIN: CREATE USER ────────────────────────────────────────────
  // Backend roles: 'student' or 'office_staff'
  const createUserByAdmin = async ({ name, email, phone, dept, role, usn, designation, password }) => {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanRole  = (role || 'student').toLowerCase();
    const cleanName  = (name || '').trim();
    const cleanPhone = (phone || '').replace(/\D/g, ''); // digits only for backend

    if (cleanRole === 'admin' || isPrimaryAdmin(cleanEmail)) {
      throw new Error('Cannot create another admin. Only one Primary Admin is allowed.');
    }
    if (!cleanName || !cleanEmail) {
      throw new Error('Name and email are required.');
    }
    if (users.find((u) => (u.email || '').toLowerCase() === cleanEmail)) {
      throw new Error(`Account with email "${cleanEmail}" already exists.`);
    }

    // Build exact payload the backend expects
    let apiPayload;
    if (cleanRole === 'student') {
      apiPayload = {
        role: 'student',
        name: cleanName,
        email_id: cleanEmail,
        phone_number: cleanPhone || '0000000000',
        usn: (usn || '').trim() || 'USN' + Date.now().toString().slice(-6),
        dept: (dept || '').trim() || 'Campus Department',
      };
    } else {
      // office_staff
      apiPayload = {
        role: 'office_staff',
        name: cleanName,
        email_id: cleanEmail,
        phone_number: cleanPhone || '0000000000',
        dept: (dept || '').trim() || 'Lost & Found Desk',
        designation: (designation || dept || '').trim() || 'Office Staff',
      };
    }

    let serverOtp = password || String(Math.floor(100000 + Math.random() * 900000));
    let newUser = {
      id: cleanEmail,
      name: cleanName,
      email: cleanEmail,
      phone: phone || '',
      dept: apiPayload.dept || '',
      usn: apiPayload.usn || '',
      designation: apiPayload.designation || '',
      password: serverOtp,
      role: cleanRole,
      registered_at: new Date().toISOString(),
    };

    // Call backend API
    try {
      const created = await createAdminUserApi(apiPayload);
      // Backend returns AdminUserView with the OTP
      if (created?.otp) {
        serverOtp = created.otp;
        newUser.password = serverOtp;
      }
      console.log('User created on backend:', cleanEmail, 'OTP:', serverOtp);
    } catch (apiErr) {
      const msg = messageFromError(apiErr);
      console.warn('Backend create user note:', msg);
      // If backend rejects (e.g. duplicate), re-throw
      if (apiErr?.response?.status === 409 || apiErr?.response?.status === 422) {
        throw new Error(msg);
      }
    }

    setUsers((prev) => sanitizeUserList([newUser, ...prev]));
    return { ...newUser, otp: serverOtp };
  };

  const messageFromError = (e) =>
    e?.response?.data?.error?.message || e?.message || 'Unknown error';

  // ── ADMIN: REGENERATE OTP ─────────────────────────────────────────
  const regenerateUserOtp = async (email) => {
    const cleanEmail = (email || '').trim().toLowerCase();
    let newOtp = String(Math.floor(100000 + Math.random() * 900000));

    try {
      const res = await regenerateUserOtpApi(cleanEmail);
      if (res?.otp) newOtp = res.otp;
    } catch (e) {
      console.warn('Regenerate OTP backend note:', e.message);
    }

    setUsers((prev) =>
      prev.map((u) =>
        (u.email || '').toLowerCase() === cleanEmail ? { ...u, password: newOtp } : u
      )
    );
    if ((profile?.email || '').toLowerCase() === cleanEmail) {
      setProfile((p) => ({ ...p, password: newOtp }));
    }
    return newOtp;
  };

  // ── DELETE USER ────────────────────────────────────────────────────
  const deleteAccount = async (userIdOrEmail) => {
    const target = users.find(
      (u) => u.id === userIdOrEmail ||
             (u.email || '').toLowerCase() === String(userIdOrEmail).toLowerCase()
    );
    if (target?.role === 'admin' || isPrimaryAdmin(target?.email)) {
      throw new Error('The Primary Admin account cannot be deleted.');
    }
    try {
      if (target?.email) await deleteAdminUserApi(target.email);
    } catch (e) {
      console.warn('Delete user backend note:', e.message);
    }
    setUsers((prev) =>
      sanitizeUserList(
        prev.filter(
          (u) => u.id !== userIdOrEmail &&
                 (u.email || '').toLowerCase() !== String(userIdOrEmail).toLowerCase()
        )
      )
    );
    if (
      profile?.id === userIdOrEmail ||
      (profile?.email || '').toLowerCase() === String(userIdOrEmail).toLowerCase()
    ) {
      logout();
    }
  };

  // ── PROFILE UPDATE ─────────────────────────────────────────────────
  const updateProfile = ({ name, phone, dept, email }) => {
    if (!profile) return null;
    const updated = {
      ...profile,
      name: (name || profile.name || '').trim(),
      phone: (phone || profile.phone || '').trim(),
      dept: (dept || profile.dept || '').trim(),
      email: (email || profile.email || '').trim().toLowerCase(),
    };
    setProfile(updated);
    setUsers((prev) =>
      sanitizeUserList(
        prev.map((u) =>
          u.id === profile.id || (u.email || '').toLowerCase() === (profile.email || '').toLowerCase()
            ? updated
            : u
        )
      )
    );
    return updated;
  };

  // ── SWITCH ACCOUNT (quick switch in sidebar) ───────────────────────
  const switchAccount = (targetEmailOrId) => {
    const target = users.find(
      (u) =>
        (u.email || '').toLowerCase() === String(targetEmailOrId).toLowerCase() ||
        u.id === String(targetEmailOrId)
    );
    if (target) {
      setProfile(target);
      const sessionToken = 'switch_' + Date.now();
      localStorage.setItem(STORAGE_KEY_TOKEN, sessionToken);
      setToken(sessionToken);
      return target;
    }
    return null;
  };

  // ── LOGOUT ──────────────────────────────────────────────────────────
  const logout = () => {
    localStorage.removeItem(STORAGE_KEY_TOKEN);
    localStorage.removeItem(STORAGE_KEY_PROFILE);
    setToken(null);
    setProfile(null);
    window.dispatchEvent(new Event('findit_token_changed'));
  };

  // ── SIGNUP (alias for createUserByAdmin — used in registration flow) ─
  const signup = async (args) => createUserByAdmin(args);

  const value = useMemo(
    () => ({
      profile,
      users,
      token,
      backendStatus,
      isAuthenticated: !!token && !!profile,
      login,
      logout,
      signup,
      createUserByAdmin,
      regenerateUserOtp,
      deleteAccount,
      updateProfile,
      switchAccount,
      syncUsersFromBackend,
      displayRole,
    }),
    [profile, users, token, backendStatus]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
