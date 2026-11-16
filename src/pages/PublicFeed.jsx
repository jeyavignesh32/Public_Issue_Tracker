
import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet default marker icons for React
delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default function PublicFeed() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    type: '',
    status: '',
    search: ''
  });
  const [viewMode, setViewMode] = useState('grid');

  const { isLoggedIn } = useAuth();

  useEffect(() => {
    fetchFeed();
  }, [filter.type, filter.status]);

  const fetchFeed = async () => {
    setLoading(true);

    try {
      const { data } = await axios.get('/api/complaints/public', {
        params: filter
      });

      setComplaints(data);
    } catch (err) {
      console.error('Error fetching feed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchFeed();
  };

  const handleUpvote = async (id) => {
    if (!isLoggedIn) {
      return alert('Please login to upvote.');
    }

    try {
      const res = await axios.post(`/api/complaints/${id}/upvote`);

      setComplaints((prev) =>
        prev.map((c) => {
          if (c.id === id) {
            return {
              ...c,
              upvote_count: res.data.upvoted
                ? Number(c.upvote_count || 0) + 1
                : Math.max(0, Number(c.upvote_count || 0) - 1)
            };
          }

          return c;
        })
      );
    } catch (err) {
      console.error('Error updating upvote:', err);
      alert(err.response?.data?.message || 'Unable to update upvote.');
    }
  };

  // Complaints with valid GPS coordinates
  const validLocs = complaints.filter((c) => {
    return (
      c.latitude !== null &&
      c.latitude !== undefined &&
      c.longitude !== null &&
      c.longitude !== undefined &&
      Number.isFinite(Number(c.latitude)) &&
      Number.isFinite(Number(c.longitude))
    );
  });

  // Center map on the first complaint with GPS coordinates
  const mapCenter =
    validLocs.length > 0
      ? [
          Number(validLocs[0].latitude),
          Number(validLocs[0].longitude)
        ]
      : [20.5937, 78.9629];

  return (
    <div className="page-wrapper">
      <div className="container">

        {/* Header */}
        <div
          style={{
            textAlign: 'center',
            margin: '48px 0',
            animation: 'fadeInUp 0.6s ease'
          }}
        >
          <h1
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 42,
              fontWeight: 800,
              marginBottom: 16
            }}
          >
            Track Your City's Health
          </h1>

          <p
            style={{
              fontSize: 18,
              color: 'var(--text-secondary)',
              maxWidth: 600,
              margin: '0 auto'
            }}
          >
            Report issues, upvote what matters, and see real-time
            progress on public complaints.
          </p>

          {!isLoggedIn && (
            <div style={{ marginTop: 24 }}>
              <Link
                to="/register"
                className="btn btn-primary btn-lg"
                style={{ marginRight: 12 }}
              >
                Join the Movement
              </Link>
            </div>
          )}
        </div>

        {/* Search and Filters */}
        <form
          onSubmit={handleSearch}
          className="glass-card"
          style={{ padding: 16, marginBottom: 16 }}
        >
          <div className="filter-bar" style={{ marginBottom: 0 }}>

            <div className="search-input-wrap">
              <span className="search-icon">🔍</span>

              <input
                className="form-input"
                placeholder="Search by title or location..."
                value={filter.search}
                onChange={(e) =>
                  setFilter({
                    ...filter,
                    search: e.target.value
                  })
                }
              />
            </div>

            <select
              className="form-select"
              style={{ width: 180 }}
              value={filter.type}
              onChange={(e) =>
                setFilter({
                  ...filter,
                  type: e.target.value
                })
              }
            >
              <option value="">All Categories</option>
              <option value="Pothole">🧱 Pothole</option>
              <option value="Streetlight">💡 Streetlight</option>
              <option value="Garbage">🗑️ Garbage</option>
              <option value="Water Supply">💧 Water Supply</option>
              <option value="Sewage">🚰 Sewage</option>
              <option value="Flooding">🌊 Flooding</option>
              <option value="Others">📋 Others</option>
            </select>

            <select
              className="form-select"
              style={{ width: 180 }}
              value={filter.status}
              onChange={(e) =>
                setFilter({
                  ...filter,
                  status: e.target.value
                })
              }
            >
              <option value="">All Statuses</option>
              <option value="Submitted">🆕 Submitted</option>
              <option value="Assigned">👷 Assigned</option>
              <option value="In Progress">🚧 In Progress</option>
              <option value="Completed">✅ Completed</option>
            </select>

            <button type="submit" className="btn btn-primary">
              Search
            </button>

          </div>
        </form>

        {/* View Mode Buttons */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            marginBottom: 24,
            gap: 8
          }}
        >
          <button
            type="button"
            className={`btn ${viewMode === 'grid' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setViewMode('grid')}
          >
            Layout Grid
          </button>

          <button
            type="button"
            className={`btn ${viewMode === 'map' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setViewMode('map')}
          >
            Smart Map
          </button>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="loader">
            <div className="spinner" />
          </div>
        ) : complaints.length === 0 ? (
          <div className="empty-state glass-card">
            <div className="empty-icon">🌈</div>
            <div className="empty-title">All clear!</div>
            <p>No issues found matching your filters.</p>
          </div>
        ) : viewMode === 'grid' ? (

          /* Grid View */
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: 24,
              paddingBottom: 64
            }}
          >
            {complaints.map((complaint) => (
              <div
                key={complaint.id}
                className="complaint-card scroll-reveal"
              >
                <Link
                  to={`/complaints/${complaint.id}`}
                  style={{ display: 'block' }}
                >
                  {complaint.image_url ? (
                    <img
                      src={complaint.image_url}
                      alt={complaint.title}
                      className="complaint-card-img"
                    />
                  ) : (
                    <div className="complaint-card-img-placeholder">
                      {complaint.type === 'Pothole'
                        ? '🧱'
                        : complaint.type === 'Garbage'
                        ? '🗑️'
                        : complaint.type === 'Streetlight'
                        ? '💡'
                        : '📍'}
                    </div>
                  )}
                </Link>

                <div className="complaint-card-body">

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: 8
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        gap: 8,
                        alignItems: 'center'
                      }}
                    >
                      <div className="complaint-card-type">
                        {complaint.type}
                      </div>

                      {complaint.priority && (
                        <div
                          style={{
                            fontSize: 10,
                            padding: '2px 6px',
                            borderRadius: 12,
                            fontWeight: 700,
                            background:
                              complaint.priority === 'High'
                                ? 'rgba(239, 68, 68, 0.1)'
                                : complaint.priority === 'Medium'
                                ? 'rgba(245, 158, 11, 0.1)'
                                : 'rgba(34, 197, 94, 0.1)',
                            color:
                              complaint.priority === 'High'
                                ? '#ef4444'
                                : complaint.priority === 'Medium'
                                ? '#f59e0b'
                                : '#22c55e',
                            border:
                              `1px solid ${
                                complaint.priority === 'High'
                                  ? 'rgba(239, 68, 68, 0.5)'
                                  : complaint.priority === 'Medium'
                                  ? 'rgba(245, 158, 11, 0.5)'
                                  : 'rgba(34, 197, 94, 0.5)'
                              }`
                          }}
                        >
                          {complaint.priority.toUpperCase()}
                        </div>
                      )}
                    </div>

                    <div
                      className={`badge badge-${complaint.status
                        .replace(/\s+/g, '')
                        .toLowerCase()}`}
                    >
                      {complaint.status}
                    </div>
                  </div>

                  <Link to={`/complaints/${complaint.id}`}>
                    <h3 className="complaint-card-title">
                      {complaint.title}
                    </h3>
                  </Link>

                  <div className="complaint-card-location">
                    📍 {complaint.location_text || 'Unknown Location'}
                  </div>

                  <div className="complaint-card-footer">
                    <span
                      style={{
                        fontSize: 12,
                        color: 'var(--text-muted)'
                      }}
                    >
                      By {complaint.reporter_name} •{' '}
                      {new Date(complaint.created_at).toLocaleDateString()}
                    </span>

                    <button
                      type="button"
                      className="upvote-btn"
                      onClick={() => handleUpvote(complaint.id)}
                    >
                      ▲ {complaint.upvote_count}
                    </button>
                  </div>

                </div>
              </div>
            ))}
          </div>

        ) : (

          /* Map View */
          <div
            className="glass-card"
            style={{
              height: 600,
              width: '100%',
              overflow: 'hidden',
              padding: 4,
              zIndex: 0
            }}
          >
            <VanillaMap
              locations={validLocs}
              center={mapCenter}
            />
          </div>
        )}

      </div>
    </div>
  );
}

