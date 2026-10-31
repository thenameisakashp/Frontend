import { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Crown, Package, Clock, CheckCircle2, Archive, Eye,
  UserPlus, KeyRound, Trash2, Phone, Mail, Building2,
  RefreshCw, LogIn, GraduationCap, Users, Loader2, AlertCircle,
  RotateCcw, Check, X, Shield,
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';

export default function AdminDashboard() {
  const {
    items, activeItems, archivedItems,
    claims, pendingClaims, resolvedClaims,
    archiveItem, reopenItem, deleteItem,
    resolvePost, undoResolution, rejectClaim,
  } = useData();

  const {
    users, createUserByAdmin, regenerateUserOtp,
    deleteAccount, switchAccount, profile, syncUsersFromBackend, displayRole,
  } = useAuth();

  const navigate = useNavigate();

  // Tabs: 'found' (default from screenshot), 'pending', 'resolved', 'archived', 'users'
  const [activeTab, setActiveTab] = useState('found');
  const [actionNotice, setActionNotice] = useState('');
  const [noticeType, setNoticeType] = useState('success');

  // Create User Form State
  const [newName, setNewName]               = useState('');
  const [newEmail, setNewEmail]             = useState('');
  const [newRole, setNewRole]               = useState('student');
  const [newPhone, setNewPhone]             = useState('');
  const [newDept, setNewDept]               = useState('');
  const [newUsn, setNewUsn]                 = useState('');
  const [newDesignation, setNewDesignation] = useState('');
  const [createLoading, setCreateLoading]   = useState(false);
  const [createError, setCreateError]       = useState('');
  const [lastCreatedOtp, setLastCreatedOtp] = useState('');

  const [roleFilter, setRoleFilter]         = useState('all');
  const [syncLoading, setSyncLoading]       = useState(false);

  const showNotice = (msg, type = 'success') => {
    setNoticeType(type);
    setActionNotice(msg);
    setTimeout(() => setActionNotice(''), 5000);
  };

  const handleSyncUsers = async () => {
    setSyncLoading(true);
    try {
      await syncUsersFromBackend();
      showNotice('User directory refreshed from backend.');
    } catch {
      showNotice('Could not sync users from backend.', 'error');
    } finally {
      setSyncLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setCreateError('');
    setLastCreatedOtp('');
    setCreateLoading(true);

    try {
      const created = await createUserByAdmin({
        name: newName,
        email: newEmail,
        phone: newPhone,
        dept: newDept,
        role: newRole,
        usn: newUsn,
        designation: newDesignation || newDept,
      });

      const otp = created.otp || created.password || '(check backend)';
      setLastCreatedOtp(otp);
      showNotice(`✓ User "${created.name}" created as ${displayRole(created.role)}. OTP: ${otp}`);

      setNewName(''); setNewEmail(''); setNewPhone('');
      setNewDept(''); setNewUsn(''); setNewDesignation('');
    } catch (err) {
      setCreateError(err.message || 'Failed to create user.');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleRegenerateOtp = async (userEmail, userName) => {
    try {
      const otp = await regenerateUserOtp(userEmail);
      showNotice(`New OTP for ${userName}: "${otp}"`);
    } catch (err) {
      showNotice(`Failed to regenerate OTP: ${err.message}`, 'error');
    }
  };

  const handleConnectAsUser = (userEmail) => {
    const connected = switchAccount(userEmail);
    if (connected) {
      if (connected.role === 'office_staff') navigate('/staff/add');
      else navigate('/');
    }
  };

  const handleDeleteUser = async (userId, userName, userEmail) => {
    if (!window.confirm(`Remove user "${userName}" (${userEmail})?`)) return;
    try {
      await deleteAccount(userId);
      showNotice(`Account "${userName}" removed.`);
    } catch (err) {
      showNotice(err.message, 'error');
    }
  };

  const handleArchiveItem = async (postId, title) => {
    await archiveItem(postId);
    showNotice(`"${title}" has been archived.`);
  };

  const handleReopenItem = async (postId, title) => {
    await reopenItem(postId);
    showNotice(`"${title}" has been reopened.`);
  };

  const handleDeletePost = async (postId, title) => {
    // Row 3 of spec: Edit / delete (not while a claim is pending)
    const hasPendingClaim = claims.some(
      (c) =>
        (String(c.post_id) === String(postId) || String(c.target_id) === String(postId)) &&
        (c.decision === 'pending' || c.status === 'pending' || c.status === 'claim_pending')
    );
    if (hasPendingClaim) {
      showNotice(`Cannot delete "${title}" while an ownership claim is pending resolution.`, 'error');
      return;
    }

    if (window.confirm(`Delete post "${title}"?`)) {
      try {
        await deleteItem(postId);
        showNotice(`Post "${title}" deleted.`);
      } catch (err) {
        showNotice(err.message, 'error');
      }
    }
  };

  const handleResolveClaim = async (postId, claimId, claimant) => {
    const note = window.prompt(`Confirm approval for ${claimant}'s claim. Enter resolution verification note:`, 'Proof verified in-person at campus desk.');
    if (note !== null) {
      try {
        await resolvePost(postId, claimId, note.trim() || 'Proof verified in-person at campus desk.');
        showNotice(`Claim #${claimId} approved & post resolved for ${claimant}.`);
      } catch (err) {
        showNotice(err?.message || 'Failed to resolve claim on backend.', 'error');
      }
    }
  };

  const handleRejectClaim = (claimId, claimant) => {
    if (window.confirm(`Reject claim #${claimId} submitted by ${claimant}?`)) {
      rejectClaim(claimId);
      showNotice(`Claim #${claimId} rejected.`);
    }
  };

  const students = users.filter((u) => u.role === 'student');
  const staffMembers = users.filter((u) => u.role === 'office_staff');

  const filteredUsers = users.filter((u) => {
    if (roleFilter === 'student') return u.role === 'student';
    if (roleFilter === 'office_staff') return u.role === 'office_staff';
    if (roleFilter === 'admin') return u.role === 'admin';
    return true;
  });

  return (
    <div className="admin-dashboard-container">
      {/* Header matching Screen 4 of reference design */}
      <div className="admin-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="admin-crown-icon-wrap" style={{ background: '#fef3c7', color: '#b45309', width: 44, height: 44, borderRadius: 10, display: 'grid', placeItems: 'center' }}>
            <Crown size={26} />
          </div>
          <div>
            <h1 className="admin-title" style={{ fontSize: 24, fontWeight: 800, margin: 0, color: '#17233d' }}>
              Admin Dashboard
            </h1>
            <p className="admin-subtitle" style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0' }}>
              Manage found items and handle claims.
            </p>
          </div>
        </div>

        <button
          type="button"
          className="btn outline-btn"
          onClick={handleSyncUsers}
          disabled={syncLoading}
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}
        >
          {syncLoading ? <Loader2 size={14} className="spin" /> : <RefreshCw size={14} />}
          Sync Backend
        </button>
      </div>

      {/* Toast Alert */}
      {actionNotice && (
        <div className={`admin-toast-banner ${noticeType === 'error' ? 'error-banner' : ''}`} style={{ margin: '14px 0' }}>
          {noticeType === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Last created OTP banner */}
      {lastCreatedOtp && (
        <div style={{
          margin: '0 0 14px', padding: '12px 16px',
          background: '#f0fdf4', border: '1px solid #86efac',
          borderRadius: 8, display: 'flex', gap: 10, alignItems: 'center',
        }}>
          <KeyRound size={16} style={{ color: '#16a34a' }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: '#15803d' }}>
            New User OTP: <code style={{ fontSize: 15, letterSpacing: 2, background: '#dcfce7', padding: '2px 6px', borderRadius: 4 }}>{lastCreatedOtp}</code>
            &nbsp;— Share this OTP with the user so they can log in.
          </span>
        </div>
      )}

      {/* 4 Stat Cards Matching Screen 4 Exactly */}
      <div className="admin-stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, margin: '16px 0 20px' }}>
        {/* 1. Total Found Items */}
        <div
          className="admin-stat-card"
          onClick={() => setActiveTab('found')}
          style={{ cursor: 'pointer', border: activeTab === 'found' ? '2px solid #2563eb' : '1px solid #e2e8f0', background: '#ffffff', padding: 16, borderRadius: 10, display: 'flex', alignItems: 'center', gap: 14 }}
        >
          <div style={{ width: 44, height: 44, borderRadius: 10, background: '#eff6ff', color: '#2563eb', display: 'grid', placeItems: 'center' }}>
            <Package size={22} />
          </div>
          <div>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block' }}>Total Found Items</span>
            <b style={{ fontSize: 24, fontWeight: 800, color: '#17233d' }}>{items.length}</b>
          </div>
        </div>

        {/* 2. Pending Claims */}
        <div
          className="admin-stat-card"
          onClick={() => setActiveTab('pending')}
          style={{ cursor: 'pointer', border: activeTab === 'pending' ? '2px solid #eab308' : '1px solid #e2e8f0', background: '#ffffff', padding: 16, borderRadius: 10, display: 'flex', alignItems: 'center', gap: 14 }}
        >
          <div style={{ width: 44, height: 44, borderRadius: 10, background: '#fef9c3', color: '#ca8a04', display: 'grid', placeItems: 'center' }}>
            <Clock size={22} />
          </div>
          <div>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block' }}>Pending Claims</span>
            <b style={{ fontSize: 24, fontWeight: 800, color: '#17233d' }}>{pendingClaims.length}</b>
          </div>
        </div>

        {/* 3. Resolved Claims */}
        <div
          className="admin-stat-card"
          onClick={() => setActiveTab('resolved')}
          style={{ cursor: 'pointer', border: activeTab === 'resolved' ? '2px solid #16a34a' : '1px solid #e2e8f0', background: '#ffffff', padding: 16, borderRadius: 10, display: 'flex', alignItems: 'center', gap: 14 }}
        >
          <div style={{ width: 44, height: 44, borderRadius: 10, background: '#dcfce7', color: '#16a34a', display: 'grid', placeItems: 'center' }}>
            <CheckCircle2 size={22} />
          </div>
          <div>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block' }}>Resolved Claims</span>
            <b style={{ fontSize: 24, fontWeight: 800, color: '#17233d' }}>{resolvedClaims.length}</b>
          </div>
        </div>

        {/* 4. Archived Items */}
        <div
          className="admin-stat-card"
          onClick={() => setActiveTab('archived')}
          style={{ cursor: 'pointer', border: activeTab === 'archived' ? '2px solid #475569' : '1px solid #e2e8f0', background: '#ffffff', padding: 16, borderRadius: 10, display: 'flex', alignItems: 'center', gap: 14 }}
        >
          <div style={{ width: 44, height: 44, borderRadius: 10, background: '#f1f5f9', color: '#475569', display: 'grid', placeItems: 'center' }}>
            <Archive size={22} />
          </div>
          <div>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block' }}>Archived Items</span>
            <b style={{ fontSize: 24, fontWeight: 800, color: '#17233d' }}>{archivedItems.length}</b>
          </div>
        </div>
      </div>

      {/* Tabs Row Matching Screen 4: Found Items | Pending Claims | Resolved Claims | Archived | User Management */}
      <div className="admin-tabs-bar" style={{ display: 'flex', gap: 8, borderBottom: '2px solid #e2e8f0', marginBottom: 20 }}>
        <button
          className={`admin-tab-item ${activeTab === 'found' ? 'active' : ''}`}
          onClick={() => setActiveTab('found')}
          style={{ padding: '10px 16px', fontWeight: 700, fontSize: 13, background: 'none', border: 'none', borderBottom: activeTab === 'found' ? '3px solid #2563eb' : 'none', color: activeTab === 'found' ? '#2563eb' : '#64748b', cursor: 'pointer' }}
        >
          Found Items ({activeItems.length})
        </button>

        <button
          className={`admin-tab-item ${activeTab === 'pending' ? 'active' : ''}`}
          onClick={() => setActiveTab('pending')}
          style={{ padding: '10px 16px', fontWeight: 700, fontSize: 13, background: 'none', border: 'none', borderBottom: activeTab === 'pending' ? '3px solid #eab308' : 'none', color: activeTab === 'pending' ? '#ca8a04' : '#64748b', cursor: 'pointer' }}
        >
          Pending Claims ({pendingClaims.length})
        </button>

        <button
          className={`admin-tab-item ${activeTab === 'resolved' ? 'active' : ''}`}
          onClick={() => setActiveTab('resolved')}
          style={{ padding: '10px 16px', fontWeight: 700, fontSize: 13, background: 'none', border: 'none', borderBottom: activeTab === 'resolved' ? '3px solid #16a34a' : 'none', color: activeTab === 'resolved' ? '#16a34a' : '#64748b', cursor: 'pointer' }}
        >
          Resolved Claims ({resolvedClaims.length})
        </button>

        <button
          className={`admin-tab-item ${activeTab === 'archived' ? 'active' : ''}`}
          onClick={() => setActiveTab('archived')}
          style={{ padding: '10px 16px', fontWeight: 700, fontSize: 13, background: 'none', border: 'none', borderBottom: activeTab === 'archived' ? '3px solid #475569' : 'none', color: activeTab === 'archived' ? '#334155' : '#64748b', cursor: 'pointer' }}
        >
          Archived ({archivedItems.length})
        </button>

        <button
          className={`admin-tab-item ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
          style={{ padding: '10px 16px', fontWeight: 700, fontSize: 13, background: 'none', border: 'none', borderBottom: activeTab === 'users' ? '3px solid #b45309' : 'none', color: activeTab === 'users' ? '#b45309' : '#64748b', cursor: 'pointer', marginLeft: 'auto' }}
        >
          <Users size={14} style={{ display: 'inline', marginRight: 4 }} />
          User Management ({users.length})
        </button>
      </div>

      {/* TAB 1: FOUND ITEMS TABLE Matching Screen 4 Exactly */}
      {activeTab === 'found' && (
        <div className="admin-table-card" style={{ background: '#ffffff', borderRadius: 10, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <table className="admin-data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', fontSize: 12, color: '#64748b' }}>
                <th style={{ padding: '12px 16px' }}>ID</th>
                <th style={{ padding: '12px 16px' }}>Item</th>
                <th style={{ padding: '12px 16px' }}>Title</th>
                <th style={{ padding: '12px 16px' }}>Location</th>
                <th style={{ padding: '12px 16px' }}>Date Found</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
                <th style={{ padding: '12px 16px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {activeItems.map((item) => {
                const img = Array.isArray(item.images) && item.images.length > 0
                  ? (typeof item.images[0] === 'string' ? item.images[0] : item.images[0]?.url)
                  : null;
                const formattedDate = item.found_on
                  ? new Date(item.found_on).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                  : 'Recently';

                return (
                  <tr key={item.post_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: '#64748b', fontSize: 12 }}>
                      #{item.post_id}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ width: 42, height: 42, borderRadius: 6, overflow: 'hidden', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {img ? (
                          <img src={img} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <Package size={18} color="#94a3b8" />
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: '#17233d', fontSize: 13 }}>
                      {item.title}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#475569', fontSize: 12 }}>
                      {item.location_found || 'Campus'}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748b', fontSize: 12 }}>
                      {formattedDate}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        background: item.status === 'claimed' || item.resolved
                          ? '#dcfce7'
                          : item.status === 'claim_pending'
                          ? '#fef9c3'
                          : item.status === 'archived'
                          ? '#f1f5f9'
                          : '#dcfce7',
                        color: item.status === 'claimed' || item.resolved
                          ? '#15803d'
                          : item.status === 'claim_pending'
                          ? '#ca8a04'
                          : item.status === 'archived'
                          ? '#475569'
                          : '#15803d',
                        padding: '3px 10px',
                        borderRadius: 999,
                        fontSize: 11,
                        fontWeight: 700
                      }}>
                        {item.status === 'claimed' || item.resolved
                          ? 'Claimed'
                          : item.status === 'claim_pending'
                          ? 'Claim Pending'
                          : item.status === 'archived'
                          ? 'Archived'
                          : 'Active'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <Link
                          to={`/items/${item.post_id}`}
                          className="btn outline-btn mini-btn"
                          style={{ padding: '4px 10px', fontSize: 11, borderRadius: 6, textDecoration: 'none' }}
                        >
                          View
                        </Link>
                        <button
                          type="button"
                          className="btn outline-btn mini-btn"
                          onClick={() => handleArchiveItem(item.post_id, item.title)}
                          style={{ padding: '4px 10px', fontSize: 11, borderRadius: 6 }}
                        >
                          Archive
                        </button>
                        <button
                          type="button"
                          className="btn outline-btn mini-btn"
                          style={{ color: '#ef4444', padding: '4px 8px' }}
                          onClick={() => handleDeletePost(item.post_id, item.title)}
                          title="Delete post"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 2: PENDING CLAIMS - Matching Image 2 "Manage Claims" */}
      {activeTab === 'pending' && (
        <div className="admin-table-card" style={{ background: '#ffffff', borderRadius: 10, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <table className="admin-data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', fontSize: 12, color: '#64748b' }}>
                <th style={{ padding: '12px 16px' }}>ID</th>
                <th style={{ padding: '12px 16px' }}>Item Title</th>
                <th style={{ padding: '12px 16px' }}>Claimant</th>
                <th style={{ padding: '12px 16px' }}>Proof Snippet</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
                <th style={{ padding: '12px 16px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pendingClaims.map((c) => (
                <tr key={c.claim_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 700, color: '#64748b', fontSize: 12 }}>
                    #{c.claim_id}
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: 700, color: '#17233d', fontSize: 13 }}>
                    {c.post_title || 'Item'}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <b style={{ fontSize: 12, color: '#1e293b' }}>{c.claimant}</b>
                    <br />
                    <small style={{ color: '#64748b', fontSize: 11 }}>{c.claimant_email}</small>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: '#334155', maxWidth: 280 }}>
                    "{c.message || c.proof_snippet}"
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ background: '#fef9c3', color: '#ca8a04', padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700 }}>
                      Pending
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <Link to={`/items/${c.post_id}`} className="btn outline-btn mini-btn">
                        View
                      </Link>
                      <button
                        type="button"
                        className="btn approve-btn mini-btn"
                        onClick={() => handleResolveClaim(c.post_id, c.claim_id, c.claimant)}
                        title="Approve claim and resolve post"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                      >
                        <Check size={12} /> Approve
                      </button>
                      <button
                        type="button"
                        className="btn outline-btn mini-btn"
                        style={{ color: '#ef4444', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        onClick={() => handleRejectClaim(c.claim_id, c.claimant)}
                        title="Reject claim"
                      >
                        <X size={12} /> Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {pendingClaims.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: 30, color: '#94a3b8' }}>
                    No pending claims awaiting resolution.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: RESOLVED CLAIMS */}
      {activeTab === 'resolved' && (
        <div className="admin-table-card" style={{ background: '#ffffff', borderRadius: 10, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <table className="admin-data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', fontSize: 12, color: '#64748b' }}>
                <th style={{ padding: '12px 16px' }}>Claim ID</th>
                <th style={{ padding: '12px 16px' }}>Item Title</th>
                <th style={{ padding: '12px 16px' }}>Claimant</th>
                <th style={{ padding: '12px 16px' }}>Decision</th>
                <th style={{ padding: '12px 16px' }}>Verification Note</th>
                <th style={{ padding: '12px 16px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {resolvedClaims.map((c) => {
                const isApproved = (c.status || c.decision) === 'approved';
                return (
                  <tr key={c.claim_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: '#64748b', fontSize: 12 }}>
                      #{c.claim_id}
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: '#17233d', fontSize: 13 }}>
                      {c.post_title || 'Item'}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 12 }}>
                      <b>{c.claimant}</b>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        background: isApproved ? '#dcfce7' : '#fee2e2',
                        color: isApproved ? '#15803d' : '#b91c1c',
                        padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700
                      }}>
                        {isApproved ? 'Approved' : 'Rejected'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: '#475569' }}>
                      {c.resolution_note || 'Verified in person.'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <Link to={`/items/${c.post_id}`} className="btn outline-btn mini-btn">
                        View Item
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 4: ARCHIVED ITEMS */}
      {activeTab === 'archived' && (
        <div className="admin-table-card" style={{ background: '#ffffff', borderRadius: 10, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <table className="admin-data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', fontSize: 12, color: '#64748b' }}>
                <th style={{ padding: '12px 16px' }}>ID</th>
                <th style={{ padding: '12px 16px' }}>Item Title</th>
                <th style={{ padding: '12px 16px' }}>Location</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
                <th style={{ padding: '12px 16px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {archivedItems.map((item) => (
                <tr key={item.post_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 700, color: '#64748b', fontSize: 12 }}>
                    #{item.post_id}
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: 700, color: '#17233d', fontSize: 13 }}>
                    {item.title}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#475569', fontSize: 12 }}>
                    {item.location_found || 'Campus'}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ background: '#f1f5f9', color: '#475569', padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700 }}>
                      Archived / Reunited
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <button
                      type="button"
                      className="btn outline-btn mini-btn"
                      onClick={() => handleReopenItem(item.post_id, item.title)}
                    >
                      <RotateCcw size={12} /> Reopen
                    </button>
                  </td>
                </tr>
              ))}
              {archivedItems.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: 30, color: '#94a3b8' }}>
                    No archived items yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 5: USER MANAGEMENT (PRIMARY ADMIN USER PROVISIONING & OTPs) */}
      {activeTab === 'users' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Create User Form Card */}
          <div className="admin-table-card" style={{ padding: '20px 24px', background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: '#eff6ff', color: '#2563eb', display: 'grid', placeItems: 'center' }}>
                <UserPlus size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: '#17233d' }}>
                  Create New Student or Staff Account
                </h3>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0' }}>
                  Provision accounts with campus domain (<code style={{ fontWeight: 700 }}>@team18.com</code>). The backend issues their login OTP.
                </p>
              </div>
            </div>

            {createError && (
              <div className="alert-error-banner" style={{ marginBottom: 14 }}>
                <AlertCircle size={14} /> {createError}
              </div>
            )}

            <form onSubmit={handleCreateUser}>
              {/* Role Picker Buttons */}
              <div style={{ marginBottom: 14 }}>
                <label className="form-label">Account Role *</label>
                <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                  {[
                    { role: 'student', label: 'Student Candidate', icon: GraduationCap, activeColor: '#15803d', activeBg: '#f0fdf4', activeBorder: '#16a34a' },
                    { role: 'office_staff', label: 'Office Staff (Found & Claims Desk)', icon: Building2, activeColor: '#1d4ed8', activeBg: '#eff6ff', activeBorder: '#2563eb' },
                  ].map(({ role, label, icon: Ico, activeColor, activeBg, activeBorder }) => (
                    <button
                      key={role} type="button"
                      onClick={() => setNewRole(role)}
                      style={{
                        flex: 1, padding: '10px 14px', borderRadius: 8,
                        border: newRole === role ? `2px solid ${activeBorder}` : '1px solid #d2deed',
                        background: newRole === role ? activeBg : '#fff',
                        color: newRole === role ? activeColor : '#475569',
                        fontWeight: 700, fontSize: 12,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer',
                      }}
                    >
                      <Ico size={16} /><span>{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Input Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12, marginBottom: 16 }}>
                <div>
                  <label className="form-label">Full Name *</label>
                  <input type="text" required className="form-input"
                    value={newName} onChange={(e) => setNewName(e.target.value)}
                    placeholder={newRole === 'office_staff' ? 'e.g. Rachel Adams' : 'e.g. John Smith'} />
                </div>
                <div>
                  <label className="form-label">Campus Email *</label>
                  <input type="email" required className="form-input"
                    value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
                    placeholder={newRole === 'office_staff' ? 'staff@team18.com' : 'student@team18.com'} />
                </div>
                <div>
                  <label className="form-label">Phone Number *</label>
                  <input type="tel" required className="form-input"
                    value={newPhone} onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="10-digit number e.g. 9876543210" />
                </div>
                <div>
                  <label className="form-label">Department *</label>
                  <input type="text" required className="form-input"
                    value={newDept} onChange={(e) => setNewDept(e.target.value)}
                    placeholder={newRole === 'office_staff' ? 'Lost & Found Desk' : 'Computer Science'} />
                </div>
                {newRole === 'student' && (
                  <div>
                    <label className="form-label">USN / Roll Number *</label>
                    <input type="text" required className="form-input"
                      value={newUsn} onChange={(e) => setNewUsn(e.target.value)}
                      placeholder="e.g. 1RV21CS001" />
                  </div>
                )}
                {newRole === 'office_staff' && (
                  <div>
                    <label className="form-label">Designation *</label>
                    <input type="text" required className="form-input"
                      value={newDesignation} onChange={(e) => setNewDesignation(e.target.value)}
                      placeholder="e.g. Desk Incharge" />
                  </div>
                )}
              </div>

              <button type="submit" className="btn primary-btn" disabled={createLoading} style={{ padding: '10px 20px', gap: 8 }}>
                {createLoading
                  ? <><Loader2 size={15} className="spin" /> Creating User…</>
                  : <><UserPlus size={16} /> + Create {newRole === 'office_staff' ? 'Office Staff' : 'Student'} Account</>}
              </button>
            </form>
          </div>

          {/* User Directory Table */}
          <div className="admin-table-card" style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 800, margin: 0, color: '#17233d' }}>
                  Registered Members Directory ({filteredUsers.length})
                </h3>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  View login OTPs or generate fresh credentials.
                </span>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {[
                  { key: 'all', label: `All (${users.length})` },
                  { key: 'student', label: `Students (${students.length})` },
                  { key: 'office_staff', label: `Staff (${staffMembers.length})` },
                  { key: 'admin', label: `Admin (1)` },
                ].map(({ key, label }) => (
                  <button key={key} type="button"
                    className={`claims-tab-btn ${roleFilter === key ? 'active' : ''}`}
                    onClick={() => setRoleFilter(key)}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <table className="admin-data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', fontSize: 12, color: '#64748b' }}>
                  <th style={{ padding: '10px 16px' }}>Name</th>
                  <th style={{ padding: '10px 16px' }}>Role</th>
                  <th style={{ padding: '10px 16px' }}>Email</th>
                  <th style={{ padding: '10px 16px' }}>Phone</th>
                  <th style={{ padding: '10px 16px' }}>Dept / USN</th>
                  <th style={{ padding: '10px 16px' }}>OTP / Password</th>
                  <th style={{ padding: '10px 16px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => {
                  const isAdmin   = u.role === 'admin';
                  const isStaff   = u.role === 'office_staff';
                  const isCurrent = u.id === profile?.id || u.email === profile?.email;
                  const roleColor = isAdmin ? '#b45309' : isStaff ? '#1d4ed8' : '#15803d';
                  const roleBg    = isAdmin ? '#fef3c7' : isStaff ? '#dbeafe' : '#dcfce7';

                  return (
                    <tr key={u.id || u.email} style={{ borderBottom: '1px solid #f1f5f9', background: isCurrent ? '#f8fafd' : undefined }}>
                      <td style={{ padding: '10px 16px', fontWeight: 700, color: '#17233d' }}>
                        {u.name}
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        <span style={{
                          textTransform: 'uppercase', fontSize: 10, fontWeight: 800,
                          background: roleBg, color: roleColor,
                          padding: '2px 8px', borderRadius: 999,
                        }}>
                          {displayRole(u.role)}
                        </span>
                      </td>
                      <td style={{ padding: '10px 16px', fontSize: 12, color: '#334155' }}>
                        {u.email}
                      </td>
                      <td style={{ padding: '10px 16px', fontSize: 12, color: '#64748b' }}>
                        {u.phone || '—'}
                      </td>
                      <td style={{ padding: '10px 16px', fontSize: 12, color: '#64748b' }}>
                        {u.usn ? <b>{u.usn} · </b> : null}
                        {u.dept || u.designation || 'Campus'}
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        <div style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          background: '#f1f5f9', padding: '3px 8px', borderRadius: 6,
                          fontFamily: 'monospace', fontSize: 12, fontWeight: 700,
                        }}>
                          <KeyRound size={12} color="#64748b" />
                          <span>{u.password || '—'}</span>
                        </div>
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button type="button" className="btn outline-btn mini-btn"
                            onClick={() => handleRegenerateOtp(u.email, u.name)}
                            title="Regenerate OTP">
                            <RefreshCw size={11} /><span>New OTP</span>
                          </button>
                          {!isAdmin && (
                            <button type="button" className="btn primary-btn mini-btn"
                              onClick={() => handleConnectAsUser(u.email)}
                              title="Connect as this user">
                              <LogIn size={11} /><span>Connect</span>
                            </button>
                          )}
                          {!isAdmin && (
                            <button type="button" className="btn outline-btn mini-btn"
                              style={{ color: '#ef4444' }}
                              onClick={() => handleDeleteUser(u.id, u.name, u.email)}
                              title="Delete user">
                              <Trash2 size={11} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
