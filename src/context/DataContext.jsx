import { createContext, useContext, useState, useEffect } from 'react';
import { INITIAL_ITEMS, INITIAL_CLAIMS } from '../data/mockData';
import {
  fetchPosts,
  createFoundPost,
  createLostRequest,
  submitClaimApi,
  fetchMyClaimsApi,
  fetchPostClaimsApi,
  checkBackendHealth,
  resolveClaimApi,
  patchResolutionApi,
  undoResolutionApi,
  withdrawClaimApi,
  updatePostApi,
  deletePostApi,
  fetchLostRequestsApi,
  updateLostRequestApi,
  deleteLostRequestApi,
} from '../services/api';

const DataContext = createContext(null);

const STORAGE_KEY_ITEMS = 'findit_live_items_v17';
const STORAGE_KEY_CLAIMS = 'findit_live_claims_v17';
const STORAGE_KEY_LOST_REQUESTS = 'findit_live_lost_v17';

// No predefined items: items appear strictly after being reported or registered
const INITIAL_LOST_REQUESTS = [];

export function DataProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ITEMS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to load items from storage', e);
    }
    return INITIAL_ITEMS;
  });

  const [claims, setClaims] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CLAIMS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to load claims from storage', e);
    }
    return INITIAL_CLAIMS;
  });

  const [lostRequests, setLostRequests] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_LOST_REQUESTS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('Failed to load lost requests from storage', e);
    }
    return INITIAL_LOST_REQUESTS;
  });

  const [backendSyncStatus, setBackendSyncStatus] = useState({
    connected: false,
    syncedAt: null,
    backendUrl: import.meta.env.VITE_API_BASE_URL || 'https://campus-os-backend-8sjf.onrender.com',
  });

  // Helper: check if token is a valid backend JWT (not a local/switch dummy)
  const hasValidToken = () => {
    const tk = localStorage.getItem('findit_token');
    return tk && !tk.startsWith('local_') && !tk.startsWith('switch_');
  };

  // Sync with live backend API
  const syncWithBackend = async () => {
    try {
      const health = await checkBackendHealth();
      if (health.online) {
        setBackendSyncStatus((prev) => ({
          ...prev,
          connected: true,
          syncedAt: new Date().toLocaleTimeString(),
        }));

        // Skip auth endpoints if no token or dummy token
        if (!hasValidToken()) {
          return;
        }

        // 1. Fetch posts (active + archived)
        let allServerPosts = [];
        try {
          const activePosts = await fetchPosts({ status: 'active', limit: 100 });
          if (Array.isArray(activePosts)) allServerPosts.push(...activePosts);
          try {
            const archivedPosts = await fetchPosts({ status: 'archived', limit: 100 });
            if (Array.isArray(archivedPosts)) allServerPosts.push(...archivedPosts);
          } catch (_) { /* ignore */ }

          if (allServerPosts.length > 0) {
            setItems((prevLocal) => {
              const localOnly = prevLocal.filter((m) =>
                !String(m.post_id || m.id).startsWith('FND-')
              );
              const merged = [...localOnly];
              allServerPosts.forEach((sp) => {
                const idx = merged.findIndex((m) => String(m.post_id || m.id) === String(sp.post_id));
                const normalized = {
                  post_id: sp.post_id,
                  id: sp.post_id,
                  type: 'found',
                  title: sp.title || 'Found Item',
                  category: sp.category || 'General',
                  location_found: sp.location_found || 'Campus',
                  found_on: sp.found_on || new Date().toISOString().split('T')[0],
                  status: sp.resolved
                    ? 'claimed'
                    : sp.status === 'archived'
                    ? 'archived'
                    : sp.status === 'claim_pending'
                    ? 'claim_pending'
                    : 'active',
                  resolved: sp.resolved || false,
                  resolution: sp.resolution || null,
                  uploader_name: sp.created_by_name || sp.created_by || 'Office Staff',
                  uploader_email: sp.created_by || '',
                  found_by: sp.created_by_name || sp.created_by || 'Office Staff',
                  claimed_by: sp.resolution?.claimant_name || sp.resolution?.claimant_email || null,
                  claimed_by_email: sp.resolution?.claimant_email || null,
                  claim_id: sp.resolution?.claim_id || null,
                  description: sp.description || '',
                  images: Array.isArray(sp.images)
                    ? sp.images.map((im) => (typeof im === 'string' ? im : im.url || im.image_url))
                    : [],
                  created_at: sp.created_at,
                };
                if (idx >= 0) merged[idx] = { ...merged[idx], ...normalized };
                else merged.push(normalized);
              });
              return merged;
            });
          }
        } catch (fetchErr) {
          console.log('Backend /posts note:', fetchErr?.response?.data || fetchErr.message);
        }

        // 2. Fetch lost requests
        try {
          const serverLost = await fetchLostRequestsApi();
          if (Array.isArray(serverLost)) {
            setLostRequests((prev) => {
              const localOnly = prev.filter((m) => String(m.id || m.post_id).startsWith('lost_'));
              const merged = [...localOnly];
              serverLost.forEach((sl) => {
                const reqId = sl.request_id || sl.id;
                const idx = merged.findIndex((m) => String(m.id || m.post_id) === String(reqId));
                const normalized = {
                  id: reqId,
                  post_id: reqId,
                  request_id: reqId,
                  type: 'lost',
                  title: sl.title,
                  description: sl.description || '',
                  location_lost: sl.location_lost || 'Campus',
                  location_found: sl.location_lost || 'Campus',
                  lost_on: sl.lost_on || new Date().toISOString().split('T')[0],
                  found_on: sl.lost_on || new Date().toISOString().split('T')[0],
                  status: sl.status || 'active',
                  reported_by: sl.created_by_name || 'Student',
                  owner_email: sl.created_by || '',
                  uploader_email: sl.created_by || '',
                  phone: sl.created_by_phone_number || '',
                  role: sl.created_by_role || 'student',
                  created_at: sl.created_at,
                };
                if (idx >= 0) merged[idx] = { ...merged[idx], ...normalized };
                else merged.push(normalized);
              });
              return merged;
            });

            // Also merge into items so lost reports appear on the Home page feed
            setItems((prevItems) => {
              const merged = [...prevItems];
              serverLost.forEach((sl) => {
                const reqId = sl.request_id || sl.id;
                const idx = merged.findIndex((m) => String(m.post_id || m.id) === String(reqId));
                const normalized = {
                  post_id: reqId,
                  id: reqId,
                  request_id: reqId,
                  type: 'lost',
                  title: sl.title,
                  category: 'General',
                  description: sl.description || '',
                  location_found: sl.location_lost || 'Campus',
                  location_lost: sl.location_lost || 'Campus',
                  found_on: sl.lost_on || new Date().toISOString().split('T')[0],
                  lost_on: sl.lost_on || new Date().toISOString().split('T')[0],
                  status: sl.status || 'active',
                  reported_by: sl.created_by_name || 'Student',
                  uploader_name: sl.created_by_name || 'Student',
                  owner_email: sl.created_by || '',
                  uploader_email: sl.created_by || '',
                  phone: sl.created_by_phone_number || '',
                  images: [],
                  created_at: sl.created_at,
                };
                if (idx >= 0) merged[idx] = { ...merged[idx], ...normalized };
                else merged.push(normalized);
              });
              return merged;
            });
          }
        } catch (e) {
          console.log('Backend /lost-requests note:', e?.response?.data || e.message);
        }

        // 3. Fetch Claims (current user's claims + claims on active posts for staff)
        try {
          const fetchedClaims = [];
          // My claims
          try {
            const myClaims = await fetchMyClaimsApi();
            if (Array.isArray(myClaims)) fetchedClaims.push(...myClaims);
          } catch (_) { /* ignore */ }

          // For each active post, fetch its claims so staff sees all pending claims
          for (const sp of allServerPosts.slice(0, 20)) {
            if (sp.post_id && /^FND-/.test(sp.post_id)) {
              try {
                const postClaims = await fetchPostClaimsApi(sp.post_id);
                if (Array.isArray(postClaims)) {
                  postClaims.forEach((pc) => {
                    if (!fetchedClaims.some((fc) => String(fc.claim_id) === String(pc.claim_id))) {
                      fetchedClaims.push(pc);
                    }
                  });
                }
              } catch (_) { /* ignore */ }
            }
          }

          if (fetchedClaims.length > 0) {
            setClaims((prev) => {
              const localOnly = prev.filter((c) => !/^CLM-[0-9a-f]{16}$/.test(String(c.claim_id || c.id)));
              const merged = [...localOnly];
              fetchedClaims.forEach((sc) => {
                const idx = merged.findIndex((m) => String(m.claim_id) === String(sc.claim_id));
                const matchingPost = allServerPosts.find((p) => String(p.post_id) === String(sc.post_id));
                const decision = (sc.decision || sc.status || 'pending').toLowerCase();
                const normalized = {
                  claim_id: sc.claim_id,
                  post_id: sc.post_id,
                  target_id: sc.post_id,
                  post_title: matchingPost?.title || sc.post_title || 'Found Item',
                  claimant: sc.claimant_name || sc.claimant || 'Claimant',
                  claimant_email: sc.claimant_email || '',
                  claimant_phone: sc.claimant_phone_number || '',
                  message: sc.message || '',
                  proof_snippet: (sc.message || '').slice(0, 50),
                  status: decision,
                  decision: decision,
                  created_at: sc.created_at || new Date().toISOString(),
                  resolution_note: sc.resolution_note || null,
                };
                if (idx >= 0) merged[idx] = { ...merged[idx], ...normalized };
                else merged.push(normalized);
              });
              return merged;
            });

            // Update item claim statuses
            setItems((prevItems) => {
              const updated = [...prevItems];
              fetchedClaims.forEach((sc) => {
                const idx = updated.findIndex((i) => String(i.post_id) === String(sc.post_id));
                if (idx >= 0) {
                  const decision = (sc.decision || sc.status || 'pending').toLowerCase();
                  if (decision === 'approved') {
                    updated[idx] = {
                      ...updated[idx],
                      status: 'claimed',
                      resolved: true,
                      claim_id: sc.claim_id,
                      claimed_by: sc.claimant_name || sc.claimant || 'Claimant',
                      claimed_by_email: sc.claimant_email || '',
                    };
                  } else if (decision === 'pending' && !updated[idx].resolved && updated[idx].status !== 'claimed') {
                    updated[idx] = {
                      ...updated[idx],
                      status: 'claim_pending',
                      claim_id: sc.claim_id,
                      claimed_by: sc.claimant_name || sc.claimant || 'Claimant',
                      claimed_by_email: sc.claimant_email || '',
                    };
                  }
                }
              });
              return updated;
            });
          }
        } catch (claimsErr) {
          console.log('Backend claims note:', claimsErr?.response?.data || claimsErr.message);
        }
      }
    } catch (err) {
      console.warn('Backend sync check note:', err.message);
    }
  };

  // Helper to fetch claims for a single post on demand
  const fetchPostClaims = async (postId) => {
    if (!postId || !hasValidToken()) return [];
    try {
      const serverClaims = await fetchPostClaimsApi(postId);
      if (Array.isArray(serverClaims) && serverClaims.length > 0) {
        setClaims((prev) => {
          const merged = [...prev];
          serverClaims.forEach((sc) => {
            const idx = merged.findIndex((m) => String(m.claim_id) === String(sc.claim_id));
            const decision = (sc.decision || sc.status || 'pending').toLowerCase();
            const normalized = {
              claim_id: sc.claim_id,
              post_id: sc.post_id || postId,
              target_id: sc.post_id || postId,
              claimant: sc.claimant_name || sc.claimant || 'Claimant',
              claimant_email: sc.claimant_email || '',
              claimant_phone: sc.claimant_phone_number || '',
              message: sc.message || '',
              proof_snippet: (sc.message || '').slice(0, 50),
              status: decision,
              decision: decision,
              created_at: sc.created_at || new Date().toISOString(),
              resolution_note: sc.resolution_note || null,
            };
            if (idx >= 0) merged[idx] = { ...merged[idx], ...normalized };
            else merged.push(normalized);
          });
          return merged;
        });

        // If there's an active/pending claim, mark item status
        setItems((prev) =>
          prev.map((i) => {
            if (String(i.post_id) === String(postId)) {
              const pendingClaim = serverClaims.find(
                (c) => (c.decision || c.status || 'pending').toLowerCase() === 'pending'
              );
              if (pendingClaim && i.status !== 'claimed' && !i.resolved) {
                return {
                  ...i,
                  status: 'claim_pending',
                  claim_id: pendingClaim.claim_id,
                  claimed_by: pendingClaim.claimant_name || 'Claimant',
                  claimed_by_email: pendingClaim.claimant_email || '',
                };
              }
            }
            return i;
          })
        );
        return serverClaims;
      }
    } catch (e) {
      console.warn('Fetch post claims note:', e.message);
    }
    return [];
  };

  // Sync on mount
  useEffect(() => {
    syncWithBackend();
  }, []);

  // Listen for login / token changes
  useEffect(() => {
    const handleTokenChange = () => {
      console.log('Token changed — re-syncing with backend...');
      syncWithBackend();
    };
    window.addEventListener('findit_token_changed', handleTokenChange);
    return () => window.removeEventListener('findit_token_changed', handleTokenChange);
  }, []);

  // Save items
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(items));
    } catch (e) {
      console.warn('Failed to persist items', e);
    }
  }, [items]);

  // Save claims
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_CLAIMS, JSON.stringify(claims));
    } catch (e) {
      console.warn('Failed to persist claims', e);
    }
  }, [claims]);

  // Save lost requests
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_LOST_REQUESTS, JSON.stringify(lostRequests));
    } catch (e) {
      console.warn('Failed to persist lost requests', e);
    }
  }, [lostRequests]);

  // Check if an item already has an active claim (Strict 1-claim limit)
  const getItemClaim = (postId) => {
    if (!postId) return null;
    const cleanId = String(postId);
    const item = items.find(
      (i) =>
        String(i.post_id) === cleanId ||
        String(i.id) === cleanId ||
        String(i.request_id) === cleanId ||
        String(i.local_id) === cleanId
    );
    const idSet = new Set([cleanId]);
    if (item) {
      if (item.post_id) idSet.add(String(item.post_id));
      if (item.id) idSet.add(String(item.id));
      if (item.request_id) idSet.add(String(item.request_id));
      if (item.local_id) idSet.add(String(item.local_id));
    }

    const foundInClaims = claims.find((c) => {
      const cPostId = String(c.post_id || c.target_id || c.id || '');
      const match = idSet.has(cPostId);
      const active = c.status !== 'withdrawn' && c.status !== 'rejected';
      return match && active;
    });

    if (foundInClaims) return foundInClaims;

    // Fallback: If item has claim properties attached directly from backend
    if (item && (item.claim_id || item.status === 'claim_pending' || item.status === 'claimed' || item.resolved)) {
      return {
        claim_id: item.claim_id || ('CLM-' + (item.post_id || item.id)),
        post_id: item.post_id || item.id,
        target_id: cleanId,
        post_title: item.title,
        claimant: item.claimed_by || 'Claimant',
        claimant_email: item.claimed_by_email || '',
        claimant_phone: item.claimed_by_phone || '',
        message: item.resolution_note || 'Claim under review',
        proof_snippet: item.resolution_note || 'Claim under review',
        status: item.resolved || item.status === 'claimed' ? 'approved' : 'pending',
        decision: item.resolved || item.status === 'claimed' ? 'approved' : 'pending',
        created_at: item.found_on || new Date().toISOString(),
      };
    }

    return null;
  };

  const canClaimItem = (postId) => {
    if (!postId) return false;
    const cleanId = String(postId);
    const item = items.find(
      (i) =>
        String(i.post_id) === cleanId ||
        String(i.id) === cleanId ||
        String(i.request_id) === cleanId ||
        String(i.local_id) === cleanId
    );
    if (!item) return false;
    if (
      item.resolved ||
      item.status === 'claimed' ||
      item.status === 'claim_pending' ||
      item.status === 'archived'
    ) {
      return false;
    }
    const existing = getItemClaim(postId);
    return !existing;
  };

  // Add Found Item (Office Staff: POST /api/v1/findit/posts multipart/form-data)
  // Backend PostView: { post_id, title, description, location_found, found_on, images, status, resolved, created_by }
  const addFoundItem = async (itemData, staffProfile) => {
    // Build a local optimistic entry immediately
    const localId = 'found_' + Date.now();
    const newItem = {
      post_id: localId,
      id: localId,
      type: 'found',
      title: itemData.title,
      description: itemData.description || '',
      location_found: itemData.location_found || 'Campus',
      found_on: itemData.found_on || new Date().toISOString().split('T')[0],
      category: itemData.category || 'General',
      status: 'active',
      resolved: false,
      uploader_name: staffProfile?.name || 'Office Staff',
      uploader_email: staffProfile?.email || '',
      found_by: staffProfile?.name || 'Office Staff',
      claimed_by: null,
      claimed_by_email: null,
      claim_id: null,
      images: Array.isArray(itemData.images) ? itemData.images : [],
    };
    setItems((prev) => [newItem, ...prev]);

    // Call backend API
    try {
      const formData = new FormData();
      const safeTitle = itemData.title && itemData.title.length >= 3 ? itemData.title : (itemData.title || 'Found Item');
      formData.append('title', safeTitle);
      if (itemData.description) formData.append('description', itemData.description);
      if (itemData.location_found && itemData.location_found.trim().length >= 2) {
        formData.append('location_found', itemData.location_found.trim());
      }
      if (itemData.found_on) formData.append('found_on', itemData.found_on);
      // Images: if files were selected
      if (Array.isArray(itemData.imageFiles)) {
        itemData.imageFiles.forEach((f) => formData.append('images', f));
      }
      const serverPost = await createFoundPost(formData);
      // Replace local entry with server entry
      const serverImages = Array.isArray(serverPost?.images) && serverPost.images.length > 0
        ? serverPost.images.map((im) => (typeof im === 'string' ? im : im.url || im.image_url))
        : newItem.images;

      setItems((prev) =>
        prev.map((i) =>
          i.post_id === localId
            ? {
                ...newItem,
                post_id: serverPost.post_id || localId,
                id: serverPost.post_id || localId,
                status: serverPost.status || 'active',
                uploader_email: serverPost.created_by || staffProfile?.email || '',
                images: serverImages,
              }
            : i
        )
      );
      return {
        ...newItem,
        post_id: serverPost.post_id || localId,
        id: serverPost.post_id || localId,
        images: serverImages,
      };
    } catch (apiErr) {
      console.warn('Create post API note:', apiErr?.response?.data || apiErr.message);
      return newItem;
    }
  };

  // Upload a Lost Item Request (Student / Non-admin: POST /api/v1/findit/lost-requests)
  const reportLostItem = async (reportData, currentUser) => {
    const nextId = 'lost_' + Date.now();

    const uploaderName = currentUser?.name || reportData.reported_by || 'Student';
    const uploaderEmail = currentUser?.email || 'student@team18.com';
    const uploaderPhone = currentUser?.phone || reportData.phone || '+1 (555) 019-3344';
    const uploaderDept = currentUser?.department || reportData.department || 'Computer Science';

    const newLostReq = {
      id: nextId,
      post_id: nextId,
      type: 'lost',
      title: reportData.title || 'Missing Item',
      category: reportData.category || 'General',
      location_lost: reportData.location_lost || 'Campus',
      location_found: reportData.location_lost || 'Campus',
      lost_on: reportData.lost_on || new Date().toISOString().split('T')[0],
      found_on: reportData.lost_on || new Date().toISOString().split('T')[0],
      status: 'active',
      reported_by: uploaderName,
      uploader_name: uploaderName,
      owner_email: uploaderEmail,
      uploader_email: uploaderEmail,
      phone: uploaderPhone,
      uploader_phone: uploaderPhone,
      department: uploaderDept,
      description: reportData.description || '',
      images: Array.isArray(reportData.images) ? reportData.images : [],
    };

    // Add to items (so it immediately displays on the Home page grid!) and to lostRequests
    setItems((prev) => [newLostReq, ...prev]);
    setLostRequests((prev) => [newLostReq, ...prev]);

    // Send to live Backend API
    try {
      const loc = (newLostReq.location_lost || '').trim();
      const safeTitle = newLostReq.title && newLostReq.title.length >= 3 ? newLostReq.title : 'Missing Item';
      const serverLost = await createLostRequest({
        title: safeTitle,
        description: newLostReq.description?.trim() || undefined,
        location_lost: loc.length >= 2 ? loc : undefined,
        lost_on: newLostReq.lost_on || undefined,
      });
      if (serverLost?.request_id) {
        newLostReq.post_id = serverLost.request_id;
        newLostReq.id = serverLost.request_id;
        newLostReq.request_id = serverLost.request_id;
        newLostReq.local_id = nextId;
        setItems((prev) =>
          prev.map((i) =>
            i.post_id === nextId
              ? {
                  ...i,
                  post_id: serverLost.request_id,
                  id: serverLost.request_id,
                  request_id: serverLost.request_id,
                  local_id: nextId,
                }
              : i
          )
        );
        setLostRequests((prev) =>
          prev.map((r) =>
            r.id === nextId
              ? {
                  ...r,
                  id: serverLost.request_id,
                  post_id: serverLost.request_id,
                  request_id: serverLost.request_id,
                  local_id: nextId,
                }
              : r
          )
        );
      }
      console.log('Successfully synced lost item to backend /api/v1/findit/lost-requests');
    } catch (backendErr) {
      console.warn('Backend lost-requests API call note:', backendErr?.response?.data || backendErr.message);
    }

    return newLostReq;
  };

  // Archive / edit lost request (owner action: PATCH /lost-requests/{id})
  const archiveLostRequest = async (requestId) => {
    setLostRequests((prev) =>
      prev.map((r) =>
        String(r.id) === String(requestId) || String(r.post_id) === String(requestId) || String(r.request_id) === String(requestId)
          ? { ...r, status: 'archived' }
          : r
      )
    );
    setItems((prev) =>
      prev.map((i) =>
        String(i.id) === String(requestId) || String(i.post_id) === String(requestId) || String(i.request_id) === String(requestId)
          ? { ...i, status: 'archived' }
          : i
      )
    );
    if (!String(requestId).startsWith('lost_')) {
      try {
        await updateLostRequestApi(requestId, { status: 'archived' });
      } catch (e) {
        // ignore
      }
    }
  };

  const deleteLostRequest = async (requestId) => {
    const cleanId = String(requestId);
    setLostRequests((prev) =>
      prev.filter(
        (r) =>
          String(r.id) !== cleanId &&
          String(r.post_id) !== cleanId &&
          String(r.request_id) !== cleanId
      )
    );
    setItems((prev) =>
      prev.filter(
        (i) =>
          String(i.id) !== cleanId &&
          String(i.post_id) !== cleanId &&
          String(i.request_id) !== cleanId
      )
    );
    if (!cleanId.startsWith('lost_')) {
      try {
        await deleteLostRequestApi(cleanId);
      } catch (e) {
        console.warn('Delete lost request API note:', e.message);
      }
    }
  };

  // Edit Lost Request (owner action: PATCH /lost-requests/{id})
  const editLostRequest = async (requestId, updatedFields) => {
    setLostRequests((prev) =>
      prev.map((r) => (String(r.id) === String(requestId) ? { ...r, ...updatedFields } : r))
    );
    if (!String(requestId).startsWith('lost_')) {
      try {
        await updateLostRequestApi(requestId, updatedFields);
      } catch (e) {
        console.warn('Update lost request API note:', e.message);
      }
    }
  };

  // Submit Claim (Student: POST /api/v1/findit/posts/{post_id}/claims  { message })
  // Backend ClaimView uses: claim_id, post_id, claimant_email, claimant_name,
  //   claimant_phone_number, message, decision:'pending'|'approved'|'rejected'
  const submitClaim = async (postId, proofText, currentUser) => {
    if (!postId) {
      throw new Error('Item ID is missing. Cannot submit claim.');
    }

    const cleanId = String(postId);
    const post = items.find(
      (i) =>
        String(i.post_id) === cleanId ||
        String(i.id) === cleanId ||
        String(i.request_id) === cleanId ||
        String(i.local_id) === cleanId
    );

    // Enforce min 10 chars (backend validation)
    if (!proofText || proofText.trim().length < 10) {
      throw new Error('Please provide at least 10 characters describing why this item is yours.');
    }

    // STRICT CHECK: Only one active claim allowed per item
    const existingClaim = getItemClaim(cleanId);
    if (existingClaim) {
      throw new Error('This item already has an active claim. Only one claim is allowed per item.');
    }

    const claimantName  = currentUser?.name || 'Student Candidate';
    const claimantEmail = currentUser?.email || 'student@team18.com';
    const claimantPhone = currentUser?.phone || '';
    const targetPostId = post?.post_id || cleanId;

    const itemIds = new Set([cleanId, String(targetPostId)]);
    if (post?.id) itemIds.add(String(post.id));
    if (post?.local_id) itemIds.add(String(post.local_id));

    // Try backend if post matches backend pattern
    if (/^FND-[0-9]{13}-[0-9a-f]{8}$/.test(String(targetPostId))) {
      try {
        const serverClaim = await submitClaimApi(targetPostId, proofText.trim());
        // Use backend-generated claim_id
        const newClaim = {
          claim_id: serverClaim.claim_id,
          post_id: targetPostId,
          target_id: cleanId,
          post_title: post?.title || 'Found Item',
          claimant: serverClaim.claimant_name || claimantName,
          claimant_email: serverClaim.claimant_email || claimantEmail,
          claimant_phone: serverClaim.claimant_phone_number || claimantPhone,
          message: serverClaim.message || proofText,
          proof_snippet: proofText.slice(0, 50),
          status: 'pending',        // local status for filtering
          decision: 'pending',      // backend field
          created_at: serverClaim.created_at || new Date().toISOString(),
        };
        setClaims((prev) => [newClaim, ...prev]);
        setItems((prev) =>
          prev.map((item) => {
            const match =
              itemIds.has(String(item.post_id)) ||
              itemIds.has(String(item.id)) ||
              itemIds.has(String(item.local_id));
            return match
              ? {
                  ...item,
                  status: 'claim_pending',
                  claim_id: newClaim.claim_id,
                  claimed_by: claimantName,
                  claimed_by_email: claimantEmail,
                }
              : item;
          })
        );
        return newClaim;
      } catch (backendErr) {
        const errCode = backendErr?.response?.data?.error?.code;
        const errMsg  = backendErr?.response?.data?.error?.message || backendErr.message;
        if (backendErr?.response?.status === 409) {
          throw new Error(errMsg || 'This item is already claimed.');
        }
        console.warn('Backend claim API note, falling back to local claim:', errMsg);
      }
    }

    // Fallback: local claim
    const nextClaimId = 'CLM-local-' + Date.now();
    const newClaim = {
      claim_id: nextClaimId,
      post_id: targetPostId,
      target_id: cleanId,
      post_title: post?.title || 'Found Item',
      claimant: claimantName,
      claimant_email: claimantEmail,
      claimant_phone: claimantPhone,
      message: proofText,
      proof_snippet: proofText.slice(0, 50),
      status: 'pending',
      decision: 'pending',
      created_at: new Date().toISOString(),
    };
    setClaims((prev) => [newClaim, ...prev]);
    setItems((prev) =>
      prev.map((item) => {
        const match =
          itemIds.has(String(item.post_id)) ||
          itemIds.has(String(item.id)) ||
          itemIds.has(String(item.local_id));
        return match
          ? {
              ...item,
              status: 'claim_pending',
              claim_id: nextClaimId,
              claimed_by: claimantName,
              claimed_by_email: claimantEmail,
            }
          : item;
      })
    );
    return newClaim;
  };

  // Withdraw Claim while pending (Claimant action: DELETE /claims/{id})
  const withdrawClaim = async (claimId) => {
    const target = claims.find((c) => String(c.claim_id) === String(claimId));
    if (!target) return;

    setClaims((prev) =>
      prev.map((c) => (String(c.claim_id) === String(claimId) ? { ...c, status: 'withdrawn' } : c))
    );

    // Free the post back to 'active'
    if (target.post_id) {
      setItems((prev) =>
        prev.map((item) => {
          const match =
            String(item.post_id) === String(target.post_id) ||
            String(item.id) === String(target.post_id) ||
            String(item.local_id) === String(target.post_id) ||
            (target.target_id && (String(item.post_id) === String(target.target_id) || String(item.id) === String(target.target_id)));
          return match
            ? {
                ...item,
                status: 'active',
                claim_id: null,
                claimed_by: null,
                claimed_by_email: null,
                claimed_by_phone: null,
              }
            : item;
        })
      );
    }

    if (/^CLM-[0-9a-f]{16}$/.test(String(claimId))) {
      try {
        await withdrawClaimApi(claimId);
      } catch (e) {
        console.warn('Withdraw claim backend note:', e.message);
      }
    }
  };

  // Staff Action: Resolve post by approving one claim (POST /api/v1/findit/posts/{post_id}/resolution)
  // Backend ResolutionCreate: { claim_id: "CLM-...", note?: string (1-500 chars) }
  // Response (201): PostView with resolved: true, status: 'archived', resolution: ResolutionView
  const resolvePost = async (postId, claimId, note = 'Proof verified in-person at campus desk.') => {
    const safeNote =
      typeof note === 'string' && note.trim().length >= 1
        ? note.trim().slice(0, 500)
        : 'Proof verified in-person at campus desk.';

    // 1. Resolve matching item and claim to find valid backend IDs if present
    const matchedItem = items.find(
      (i) =>
        String(i.post_id) === String(postId) ||
        String(i.id) === String(postId) ||
        String(i.local_id) === String(postId) ||
        String(i.claim_id) === String(claimId)
    );

    let backendPostId = null;
    if (postId && /^FND-[0-9]{13}-[0-9a-f]{8}$/.test(String(postId).trim())) {
      backendPostId = String(postId).trim();
    } else if (matchedItem?.post_id && /^FND-[0-9]{13}-[0-9a-f]{8}$/.test(String(matchedItem.post_id).trim())) {
      backendPostId = String(matchedItem.post_id).trim();
    }

    const matchedClaim = claims.find(
      (c) =>
        String(c.claim_id || c.id) === String(claimId) ||
        (backendPostId && (String(c.post_id) === String(backendPostId) || String(c.target_id) === String(backendPostId)))
    );

    let backendClaimId = null;
    if (claimId && /^CLM-[0-9a-fA-F]{16}$/.test(String(claimId).trim())) {
      backendClaimId = String(claimId).trim();
    } else if (matchedClaim?.claim_id && /^CLM-[0-9a-fA-F]{16}$/.test(String(matchedClaim.claim_id).trim())) {
      backendClaimId = String(matchedClaim.claim_id).trim();
    }

    if (!backendPostId && matchedClaim?.post_id && /^FND-[0-9]{13}-[0-9a-f]{8}$/.test(String(matchedClaim.post_id).trim())) {
      backendPostId = String(matchedClaim.post_id).trim();
    }

    const approvedClaimant = matchedClaim?.claimant || matchedClaim?.claimant_name || matchedItem?.claimed_by || 'Claimant';
    const approvedEmail = matchedClaim?.claimant_email || matchedItem?.claimed_by_email || '';
    const approvedPhone = matchedClaim?.claimant_phone || matchedClaim?.claimant_phone_number || matchedItem?.claimed_by_phone || '';

    // 2. Call backend resolution API if target post & claim are backend-managed
    let serverResponse = null;
    if (backendPostId && backendClaimId && hasValidToken()) {
      try {
        serverResponse = await resolveClaimApi(backendPostId, {
          claim_id: backendClaimId,
          note: safeNote,
        });
        console.log('Successfully resolved post on backend API:', serverResponse);
      } catch (backendErr) {
        console.error('Backend resolution API error:', backendErr?.response?.data || backendErr.message);
        throw backendErr;
      }
    }

    const effectivePostId = backendPostId || postId;
    const effectiveClaimId = backendClaimId || claimId;

    // 3. Update local claims: the chosen claim is approved, other claims on this post are rejected
    setClaims((prev) => {
      let found = false;
      const updated = prev.map((c) => {
        const isTargetClaim =
          String(c.claim_id || c.id) === String(effectiveClaimId) ||
          String(c.claim_id || c.id) === String(claimId);

        const isPostMatch =
          String(c.post_id) === String(effectivePostId) ||
          String(c.target_id) === String(effectivePostId) ||
          String(c.post_id) === String(postId) ||
          String(c.target_id) === String(postId);

        if (isTargetClaim) {
          found = true;
          return {
            ...c,
            status: 'approved',
            decision: 'approved',
            resolution_note: safeNote,
            resolved_at: new Date().toISOString(),
          };
        }
        if (isPostMatch && !isTargetClaim) {
          return {
            ...c,
            status: 'rejected',
            decision: 'rejected',
          };
        }
        return c;
      });

      if (!found && (effectiveClaimId || claimId)) {
        updated.unshift({
          claim_id: effectiveClaimId || claimId,
          id: effectiveClaimId || claimId,
          post_id: effectivePostId || postId,
          target_id: effectivePostId || postId,
          post_title: matchedItem?.title || 'Campus Item',
          claimant: approvedClaimant,
          claimant_email: approvedEmail,
          claimant_phone: approvedPhone,
          message: safeNote,
          proof_snippet: safeNote.slice(0, 50),
          status: 'approved',
          decision: 'approved',
          resolution_note: safeNote,
          created_at: new Date().toISOString(),
        });
      }
      return updated;
    });

    // 4. Update local items: post is marked claimed & resolved
    setItems((prev) =>
      prev.map((item) => {
        const match =
          String(item.post_id) === String(effectivePostId) ||
          String(item.id) === String(effectivePostId) ||
          String(item.post_id) === String(postId) ||
          String(item.id) === String(postId) ||
          String(item.local_id) === String(postId) ||
          String(item.claim_id) === String(effectiveClaimId) ||
          String(item.claim_id) === String(claimId);

        return match
          ? {
              ...item,
              status: 'claimed',
              resolved: true,
              resolution_note: safeNote,
              claimed_by: approvedClaimant,
              claimed_by_email: approvedEmail,
              claimed_by_phone: approvedPhone,
              claim_id: effectiveClaimId || claimId,
              resolution: serverResponse?.resolution || {
                claim_id: effectiveClaimId || claimId,
                claimant_email: approvedEmail,
                note: safeNote,
                resolved_at: new Date().toISOString(),
              },
            }
          : item;
      })
    );

    return serverResponse || { success: true };
  };

  // Staff Action: Undo resolution (DELETE /posts/{id}/resolution)
  const undoResolution = async (postId) => {
    setClaims((prev) =>
      prev.map((c) =>
        String(c.post_id) === String(postId)
          ? { ...c, status: 'pending', decision: 'pending', resolution_note: null }
          : c
      )
    );

    setItems((prev) =>
      prev.map((item) =>
        String(item.post_id || item.id) === String(postId)
          ? {
              ...item,
              status: 'claim_pending',
              resolved: false,
              resolution_note: null,
              resolution: null,
            }
          : item
      )
    );

    if (!String(postId).startsWith('found_') && !String(postId).startsWith('lost_')) {
      try {
        await undoResolutionApi(postId);
      } catch (e) {
        console.warn('Undo resolution API note:', e.message);
      }
    }
  };

  // Staff Action: Change resolution note (PATCH /posts/{id}/resolution)
  const changeResolution = async (postId, claimId, note) => {
    setClaims((prev) =>
      prev.map((c) =>
        String(c.claim_id) === String(claimId)
          ? { ...c, resolution_note: note }
          : c
      )
    );
    setItems((prev) =>
      prev.map((item) =>
        String(item.post_id) === String(postId)
          ? { ...item, resolution_note: note }
          : item
      )
    );
    if (!String(postId).startsWith('found_') && !String(postId).startsWith('lost_')) {
      try {
        await patchResolutionApi(postId, {
          ...(claimId && /^CLM-[0-9a-f]{16}$/.test(String(claimId)) ? { claim_id: claimId } : {}),
          note,
        });
      } catch (e) {
        console.warn('Change resolution API note:', e.message);
      }
    }
  };

  // Archive post (Office Staff / Admin action: PATCH /posts/{id} status=archived)
  const archiveItem = async (postId) => {
    setItems((prev) =>
      prev.map((i) => (String(i.post_id) === String(postId) ? { ...i, status: 'archived' } : i))
    );
    if (!String(postId).startsWith('found_') && !String(postId).startsWith('lost_')) {
      try {
        await updatePostApi(postId, { status: 'archived' });
      } catch (e) {
        // ignore
      }
    }
  };

  // Reopen post (Office Staff / Admin action: PATCH /posts/{id} status=active)
  const reopenItem = async (postId) => {
    setItems((prev) =>
      prev.map((i) => {
        if (String(i.post_id) === String(postId)) {
          const existing = getItemClaim(postId);
          const nextStatus = existing
            ? existing.status === 'approved'
              ? 'claimed'
              : 'claim_pending'
            : 'active';
          return { ...i, status: nextStatus };
        }
        return i;
      })
    );
    if (!String(postId).startsWith('found_') && !String(postId).startsWith('lost_')) {
      try {
        await updatePostApi(postId, { status: 'active' });
      } catch (e) {
        // ignore
      }
    }
  };

  // Delete post (Office Staff action: DELETE /posts/{id} - not while a claim is pending)
  const deleteItem = async (postId) => {
    const cleanId = String(postId);
    const post = items.find(
      (i) =>
        String(i.post_id) === cleanId ||
        String(i.id) === cleanId ||
        String(i.local_id) === cleanId
    );
    const pending = claims.find(
      (c) =>
        (String(c.post_id) === cleanId ||
          (post && String(c.post_id) === String(post.post_id))) &&
        c.status === 'pending'
    );
    if (pending) {
      throw new Error('Cannot delete a post while a claim is pending resolution.');
    }

    const removeIds = new Set([cleanId]);
    if (post) {
      if (post.post_id) removeIds.add(String(post.post_id));
      if (post.id) removeIds.add(String(post.id));
      if (post.local_id) removeIds.add(String(post.local_id));
    }

    setItems((prev) =>
      prev.filter(
        (i) =>
          !removeIds.has(String(i.post_id)) &&
          !removeIds.has(String(i.id)) &&
          !removeIds.has(String(i.local_id))
      )
    );
    setClaims((prev) =>
      prev.filter(
        (c) =>
          !removeIds.has(String(c.post_id)) &&
          !removeIds.has(String(c.target_id || ''))
      )
    );

    const targetServerId = post?.post_id || cleanId;
    if (String(targetServerId).startsWith('FND-')) {
      try {
        await deletePostApi(targetServerId);
      } catch (e) {
        console.warn('Delete post backend note:', e.message);
      }
    }
  };

  // Staff Action: Edit post (PATCH /posts/{id} - not while a claim is pending)
  const editItem = async (postId, updateFields) => {
    const pending = claims.find(
      (c) => String(c.post_id) === String(postId) && c.status === 'pending'
    );
    if (pending) {
      throw new Error('Cannot edit a post while a claim is pending resolution.');
    }
    setItems((prev) =>
      prev.map((item) =>
        String(item.post_id) === String(postId)
          ? { ...item, ...updateFields }
          : item
      )
    );
    if (!String(postId).startsWith('found_') && !String(postId).startsWith('lost_')) {
      try {
        await updatePostApi(postId, updateFields);
      } catch (e) {
        console.warn('Update post API note:', e.message);
      }
    }
  };

  // Legacy alias for admin compatibility
  const approveClaim = (claimId, note = 'Proof verified in-person at campus desk.') => {
    const claim = claims.find((c) => String(c.claim_id || c.id) === String(claimId));
    if (claim) {
      return resolvePost(claim.post_id, claimId, note);
    }
  };

  const rejectClaim = (claimId) => {
    const claim = claims.find((c) => String(c.claim_id) === String(claimId));
    setClaims((prev) =>
      prev.map((c) => (String(c.claim_id) === String(claimId) ? { ...c, status: 'rejected' } : c))
    );
    if (claim?.post_id) {
      setItems((prev) =>
        prev.map((item) =>
          String(item.post_id) === String(claim.post_id)
            ? {
                ...item,
                status: 'active',
                claim_id: null,
                claimed_by: null,
                claimed_by_email: null,
                claimed_by_phone: null,
              }
            : item
        )
      );
    }
  };

  // Helper filters
  const activeItems = items.filter((i) => i.status !== 'archived');
  const availableToClaimItems = items.filter((i) => i.status === 'active');
  const archivedItems = items.filter((i) => i.status === 'archived');
  const pendingClaims = claims.filter((c) => c.status === 'pending');
  const resolvedClaims = claims.filter((c) => c.status === 'approved' || c.status === 'rejected');
  const approvedClaims = claims.filter((c) => c.status === 'approved');
  const rejectedClaims = claims.filter((c) => c.status === 'rejected');

  const value = {
    items,
    activeItems,
    availableToClaimItems,
    archivedItems,
    claims,
    pendingClaims,
    resolvedClaims,
    approvedClaims,
    rejectedClaims,
    lostRequests,
    backendSyncStatus,
    addFoundItem,
    reportLostItem,
    archiveLostRequest,
    editLostRequest,
    deleteLostRequest,
    submitClaim,
    withdrawClaim,
    resolvePost,
    changeResolution,
    undoResolution,
    getItemClaim,
    canClaimItem,
    approveClaim,
    rejectClaim,
    archiveItem,
    reopenItem,
    editItem,
    deleteItem,
    fetchPostClaims,
    refreshData: syncWithBackend,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export const useData = () => useContext(DataContext);
