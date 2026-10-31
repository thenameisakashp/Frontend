import { useState, useMemo, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  MapPin,
  CalendarDays,
  Tag,
  UserRound,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Send,
  Package,
  CheckCircle2,
  ListChecks,
  ImageOff,
  Lock,
  Clock,
  AlertCircle,
  User,
  Phone,
  Mail,
  Building2,
  Check,
  X,
  RotateCcw,
  Archive,
  Edit3,
  Trash2,
  FileEdit,
  Crown,
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { messageOf } from '../services/api';

export default function ItemDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    items,
    lostRequests,
    submitClaim,
    getItemClaim,
    canClaimItem,
    withdrawClaim,
    resolvePost,
    changeResolution,
    undoResolution,
    archiveItem,
    reopenItem,
    editItem,
    deleteItem,
    archiveLostRequest,
    deleteLostRequest,
    fetchPostClaims,
  } = useData();

  const { profile } = useAuth();

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [proofNote, setProofNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');

  // Office Staff Edit Post State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editCategory, setEditCategory] = useState('');

  const item = useMemo(() => {
    // 1. Check items by post_id, id, request_id, or local_id
    const fromItems = (items || []).find(
      (x) =>
        String(x.post_id) === String(id) ||
        String(x.id) === String(id) ||
        String(x.request_id) === String(id) ||
        String(x.local_id) === String(id)
    );
    if (fromItems) return fromItems;

    // 2. Check lostRequests by id, request_id, post_id, or local_id
    const fromLost = (lostRequests || []).find(
      (r) =>
        String(r.id) === String(id) ||
        String(r.request_id) === String(id) ||
        String(r.post_id) === String(id) ||
        String(r.local_id) === String(id)
    );
    if (fromLost) {
      return {
        ...fromLost,
        post_id: fromLost.request_id || fromLost.id || id,
        id: fromLost.request_id || fromLost.id || id,
        type: 'lost',
        title: fromLost.title || 'Missing Item',
        description: fromLost.description || '',
        category: fromLost.category || 'General',
        location_found: fromLost.location_lost || fromLost.location_found || 'Campus',
        location_lost: fromLost.location_lost || fromLost.location_found || 'Campus',
        found_on: fromLost.lost_on || fromLost.found_on || new Date().toISOString().split('T')[0],
        lost_on: fromLost.lost_on || fromLost.found_on || new Date().toISOString().split('T')[0],
        status: fromLost.status || 'active',
        uploader_name: fromLost.reported_by || fromLost.uploader_name || 'Student',
        uploader_email: fromLost.owner_email || fromLost.uploader_email || '',
        uploader_phone: fromLost.phone || fromLost.uploader_phone || '',
        images: Array.isArray(fromLost.images) ? fromLost.images : [],
      };
    }

    return null;
  }, [items, lostRequests, id]);

  const cleanId = item ? (item.post_id || item.id || item.request_id || item.local_id || id) : id;

  // Sync post claims from backend on mount or when cleanId changes
  useEffect(() => {
    if (cleanId && fetchPostClaims) {
      fetchPostClaims(cleanId);
    }
  }, [cleanId, fetchPostClaims]);

  const existingClaim = useMemo(() => {
    return cleanId ? getItemClaim(cleanId) : null;
  }, [cleanId, getItemClaim]);

  if (!item) {
    return (
      <div className="item-not-found-wrap" style={{ padding: '24px' }}>
        <Link to="/" className="back-nav-link">
          <ArrowLeft size={16} /> Back to Items
        </Link>
        <div className="empty-state-box">
          <Package size={42} className="empty-icon" />
          <h3>Item Not Found</h3>
          <p>This item does not exist or may have been deleted.</p>
          <Link to="/" className="btn primary-btn" style={{ marginTop: 14 }}>
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  const imagesList = Array.isArray(item.images) ? item.images : [];
  const hasImages = imagesList.length > 0;

  const isClaimApproved =
    existingClaim?.status === 'approved' ||
    existingClaim?.decision === 'approved' ||
    item.status === 'claimed' ||
    item.resolved === true;

  const isClaimPending =
    !isClaimApproved &&
    (existingClaim?.status === 'pending' ||
      existingClaim?.decision === 'pending' ||
      item.status === 'claim_pending');

  const isMyClaim =
    existingClaim?.claimant_email === profile?.email ||
    existingClaim?.claimant === profile?.name;
  const isMyUploadedItem =
    item.uploader_email === profile?.email ||
    item.uploader_name === profile?.name;

  const role = profile?.role || 'student';
  const isAdmin = role === 'admin';
  const isStaff = role === 'staff' || role === 'office_staff';
  const isStaffOrAdmin = isAdmin || isStaff;

  const formattedDate = item.found_on
    ? new Date(item.found_on).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Recently';

  const handlePrevImage = () => {
    if (!hasImages) return;
    setActiveImageIndex((prev) => (prev === 0 ? imagesList.length - 1 : prev - 1));
  };

  const handleNextImage = () => {
    if (!hasImages) return;
    setActiveImageIndex((prev) => (prev === imagesList.length - 1 ? 0 : prev + 1));
  };

  const handleClaimSubmit = async (e) => {
    e.preventDefault();
    if (!cleanId || !canClaimItem(cleanId)) {
      setErrorMessage('This item has already been claimed by someone. Only one claim is permitted.');
      return;
    }

    if (proofNote.trim().length < 10) {
      setErrorMessage('Please provide at least 10 characters describing proof or verification.');
      return;
    }

    setErrorMessage('');
    setSubmitting(true);

    try {
      await submitClaim(cleanId, proofNote.trim(), profile);
      setSubmitting(false);
      setProofNote('');
      setActionSuccessMsg('Single claim submitted successfully! Campus staff will review your proof.');
    } catch (err) {
      setErrorMessage(err.message || 'Failed to submit claim.');
      setSubmitting(false);
    }
  };

  // Claimant withdraws while pending
  const handleWithdrawClaim = async () => {
    const claimIdToWithdraw = existingClaim?.claim_id || item.claim_id;
    if (!claimIdToWithdraw) {
      alert('No active claim found to withdraw.');
      return;
    }
    if (window.confirm('Are you sure you want to withdraw your pending claim?')) {
      await withdrawClaim(claimIdToWithdraw);
      setActionSuccessMsg('Your claim has been withdrawn.');
    }
  };

  // Office staff resolves post by approving one claim
  const handleStaffResolve = async () => {
    const claimToApprove = existingClaim || (item.claim_id ? { claim_id: item.claim_id, claimant: item.claimed_by || 'Claimant' } : null);
    if (!claimToApprove) {
      alert('No pending claim found on this item to approve.');
      return;
    }
    const note = window.prompt(
      `Approve ${claimToApprove.claimant || 'Claimant'}'s claim. Enter office resolution note:`,
      'Proof verified in-person at campus desk.'
    );
    if (note !== null) {
      try {
        await resolvePost(cleanId, claimToApprove.claim_id, note);
        setActionSuccessMsg(`Item resolved and handed over to ${claimToApprove.claimant || 'Claimant'}.`);
      } catch (err) {
        setErrorMessage(messageOf(err));
      }
    }
  };

  const handleUndoResolution = async () => {
    if (window.confirm('Reopen this post and undo resolution?')) {
      await undoResolution(cleanId);
      setActionSuccessMsg('Resolution undone.');
    }
  };

  const handleToggleArchive = async () => {
    if (item.status === 'archived') {
      await reopenItem(cleanId);
      setActionSuccessMsg('Post reopened and active.');
    } else {
      await archiveItem(cleanId);
      setActionSuccessMsg('Post archived.');
    }
  };

  // Office Staff: Edit post (PATCH /posts/{id} - not while a claim is pending)
  const handleOpenEdit = () => {
    if (isClaimPending) {
      alert('Cannot edit this post while an ownership claim is pending resolution.');
      return;
    }
    setEditTitle(item.title);
    setEditDesc(item.description || '');
    setEditLocation(item.location_found || '');
    setEditCategory(item.category || 'General');
    setShowEditModal(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    try {
      await editItem(cleanId, {
        title: editTitle.trim(),
        description: editDesc.trim(),
        location_found: editLocation.trim(),
        category: editCategory,
      });
      setShowEditModal(false);
      setActionSuccessMsg('Post updated successfully!');
    } catch (err) {
      setErrorMessage(err.message);
    }
  };

  // Office Staff: Delete post (DELETE /posts/{id} - not while a claim is pending)
  const handleDeletePost = async () => {
    if (isClaimPending) {
      alert('Cannot delete this post while a claim is pending resolution.');
      return;
    }
    if (window.confirm(`Are you sure you want to delete post "${item.title}"?`)) {
      try {
        await deleteItem(cleanId);
        navigate('/');
      } catch (err) {
        setErrorMessage(err.message);
      }
    }
  };

  // Office Staff: Change resolution (PATCH /posts/{id}/resolution)
  const handleChangeResolutionNote = async () => {
    if (!existingClaim) return;
    const currentNote = item.resolution_note || existingClaim.resolution_note || 'Verified by office staff.';
    const newNote = window.prompt('Update resolution verification note:', currentNote);
    if (newNote !== null && newNote.trim()) {
      await changeResolution(cleanId, existingClaim.claim_id, newNote.trim());
      setActionSuccessMsg('Resolution note updated successfully.');
    }
  };


  // Item status pill
  let itemStatusBadge = <span className="pill green-pill">Found</span>;
  if (item.status === 'archived') {
    itemStatusBadge = <span className="pill grey-pill">Archived</span>;
  } else if (item.type === 'lost') {
    itemStatusBadge = (
      <span className="pill" style={{ background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5' }}>
        Reported Lost
      </span>
    );
  } else if (isClaimApproved) {
    itemStatusBadge = <span className="pill green-pill">Claimed</span>;
  } else if (isClaimPending) {
    itemStatusBadge = <span className="pill yellow-pill">Claim Pending</span>;
  }

  return (
    <div className="item-details-container">
      {/* Back Link */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link to="/" className="back-nav-link">
          <ArrowLeft size={16} />
          <span>Back to Items</span>
        </Link>

        {(isStaff || isMyUploadedItem) && (
          <div style={{ display: 'flex', gap: '8px' }}>
            {item.type !== 'lost' ? (
              <>
                <button
                  type="button"
                  className="btn outline-btn mini-btn"
                  onClick={handleOpenEdit}
                  title="Edit post details (PATCH /posts/{id})"
                >
                  <Edit3 size={12} />
                  <span>Edit Post</span>
                </button>
                <button
                  type="button"
                  className="btn outline-btn mini-btn"
                  onClick={handleToggleArchive}
                >
                  <Archive size={12} />
                  <span>{item.status === 'archived' ? 'Reopen Post' : 'Archive Post'}</span>
                </button>
                <button
                  type="button"
                  className="btn outline-btn mini-btn"
                  style={{ color: '#ef4444' }}
                  onClick={handleDeletePost}
                  title="Delete post (DELETE /posts/{id})"
                >
                  <Trash2 size={12} />
                  <span>Delete Post</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                className="btn outline-btn mini-btn"
                style={{ color: '#ef4444' }}
                onClick={async () => {
                  if (window.confirm('Are you sure you want to delete this lost report?')) {
                    await deleteLostRequest(item.id || item.post_id);
                    navigate('/');
                  }
                }}
                title="Delete lost report (DELETE /lost-requests/{id})"
              >
                <Trash2 size={12} />
                <span>Delete Report</span>
              </button>
            )}
          </div>
        )}
      </div>

      {actionSuccessMsg && (
        <div className="alert-success-banner" style={{ margin: '12px 0' }}>
          <CheckCircle2 size={16} />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* Main Details Grid */}
      <div className="details-two-col-grid">
        {/* Left Column: Carousel & Gallery */}
        <div className="details-gallery-col">
          <div className="carousel-main-frame">
            {hasImages ? (
              <img
                src={imagesList[activeImageIndex] || imagesList[0]}
                alt={item.title}
                className="carousel-active-img"
              />
            ) : (
              <div className="no-images-carousel-placeholder">
                <ImageOff size={36} className="placeholder-icon" />
                <span>No photos uploaded for this item</span>
              </div>
            )}

            {imagesList.length > 1 && (
              <>
                <button
                  type="button"
                  className="carousel-nav-btn prev-btn"
                  onClick={handlePrevImage}
                  aria-label="Previous image"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  type="button"
                  className="carousel-nav-btn next-btn"
                  onClick={handleNextImage}
                  aria-label="Next image"
                >
                  <ChevronRight size={18} />
                </button>
              </>
            )}
          </div>

          {/* Thumbnails Row */}
          {imagesList.length > 1 && (
            <div className="carousel-thumbs-row">
              {imagesList.map((imgUrl, idx) => (
                <button
                  key={idx}
                  type="button"
                  className={`carousel-thumb-btn ${idx === activeImageIndex ? 'active' : ''}`}
                  onClick={() => setActiveImageIndex(idx)}
                >
                  <img src={imgUrl} alt={`Thumbnail ${idx + 1}`} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Metadata & Description */}
        <div className="details-info-col">
          <div className="details-title-row">
            <h1 className="item-main-title">{item.title}</h1>
            {itemStatusBadge}
          </div>

          {/* Facts List */}
          <div className="details-facts-list">
            <div className="fact-item-row">
              <MapPin size={16} className="fact-icon" />
              <div className="fact-text">
                <span className="fact-label">Location:</span>
                <b className="fact-value">{item.location_found || 'Campus'}</b>
              </div>
            </div>

            <div className="fact-item-row">
              <CalendarDays size={16} className="fact-icon" />
              <div className="fact-text">
                <span className="fact-label">Date Reported:</span>
                <b className="fact-value">{formattedDate}</b>
              </div>
            </div>

            <div className="fact-item-row">
              <Tag size={16} className="fact-icon" />
              <div className="fact-text">
                <span className="fact-label">Category:</span>
                <b className="fact-value">{item.category || 'General'}</b>
              </div>
            </div>

            <div className="fact-item-row">
              <UserRound size={16} className="fact-icon" />
              <div className="fact-text">
                <span className="fact-label">Posted By:</span>
                <b className="fact-value">
                  {item.uploader_name || item.found_by || 'Campus Staff'}
                  {isMyUploadedItem && ' (You)'}
                </b>
              </div>
            </div>

            {/* Candidate / Staff Contact Details */}
            {item.uploader_phone && item.uploader_phone !== 'Not specified' && (
              <div className="fact-item-row">
                <Phone size={16} className="fact-icon" />
                <div className="fact-text">
                  <span className="fact-label">Phone:</span>
                  <a href={`tel:${item.uploader_phone}`} className="fact-value contact-link">
                    {item.uploader_phone}
                  </a>
                </div>
              </div>
            )}

            {item.uploader_department && (
              <div className="fact-item-row">
                <Building2 size={16} className="fact-icon" />
                <div className="fact-text">
                  <span className="fact-label">Department / Desk:</span>
                  <b className="fact-value">{item.uploader_department}</b>
                </div>
              </div>
            )}
          </div>

          {/* Description Box */}
          <div className="details-description-box">
            <h4 className="desc-heading">Description</h4>
            <p className="desc-body">
              {item.description || 'No description was provided.'}
            </p>
          </div>

          {/* Uploader / Staff Upload Actions */}
          {(isMyUploadedItem || isStaffOrAdmin) && (
            <div style={{
              marginTop: '16px',
              padding: '12px 14px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '10px'
            }}>
              <div>
                <b style={{ fontSize: '12px', color: '#334155', display: 'block' }}>
                  {item.type === 'lost' ? 'Lost Item Report Management' : 'Found Post Management'}
                </b>
                <span style={{ fontSize: '11px', color: '#64748b' }}>
                  {item.type === 'lost'
                    ? 'You can withdraw or delete this lost item report.'
                    : 'Office staff and post creator can edit or delete this listing.'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {item.type !== 'lost' ? (
                  <>
                    <button
                      type="button"
                      className="btn outline-btn mini-btn"
                      onClick={handleOpenEdit}
                    >
                      <Edit3 size={12} /> Edit
                    </button>
                    <button
                      type="button"
                      className="btn outline-btn mini-btn"
                      style={{ color: '#ef4444' }}
                      onClick={handleDeletePost}
                      title="Delete this uploaded found post"
                    >
                      <Trash2 size={12} /> Delete Upload
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="btn outline-btn mini-btn"
                    style={{ color: '#ef4444' }}
                    onClick={async () => {
                      if (window.confirm('Are you sure you want to withdraw/delete this lost report?')) {
                        await deleteLostRequest(cleanId);
                        navigate('/');
                      }
                    }}
                    title="Withdraw or delete this lost report"
                  >
                    <Trash2 size={12} /> Withdraw / Delete Upload
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Possible Contents */}
          {item.possible_contents && item.possible_contents.length > 0 && (
            <div className="possible-contents-box">
              <div className="possible-contents-header">
                <ListChecks size={15} className="contents-icon" />
                <span className="contents-heading">Possible Contents / Identifying Details</span>
              </div>
              <ul className="possible-contents-list">
                {item.possible_contents.map((content, i) => (
                  <li key={i} className="possible-content-item">
                    {content}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Claim Section: STRICT 1-CLAIM LIMIT & STAFF RESOLUTION */}
      <div className="claim-section-card">
        {item.type === 'lost' ? (
          <div className="claim-locked-banner" style={{ background: '#f8fafc', borderColor: '#e2e8f0' }}>
            <div className="claim-locked-icon-wrap" style={{ background: '#fee2e2', color: '#dc2626' }}>
              <FileEdit size={24} />
            </div>
            <div className="claim-locked-info" style={{ flex: 1 }}>
              <div className="claim-locked-tag" style={{ background: '#fee2e2', color: '#b91c1c' }}>
                <Tag size={12} />
                <span>Lost Item Report</span>
              </div>
              <h3 className="claim-locked-title">Reported by {item.reported_by || item.uploader_name || 'Campus Student'}</h3>
              <p className="claim-locked-desc">
                If you have found this item or turned it in to campus security/staff, please reach out to the owner or visit the campus helpdesk.
              </p>
              <div style={{ display: 'flex', gap: '10px', marginTop: '12px', flexWrap: 'wrap', fontSize: '13px', alignItems: 'center' }}>
                {(item.uploader_email || item.owner_email) && (
                  <a href={`mailto:${item.uploader_email || item.owner_email}`} className="btn outline-btn mini-btn" style={{ textDecoration: 'none' }}>
                    <Mail size={13} /> {item.uploader_email || item.owner_email}
                  </a>
                )}
                {(item.uploader_phone || item.phone) && (
                  <a href={`tel:${item.uploader_phone || item.phone}`} className="btn outline-btn mini-btn" style={{ textDecoration: 'none' }}>
                    <Phone size={13} /> {item.uploader_phone || item.phone}
                  </a>
                )}
                {(isMyUploadedItem || isStaff) && (
                  <button
                    type="button"
                    className="btn outline-btn mini-btn"
                    style={{ color: '#ef4444' }}
                    onClick={async () => {
                      if (window.confirm('Are you sure you want to withdraw/delete this lost report?')) {
                        await deleteLostRequest(cleanId);
                        navigate('/');
                      }
                    }}
                    title="Withdraw or delete this lost report (DELETE /lost-requests/{id})"
                  >
                    <Trash2 size={13} /> Withdraw / Delete Report
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : isClaimApproved ? (
          /* CASE 1: Claim has already been approved & resolved */
          <div className="claim-locked-banner approved-lock">
            <div className="claim-locked-icon-wrap green-wrap">
              <CheckCircle2 size={24} />
            </div>
            <div className="claim-locked-info" style={{ flex: 1 }}>
              <div className="claim-locked-tag">
                <CheckCircle2 size={12} />
                <span>Resolved &amp; Reunited</span>
              </div>
              <h3 className="claim-locked-title">Item Successfully Claimed and Reunited</h3>
              <p className="claim-locked-desc">
                The ownership claim was approved and resolved.
                {item.claimed_by && ` Handed over to: ${item.claimed_by}.`}
                {(item.resolution_note || existingClaim?.resolution_note) &&
                  ` Resolution note: "${item.resolution_note || existingClaim?.resolution_note}"`}
              </p>
              <div className="claim-locked-actions" style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <Link to="/" className="btn outline-btn">
                  Browse Active Items
                </Link>
                {isStaffOrAdmin && (
                  <>
                    <button className="btn outline-btn mini-btn" onClick={handleChangeResolutionNote}>
                      <Edit3 size={12} />
                      <span>Change Note</span>
                    </button>
                    <button className="btn outline-btn mini-btn" onClick={handleUndoResolution}>
                      <RotateCcw size={12} />
                      <span>Undo Resolution</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ) : isClaimPending ? (
          /* CASE 2: Single Claim Limit Reached & Under Review */
          <div className="claim-locked-banner pending-lock">
            <div className="claim-locked-icon-wrap yellow-wrap">
              <Clock size={24} />
            </div>
            <div className="claim-locked-info" style={{ flex: 1 }}>
              <div className="claim-locked-tag">
                <Lock size={12} />
                <span>Single Claim Limit Reached</span>
              </div>
              <h3 className="claim-locked-title">
                {isMyClaim
                  ? `Your Claim (#${existingClaim?.claim_id}) is Under Review`
                  : `Claim Submitted by Candidate: ${existingClaim?.claimant || 'Candidate'}`}
              </h3>
              <p className="claim-locked-desc">
                {isMyClaim
                  ? `You submitted this claim. Office staff will contact you at ${existingClaim?.claimant_phone || existingClaim?.claimant_email} upon verification.`
                  : `A verification claim was already submitted by ${existingClaim?.claimant || 'a student'}. Only one active claim is permitted per item.`}
              </p>

              {/* Claimant Proof Snippet */}
              {existingClaim && (
                <div
                  style={{
                    background: '#ffffff',
                    border: '1px solid #fed7aa',
                    borderRadius: '6px',
                    padding: '10px 12px',
                    margin: '10px 0',
                  }}
                >
                  <b style={{ fontSize: '11px', color: '#9a3412', display: 'block' }}>
                    Submitted Proof Message:
                  </b>
                  <span style={{ fontSize: '12px', color: '#431407' }}>
                    "{existingClaim.message || existingClaim.proof_snippet}"
                  </span>
                </div>
              )}

              {/* Show contact details to Staff, Admin, or Uploader */}
              {existingClaim && (isStaffOrAdmin || isMyUploadedItem) && (
                <div className="claimant-contact-card">
                  <span className="contact-card-title">Claimant Candidate Contact Details:</span>
                  <div className="contact-card-grid">
                    {existingClaim.claimant_phone && (
                      <a href={`tel:${existingClaim.claimant_phone}`} className="contact-card-item">
                        <Phone size={13} className="brand-blue" />
                        <span>{existingClaim.claimant_phone}</span>
                      </a>
                    )}
                    {existingClaim.claimant_email && (
                      <a href={`mailto:${existingClaim.claimant_email}`} className="contact-card-item">
                        <Mail size={13} className="brand-blue" />
                        <span>{existingClaim.claimant_email}</span>
                      </a>
                    )}
                    {existingClaim.claimant_department && (
                      <div className="contact-card-item">
                        <Building2 size={13} className="brand-blue" />
                        <span>{existingClaim.claimant_department}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons: Office Staff resolves, Claimant withdraws */}
              <div className="claim-locked-actions" style={{ marginTop: '14px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {isStaffOrAdmin && (
                  <button className="btn primary-btn" onClick={handleStaffResolve} title="Office staff & admin approve claim and resolve post">
                    <Check size={14} />
                    <span>Approve Claim &amp; Hand Over</span>
                  </button>
                )}

                {(isMyClaim || isStaffOrAdmin) && (
                  <button className="btn outline-btn" style={{ color: '#ef4444' }} onClick={handleWithdrawClaim} title="Withdraw or delete this claim">
                    <X size={14} />
                    <span>Withdraw / Delete Claim</span>
                  </button>
                )}

                <button className="btn outline-btn" onClick={() => navigate('/claims')}>
                  Track in Claims
                </button>
              </div>
            </div>
          </div>
        ) : isAdmin ? (
          /* Primary Admin view: Informational notice */
          <div className="claim-uploader-notice-box" style={{ background: '#fef3c7', borderColor: '#fde68a' }}>
            <div className="claim-header-icon-wrap" style={{ background: '#fef3c7', color: '#b45309' }}>
              <Crown size={20} />
            </div>
            <div>
              <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#92400e' }}>
                Primary Admin View
              </h4>
              <p style={{ fontSize: '11px', color: '#b45309', margin: '2px 0 0' }}>
                This found item is active. Students can submit verification claims below. Office staff review and resolve claims.
              </p>
            </div>
          </div>
        ) : (
          /* CASE 3: Student / Candidate submits claim */
          <>
            <div className="claim-card-header">
              <div className="claim-header-icon-wrap">
                <ShieldCheck size={22} />
              </div>
              <div className="claim-header-titles">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 className="claim-box-title">Claim this Item</h3>
                  <span className="one-claim-pill">Only 1 claim allowed</span>
                </div>
                <p className="claim-box-subtitle">
                  Submitting as candidate <b>{profile?.name}</b> ({profile?.phone || profile?.email}). Staff will contact you with this info.
                </p>
              </div>
            </div>

            <form className="claim-form" onSubmit={handleClaimSubmit}>
              <label className="claim-label">
                <span>Proof / Verification</span>
                <span className="required-star">*</span>
              </label>

              <textarea
                className="claim-textarea"
                rows={4}
                maxLength={500}
                value={proofNote}
                onChange={(e) => setProofNote(e.target.value)}
                placeholder="Provide details only you would know (e.g. specific contents, card details, marks, etc.) (minimum 10 characters)"
                required
              />

              <div className="claim-char-counter">
                <span></span>
                <span>{proofNote.length}/500</span>
              </div>

              {errorMessage && (
                <div className="alert-error-banner" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertCircle size={14} />
                  <span>{errorMessage}</span>
                </div>
              )}

              <button
                type="submit"
                className="btn primary-btn submit-claim-btn"
                disabled={submitting}
              >
                <Check size={15} />
                <span>{submitting ? 'Submitting Claim...' : 'Submit Claim'}</span>
              </button>
            </form>
          </>
        )}
      </div>

      {/* Staff Edit Post Modal */}
      {showEditModal && (
        <div className="modal-backdrop-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-dialog-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <div className="modal-title-group">
                <Edit3 size={18} className="brand-blue" />
                <h3>Edit Found Item Post</h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowEditModal(false)}
              >
                <X size={18} />
              </button>
            </div>
            <p className="modal-subtitle-text">
              Office Staff can update the post details. Changes are saved via PATCH /posts/{'{id}'}.
            </p>

            <form onSubmit={handleSaveEdit} className="modal-form">
              <div className="form-group">
                <label className="form-label">Item Title</label>
                <div className="input-wrap">
                  <Package size={16} />
                  <input
                    type="text"
                    required
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="Item title"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="claim-textarea"
                  rows={3}
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  placeholder="Describe the found item"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Location Found</label>
                <div className="input-wrap">
                  <MapPin size={16} />
                  <input
                    type="text"
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    placeholder="Where was the item found?"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Category</label>
                <div className="input-wrap">
                  <Tag size={16} />
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    style={{ border: 'none', outline: 'none', flex: 1, fontSize: '12px', background: 'transparent' }}
                  >
                    <option value="Electronics">Electronics</option>
                    <option value="Clothing">Clothing</option>
                    <option value="Accessories">Accessories</option>
                    <option value="Documents">Documents</option>
                    <option value="Keys">Keys</option>
                    <option value="Bags">Bags</option>
                    <option value="Sports">Sports</option>
                    <option value="General">General</option>
                  </select>
                </div>
              </div>

              <div className="modal-actions-row">
                <button
                  type="button"
                  className="btn outline-btn"
                  onClick={() => setShowEditModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn primary-btn">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
