import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, Eye, Archive } from 'lucide-react';
import { MOCK_ITEMS } from '../data/mockData';

export default function ManageFoundItems() {
  const [items, setItems] = useState(MOCK_ITEMS);

  const handleArchive = (postId) => {
    setItems(items.map((i) =>
      i.post_id === postId ? { ...i, status: 'archived' } : i
    ));
  };

  const handleReopen = (postId) => {
    setItems(items.map((i) =>
      i.post_id === postId ? { ...i, status: 'active' } : i
    ));
  };

  return (
    <div className="admin-page">
      <div className="page-title">
        <h1>Manage Found Items</h1>
        <p className="muted">View, Archive or Reopen items</p>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Item</th>
              <th>Title</th>
              <th>Location</th>
              <th>Date Found</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((x) => (
              <tr key={x.post_id}>
                <td>#{x.post_id}</td>
                <td>
                  {x.images?.[0] ? (
                    <img src={x.images[0]} alt="" className="table-thumb" />
                  ) : (
                    <div className="table-thumb-placeholder">
                      <Package size={14} />
                    </div>
                  )}
                </td>
                <td>{x.title}</td>
                <td>{x.location_found}</td>
                <td>
                  {new Date(x.found_on).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </td>
                <td>
                  <span className={`pill ${x.status === 'active' ? 'status-active' : 'status-archived'}`}>
                    {x.status === 'active' ? 'Active' : 'Archived'}
                  </span>
                </td>
                <td className="actions-cell">
                  <Link className="btn outline mini" to={`/items/${x.post_id}`}>
                    <Eye size={12} /> View
                  </Link>
                  {x.status === 'active' ? (
                    <button
                      className="btn outline mini archive-btn"
                      onClick={() => handleArchive(x.post_id)}
                    >
                      <Archive size={12} /> Archive
                    </button>
                  ) : (
                    <button
                      className="btn outline mini"
                      onClick={() => handleReopen(x.post_id)}
                    >
                      Reopen
                    </button>
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
