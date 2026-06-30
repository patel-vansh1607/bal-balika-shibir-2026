import React, { useState } from 'react';
import { FaPlus, FaSpinner, FaUser } from 'react-icons/fa';
import { karayakars as karayakarsApi, upload } from '../../apiClient';
import styles from './KarayakarForm.module.css';

const REGIONS        = ['Kenya', 'Tanzania', 'Uganda', 'Zambia', 'Malawi', 'Botswana', 'South Africa'];
const TSHIRT_REGIONS = ['South Africa', 'Botswana'];
const TSHIRT_SIZES   = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

export default function KarayakarForm() {
  const [form, setForm] = useState({
    fullName:     '',
    region:       'Kenya',
    tshirtSize:   '',
    profilePhoto: null,
  });
  const [submitting, setSubmitting] = useState(false);
  const [preview, setPreview]       = useState(null);
  const [error, setError]           = useState('');
  const [success, setSuccess]       = useState('');

  const needsTshirt = TSHIRT_REGIONS.includes(form.region);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setForm(f => ({ ...f, profilePhoto: file }));
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (needsTshirt && !form.tshirtSize) {
      setError('T-shirt size is required for ' + form.region + '.');
      return;
    }

    setSubmitting(true);
    try {
      let photo_url = '';
      if (form.profilePhoto) {
        const ext      = form.profilePhoto.name.split('.').pop();
        const filename = `karayakar_${Date.now()}.${ext}`;
        const res      = await upload.photo(form.profilePhoto, filename);
        photo_url = res.url || '';
      }

      await karayakarsApi.create({
        full_name:   form.fullName,
        region:      form.region,
        photo_url,
        tshirt_size: needsTshirt ? form.tshirtSize : null,
      });

      setSuccess('Karayakar registered successfully!');
      setForm({ fullName: '', region: 'Kenya', tshirtSize: '', profilePhoto: null });
      setPreview(null);
    } catch (err) {
      setError(err.message || 'Registration failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <h2>Register Karayakar</h2>

      {error   && <p style={{ color: '#c53030', marginBottom: 12, fontSize: 14 }}>{error}</p>}
      {success && <p style={{ color: '#276749', marginBottom: 12, fontSize: 14 }}>{success}</p>}

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.inputGroup}>
          <label>Full Name</label>
          <input
            required
            placeholder="Enter full name"
            value={form.fullName}
            onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
          />
        </div>

        <div className={styles.inputGroup}>
          <label>Region</label>
          <select
            value={form.region}
            onChange={e => setForm(f => ({ ...f, region: e.target.value, tshirtSize: '' }))}
          >
            {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        {needsTshirt && (
          <div className={styles.inputGroup}>
            <label>T-Shirt Size</label>
            <select
              required
              value={form.tshirtSize}
              onChange={e => setForm(f => ({ ...f, tshirtSize: e.target.value }))}
            >
              <option value="">Select size</option>
              {TSHIRT_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        )}

        <div className={styles.inputGroup}>
          <label>Profile Photo</label>
          <div className={styles.photoUpload}>
            {preview
              ? <img src={preview} alt="Preview" className={styles.preview} />
              : <FaUser className={styles.placeholderIcon} />
            }
            <input type="file" accept="image/*" onChange={handleFileChange} />
          </div>
        </div>

        <button type="submit" disabled={submitting}>
          {submitting ? <FaSpinner className={styles.spin} /> : <FaPlus />}
          {submitting ? ' Submitting...' : ' Register'}
        </button>
      </form>
    </div>
  );
}
