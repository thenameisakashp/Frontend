import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileEdit,
  CheckCircle2,
  Phone,
  Mail,
  Plus,
  Search,
  Edit3,
  Trash2,
  X,
  MapPin,
  Tag,
  Package,
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';

export default function LostRequestsPage() {
  const { lostRequests, archiveLostRequest, editLostRequest, deleteLostRequest } = useData();
  const { profile } = useAuth();
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [actionMsg, setActionMsg] = useState('');

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editCategory, setEditCategory] = useState('');

  const isStaff = profile?.role === 'staff' || profile?.role === 'office_staff';
  const isAdmin = profile?.role === 'admin';
  const isStaffOrAdmin = isStaff || isAdmin;

  // Per spec: "Staff see everyone's, others see their own"
  // Admin does NOT participate in lost-requests (non-admin only), but can still view from admin overview
  const visibleRequests = isStaff
    ? lostRequests
    : lostRequests.filter(
        (r) =>
          r.owner_email === profile?.email ||
          r.created_by === profile?.email ||
          r.reported_by === profile?.name
      );

  const filtered = visibleRequests.filter((r) => {
    if (filter === 'active' && r.status === 'archived') return false;
    if (filter === 'archived' && r.status !== 'archived') return false;
    if (query.trim()) {
      const q = query.toLowerCase();
      return (
        r.title?.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q) ||
        r.location_lost?.toLowerCase().includes(q) ||
        r.reported_by?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const showNotice = (msg) => {
    setActionMsg(msg);
    setTimeout(() => setActionMsg(''), 4000);
  };

  const handleArchive = async (id, title) => {
    await archiveLostRequest(id);
    showNotice(`"${title}" marked as found / archived.`);
  };

  const handleDelete = async (id, title) => {
    if (window.confirm(`Delete lost report "${title}"? This cannot be undone.`)) {
      await deleteLostRequest(id);
      showNotice(`"${title}" deleted.`);
    }
  };

  // Owner action: PATCH /lost-requests/{id}
  const handleOpenEdit = (r) => {
    setEditId(r.id);
    setEditTitle(r.title || '');
    setEditDesc(r.description || '');
    setEditLocation(r.location_lost || '');
    setEditCategory(r.category || 'General');
    setShowEditModal(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    await editLostRequest(editId, {
      title: editTitle.trim(),
      description: editDesc.trim(),
      location_lost: editLocation.trim(),
      category: editCategory,
    });
    setShowEditModal(false);
    showNotice(`Lost report updated successfully.`);
  };

  return (
    <div className="browse-page-container">
      {/* Page Header */}
      <div className="page-header-block">
        <span className="eyebrow-text">
          {isStaff ? 'STAFF DESK · LOST REPORTS' : 'YOUR MISSING REPORTS'}
        </span>
        <h1 className="page-title-text">
          {isStaff ? 'Lost Item Requests' : 'My Reported Lost Items'}
        </h1>
        <p className="page-subtitle-text">
          {isStaff
            ? 'Staff review all reported missing items submitted by campus students to assist in matching found belongings.'
            : 'Track the status of belongings you reported missing. Mark them as found/archived when reunited.'}
        </p>
      </div>

      {actionMsg && (
        <div className="alert-success-banner" style={{ marginBottom: 14 }}>
          <CheckCircle2 size={16} />
          <span>{actionMsg}</span>
        </div>
      )}

      {/* Actions and Search Bar */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap' }}>
        <div className="browse-search-bar" style={{ flex: 1, minWidth: '240px', margin: 0 }}>
          <Search size={16} className="browse-search-icon" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search lost reports by item title, location, student name…"
            className="browse-search-input"
          />
        </div>

        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            type="button"
            className={`claims-tab-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All ({visibleRequests.length})
          </button>
          <button
            type="button"
            className={`claims-tab-btn ${filter === 'active' ? 'active' : ''}`}
            onClick={() => setFilter('active')}
          >
            Active ({visibleRequests.filter((r) => r.status !== 'archived').length})
          </button>
          <button
            type="button"
            className={`claims-tab-btn ${filter === 'archived' ? 'active' : ''}`}
            onClick={() => setFilter('archived')}
          >
            Archived ({visibleRequests.filter((r) => r.status === 'archived').length})
          </button>
        </div>

        {!isStaffOrAdmin && (
          <Link to="/lost/report" className="btn primary-btn" style={{ marginLeft: 'auto' }}>
            <Plus size={14} />
            <span>Report Lost Item</span>
          </Link>
        )}
      </div>

      {/* Requests Table */}
      {filtered.length > 0 ? (
        <div className="admin-table-card">
          <table className="admin-data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Item Title</th>
                <th>Reported By</th>
                <th>Location Lost</th>
                <th>Date Lost</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const isOwner =
                  r.owner_email === profile?.email ||
                  r.created_by === profile?.email ||
                  r.reported_by === profile?.name;

                return (
                  <tr key={r.id}>
                    <td className="td-id">#{r.id}</td>
                    <td className="td-title">
                      <b>{r.title}</b>
                      <small className="td-sub-text">{r.category || 'General'}</small>
                      {r.description && (
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                          "{r.description}"
                        </p>
                      )}
                    </td>
                    <td>
                      <div className="contact-cell-stack">
                        <b>{r.reported_by}</b>
                        {r.phone && (
                          <a href={`tel:${r.phone}`} className="contact-sub-link">
                            <Phone size={10} />
                            <span>{r.phone}</span>
                          </a>
                        )}
                        {r.owner_email && (
                          <a href={`mailto:${r.owner_email}`} className="contact-sub-link">
                            <Mail size={10} />
                            <span>{r.owner_email}</span>
                          </a>
                        )}
                      </div>
                    </td>
                    <td>{r.location_lost}</td>
                    <td>{r.lost_on}</td>
                    <td>
                      <span className={`pill ${r.status === 'archived' ? 'grey-pill' : 'yellow-pill'}`}>
                        {r.status === 'archived' ? 'Archived / Reunited' : 'Active Report'}
                      </span>
                    </td>
                    <td className="td-actions">
                      <div className="table-actions-cluster">
                        {/* Owner can edit (PATCH /lost-requests/{id}) */}
                        {isOwner && r.status !== 'archived' && (
                          <button
                            type="button"
                            className="btn outline-btn mini-btn"
                            onClick={() => handleOpenEdit(r)}
                            title="Edit lost report (PATCH /lost-requests/{id})"
                          >
                            <Edit3 size={12} />
                            <span>Edit</span>
                          </button>
                        )}

                        {/* Owner or Staff can archive (PATCH /lost-requests/{id} status=archived) */}
                        {r.status !== 'archived' && (isOwner || isStaff) && (
                          <button
                            type="button"
                            className="btn outline-btn mini-btn"
                            onClick={() => handleArchive(r.id, r.title)}
                            title="Set status to archived once found"
                          >
                            <CheckCircle2 size={12} />
                            <span>Mark Found</span>
                          </button>
                        )}

                        {/* Owner can delete (DELETE /lost-requests/{id}) */}
                        {isOwner && (
                          <button
                            type="button"
                            className="btn outline-btn mini-btn"
                            style={{ color: '#ef4444' }}
                            onClick={() => handleDelete(r.id, r.title)}
                            title="Delete lost report (DELETE /lost-requests/{id})"
                          >
                            <Trash2 size={12} />
                            <span>Delete</span>
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
          <FileEdit size={40} className="empty-icon" />
          <h3>No lost item requests found</h3>
          <p>
            {isStaff
              ? 'No student has submitted an active lost request matching this filter.'
              : 'You have not submitted any missing item reports yet.'}
          </p>
          {!isStaffOrAdmin && (
            <Link to="/lost/report" className="btn primary-btn" style={{ marginTop: 14 }}>
              <Plus size={14} />
              <span>Report a Lost Item</span>
            </Link>
          )}
        </div>
      )}

      {/* Owner Edit Lost Report Modal */}
      {showEditModal && (
        <div className="modal-backdrop-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-dialog-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <div className="modal-title-group">
                <Edit3 size={18} className="brand-blue" />
                <h3>Edit Lost Report</h3>
              </div>
              <button type="button" className="modal-close-btn" onClick={() => setShowEditModal(false)}>
                <X size={18} />
              </button>
            </div>
            <p className="modal-subtitle-text">
              Update your lost item details. Changes saved via PATCH /lost-requests/{'{id}'}.
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
                    placeholder="What did you lose?"
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
                  placeholder="Describe the lost item"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Location Lost</label>
                <div className="input-wrap">
                  <MapPin size={16} />
                  <input
                    type="text"
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    placeholder="Where did you lose it?"
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
                <button type="button" className="btn outline-btn" onClick={() => setShowEditModal(false)}>
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
