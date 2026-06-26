import React, { useState } from 'react';
import { FaPlus, FaSpinner, FaUser, FaGlobe } from 'react-icons/fa';
import styles from './KarayakarForm.module.css';

const REGIONS = ['Kenya', 'Tanzania', 'Uganda', 'Zambia', 'Malawi', 'Botswana', 'South Africa'];

export default function KarayakarForm() {
  const [form, setForm] = useState({
    fullName: '',
    region: 'Kenya',
    profilePhoto: null,
  });
  const [submitting, setSubmitting] = useState(false);
  const [preview, setPreview] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setForm({ ...form, profilePhoto: file });
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    // Simulate API call
    setTimeout(() => {
      console.log('Form Submitted:', form);
      setSubmitting(false);
      alert('Karayakar details submitted successfully!');
    }, 1500);
  };

  return (
    <div className={styles.container}>
      <h2>Register Karayakar</h2>
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.inputGroup}>
          <label>Full Name</label>
          <input 
            required 
            placeholder="Enter full name" 
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
          />
        </div>

        <div className={styles.inputGroup}>
          <label>Region</label>
          <select 
            value={form.region} 
            onChange={(e) => setForm({ ...form, region: e.target.value })}
          >
            {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        <div className={styles.inputGroup}>
          <label>Profile Photo</label>
          <div className={styles.photoUpload}>
            {preview ? (
              <img src={preview} alt="Preview" className={styles.preview} />
            ) : (
              <FaUser className={styles.placeholderIcon} />
            )}
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