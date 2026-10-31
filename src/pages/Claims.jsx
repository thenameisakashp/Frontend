import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, Eye, Package, User, Check, X, RotateCcw, AlertTriangle, ShieldCheck, Loader2 } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { messageOf } from '../services/api';

export default function Claims() {
  const { claims, items, withdrawClaim, resolvePost, refreshData } = useData();
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState('all');
  const [actionMsg, setActionMsg] = useState('');

  // Approval modal state
  const [approvingClaim, setApprovingClaim] = useState(null);
  const [approvalNote, setApprovalNote] = useState('Proof verified in-person at campus desk.');
  const [isSubmittingApproval, setIsSubmittingApproval] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Auto-refresh claims from backend on mount
  useEffect(() => {
    if (refreshData) refreshData();
  }, [refreshData]);

  const role = profile?.role || 'student';
  const isAdmin = role === 'admin';
  const isStaff = role === 'staff' || role === 'office_staff';
  const isStaffOrAdmin = isAdmin || isStaff;

  // Claim status helpers complying with backend ClaimView
  // status: "active" | "archived"
  // decision: "pending" | "approved" | "rejected"
  const isClaimApproved = (c) => {
    const d = (c.decision || '').toLowerCase();
    const s = (c.status || '').toLowerCase();
    return d === 'approved' || s === 'approved';
  };

  const isClaimRejected = (c) => {
    const d = (c.decision || '').toLowerCase();
    const s = (c.status || '').toLowerCase();
    return d === 'rejected' || s === 'rejected';
  };

  const isClaimWithdrawn = (c) => {
    const d = (c.decision || '').toLowerCase();
    const s = (c.status || '').toLowerCase();
    return d === 'withdrawn' || s === 'withdrawn';
  };

  const isClaimPending = (c) => !isClaimApproved(c) && !isClaimRejected(c) && !isClaimWithdrawn(c);

  // Filter claims: Staff and Admin see all claims on posts. Students see their own claims.
  // Per spec sheet: "GET /posts/{id}/claims , /claims/me | everyone | Claims on a post (staff see all) / my claims"
  const visibleClaims = useMemo(() => {
    if (isStaffOrAdmin) return claims;
    return claims.filter((c) => {
      const emailMatches =
        c.claimant_email &&
        profile?.email &&
        c.claimant_email.toLowerCase() === profile.email.toLowerCase();
      const nameMatches =
        c.claimant &&
        profile?.name &&
        c.claimant.toLowerCase() === profile.name.toLowerCase();
      return emailMatches || nameMatches || !c.claimant_email;
    });
  }, [claims, profile, isStaffOrAdmin]);

  const filteredClaims = useMemo(() => {
    if (activeTab === 'pending') {
      return visibleClaims.filter(isClaimPending);
    }
    if (activeTab === 'resolved') {
      return visibleClaims.filter((c) => isClaimApproved(c) || isClaimRejected(c));
    }
    return visibleClaims;
  }, [visibleClaims, activeTab]);

  const getItemImage = (postId) => {
    const cleanId = String(postId || '');
    const post = items.find(
      (i) =>
        String(i.post_id) === cleanId ||
        String(i.id) === cleanId ||
        String(i.local_id) === cleanId
    );
    if (post && post.images && post.images.length > 0) {
      return typeof post.images[0] === 'string'
        ? post.images[0]
        : post.images[0]?.url || null;
    }
    return null;
  };

  const handleWithdraw = async (claimId, postTitle) => {
    if (window.confirm(`Are you sure you want to withdraw your claim for "${postTitle}"?`)) {
      try {
        await withdrawClaim(claimId);
        setActionMsg(`Your claim for "${postTitle}" has been withdrawn.`);
        setTimeout(() => setActionMsg(''), 3500);
      } catch (err) {
        alert(messageOf(err) || 'Failed to withdraw claim.');
      }
    }
  };

  const handleOpenApprove = (claim) => {
    setApprovingClaim(claim);
    setApprovalNote('Proof verified in-person at campus desk.');
    setErrorMsg('');
  };

  const handleConfirmApprove = async (e) => {
    if (e) e.preventDefault();
    if (!approvingClaim) return;

    setIsSubmittingApproval(true);
    setErrorMsg('');

    const targetPostId = approvingClaim.post_id || approvingClaim.target_id;
    const targetClaimId = approvingClaim.claim_id || approvingClaim.id;
    const noteText = approvalNote.trim() || 'Proof verified in-person at campus desk.';

    try {
      await resolvePost(targetPostId, targetClaimId, noteText);
      setActionMsg(`Claim #${targetClaimId} approved & post resolved for ${approvingClaim.claimant || 'Claimant'}.`);
      setApprovingClaim(null);
      setTimeout(() => setActionMsg(''), 4000);
    } catch (err) {
      const msg = messageOf(err);
      if (isAdmin && (err?.response?.status === 403 || msg.toLowerCase().includes('role'))) {
        setErrorMsg('Backend Notice: Claim resolution is strictly restricted to Office Staff accounts (role: office_staff). Please sign in as an Office Staff account to resolve posts on the backend API.');
      } else {
        setErrorMsg(msg || 'Failed to approve claim. Please check your network and account role.');
      }
    } finally {
      setIsSubmittingApproval(false);
    }
  };

  const pendingCount = visibleClaims.filter(isClaimPending).length;
  const resolvedCount = visibleClaims.filter((c) => isClaimApproved(c) || isClaimRejected(c)).length;

  return (
    <div className="my-claims-container">
      {/* Page Title */}
      <div className="my-claims-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <span className="eyebrow-text">
              {isStaffOrAdmin ? 'STAFF & ADMIN DESK' : 'SINGLE CLAIM TRACKING'}
            </span>
            <h1 className="claims-page-title">
              {isStaffOrAdmin ? 'Campus Item Claims & Resolutions' : 'My Claims'}
            </h1>
            <p className="claims-page-subtitle">
              {isStaffOrAdmin
                ? `Reviewing claims submitted by campus candidates. Office staff can resolve post by approving 1 claim.`
                : `Tracking verification claims submitted by ${profile?.name} (${profile?.email}). Only 1 claim allowed per item.`}
            </p>
          </div>
          <div className="claims-user-badge">
            <User size={13} />
            <span>Account: <b>{profile?.name}</b> ({role.toUpperCase()})</span>
          </div>
        </div>
      </div>

      {actionMsg && (
        <div className="alert-success-banner" style={{ marginBottom: 16 }}>
          <ShieldCheck size={16} />
          <span>{actionMsg}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="claims-tab-bar">
        <button
          type="button"
          className={`claims-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          All Claims ({visibleClaims.length})
        </button>
        <button
          type="button"
          className={`claims-tab-btn ${activeTab === 'pending' ? 'active' : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          Pending ({pendingCount})
        </button>
        <button
          type="button"
          className={`claims-tab-btn ${activeTab === 'resolved' ? 'active' : ''}`}
          onClick={() => setActiveTab('resolved')}
        >
          Resolved ({resolvedCount})
        </button>
      </div>

      {/* Table */}
      {filteredClaims.length > 0 ? (
        <div className="claims-table-card">
          <table className="claims-table">
            <thead>
              <tr>
                <th>Claim ID</th>
                <th>Item Image</th>
                <th>Item &amp; Details</th>
                {isStaffOrAdmin && <th>Claimant Details</th>}
                <th>Location</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredClaims.map((claim) => {
                const img = getItemImage(claim.post_id || claim.target_id);
                const isApproved = isClaimApproved(claim);
                const isRejected = isClaimRejected(claim);
                const isWithdrawn = isClaimWithdrawn(claim);
                const isPending = isClaimPending(claim);

                const isMyClaim =
                  claim.claimant_email === profile?.email ||
                  claim.claimant === profile?.name;

                return (
                  <tr key={claim.claim_id || claim.id}>
                    <td className="td-id">#{claim.claim_id || claim.id}</td>
                    <td className="td-item">
                      <div className="claim-thumb-box">
                        {img ? (
                          <img src={img} alt={claim.post_title} />
                        ) : (
                          <div className="table-thumb-empty">
                            <Package size={14} />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="td-title">
                      <div className="claim-title-text">{claim.post_title || 'Missing Item'}</div>
                      <small className="claim-date-text">
                        Submitted: {claim.created_at ? new Date(claim.created_at).toLocaleDateString() : 'Recently'}
                      </small>
                      {claim.message && (
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px' }}>
                          Proof: "{claim.message}"
                        </p>
                      )}
                      {claim.resolution_note && (
                        <p style={{ fontSize: '11px', color: '#16a34a', marginTop: '2px', fontWeight: 600 }}>
                          Resolution Note: "{claim.resolution_note}"
                        </p>
                      )}
                    </td>

                    {isStaffOrAdmin && (
                      <td>
                        <div className="contact-cell-stack">
                          <b>{claim.claimant || claim.claimant_name || 'Claimant'}</b>
                          {(claim.claimant_phone || claim.claimant_phone_number) && (
                            <span style={{ fontSize: '11px', color: 'var(--primary-blue)' }}>
                              {claim.claimant_phone || claim.claimant_phone_number}
                            </span>
                          )}
                          {claim.claimant_email && (
                            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                              {claim.claimant_email}
                            </span>
                          )}
                        </div>
                      </td>
                    )}

                    <td className="td-location">{claim.location || 'Campus'}</td>

                    <td className="td-status">
                      <span
                        className={`pill ${
                          isApproved
                            ? 'green-pill'
                            : isRejected || isWithdrawn
                            ? 'red-pill'
                            : 'yellow-pill'
                        }`}
                      >
                        {isApproved
                          ? 'Approved'
                          : isRejected
                          ? 'Rejected'
                          : isWithdrawn
                          ? 'Withdrawn'
                          : 'Pending'}
                      </span>
                    </td>

                    <td className="td-actions">
                      <div className="table-actions-cluster">
                        {(claim.post_id || claim.target_id) && (
                          <Link
                            to={`/items/${claim.post_id || claim.target_id}`}
                            className="btn outline-btn mini-btn"
                          >
                            <Eye size={12} />
                            <span>View</span>
                          </Link>
                        )}

                        {/* Claimant and Staff can withdraw/delete claim while pending (DELETE /api/v1/findit/claims/{id}) */}
                        {(isMyClaim || isStaff) && isPending && (
                          <button
                            type="button"
                            className="btn outline-btn mini-btn"
                            style={{ color: '#ef4444' }}
                            onClick={() => handleWithdraw(claim.claim_id || claim.id, claim.post_title)}
                            title="Withdraw or delete claim while pending"
                          >
                            <X size={12} />
                            <span>Withdraw</span>
                          </button>
                        )}

                        {/* Office Staff & Admin can approve claim and resolve post (POST /api/v1/findit/posts/{id}/resolution) */}
                        {isStaffOrAdmin && isPending && (
                          <button
                            type="button"
                            className="btn approve-btn mini-btn"
                            onClick={() => handleOpenApprove(claim)}
                            title="Office staff approve claim and resolve post"
                          >
                            <Check size={12} />
                            <span>Approve Claim</span>
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
      ) : (
        <div className="empty-state-box">
          <ClipboardList size={38} className="empty-icon" />
          <h3>No claims found</h3>
          <p>
            {isStaffOrAdmin
              ? 'There are currently no claims submitted for campus items.'
              : `${profile?.name} has not submitted any claims yet.`}
          </p>
          <Link to="/" className="btn primary-btn" style={{ marginTop: 12 }}>
            Browse Available Items
          </Link>
        </div>
      )}

      {/* Approve Claim Confirmation Modal */}
      {approvingClaim && (
        <div
          className="modal-backdrop-overlay"
          onClick={() => !isSubmittingApproval && setApprovingClaim(null)}
        >
          <div
            className="modal-dialog-card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 480 }}
          >
            <div className="modal-header-row">
              <div className="modal-title-group">
                <Check size={18} style={{ color: '#16a34a' }} />
                <h3>Approve Claim &amp; Hand Over</h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => !isSubmittingApproval && setApprovingClaim(null)}
                title="Close dialog"
              >
                <X size={16} />
              </button>
            </div>

            <p className="modal-subtitle-text">
              Approving this claim marks the post as resolved and rejects any competing claims on the campus backend.
            </p>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '12px 14px', marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-heading)', marginBottom: 4 }}>
                {approvingClaim.post_title || 'Campus Item'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
                Claimant: <b style={{ color: 'var(--text-heading)' }}>{approvingClaim.claimant || approvingClaim.claimant_name || 'Claimant'}</b>
                {approvingClaim.claimant_email && <span> ({approvingClaim.claimant_email})</span>}
              </div>
              {approvingClaim.message && (
                <div style={{ fontSize: 12, fontStyle: 'italic', color: '#475569', background: '#ffffff', padding: '6px 10px', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                  Proof: "{approvingClaim.message}"
                </div>
              )}
            </div>

            {errorMsg && (
              <div className="alert error" style={{ marginBottom: 14, fontSize: 12, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleConfirmApprove} className="modal-form">
              <label className="login-field-label" style={{ fontSize: 12, fontWeight: 600 }}>
                Resolution Verification Note (sent to backend API)
              </label>
              <textarea
                rows={3}
                required
                minLength={1}
                maxLength={500}
                value={approvalNote}
                onChange={(e) => setApprovalNote(e.target.value)}
                placeholder="e.g. Proof verified in-person at campus office desk. Matched physical description."
                className="drawer-select"
                style={{ width: '100%', resize: 'vertical', padding: '8px 10px', fontSize: 12 }}
              />

              <div className="modal-actions-row" style={{ marginTop: 10 }}>
                <button
                  type="button"
                  className="btn outline-btn"
                  disabled={isSubmittingApproval}
                  onClick={() => setApprovingClaim(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn approve-btn"
                  disabled={isSubmittingApproval || !approvalNote.trim()}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  {isSubmittingApproval ? <Loader2 size={14} className="spin" /> : <Check size={14} />}
                  <span>{isSubmittingApproval ? 'Resolving on Backend…' : 'Confirm & Approve'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
