import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, SlidersHorizontal, Package, RotateCcw, FileEdit } from 'lucide-react';
import { useData } from '../context/DataContext';
import { CATEGORIES, LOCATIONS } from '../data/mockData';
import ItemCard from '../components/ItemCard';

export default function Browse() {
  const { activeItems, archivedItems, items } = useData();
  const [statusTab, setStatusTab] = useState('active'); // 'active' | 'archived' | 'all'
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [sortOrder, setSortOrder] = useState('latest');
  const [showFilters, setShowFilters] = useState(false);

  const baseItems = useMemo(() => {
    if (statusTab === 'active') return activeItems;
    if (statusTab === 'archived') return archivedItems;
    return items;
  }, [statusTab, activeItems, archivedItems, items]);

  const filteredItems = useMemo(() => {
    let result = [...baseItems];

    if (query.trim()) {
      const q = query.toLowerCase().trim();
      result = result.filter(
        (item) =>
          (item.title && item.title.toLowerCase().includes(q)) ||
          (item.description && item.description.toLowerCase().includes(q)) ||
          (item.location_found && item.location_found.toLowerCase().includes(q)) ||
          (item.category && item.category.toLowerCase().includes(q))
      );
    }

    if (category) {
      result = result.filter((item) => item.category === category);
    }

    if (location) {
      result = result.filter((item) => item.location_found === location);
    }

    if (sortOrder === 'oldest') {
      result.sort((a, b) => new Date(a.found_on) - new Date(b.found_on));
    } else {
      result.sort((a, b) => new Date(b.found_on) - new Date(a.found_on));
    }

    return result;
  }, [baseItems, query, category, location, sortOrder]);

  const handleReset = () => {
    setQuery('');
    setCategory('');
    setLocation('');
    setSortOrder('latest');
  };

  return (
    <div className="browse-page-container">
      {/* Page Title */}
      <div className="page-header-block">
        <span className="eyebrow-text">THE CAMPUS COLLECTION</span>
        <h1 className="page-title-text">Browse items</h1>
        <p className="page-subtitle-text">
          Search what has been reported around your campus.
        </p>
      </div>

      {/* Search Bar */}
      <div className="browse-search-bar">
        <Search size={18} className="browse-search-icon" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by item name, description or location…"
          className="browse-search-input"
        />
        <button
          type="button"
          className={`browse-filter-toggle-btn ${showFilters ? 'active' : ''}`}
          onClick={() => setShowFilters(!showFilters)}
          title="Toggle filters"
        >
          <SlidersHorizontal size={18} />
        </button>
      </div>

      {/* Status Tabs: Active / Archived (per spec: List with GET /posts?status=archived) */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
        <button
          type="button"
          className={`claims-tab-btn ${statusTab === 'active' ? 'active' : ''}`}
          onClick={() => setStatusTab('active')}
        >
          Active Listings ({activeItems.length})
        </button>
        <button
          type="button"
          className={`claims-tab-btn ${statusTab === 'archived' ? 'active' : ''}`}
          onClick={() => setStatusTab('archived')}
        >
          Archived / Reunited ({archivedItems.length})
        </button>
        <button
          type="button"
          className={`claims-tab-btn ${statusTab === 'all' ? 'active' : ''}`}
          onClick={() => setStatusTab('all')}
        >
          All Items ({items.length})
        </button>
      </div>

      {/* Filter Options */}
      {showFilters && (
        <div className="browse-filters-drawer">
          <div className="drawer-select-group">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="drawer-select"
            >
              <option value="">All Categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="drawer-select"
            >
              <option value="">All Locations</option>
              {LOCATIONS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>

            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="drawer-select"
            >
              <option value="latest">Latest First</option>
              <option value="oldest">Oldest First</option>
            </select>

            <button className="btn outline-btn reset-btn" onClick={handleReset}>
              <RotateCcw size={13} />
              <span>Reset</span>
            </button>
          </div>
        </div>
      )}

      {/* Results Header Line */}
      <div className="browse-results-line">
        <b>{filteredItems.length} items available</b>
        <span>Showing active listings</span>
      </div>

      {/* Grid of Items or Empty State */}
      {filteredItems.length > 0 ? (
        <div className="item-grid compact-grid">
          {filteredItems.map((item) => (
            <ItemCard item={item} key={item.post_id || item.id} />
          ))}
        </div>
      ) : activeItems.length === 0 ? (
        <div className="empty-state-box">
          <Package size={44} className="empty-icon" />
          <h3>No items listed yet</h3>
          <p>Be the first to upload a missing item!</p>
          <Link to="/lost/report" className="btn primary-btn" style={{ marginTop: 14 }}>
            <FileEdit size={14} />
            <span>Upload a Missing Item</span>
          </Link>
        </div>
      ) : (
        <div className="empty-state-box">
          <Search size={36} className="empty-icon" />
          <h3>No matching items</h3>
          <p>Try another search keyword or clear applied filters.</p>
          <button className="btn outline-btn" onClick={handleReset} style={{ marginTop: 12 }}>
            Clear Filters
          </button>
        </div>
      )}
    </div>
  );
}
