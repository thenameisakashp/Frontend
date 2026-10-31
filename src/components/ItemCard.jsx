import { MapPin, CalendarDays, Package, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useData } from '../context/DataContext';

export default function ItemCard({ item }) {
  const { getItemClaim } = useData();
  const id = item.post_id || item.id || item.request_id || item.local_id;
  const title = item.title || item.item_name || 'Missing Item';
  const images = item.images || [];
  const image =
    typeof images[0] === 'string'
      ? images[0]
      : images[0]?.url || images[0]?.image_url || null;

  const rawDate = item.found_on || item.lost_on;
  const formattedDate = rawDate
    ? new Date(rawDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Recently';

  const existingClaim = getItemClaim(id);
  const isClaimed =
    existingClaim?.status === 'approved' ||
    existingClaim?.decision === 'approved' ||
    item.status === 'claimed' ||
    item.resolved === true;

  const isClaimPending =
    !isClaimed &&
    (existingClaim?.status === 'pending' ||
      existingClaim?.decision === 'pending' ||
      item.status === 'claim_pending');

  const isLost = item.type === 'lost';

  return (
    <div className={`item-card ${isClaimPending ? 'card-claim-pending' : ''}`}>
      <div className="item-image-wrapper">
        {image ? (
          <img src={image} alt={title} className="item-thumb-img" loading="lazy" />
        ) : (
          <div className="item-no-image-placeholder">
            <Package size={28} className="placeholder-icon" />
            <span>{item.category || 'Missing Item'}</span>
          </div>
        )}

        {isClaimed ? (
          <span className="pill green-pill">Claimed</span>
        ) : isClaimPending ? (
          <span className="pill yellow-pill" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
            <Lock size={9} />
            <span>Claim Pending</span>
          </span>
        ) : isLost ? (
          <span className="pill" style={{ background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5' }}>
            Reported Lost
          </span>
        ) : (
          <span className="pill green-pill">Found</span>
        )}
      </div>

      <div className="item-details">
        <h3 className="item-title">{title}</h3>
        <div className="item-meta-list">
          <div className="meta-row">
            <MapPin size={13} className="meta-icon" />
            <span>{item.location_found || item.location_lost || item.location || 'Campus'}</span>
          </div>
          <div className="meta-row">
            <CalendarDays size={13} className="meta-icon" />
            <span>{formattedDate}</span>
          </div>
        </div>

        <Link
          className={`view-details-link ${isClaimPending ? 'view-details-claimed' : ''}`}
          to={`/items/${encodeURIComponent(id)}`}
        >
          {isClaimPending ? 'View Claim Status' : 'View Details'}
        </Link>
      </div>
    </div>
  );
}
