import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://campus-os-backend-8sjf.onrender.com';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach Bearer token from localStorage to every request (skip dummy local/switch tokens)
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('findit_token') || localStorage.getItem('findit_token_v4');
    if (token && !token.startsWith('local_') && !token.startsWith('switch_')) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn('Backend 401: invalid/expired token');
    }
    return Promise.reject(error);
  }
);

// Helper: extract readable error message from backend response
export const messageOf = (e) => {
  if (e?.response?.data?.error?.message) {
    return e.response.data.error.message;
  }
  if (Array.isArray(e?.response?.data?.detail)) {
    return e.response.data.detail.map((d) => d.msg || d.message || JSON.stringify(d)).join('; ');
  }
  if (typeof e?.response?.data?.detail === 'string') {
    return e.response.data.detail;
  }
  return e?.message || 'An unexpected error occurred';
};

// ── Health ──────────────────────────────────────────────────────
export const checkBackendHealth = async () => {
  try {
    const { data } = await api.get('/health');
    return { online: true, data };
  } catch (err) {
    return { online: false, error: err.message };
  }
};

// ── Auth ─────────────────────────────────────────────────────────
// Admin: POST /api/v1/auth/admin/login  { email_id, otp }
// User:  POST /api/v1/auth/login        { email_id, otp }
// Both return: { access_token, token_type, expires_in, profile }
export const authLogin = async (email_id, otp, isAdmin = false) => {
  const endpoint = isAdmin ? '/api/v1/auth/admin/login' : '/api/v1/auth/login';
  const { data } = await api.post(endpoint, { email_id, otp });
  return data; // { access_token, profile }
};

// ── Admin User Management ────────────────────────────────────────
// GET /api/v1/admin/users  →  { items: [AdminUserView], count, next_cursor }
// AdminUserView: { role, name, email_id, phone_number, dept, usn?, designation?, otp, created_at }
export const fetchAdminUsersApi = async () => {
  const { data } = await api.get('/api/v1/admin/users');
  return data?.items || [];
};

// POST /api/v1/admin/users
// StudentCreate:    { role:'student',    name, usn, dept, email_id, phone_number }
// OfficeStaffCreate:{ role:'office_staff', name, dept, designation, email_id, phone_number }
export const createAdminUserApi = async (userData) => {
  const { data } = await api.post('/api/v1/admin/users', userData);
  return data; // AdminUserView (includes otp!)
};

// GET /api/v1/admin/users/{email_id}
export const getAdminUserApi = async (email_id) => {
  const { data } = await api.get(`/api/v1/admin/users/${encodeURIComponent(email_id)}`);
  return data;
};

// POST /api/v1/admin/users/{email_id}/regenerate-otp
export const regenerateUserOtpApi = async (email_id) => {
  const { data } = await api.post(`/api/v1/admin/users/${encodeURIComponent(email_id)}/regenerate-otp`);
  return data; // { otp: '...' }
};

// DELETE /api/v1/admin/users/{email_id}
export const deleteAdminUserApi = async (email_id) => {
  const { data } = await api.delete(`/api/v1/admin/users/${encodeURIComponent(email_id)}`);
  return data;
};

// GET /api/v1/admin/me  (admin profile)
export const fetchAdminMe = async () => {
  const { data } = await api.get('/api/v1/admin/me');
  return data;
};

// GET /api/v1/users/me  (student/staff profile)
export const fetchUserMe = async () => {
  const { data } = await api.get('/api/v1/users/me');
  return data;
};

// ── Found Item Posts ─────────────────────────────────────────────
// GET /api/v1/findit/posts?status=active
// Returns PostList: { count, items: [PostView], next_cursor }
// PostView: { post_id, title, description, location_found, found_on, images:[{url}], status, resolved, resolution, created_by, created_at }
export const fetchPosts = async (params = { status: 'active', limit: 100 }) => {
  const { data } = await api.get('/api/v1/findit/posts', { params });
  return data?.items || [];
};

// GET /api/v1/findit/posts/{post_id}
export const fetchPostDetails = async (postId) => {
  const { data } = await api.get(`/api/v1/findit/posts/${encodeURIComponent(postId)}`);
  return data?.post || data;
};

// Helper to convert plain object to FormData for multipart endpoints
const toFormData = (data) => {
  if (data instanceof FormData) return data;
  const fd = new FormData();
  if (data && typeof data === 'object') {
    Object.entries(data).forEach(([k, v]) => {
      if (v !== undefined && v !== null) {
        if (Array.isArray(v)) {
          v.forEach((item) => fd.append(k, item));
        } else {
          fd.append(k, v);
        }
      }
    });
  }
  return fd;
};

