import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, Eye, CheckCircle, XCircle } from 'lucide-react';
import { MOCK_CLAIMS } from '../data/mockData';

export default function ManageClaims() {
  const [claims, setClaims] = useState(MOCK_CLAIMS);

  const handleApprove = (claimId) => {
    setClaims(claims.map((c) =>
      c.claim_id === claimId ? { ...c, status: 'approved' } : c
    ));
  };

  const handleReject = (claimId) => {
    setClaims(claims.map((c) =>
      c.claim_id === claimId ? { ...c, status: 'rejected' } : c
    ));
  };

  const pendingClaims = claims.filter((c) => c.status === 'pending');

  return (
    <div className="admin-page">
      <div className="page-title">
        <h1>Manage Claims</h1>
        <p className="muted">View pending claims and approve/reject</p>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Item</th>
              <th>Claimant</th>
              <th>Proof Snippet</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {claims.map((c) => (
              <tr key={c.claim_id}>
                <td>#{c.claim_id}</td>
                <td>{c.post_title}</td>
                <td>{c.claimant}</td>
                <td className="proof-cell">"{c.proof_snippet}"</td>
                <td>
                  <span
                    className={`pill ${
                      c.status === 'approved'
                        ? 'status-approved'
                        : c.status === 'rejected'
                        ? 'status-rejected'
                        : 'status-pending'
                    }`}
                  >
                    {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                  </span>
                </td>
                <td className="actions-cell">
                  <Link className="btn outline mini" to={`/items/${c.post_id}`}>
                    <Eye size={12} /> View
                  </Link>
                  {c.status === 'pending' && (
                    <>
                      <button
                        className="btn approve-btn mini"
                        onClick={() => handleApprove(c.claim_id)}
                      >
                        <CheckCircle size={12} /> Approve
                      </button>
                      <button
                        className="btn reject-btn mini"
                        onClick={() => handleReject(c.claim_id)}
                      >
                        <XCircle size={12} /> Reject
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
