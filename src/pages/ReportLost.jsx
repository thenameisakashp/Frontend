import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileEdit,
  Upload,
  Calendar,
  Send,
  CheckCircle2,
  X,
  Plus,
  Eye,
  Home,
  User,
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { CATEGORIES } from '../data/mockData';

export default function ReportLost() {
  const navigate = useNavigate();
  const { reportLostItem } = useData();
  const { profile } = useAuth();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location_lost: '',
    category: '',
    lost_on: new Date().toISOString().split('T')[0],
    possible_contents_raw: '',
  });

  const [images, setImages] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successReport, setSuccessReport] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const remainingSlots = 5 - images.length;
    if (remainingSlots <= 0) {
      setErrorMessage('You can upload a maximum of 5 images.');
      return;
    }

    const filesToRead = files.slice(0, remainingSlots);

    filesToRead.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target.result;
        setImages((prev) => {
          if (prev.length < 5) {
            return [...prev, dataUrl];
          }
          return prev;
        });
      };
      reader.readAsDataURL(file);
    });

    setErrorMessage('');
  };

  const handleRemoveImage = (index) => {
    setImages((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.description || !formData.location_lost || !formData.category) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const possibleContents = formData.possible_contents_raw
        ? formData.possible_contents_raw
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : [];

      const newReport = await reportLostItem(
        {
          title: formData.title.trim(),
          description: formData.description.trim(),
          location_lost: formData.location_lost.trim(),
          category: formData.category,
          lost_on: formData.lost_on,
          images: images,
          possible_contents: possibleContents,
        },
        profile
      );

      setSuccessReport(newReport);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to submit report.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData({
      title: '',
      description: '',
      location_lost: '',
      category: '',
      lost_on: new Date().toISOString().split('T')[0],
      possible_contents_raw: '',
    });
    setImages([]);
    setSuccessReport(null);
    setErrorMessage('');
  };

  return (
    <div className="report-lost-container">
      {/* Header */}
      <div className="report-page-header">
        <div className="report-header-icon-box">
          <FileEdit size={24} className="report-icon" />
        </div>
        <div className="report-header-text">
          <h1 className="report-main-title">Report a Lost Item</h1>
          <p className="report-main-subtitle">
            Help others find your lost item by providing clear details.
          </p>
        </div>
      </div>

      {successReport ? (
        <div className="report-success-box">
          <CheckCircle2 size={40} className="success-icon" />
          <h2>Missing Item Uploaded Successfully!</h2>
          <p>
            <b>"{successReport.title}"</b> (ID #{successReport.post_id || successReport.id}) was registered by <b>{profile?.name}</b>.
            It is now live on the FindIt Home page for the campus community to assist.
          </p>
          <div className="report-success-buttons">
            <button className="btn primary-btn" onClick={() => navigate('/')}>
              <Home size={14} />
              <span>View on Home Page</span>
            </button>
            <button
              className="btn outline-btn"
              onClick={() => navigate(`/items/${encodeURIComponent(successReport.post_id || successReport.id)}`)}
            >
              <Eye size={14} />
              <span>View Item Listing</span>
            </button>
            <button className="btn outline-btn" onClick={handleReset}>
              <Plus size={14} />
              <span>Upload Another Item</span>
            </button>
          </div>
        </div>
      ) : (
        <form className="report-form-card" onSubmit={handleSubmit}>
          {/* Left Column: Form Fields */}
          <div className="report-form-col-left">
            {/* Uploader indicator */}
            <div className="uploader-pill-banner">
              <User size={13} />
              <span>Reporting as: <b>{profile?.name}</b> ({profile?.email})</span>
            </div>

            {/* Title */}
            <div className="form-group">
              <label className="form-label">
                Title <span className="required-star">*</span>
              </label>
              <input
                type="text"
                name="title"
                required
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g. Blue Backpack, Black Leather Wallet, Casio Calculator"
                className="form-input"
              />
            </div>

            {/* Description */}
            <div className="form-group">
              <label className="form-label">
                Description <span className="required-star">*</span>
              </label>
              <textarea
                name="description"
                required
                rows={4}
                value={formData.description}
                onChange={handleChange}
                placeholder="Provide detailed description (color, brand, special marks, stickers, etc.)"
                className="form-textarea"
              />
            </div>

            {/* Location */}
            <div className="form-group">
              <label className="form-label">
                Location Lost <span className="required-star">*</span>
              </label>
              <input
                type="text"
                name="location_lost"
                required
                value={formData.location_lost}
                onChange={handleChange}
                placeholder="e.g. Library 2nd Floor, Computer Lab, CSE Block"
                className="form-input"
              />
            </div>

            {/* Category */}
            <div className="form-group">
              <label className="form-label">
                Category <span className="required-star">*</span>
              </label>
              <select
                name="category"
                required
                value={formData.category}
                onChange={handleChange}
                className="form-select"
              >
                <option value="">Select Category</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Lost */}
            <div className="form-group">
              <label className="form-label">Date Lost</label>
              <div className="date-input-container">
                <input
                  type="date"
                  name="lost_on"
                  value={formData.lost_on}
                  onChange={handleChange}
                  className="form-input date-field"
                />
                <Calendar size={16} className="date-field-icon" />
              </div>
            </div>

            {/* Possible Contents (Optional) */}
            <div className="form-group">
              <label className="form-label">
                Possible Contents <span style={{ color: '#8c9eb5', fontWeight: 400 }}>(Optional - comma separated)</span>
              </label>
              <input
                type="text"
                name="possible_contents_raw"
                value={formData.possible_contents_raw}
                onChange={handleChange}
                placeholder="e.g. Cards, Some cash, Student ID, House keys"
                className="form-input"
              />
            </div>
          </div>

          {/* Right Column: Image Upload */}
          <div className="report-form-col-right">
            <div className="upload-section-title">Upload Images (up to 5)</div>

            {/* Drag & Drop Box */}
            <label className="image-dropzone-box">
              <input
                type="file"
                multiple
                accept="image/png, image/jpeg, image/jpg, image/webp"
                onChange={handleFileUpload}
                className="file-hidden-input"
                disabled={images.length >= 5}
              />
              <Upload size={30} className="dropzone-upload-icon" />
              <div className="dropzone-text-primary">
                Drag &amp; drop images here
              </div>
              <div className="dropzone-text-secondary">or click to upload from device</div>
            </label>

            <span className="upload-hint-text">
              Upload photos of your missing item (up to 5 images, JPG/PNG/WebP)
            </span>

            {/* Uploaded Thumbnails Preview Slots (5 slots total) */}
            <div className="upload-slots-grid">
              {images.map((imgUrl, idx) => (
                <div key={idx} className="slot-thumb-item">
                  <img src={imgUrl} alt={`Upload preview ${idx + 1}`} />
                  <button
                    type="button"
                    className="remove-slot-btn"
                    onClick={() => handleRemoveImage(idx)}
                    title="Remove image"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}

              {/* Empty placeholder slots up to 5 */}
              {Array.from({ length: Math.max(0, 5 - images.length) }).map((_, i) => (
                <label key={i} className="slot-empty-item" title="Add image slot">
                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/jpg, image/webp"
                    onChange={handleFileUpload}
                    className="file-hidden-input"
                  />
                  <Plus size={16} />
                </label>
              ))}
            </div>

            {errorMessage && (
              <div className="alert-error-banner">{errorMessage}</div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              className="btn primary-btn submit-report-btn"
              disabled={isSubmitting}
            >
              <Send size={15} />
              <span>{isSubmitting ? 'Reporting Lost Item...' : 'Report Lost Item'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
