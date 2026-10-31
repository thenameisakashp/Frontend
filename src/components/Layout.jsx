import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Search,
  Home,
  FileEdit,
  ClipboardList,
  Crown,
  LogOut,
  Menu,
  X,
  UserPlus,
  Check,
  ChevronUp,
  Phone,
  Building2,
  Mail,
  User,
  Edit3,
  CheckCircle2,
  PlusCircle,
  Shield,
  GraduationCap,
  Users,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';

export default function Layout() {
  const { profile, users, logout, switchAccount, updateProfile, backendStatus } = useAuth();
  const { backendSyncStatus } = useData();
  const nav = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [showEditContactModal, setShowEditContactModal] = useState(false);

  // Edit Contact Details State
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editDept, setEditDept] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [updateMsg, setUpdateMsg] = useState('');

  const role = profile?.role || 'student';
  const isAdmin   = role === 'admin';
  const isStaff   = role === 'office_staff';   // Backend uses 'office_staff'
  const isStudent = role === 'student';

  const isOnAdminPage = location.pathname.startsWith('/admin');

  let navLinks = [];
  if (isAdmin || isOnAdminPage) {
    navLinks = [
      { to: '/', label: 'Home', icon: Home, end: true },
      { to: '/admin', label: 'Admin Dashboard', icon: Crown },
      { to: '/claims', label: 'All Claims', icon: ClipboardList },
    ];
  } else if (isStaff) {
    navLinks = [
      { to: '/', label: 'Home', icon: Home, end: true },
      { to: '/staff/add', label: 'Register Found Item', icon: PlusCircle },
      { to: '/lost/report', label: 'Report Lost', icon: FileEdit },
      { to: '/claims', label: 'Claims & Resolution', icon: ClipboardList },
      { to: '/admin', label: 'Admin Panel', icon: Crown },
    ];
  } else {
    // Student / General User - matches reference screenshot
    navLinks = [
      { to: '/', label: 'Home', icon: Home, end: true },
      { to: '/lost/report', label: 'Report Lost', icon: FileEdit },
      { to: '/claims', label: 'My Claims', icon: ClipboardList },
      { to: '/admin', label: 'Admin Panel', icon: Crown },
    ];
  }

  const roleLabel = isAdmin ? 'Primary Admin' : isStaff ? 'Office Staff' : 'Student Candidate';
  const roleBadgeStyle = isAdmin
    ? { background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a' }
    : isStaff
    ? { background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }
    : { background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' };

  const handleOpenEditContact = (e) => {
    e.stopPropagation();
    setEditName(profile?.name || '');
    setEditPhone(profile?.phone || '');
    setEditDept(profile?.department || '');
    setEditEmail(profile?.email || '');
    setUpdateMsg('');
    setShowEditContactModal(true);
    setShowAccountMenu(false);
  };

  const handleSaveContactDetails = (e) => {
    e.preventDefault();
    updateProfile({
      name: editName,
      phone: editPhone,
      department: editDept,
      email: editEmail,
    });
    setUpdateMsg('Contact details updated successfully!');
    setTimeout(() => {
      setShowEditContactModal(false);
      setUpdateMsg('');
    }, 1200);
  };

  const handleSelectAccount = (userEmail) => {
    const switched = switchAccount(userEmail);
    setShowAccountMenu(false);
    if (switched?.role === 'admin' && location.pathname === '/login') {
      nav('/admin');
    } else if (switched?.role === 'office_staff') {
      nav('/staff/add');
    }
  };

  const isConnected = backendStatus?.online || backendSyncStatus?.connected;

  return (
    <div className="app-shell">
      {/* Mobile Backdrop */}
      {open && <div className="sidebar-backdrop" onClick={() => setOpen(false)} />}

      {/* Sidebar */}
      <aside className={`sidebar ${open ? 'show' : ''}`}>
        {/* Brand */}
        <div className="brand">
          <div className="brand-icon">
            <Search size={20} strokeWidth={2.8} />
          </div>
          <div className="brand-text">
            <span>FindIt</span>
            <small>Lost &amp; Found</small>
          </div>
          <button className="mobile-close" onClick={() => setOpen(false)} aria-label="Close menu">
            <X size={18} />
          </button>
        </div>

        {/* Backend Connected Status Tag */}
        <div className="sidebar-backend-badge" title={`Connected to ${backendStatus.url}`}>
          <span className={`status-indicator-dot ${isConnected ? 'dot-online' : 'dot-offline'}`} />
          <span>{isConnected ? 'Backend Live' : 'Connecting API...'}</span>
        </div>

        {/* Role Indicator Banner */}
        <div
          style={{
            margin: '0 4px 14px',
            padding: '6px 8px',
            borderRadius: '6px',
            fontSize: '10px',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            textTransform: 'uppercase',
            letterSpacing: '0.4px',
            ...roleBadgeStyle,
          }}
        >
          {isAdmin && <Crown size={13} />}
          {isStaff && <Shield size={13} />}
          {isStudent && <GraduationCap size={13} />}
          <span>{roleLabel}</span>
        </div>

        {/* Navigation */}
        <nav className="nav-menu">
          {navLinks.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setOpen(false)}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Sidebar Bottom Profile & Mutual Account Switcher */}
        <div className="sidebar-bottom">
          {/* Mutual Account Switcher Popover */}
          {showAccountMenu && (
            <div className="account-switcher-popover">
              <div className="popover-header">
                <span>Switch Connected Account</span>
                <button
                  type="button"
                  className="popover-close-btn"
                  onClick={() => setShowAccountMenu(false)}
                >
                  <X size={12} />
                </button>
              </div>

              <div className="popover-users-list">
                {users.map((u) => {
                  const isCurrent = u.id === profile?.id || u.email === profile?.email;
                  return (
                    <button
                      key={u.id}
                      type="button"
                      className={`popover-user-row ${isCurrent ? 'active-user' : ''}`}
                      onClick={() => handleSelectAccount(u.email)}
                    >
                      <span className="popover-avatar">{u.name.slice(0, 1)}</span>
                      <div className="popover-user-details">
                        <b>{u.name}</b>
                        <small>
                          <span
                            style={{
                              fontWeight: 700,
                              color:
                                u.role === 'admin'
                                ? '#b45309'
                                : (u.role === 'staff' || u.role === 'office_staff')
                                ? '#1d4ed8'
                                : '#15803d',
                            }}
                          >
                            [{u.role === 'admin' ? 'PRIMARY ADMIN' : (u.role === 'office_staff' || u.role === 'staff') ? 'OFFICE STAFF' : u.role?.toUpperCase()}]
                          </span>{' '}
                          · {u.phone || u.email}
                        </small>
                      </div>
                      {isCurrent && <Check size={14} className="current-check" />}
                    </button>
                  );
                })}
              </div>

              <div className="popover-footer">
                {isAdmin ? (
                  <button
                    type="button"
                    className="popover-add-account-btn"
                    onClick={() => {
                      setShowAccountMenu(false);
                      nav('/admin');
                    }}
                  >
                    <UserPlus size={13} />
                    <span>+ Provision User (Admin Portal)</span>
                  </button>
                ) : (
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', textAlign: 'center', display: 'block', padding: '6px' }}>
                    User accounts are provisioned by Admin
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Active Profile Mini Bar */}
          <div className="profile-mini-box">
            <div
              className="profile-mini"
              onClick={() => setShowAccountMenu(!showAccountMenu)}
              title="Click to switch between connected candidate, staff & admin accounts"
            >
              <div className="avatar">
                <span className="avatar-icon">{(profile?.name || 'U').slice(0, 1).toUpperCase()}</span>
              </div>
              <div className="profile-info">
                <b>{profile?.name || 'Connected Member'}</b>
                <small
                  className={
                    isAdmin ? 'role-admin' : isStaff ? 'role-staff' : 'role-student'
                  }
                >
                  {roleLabel}
                </small>
              </div>
              <button
                type="button"
                className="account-switch-trigger"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAccountMenu(!showAccountMenu);
                }}
                title="Switch account"
              >
                <ChevronUp size={14} />
              </button>
            </div>

            {/* Candidate / Staff Contact Info Snippet & Edit Button */}
            {profile && (
              <div className="candidate-contact-snippet">
                {profile.phone && (
                  <div className="snippet-row">
                    <Phone size={10} className="snippet-icon" />
                    <span>{profile.phone}</span>
                  </div>
                )}
                {profile.department && (
                  <div className="snippet-row">
                    <Building2 size={10} className="snippet-icon" />
                    <span>{profile.department}</span>
                  </div>
                )}
                <button
                  type="button"
                  className="btn-edit-contact-link"
                  onClick={handleOpenEditContact}
                >
                  <Edit3 size={11} />
                  <span>Update Contact Details</span>
                </button>
              </div>
            )}
          </div>

          <button
            className="nav-link logout-btn"
            onClick={() => {
              logout();
              nav('/login');
            }}
          >
            <LogOut size={16} />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-area">
        {/* Mobile Header Bar */}
        <header className="mobile-topbar">
          <button className="menu-button" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu size={22} />
          </button>
          <div className="mobile-brand-title">
            <Search size={18} className="brand-blue" />
            <b>FindIt</b>
          </div>
          <div
            className="role-chip"
            onClick={handleOpenEditContact}
            style={{ cursor: 'pointer' }}
            title="Update contact details"
          >
            {profile?.name || 'Member'}
          </div>
        </header>

        {/* Page Content Outlet */}
        <div className="page-wrap">
          <Outlet />
        </div>
      </main>

      {/* UPDATE CONTACT DETAILS MODAL */}
      {showEditContactModal && (
        <div className="modal-backdrop-overlay" onClick={() => setShowEditContactModal(false)}>
          <div className="modal-dialog-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <div className="modal-title-group">
                <Edit3 size={18} className="brand-blue" />
                <h3>Update Contact Details</h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowEditContactModal(false)}
              >
                <X size={16} />
              </button>
            </div>

            <p className="modal-subtitle-text">
              Keep your contact details up to date so finders, claimants, and campus staff can reach you.
            </p>

            {updateMsg && (
              <div className="alert-success-banner">
                <CheckCircle2 size={16} />
                <span>{updateMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveContactDetails} className="modal-form">
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <div className="input-wrap">
                  <User size={16} />
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Full Name"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Contact Phone / Mobile Number</label>
                <div className="input-wrap">
                  <Phone size={16} />
                  <input
                    type="tel"
                    required
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="e.g. +1 (555) 019-2831 or 9876543210"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Department / Office Location / Student ID</label>
                <div className="input-wrap">
                  <Building2 size={16} />
                  <input
                    type="text"
                    required
                    value={editDept}
                    onChange={(e) => setEditDept(e.target.value)}
                    placeholder="e.g. Mechanical Eng - Sem 5 (ID: ME2024-11)"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Campus Email Address</label>
                <div className="input-wrap">
                  <Mail size={16} />
                  <input
                    type="email"
                    required
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="user@team18.com"
                  />
                </div>
              </div>

              <div className="modal-actions-row">
                <button
                  type="button"
                  className="btn outline-btn"
                  onClick={() => setShowEditContactModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn primary-btn">
                  Save Contact Details
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
