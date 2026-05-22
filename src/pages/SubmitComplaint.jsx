import { useState, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function SubmitComplaint() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ title: '', description: '', type: 'Pothole', location_text: '', latitude: '', longitude: '' });
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Your browser does not support Voice Input. Please use Google Chrome or Edge.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (e) => {
      const text = e.results[0][0].transcript;
      setForm(f => ({ ...f, description: f.description ? f.description + ' ' + text : text }));
    };
    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

  const handleNext = (e) => { e.preventDefault(); setStep(s => s + 1); };
  const handleBack = () => setStep(s => s - 1);

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setPreview(URL.createObjectURL(file));
      setStep(4);
    }
  };

  const getLocation = () => {
    if (!navigator.geolocation) return alert('Geolocation is not supported by your browser');
    navigator.geolocation.getCurrentPosition(
      (pos) => setForm({ ...form, latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      (err) => alert('Unable to retrieve location: ' + err.message)
    );
  };

  const handleSubmit = async () => {
    setLoading(true);
    const formData = new FormData();
    Object.entries(form).forEach(([key, val]) => formData.append(key, val));
    if (image) formData.append('image', image);

    try {
      const { data } = await axios.post('/api/complaints', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      navigate(`/complaints/${data.id}`);
    } catch (err) {
      alert(err.response?.data?.error || 'Submission failed');
      setLoading(false);
    }
  };

  return (
    <div className="page-wrapper container" style={{ padding: '40px 16px' }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <h1 className="page-title" style={{ textAlign: 'center', marginBottom: 32 }}>Report an Issue</h1>

        {/* Steps */}
        <div className="steps-bar">
          {['Details', 'Location', 'Photo', 'Review'].map((label, idx) => {
            const num = idx + 1;
            return (
              <div key={label} className={`step-item ${step === num ? 'active' : step > num ? 'done' : ''}`}>
                <div className="step-circle">{step > num ? '✓' : num}</div>
                <div className="step-label">{label}</div>
              </div>
            );
          })}
        </div>

        <div className="glass-card" style={{ padding: 32 }}>
          {/* Step 1: Details */}
          {step === 1 && (
            <form onSubmit={handleNext} className="animate-fadeInRight">
              <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Issue Details</h2>
              <div className="form-group">
                <label>Category</label>
                <select className="form-select" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} required>
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
                <input className="form-input" placeholder="e.g. Huge pothole on Main Street" required 
                  value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Detailed Description</label>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <textarea className="form-textarea" placeholder="Provide more specific details..." required rows={4} style={{ flex: 1 }}
                    value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                  <button type="button" onClick={startListening} title="Speak to type"
                    style={{
                      background: isListening ? '#f97316' : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${isListening ? '#f97316' : 'var(--border)'}`,
                      borderRadius: '50%', width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 20, cursor: 'pointer', transition: 'all 0.3s', animation: isListening ? 'pulse 1.5s infinite' : 'none'
                    }}>
                    🎤
                  </button>
                </div>
              </div>
              <button type="submit" className="btn btn-primary btn-full">Next: Location →</button>
            </form>
          )}

          {/* Step 2: Location */}
          {step === 2 && (
            <form onSubmit={handleNext} className="animate-fadeInRight">
              <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Where is it?</h2>
              <div className="form-group">
                <button type="button" className="btn btn-ghost btn-full" onClick={getLocation} style={{ marginBottom: 16 }}>
                  📍 Use My Current GPS Location
                </button>
                {form.latitude && <p style={{ fontSize: 13, color: 'var(--green-primary)', textAlign: 'center', marginBottom: 16 }}>✓ GPS Coordinates Captured</p>}
              </div>
              <div className="form-group">
                <label>Or type the address / landmark</label>
                <textarea className="form-textarea" placeholder="e.g. Near City Hospital, Block B, 4th Avenue" required={!form.latitude} rows={3}
                  value={form.location_text} onChange={e => setForm({ ...form, location_text: e.target.value })} />
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button type="button" className="btn btn-ghost" onClick={handleBack}>← Back</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Next: Upload Photo →</button>
              </div>
            </form>
          )}

          {/* Step 3: Photo (Optional) */}
          {step === 3 && (
            <div className="animate-fadeInRight">
              <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Add visual proof (Optional)</h2>
              <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageSelect} style={{ display: 'none' }} />
              
              <div className="upload-zone" onClick={() => fileInputRef.current?.click()}>
                <div className="upload-zone-icon">📸</div>
                <div className="upload-zone-text">Click to browse or take a photo</div>
                <div className="upload-zone-sub">Max size: 5MB</div>
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                <button type="button" className="btn btn-ghost" onClick={handleBack}>← Back</button>
                <button type="button" className="btn btn-primary" style={{ flex: 1 }} onClick={() => setStep(4)}>Skip / Next →</button>
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {step === 4 && (
            <div className="animate-fadeInRight">
              <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Review Submission</h2>
              
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)', padding: 20 }}>
                <div style={{ fontSize: 12, color: 'var(--blue-light)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>{form.type}</div>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>{form.title}</h3>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16 }}>{form.description}</p>
                
                <div style={{ display: 'flex', gap: 8, fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                  <span>📍</span> <span>{form.location_text || 'GPS Location provided'}</span>
                </div>

                {preview && <img src={preview} className="preview-img" alt="Proof" />}
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                <button type="button" className="btn btn-ghost" onClick={handleBack}>← Edit</button>
                <button type="button" className="btn btn-orange" style={{ flex: 1 }} onClick={handleSubmit} disabled={loading}>
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
