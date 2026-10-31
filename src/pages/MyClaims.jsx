import { useState } from 'react';
import { ClipboardList, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MOCK_MY_CLAIMS } from '../data/mockData';

export default function MyClaims() {
  const [activeTab, setActiveTab] = useState('all');

  const claims = MOCK_MY_CLAIMS;

  const filtered = activeTab === 'all'
    ? claims
    : claims.filter((c) => c.status.toLowerCase() === activeTab);

  const statusClass = (status) => {
    const s = status.toLowerCase();
    if (s === 'approved') return 'status-approved';
    if (s === 'rejected') return 'status-rejected';
    return 'status-pending';
  };

  return (
    <div className="my-claims-page">
      <div className="claims-header">
        <h1>My Claims</h1>
        <p>Track the status of your claims.</p>
      </div>

      <div className="claims-tabs">
        {['all', 'pending', 'approved', 'rejected'].map((tab) => (
          <button
            key={tab}
            className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'all' ? 'All Claims' : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {filtered.length > 0 ? (
        <div className="claims-list">
          {filtered.map((claim) => (
            <div key={claim.claim_id} className="claim-card">
              <div className="claim-card-image">
                <div className="claim-card-placeholder">
                  <ClipboardList size={20} />
                </div>
              </div>
              <div className="claim-card-info">
                <div className="claim-card-row">
                  <span className="claim-id">#{claim.claim_id}</span>
                  <h3>{claim.title}</h3>
                </div>
                <div className="claim-card-meta">
                  <span>{claim.date}</span>
                  <span>{claim.location}</span>
                </div>
              </div>
              <div className="claim-card-actions">
                <span className={`status-badge ${statusClass(claim.status)}`}>
                  {claim.status}
                </span>
                <Link to={`/items/${claim.post_id}`} className="btn outline mini">
                  <Eye size={14} /> View
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <ClipboardList size={32} />
          <h3>No claims found</h3>
          <p>No claims match the selected filter.</p>
        </div>
      )}
    </div>
  );
}