// POST /api/v1/findit/posts  (multipart/form-data)
// fields: title (required), description?, location_found?, found_on? (YYYY-MM-DD), images[]?
export const createFoundPost = async (formDataOrObj) => {
  const body = toFormData(formDataOrObj);
  const { data } = await api.post('/api/v1/findit/posts', body, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};

// PATCH /api/v1/findit/posts/{post_id}  (multipart/form-data)
export const updatePostApi = async (postId, updateData) => {
  const body = toFormData(updateData);
  const { data } = await api.patch(
    `/api/v1/findit/posts/${encodeURIComponent(postId)}`,
    body,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return data;
};

// DELETE /api/v1/findit/posts/{post_id}
export const deletePostApi = async (postId) => {
  const { data } = await api.delete(`/api/v1/findit/posts/${encodeURIComponent(postId)}`);
  return data;
};

// ── Claims ───────────────────────────────────────────────────────
// POST /api/v1/findit/posts/{post_id}/claims  { message }
// ClaimCreate: { message: string (10-1000 chars) }
// ClaimView: { claim_id, post_id, claimant_email, claimant_name, claimant_role, claimant_phone_number, message, status, decision:'pending'|'approved'|'rejected', created_at }
export const submitClaimApi = async (postId, message) => {
  const { data } = await api.post(
    `/api/v1/findit/posts/${encodeURIComponent(postId)}/claims`,
    { message }
  );
  return data;
};

// GET /api/v1/findit/posts/{post_id}/claims  (staff: all claims; student: own)
export const fetchPostClaimsApi = async (postId) => {
  const { data } = await api.get(`/api/v1/findit/posts/${encodeURIComponent(postId)}/claims`);
  return data?.items || [];
};

// GET /api/v1/findit/claims/me  (current user's claims)
export const fetchMyClaimsApi = async () => {
  const { data } = await api.get('/api/v1/findit/claims/me');
  return data?.items || [];
};

// GET /api/v1/findit/claims/{claim_id}
export const fetchClaimApi = async (claimId) => {
  const { data } = await api.get(`/api/v1/findit/claims/${encodeURIComponent(claimId)}`);
  return data;
};

// DELETE /api/v1/findit/claims/{claim_id}  (claimant withdraws while pending)
export const withdrawClaimApi = async (claimId) => {
  const { data } = await api.delete(`/api/v1/findit/claims/${encodeURIComponent(claimId)}`);
  return data;
};

// ── Resolution ───────────────────────────────────────────────────
// GET /api/v1/findit/posts/{post_id}/resolution (office staff)
export const fetchResolutionApi = async (postId) => {
  const { data } = await api.get(
    `/api/v1/findit/posts/${encodeURIComponent(postId)}/resolution`
  );
  return data;
};

// POST /api/v1/findit/posts/{post_id}/resolution  { claim_id, note? }
// ResolutionCreate: { claim_id: 'CLM-...', note?: string }
export const resolveClaimApi = async (postId, { claim_id, note }) => {
  const cleanPostId = String(postId || '').trim();
  const cleanClaimId = String(claim_id || '').trim();
  const payload = { claim_id: cleanClaimId };
  if (note && typeof note === 'string' && note.trim().length >= 1) {
    payload.note = note.trim().slice(0, 500);
  }
  const { data } = await api.post(
    `/api/v1/findit/posts/${encodeURIComponent(cleanPostId)}/resolution`,
    payload
  );
  return data;
};

// PATCH /api/v1/findit/posts/{post_id}/resolution  { claim_id?, note? }
export const patchResolutionApi = async (postId, payload = {}) => {
  const body = {};
  if (payload.claim_id && /^CLM-[0-9a-f]{16}$/.test(payload.claim_id)) {
    body.claim_id = payload.claim_id;
  }
  if (payload.note && payload.note.trim().length >= 1) {
    body.note = payload.note.trim().slice(0, 500);
  }
  const { data } = await api.patch(
    `/api/v1/findit/posts/${encodeURIComponent(postId)}/resolution`,
    body
  );
  return data;
};

// DELETE /api/v1/findit/posts/{post_id}/resolution  (undo resolution)
export const undoResolutionApi = async (postId) => {
  const { data } = await api.delete(
    `/api/v1/findit/posts/${encodeURIComponent(postId)}/resolution`
  );
  return data;
};

// ── Lost Item Requests ────────────────────────────────────────────
// GET /api/v1/findit/lost-requests?status=active
// LostList: { items: [LostView], count, next_cursor }
// LostView: { request_id, title, description, location_lost, lost_on, status, created_by, created_by_name, created_by_role, created_by_phone_number, created_at }
export const fetchLostRequestsApi = async (params = {}) => {
  const { data } = await api.get('/api/v1/findit/lost-requests', { params });
  return data?.items || data || [];
};

// POST /api/v1/findit/lost-requests
// LostCreate: { title (required), description?, location_lost?, lost_on? }  (additionalProperties: false)
export const createLostRequest = async (lostData) => {
  const payload = {
    title: lostData.title,
    ...(lostData.description ? { description: lostData.description } : {}),
    ...(lostData.location_lost ? { location_lost: lostData.location_lost } : {}),
    ...(lostData.lost_on ? { lost_on: lostData.lost_on } : {}),
  };
  const { data } = await api.post('/api/v1/findit/lost-requests', payload);
  return data;
};

// PATCH /api/v1/findit/lost-requests/{request_id}
// LostUpdate: { title?, description?, location_lost?, lost_on?, status? }  (additionalProperties: false)
export const updateLostRequestApi = async (requestId, patchData) => {
  const payload = {};
  if (patchData.title !== undefined) payload.title = patchData.title;
  if (patchData.description !== undefined) payload.description = patchData.description;
  if (patchData.location_lost !== undefined) payload.location_lost = patchData.location_lost;
  if (patchData.lost_on !== undefined) payload.lost_on = patchData.lost_on;
  if (patchData.status !== undefined) payload.status = patchData.status;

  const { data } = await api.patch(
    `/api/v1/findit/lost-requests/${encodeURIComponent(requestId)}`,
    payload
  );
  return data;
};

// DELETE /api/v1/findit/lost-requests/{request_id}
export const deleteLostRequestApi = async (requestId) => {
  const { data } = await api.delete(
    `/api/v1/findit/lost-requests/${encodeURIComponent(requestId)}`
  );
  return data;
};

export default api;
