import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, ArrowUpRight, Package, RotateCcw, PlusCircle, FileEdit } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { CATEGORIES, LOCATIONS } from '../data/mockData';
import ItemCard from '../components/ItemCard';

export default function Dashboard() {
  const { profile } = useAuth();
  const { activeItems } = useData();
  const [activeSectionTab, setActiveSectionTab] = useState('all'); // 'all' | 'found' | 'lost'
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [sortOrder, setSortOrder] = useState('latest');

  const filteredItems = useMemo(() => {
    let result = [...activeItems];

    if (activeSectionTab === 'found') {
      result = result.filter((item) => item.type !== 'lost');
    } else if (activeSectionTab === 'lost') {
      result = result.filter((item) => item.type === 'lost');
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (item) =>
          (item.title && item.title.toLowerCase().includes(q)) ||
          (item.description && item.description.toLowerCase().includes(q)) ||
          (item.location_found && item.location_found.toLowerCase().includes(q)) ||
          (item.location_lost && item.location_lost.toLowerCase().includes(q)) ||
          (item.category && item.category.toLowerCase().includes(q))
      );
    }

    if (category) {
      result = result.filter((item) => item.category === category);
    }

    if (location) {
      result = result.filter(
        (item) => item.location_found === location || item.location_lost === location
      );
    }

    if (sortOrder === 'oldest') {
      result.sort((a, b) => new Date(a.found_on || a.lost_on) - new Date(b.found_on || b.lost_on));
    } else {
      result.sort((a, b) => new Date(b.found_on || b.lost_on) - new Date(a.found_on || a.lost_on));
    }

    return result;
  }, [activeItems, activeSectionTab, searchQuery, category, location, sortOrder]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setCategory('');
    setLocation('');
    setSortOrder('latest');
    setActiveSectionTab('all');
  };

  const totalCount = activeItems.length;
  const foundCount = activeItems.filter((i) => i.type !== 'lost').length;
  const lostCount = activeItems.filter((i) => i.type === 'lost').length;

  return (
    <div className="home-container">
      {/* Hero Banner */}
      <div className="home-hero">
        <div className="hero-counter-badge">
          <span>{totalCount > 0 ? `1/${totalCount}` : '0/0'}</span>
          <span className="hero-counter-sub">{totalCount} items</span>
        </div>

        <div className="hero-content">
          <h1 className="hero-title">FindIt: Lost &amp; Found</h1>
          <p className="hero-subtitle">
            Lost something? Someone might have already found it.
            <br />
            Let's reunite items with their owners!
          </p>

          {/* Search Box */}
          <div className="hero-search-box">
            <Search size={18} className="search-box-icon" />
            <input
              type="text"
              placeholder="Search items (e.g. phone, wallet, bag...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-box-input"
            />
            <button className="btn hero-search-btn" type="button">
              <Search size={15} />
              <span>Search</span>
            </button>
          </div>

          {/* Filter Dropdowns */}
          <div className="hero-filters-row">
            <div className="filter-select-wrapper">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="hero-select"
              >
                <option value="">All Categories</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-select-wrapper">
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="hero-select"
              >
                <option value="">All Locations</option>
                {LOCATIONS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-select-wrapper">
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="hero-select"
              >
                <option value="latest">Latest First</option>
                <option value="oldest">Oldest First</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Section Header with Tabs */}
      <div className="section-header-row">
        <div className="section-title-group" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <h2 className="section-heading-text" style={{ margin: 0 }}>Found Items</h2>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              type="button"
              className={`claims-tab-btn ${activeSectionTab === 'all' ? 'active' : ''}`}
              onClick={() => setActiveSectionTab('all')}
              style={{ padding: '4px 10px', fontSize: 12, borderRadius: 6 }}
            >
              All Items ({totalCount})
            </button>
            <button
              type="button"
              className={`claims-tab-btn ${activeSectionTab === 'found' ? 'active' : ''}`}
              onClick={() => setActiveSectionTab('found')}
              style={{ padding: '4px 10px', fontSize: 12, borderRadius: 6 }}
            >
              Found ({foundCount})
            </button>
            <button
              type="button"
              className={`claims-tab-btn ${activeSectionTab === 'lost' ? 'active' : ''}`}
              onClick={() => setActiveSectionTab('lost')}
              style={{ padding: '4px 10px', fontSize: 12, borderRadius: 6 }}
            >
              Reported Lost ({lostCount})
            </button>
          </div>
        </div>

        <div className="section-actions-group">
          {(searchQuery || category || location) && (
            <button className="reset-filter-btn" onClick={handleResetFilters}>
              <RotateCcw size={13} />
              <span>Reset</span>
            </button>
          )}
          {profile?.role !== 'admin' && (
            <Link to="/lost/report" className="btn mini-btn primary-btn" style={{ fontSize: 12, padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <FileEdit size={13} />
              <span>Report Lost</span>
            </Link>
          )}
          {profile?.role === 'office_staff' && (
            <Link to="/staff/add" className="btn mini-btn outline-btn" style={{ fontSize: 12, padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <PlusCircle size={13} />
              <span>Register Found</span>
            </Link>
          )}
        </div>
      </div>

      {/* Items Grid */}
      {filteredItems.length > 0 ? (
        <div className="item-grid compact-grid">
          {filteredItems.map((item) => (
            <ItemCard item={item} key={item.post_id || item.id} />
          ))}
        </div>
      ) : totalCount === 0 ? (
        <div className="empty-state-box">
          <Package size={44} className="empty-icon" style={{ opacity: 0.6 }} />
          <h3>No Items Uploaded Yet</h3>
          <p>
            When an item is uploaded or reported missing, it will immediately appear here.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 14 }}>
            {profile?.role !== 'admin' && (
              <Link to="/lost/report" className="btn primary-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <FileEdit size={15} /> Report a Lost Item
              </Link>
            )}
            {profile?.role === 'office_staff' && (
              <Link to="/staff/add" className="btn outline-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <PlusCircle size={15} /> Register Found Item
              </Link>
            )}
          </div>
        </div>
      ) : (
        <div className="empty-state-box">
          <Search size={36} className="empty-icon" />
          <h3>No matching items</h3>
          <p>Try searching for a different keyword or resetting filters.</p>
          <button className="btn outline-btn reset-btn" onClick={handleResetFilters} style={{ marginTop: 10 }}>
            Reset Filters
          </button>
        </div>
      )}
    </div>
  );
}
