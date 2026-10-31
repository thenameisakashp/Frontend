import { useState, useRef } from 'react';
import { ArrowLeft, Upload, PlusCircle, CheckCircle2, X, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { CATEGORIES } from '../data/mockData';

export default function StaffAdd() {
  const { profile } = useAuth();
  const { addFoundItem } = useData();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    title: '',
    description: '',
    location_found: '',
    found_on: new Date().toISOString().split('T')[0],
    category: 'Electronics',
  });

  const [images, setImages] = useState([]);        // { dataUrl, file } pairs
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const remaining = 5 - images.length;
    if (remaining <= 0) { setError('Maximum 5 images allowed.'); return; }
    const toRead = files.slice(0, remaining);
    toRead.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setImages((prev) => prev.length < 5 ? [...prev, { dataUrl: ev.target.result, file }] : prev);
      };
      reader.readAsDataURL(file);
    });
    setError('');
    // Reset file input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (idx) => setImages((prev) => prev.filter((_, i) => i !== idx));

  async function submit(e) {
    e.preventDefault();
    if (!form.title.trim() || form.title.trim().length < 3) {
      setError('Item title must be at least 3 characters.');
      return;
    }
    setBusy(true);
    setError('');
    setMsg('');

    try {
      const created = await addFoundItem(
        {
          title: form.title.trim(),
          description: form.description.trim(),
          location_found: form.location_found.trim() || 'Campus',
          found_on: form.found_on,
          category: form.category,
          images: images.map((img) => img.dataUrl),    // preview URLs for local display
          imageFiles: images.map((img) => img.file),   // actual File objects for backend upload
        },
        profile
      );

      setMsg(`"${created.title}" published! Post ID: ${created.post_id}`);
      setForm({
        title: '', description: '', location_found: '',
        found_on: new Date().toISOString().split('T')[0],
        category: 'Electronics',
      });
      setImages([]);
      setTimeout(() => navigate('/'), 1800);
    } catch (err) {
      setError(err?.response?.data?.error?.message || err.message || 'Failed to publish. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="report-lost-container">
      <Link to="/" className="back-nav-link"><ArrowLeft size={16} /> Dashboard</Link>

      <div className="report-page-header">
        <div className="report-header-icon-box" style={{ background: '#dbeafe', color: '#1d4ed8' }}>
          <PlusCircle size={24} />
        </div>
        <div className="report-header-text">
          <span className="eyebrow-text">OFFICE STAFF WORKSPACE</span>
          <h1 className="report-main-title">Register a Found Item</h1>
          <p className="report-main-subtitle">
            Publish found items so rightful owners can identify and submit a claim.
          </p>
        </div>
      </div>

      {msg && (
        <div className="alert-success-banner" style={{ marginBottom: 18 }}>
          <CheckCircle2 size={18} /><span>{msg}</span>
        </div>
      )}
      {error && (
        <div className="alert-error-banner" style={{ marginBottom: 18 }}>{error}</div>
      )}

      <form className="report-form-card" onSubmit={submit}>
        <div className="report-form-col-left">
          <div className="uploader-pill-banner" style={{ background: '#eff6ff', color: '#1d4ed8' }}>
            <span>Office Staff: <b>{profile?.name}</b> · {profile?.dept || 'Lost & Found Desk'}</span>
          </div>

          <div className="form-group">
            <label className="form-label">Item Name / Title <span className="required-star">*</span></label>
            <input required minLength={3} name="title" value={form.title} onChange={change}
              placeholder="e.g. Black wireless earbuds in charging case" className="form-input" />
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea name="description" value={form.description} onChange={change}
              rows={4} placeholder="Color, brand, unique markings, stickers…" className="form-textarea" />
          </div>

          <div className="form-group">
            <label className="form-label">Found Location</label>
            <input name="location_found" value={form.location_found} onChange={change}
              placeholder="e.g. Library 2nd Floor, Canteen counter, Gym" className="form-input" />
          </div>

          <div className="form-group">
            <label className="form-label">Category</label>
            <select name="category" value={form.category} onChange={change} className="form-select">
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Date Found</label>
            <input type="date" name="found_on" value={form.found_on} onChange={change}
              className="form-input" max={new Date().toISOString().split('T')[0]} />
          </div>
        </div>

        <div className="report-form-col-right">
          <div className="upload-section-title">Item Photos (up to 5)</div>
          <label className="image-dropzone-box">
            <input ref={fileInputRef} type="file" accept="image/*" multiple
              onChange={handleFileUpload} className="file-hidden-input" disabled={images.length >= 5} />
            <Upload size={30} className="dropzone-upload-icon" />
            <div className="dropzone-text-primary">Click to upload photos</div>
            <div className="dropzone-text-secondary">JPEG, PNG or WebP · max 5 images</div>
          </label>

          {images.length > 0 && (
            <div className="upload-slots-grid">
              {images.map((img, idx) => (
                <div key={idx} className="slot-thumb-item">
                  <img src={img.dataUrl} alt={`Preview ${idx + 1}`} />
                  <button type="button" className="remove-slot-btn" onClick={() => removeImage(idx)}>
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <button type="submit" className="btn primary-btn submit-report-btn"
            disabled={busy} style={{ marginTop: 20 }}>
            {busy
              ? <><Loader2 size={16} className="spin" /> Publishing…</>
              : <><PlusCircle size={16} /> Publish Found Item</>}
          </button>
        </div>
      </form>
    </div>
  );
}
