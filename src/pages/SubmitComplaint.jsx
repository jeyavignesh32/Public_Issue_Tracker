
import { useState, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function SubmitComplaint() {
  const [step, setStep] = useState(1);

  const [form, setForm] = useState({
    title: '',
    description: '',
    type: 'Pothole',
    location_text: '',
    latitude: '',
    longitude: ''
  });

  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const [searchingAddress, setSearchingAddress] = useState(false);
  const [addressResults, setAddressResults] = useState([]);
  const [locationError, setLocationError] = useState('');
  const [locationSource, setLocationSource] = useState('');

  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const updateForm = (changes) => {
    setForm((previous) => ({ ...previous, ...changes }));
  };

  // Voice input for complaint description
  const startListening = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Your browser does not support voice input. Use Chrome or Edge.');
      return;
    }

    const recognition = new SpeechRecognition();

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (event) => {
      const spokenText = event.results[0][0].transcript;

      setForm((previous) => ({
        ...previous,
        description: previous.description
          ? `${previous.description} ${spokenText}`
          : spokenText
      }));
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognition.start();
  };

  const handleNext = (event) => {
    event.preventDefault();
    setStep((previous) => previous + 1);
  };

  const handleBack = () => {
    setStep((previous) => Math.max(1, previous - 1));
  };

  // Search an address using the backend geocoding endpoint
  const searchAddress = async () => {
    const address = form.location_text.trim();

    if (address.length < 3) {
      setLocationError('Please enter a more complete address.');
      return;
    }

    setSearchingAddress(true);
    setLocationError('');
    setAddressResults([]);
    setLocationSource('');

    try {
      const { data } = await axios.get('/api/geocode', {
        params: { q: address }
      });

      if (!Array.isArray(data) || data.length === 0) {
        setLocationError(
          'Address not found. Try adding the street, area, city or PIN code.'
        );
        return;
      }

      setAddressResults(data);
    } catch (error) {
      setLocationError(
        error.response?.data?.error ||
        'Unable to search this address. Please try again.'
      );
    } finally {
      setSearchingAddress(false);
    }
  };

  // User must select a matching result before submitting
  const selectAddress = (place) => {
    updateForm({
      location_text: place.address,
      latitude: String(place.latitude),
      longitude: String(place.longitude)
    });

    setAddressResults([]);
    setLocationError('');
    setLocationSource('Address');
  };

  // Capture current GPS coordinates
  const getLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      return;
    }

    setLocationError('');
    setAddressResults([]);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        updateForm({
          latitude: String(latitude),
          longitude: String(longitude),
          location_text: 'Current GPS location'
        });

        setLocationSource(
          `GPS location (accuracy approximately ${Math.round(
            position.coords.accuracy
          )} metres)`
        );

        setLocationError('');
      },
      (error) => {
        let message = 'Unable to retrieve your location.';

        if (error.code === 1) {
          message =
            'Location permission denied. Allow location access in your browser.';
        } else if (error.code === 2) {
          message = 'Your current location is unavailable.';
        } else if (error.code === 3) {
          message = 'GPS request timed out. Please try again.';
        }

        setLocationError(message);
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0
      }
    );
  };

  const handleImageSelect = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Please select an image smaller than 5 MB.');
      event.target.value = '';
      return;
    }

    setImage(file);
    setPreview(URL.createObjectURL(file));
    setStep(4);
  };

  const handleLocationNext = (event) => {
    event.preventDefault();

    if (
      form.latitude === '' ||
      form.longitude === '' ||
      !Number.isFinite(Number(form.latitude)) ||
      !Number.isFinite(Number(form.longitude))
    ) {
      setLocationError(
        'Please use GPS or search and select an address before continuing.'
      );
      return;
    }

    setLocationError('');
    setStep(3);
  };

  const handleSubmit = async () => {
    if (!form.latitude || !form.longitude) {
      alert('Please select a valid issue location.');
      setStep(2);
      return;
    }

    setLoading(true);

    const formData = new FormData();

    Object.entries(form).forEach(([key, value]) => {
      formData.append(key, value);
    });

    if (image) {
      formData.append('image', image);
    }

    try {
      const { data } = await axios.post(
        '/api/complaints',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      navigate(`/complaints/${data.id}`);
    } catch (error) {
      alert(error.response?.data?.error || 'Submission failed.');
      setLoading(false);
    }
  };

  return (
    <div
      className="page-wrapper container"
      style={{ padding: '40px 16px' }}
    >
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <h1
          className="page-title"
          style={{ textAlign: 'center', marginBottom: 32 }}
        >
          Report an Issue
        </h1>

        {/* Progress steps */}
        <div className="steps-bar">
          {['Details', 'Location', 'Photo', 'Review'].map(
            (label, index) => {
              const number = index + 1;

              return (
                <div
                  key={label}
                  className={`step-item ${
                    step === number
                      ? 'active'
                      : step > number
                      ? 'done'
                      : ''
                  }`}
                >
                  <div className="step-circle">
                    {step > number ? '✓' : number}
                  </div>
                  <div className="step-label">{label}</div>
                </div>
              );
            }
          )}
        </div>

        <div className="glass-card" style={{ padding: 32 }}>
          {/* STEP 1: ISSUE DETAILS */}
          {step === 1 && (
            <form onSubmit={handleNext} className="animate-fadeInRight">
              <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>
                Issue Details
              </h2>

              <div className="form-group">
                <label>Category</label>

                <select
                  className="form-select"
                  value={form.type}
                  onChange={(event) =>
                    updateForm({ type: event.target.value })
                  }
                  required
                >
                  <option value="Pothole">🧱 Pothole</option>
                  <option value="Streetlight">💡 Broken Streetlight</option>
                  <option value="Garbage">🗑️ Garbage Dump</option>
                  <option value="Water Supply">💧 Water Supply Issue</option>
                  <option value="Sewage">🚰 Sewage Leak</option>
                  <option value="Flooding">🌊 Flooding</option>
                  <option value="Others">📋 Others</option>
                </select>
              </div>

              <div className="form-group">
                <label>Title briefly describing the issue</label>

                <input
                  className="form-input"
                  placeholder="e.g. Huge pothole on Main Street"
                  value={form.title}
                  onChange={(event) =>
                    updateForm({ title: event.target.value })
                  }
                  required
                />
              </div>

              <div className="form-group">
                <label>Detailed Description</label>

                <div
                  style={{
                    display: 'flex',
                    gap: 12,
                    alignItems: 'flex-start'
                  }}
                >
                  <textarea
                    className="form-textarea"
                    placeholder="Provide more specific details..."
                    required
                    rows={4}
                    style={{ flex: 1 }}
                    value={form.description}
                    onChange={(event) =>
                      updateForm({ description: event.target.value })
                    }
                  />

                  <button
                    type="button"
                    onClick={startListening}
                    title="Speak to type"
                    style={{
                      background: isListening
                        ? '#f97316'
                        : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${
                        isListening ? '#f97316' : 'var(--border)'
                      }`,
                      borderRadius: '50%',
                      width: 48,
                      height: 48,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 20,
                      cursor: 'pointer'
                    }}
                  >
                    🎤
                  </button>
                </div>
              </div>

              <button type="submit" className="btn btn-primary btn-full">
                Next: Location →
              </button>
            </form>
          )}

          {/* STEP 2: LOCATION */}
          {step === 2 && (
            <form
              onSubmit={handleLocationNext}
              className="animate-fadeInRight"
            >
              <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>
                Where is the issue?
              </h2>

              <p
                style={{
                  color: 'var(--text-secondary)',
                  fontSize: 14,
                  marginBottom: 20
                }}
              >
                Use GPS or search for the exact street, area or landmark.
              </p>

              <div className="form-group">
                <button
                  type="button"
                  className="btn btn-ghost btn-full"
                  onClick={getLocation}
                  style={{ marginBottom: 16 }}
                >
                  📍 Use My Current GPS Location
                </button>
              </div>

              <div className="form-group">
                <label>Or enter an address / landmark</label>

                <textarea
                  className="form-textarea"
                  placeholder="Example: T Nagar, Usman Road, Chennai, Tamil Nadu"
                  rows={3}
                  value={form.location_text === 'Current GPS location'
                    ? ''
                    : form.location_text}
                  onChange={(event) => {
                    updateForm({
                      location_text: event.target.value,
                      latitude: '',
                      longitude: ''
                    });

                    setAddressResults([]);
                    setLocationSource('');
                    setLocationError('');
                  }}
                />

                <button
                  type="button"
                  className="btn btn-primary btn-full"
                  onClick={searchAddress}
                  disabled={searchingAddress}
                  style={{ marginTop: 10 }}
                >
                  {searchingAddress
                    ? 'Searching address...'
                    : '🔍 Search Address'}
                </button>
              </div>

              {locationError && (
                <p
                  style={{
                    color: '#ef4444',
                    fontSize: 13,
                    marginTop: 12
                  }}
                >
                  {locationError}
                </p>
              )}

              {addressResults.length > 0 && (
                <div
                  style={{
                    marginTop: 16,
                    padding: 12,
                    border: '1px solid var(--border)',
                    borderRadius: 10
                  }}
                >
                  <strong>Select the correct matching location:</strong>

                  {addressResults.map((place, index) => (
                    <button
                      type="button"
                      key={`${place.latitude}-${place.longitude}-${index}`}
                      onClick={() => selectAddress(place)}
                      style={{
                        display: 'block',
                        width: '100%',
                        textAlign: 'left',
                        padding: 12,
                        marginTop: 8,
                        borderRadius: 8,
                        border: '1px solid var(--border)',
                        background: 'rgba(255,255,255,0.04)',
                        color: 'inherit',
                        cursor: 'pointer'
                      }}
                    >
                      📍 {place.address}
                    </button>
                  ))}
                </div>
              )}

              {form.latitude !== '' && form.longitude !== '' && (
                <div
                  style={{
                    marginTop: 16,
                    padding: 14,
                    borderRadius: 10,
                    background: 'rgba(34,197,94,0.10)',
                    border: '1px solid rgba(34,197,94,0.35)'
                  }}
                >
                  <strong style={{ color: '#22c55e' }}>
                    ✓ Location selected
                  </strong>

                  <p style={{ fontSize: 13, marginTop: 8 }}>
                    {locationSource}
                  </p>

                  <p style={{ fontSize: 12, marginTop: 6 }}>
                    Latitude: {form.latitude}
                    <br />
                    Longitude: {form.longitude}
                  </p>

                  <a
                    href={`https://www.openstreetmap.org/?mlat=${form.latitude}&mlon=${form.longitude}#map=18/${form.latitude}/${form.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: 13 }}
                  >
                    View selected point on map
                  </a>
                </div>
              )}

              <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={handleBack}
                >
                  ← Back
                </button>

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                >
                  Next: Upload Photo →
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: PHOTO */}
          {step === 3 && (
            <div className="animate-fadeInRight">
              <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>
                Add visual proof (Optional)
              </h2>

              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleImageSelect}
                style={{ display: 'none' }}
              />

              <div
                className="upload-zone"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="upload-zone-icon">📸</div>
                <div className="upload-zone-text">
                  Click to browse or take a photo
                </div>
                <div className="upload-zone-sub">Max size: 5MB</div>
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={handleBack}
                >
                  ← Back
                </button>

                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  onClick={() => setStep(4)}
                >
                  Skip / Next →
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: REVIEW */}
          {step === 4 && (
            <div className="animate-fadeInRight">
              <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>
                Review Submission
              </h2>

              <div
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  borderRadius: 'var(--radius-md)',
                  padding: 20
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    color: 'var(--blue-light)',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    marginBottom: 4
                  }}
                >
                  {form.type}
                </div>

                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>
                  {form.title}
                </h3>

                <p
                  style={{
                    fontSize: 14,
                    color: 'var(--text-secondary)',
                    marginBottom: 16
                  }}
                >
                  {form.description}
                </p>

                <div style={{ fontSize: 13, marginBottom: 16 }}>
                  📍 {form.location_text}
                  <br />
                  Latitude: {form.latitude}
                  <br />
                  Longitude: {form.longitude}
                </div>

                {preview && (
                  <img
                    src={preview}
                    className="preview-img"
                    alt="Complaint proof"
                  />
                )}
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={handleBack}
                >
                  ← Edit
                </button>

                <button
                  type="button"
                  className="btn btn-orange"
                  style={{ flex: 1 }}
                  onClick={handleSubmit}
                  disabled={loading}
                >
                  {loading ? '⏳ Submitting...' : '🚀 Submit Now'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