// Leaflet Smart Map
function VanillaMap({ locations, center }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);

  useEffect(() => {
    if (!mapRef.current) return;

    if (!mapInstance.current) {
      mapInstance.current = L.map(mapRef.current).setView(center, 13);

      // OpenStreetMap tiles - no CARTO API key required
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
      }).addTo(mapInstance.current);
    } else {
      mapInstance.current.setView(center, 13);
    }

    // Remove old complaint markers
    mapInstance.current.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        mapInstance.current.removeLayer(layer);
      }
    });

    // Add complaint markers
    locations.forEach((c) => {
      const marker = L.marker([
        Number(c.latitude),
        Number(c.longitude)
      ]).addTo(mapInstance.current);

      const popupContent = `
        <div style="padding: 4px; min-width: 180px;">
          <div style="font-size: 11px; font-weight: 700; color: #f97316; text-transform: uppercase; margin-bottom: 4px;">
            ${c.type}
          </div>

          <h4 style="margin: 0 0 8px 0; font-size: 14px;">
            ${c.title}
          </h4>

          <a
            href="/complaints/${c.id}"
            style="display: block; color: #10b981; text-decoration: none; font-weight: 600; font-size: 13px;"
          >
            View Details →
          </a>
        </div>
      `;

      marker.bindPopup(popupContent);
    });

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [locations, center]);

  return (
    <div
      ref={mapRef}
      style={{
        height: '100%',
        width: '100%',
        borderRadius: 'var(--radius-lg)',
        zIndex: 1
      }}
    />
  );
}
