import { useState, useEffect } from 'react';
import { saveMetadata, fetchMetadata } from '../lib/api';

export default function MetadataEditor({ filename, initialMetadata, onSaved }) {
  const [form, setForm] = useState({ title: '', artist: '', album: '', date: '' });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

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

  if (!filename) return null;

  return (
    <section className="metadata-editor">
      <h2>Edit Metadata — {filename}</h2>
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
      <button className="btn-primary" onClick={handleSave} disabled={saving}>
        {saving ? 'Saving...' : 'Save Metadata'}
      </button>
      {message && <p className={`message ${message.startsWith('Error') ? 'error' : 'success'}`}>{message}</p>}
    </section>
  );
}
