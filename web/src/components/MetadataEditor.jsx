import { useState, useEffect, useRef } from 'react';
import { saveMetadata, fetchMetadata, generateMetadata, getArtworkUrl, uploadArtwork, fetchYouTubeArtwork } from '../lib/api';

export default function MetadataEditor({ filename, initialMetadata, onSaved }) {
  const [form, setForm] = useState({ title: '', artist: '', album: '', date: '' });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [artworkSrc, setArtworkSrc] = useState(null);
  const [uploadingArt, setUploadingArt] = useState(false);
  const [fetchingYT, setFetchingYT] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (initialMetadata) {
      setForm(initialMetadata);
      setMessage('');
    } else if (filename) {
      fetchMetadata(filename)
        .then((m) => { setForm(m); setMessage(''); })
        .catch((e) => setMessage(`Error loading metadata: ${e.message}`));
    }
  }, [filename, initialMetadata]);

  // Reset artwork state whenever filename changes
  useEffect(() => {
    setYoutubeUrl('');
    if (!filename) {
      setArtworkSrc(null);
      return;
    }
    setArtworkSrc(`${getArtworkUrl(filename)}?t=${Date.now()}`);
  }, [filename]);

  const handleChange = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      await saveMetadata(filename, form);
      setMessage('Metadata saved!');
      onSaved?.();
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleArtworkUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingArt(true);
    setMessage('');
    try {
      await uploadArtwork(filename, file);
      setArtworkSrc(`${getArtworkUrl(filename)}?t=${Date.now()}`);
      setMessage('Artwork updated!');
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setUploadingArt(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFetchYouTube = async () => {
    setFetchingYT(true);
    setMessage('');
    try {
      await fetchYouTubeArtwork(filename, youtubeUrl.trim() || undefined);
      setArtworkSrc(`${getArtworkUrl(filename)}?t=${Date.now()}`);
      setMessage('YouTube artwork fetched!');
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setFetchingYT(false);
    }
  };

  const handleGenerateAI = async () => {
    setGeneratingAI(true);
    setMessage('');
    try {
      const metadata = await generateMetadata(filename);
      setForm(metadata);
      setMessage('AI metadata generated — review and save.');
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setGeneratingAI(false);
    }
  };

  if (!filename) return null;

  return (
    <section className="metadata-editor">
      <h2>Edit Metadata — {filename}</h2>
      <div className="artwork-section">
        <div className="artwork-preview">
          {artworkSrc ? (
            <img
              src={artworkSrc}
              alt="Album artwork"
              onError={() => setArtworkSrc(null)}
            />
          ) : (
            <div className="artwork-placeholder">
              <span>No Artwork</span>
            </div>
          )}
        </div>
        <div className="artwork-actions">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={handleArtworkUpload}
          />
          <button
            className="btn-secondary btn-small"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingArt || fetchingYT}
          >
            {uploadingArt ? 'Uploading...' : 'Upload Image'}
          </button>
          <div className="yt-fetch-row">
            <input
              className="yt-url-input"
              type="text"
              placeholder="YouTube URL (optional)"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              disabled={fetchingYT}
            />
            <button
              className="btn-secondary btn-small"
              onClick={handleFetchYouTube}
              disabled={fetchingYT || uploadingArt}
            >
              {fetchingYT ? 'Searching...' : 'Fetch'}
            </button>
          </div>
        </div>
      </div>
      <div className="form-grid">
        <label>
          Title
          <input value={form.title} onChange={handleChange('title')} />
        </label>
        <label>
          Artist
          <input value={form.artist} onChange={handleChange('artist')} />
        </label>
        <label>
          Album
          <input value={form.album} onChange={handleChange('album')} />
        </label>
        <label>
          Year
          <input value={form.date} onChange={handleChange('date')} />
        </label>
      </div>
      <div className="editor-actions">
        <button className="btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button className="btn-ai" onClick={handleGenerateAI} disabled={generatingAI || saving}>
          {generatingAI ? 'Generating...' : 'Generate with AI'}
        </button>
        {message && (
          <span className={`message ${message.startsWith('Error') ? 'error' : 'success'}`}>
            {message}
          </span>
        )}
      </div>
    </section>
  );
}
