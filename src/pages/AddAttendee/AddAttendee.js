import React, { useState, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import { QRCodeSVG } from 'qrcode.react';
import { FaUserPlus, FaDownload, FaSpinner, FaCheckCircle, FaCamera } from 'react-icons/fa';
import styles from './AddAttendee.module.css';

export default function AddAttendee() {
  const [fullName, setFullName] = useState('');
  const [age, setAge] = useState('');
  const [center, setCenter] = useState('Nairobi, Kenya');
  const [parentContact, setParentContact] = useState('');
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [generatedQRValue, setGeneratedQRValue] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');
  const [finalAttendeeData, setFinalAttendeeData] = useState(null);
  
  const qrRef = useRef(null);

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  // Uploads the child's profile photo to Supabase Storage
  const uploadProfilePhoto = async (recordId, childName) => {
    if (!photoFile) return null;
    
    const fileExt = photoFile.name.split('.').pop();
    const fileName = `profile_${recordId}_${childName.replace(/\s+/g, '_').toLowerCase()}.${fileExt}`;
    
    const { error } = await supabase.storage
      .from('attendee-profiles')
      .upload(fileName, photoFile, { cacheControl: '3600', upsert: true });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('attendee-profiles')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  // Compiles and uploads the client-side SVG asset map
  const uploadQRToSupabase = async (recordId, childName) => {
    try {
      const svgElement = qrRef.current.querySelector('svg');
      const svgString = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      
      const fileExt = 'svg';
      const fileName = `qr_${recordId}_${childName.replace(/\s+/g, '_').toLowerCase()}.${fileExt}`;
      
      const { error } = await supabase.storage
        .from('shibir-qr-codes')
        .upload(fileName, svgBlob, { cacheControl: '3600', upsert: true });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('shibir-qr-codes')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (err) {
      console.error("Storage distribution drop error:", err.message);
      return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);
    setDownloadUrl('');
    setFinalAttendeeData(null);

    // 1. Initial insert row mapping to grab the unique ID string
    const { data: insertData, error: insertError } = await supabase
      .from('attendees')
      .insert([
        { 
          name: fullName.trim(), 
          age: parseInt(age), 
          center: center, 
          parent_contact: parentContact.trim(),
          status: 'Pending'
        }
      ])
      .select()
      .single();

    if (insertError) {
      alert(`Database rejected entity payload: ${insertError.message}`);
      setLoading(false);
      return;
    }

    if (insertData) {
      try {
        // 2. Upload Profile Image Asset
        const profileUrl = await uploadProfilePhoto(insertData.id, insertData.name);
        
        // 3. Mount text configurations onto code state mapping
        const shibirToken = `SHIBIR2026_ID_${insertData.id}`;
        setGeneratedQRValue(shibirToken);

        // 4. Fire async vector calculation hook
        setTimeout(async () => {
          const qrPublicUrl = await uploadQRToSupabase(insertData.id, insertData.name);
          
          // 5. Finalize table properties updates back onto structural row
          await supabase
            .from('attendees')
            .update({ 
              qr_code_url: qrPublicUrl,
              photo_url: profileUrl 
            })
            .eq('id', insertData.id);

          setDownloadUrl(qrPublicUrl);
          setFinalAttendeeData({
            name: insertData.name,
            center: insertData.center,
            photoUrl: profileUrl
          });

          setSuccess(true);
          setLoading(false);
          setFullName('');
          setAge('');
          setParentContact('');
          setPhotoFile(null);
          setPhotoPreview('');
        }, 600);

      } catch (uploadErr) {
        alert(`Media engine failed asset delivery hooks: ${uploadErr.message}`);
        setLoading(false);
      }
    }
  };

  return (
    <div className={styles.containerSplit}>
      <div className={styles.card}>
        {success && (
          <div className={styles.bannerSuccess}>
            <p style={{ margin: '0 0 4px 0', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FaCheckCircle /> Card Successfully Generated!
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className={styles.formGrid}>
            
            <div className={styles.formGroupFull}>
              <label className={styles.label}>Child's Full Name</label>
              <input 
                type="text" required className={styles.input}
                placeholder="e.g. Purushottam Patel"
                value={fullName} onChange={(e) => setFullName(e.target.value)} disabled={loading}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Age</label>
              <input 
                type="number" required min="3" max="18" className={styles.input}
                placeholder="11"
                value={age} onChange={(e) => setAge(e.target.value)} disabled={loading}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Africa Center Node</label>
              <select className={styles.select} value={center} onChange={(e) => setCenter(e.target.value)} disabled={loading}>
                <optgroup label="Kenya">
                  <option value="Nairobi, Kenya">Nairobi</option>
                  <option value="Nakuru, Kenya">Nakuru</option>
                  <option value="Kisumu, Kenya">Kisumu</option>
                  <option value="Mombasa, Kenya">Mombasa</option>
                </optgroup>
                <optgroup label="Uganda">
                  <option value="Kampala, Uganda">Kampala</option>
                  <option value="Jinja, Uganda">Jinja</option>
                </optgroup>
                <optgroup label="Tanzania">
                  <option value="Dar es Salaam, Tanzania">Dar es Salaam</option>
                  <option value="Arusha, Tanzania">Arusha</option>
                </optgroup>
                <optgroup label="Other Regions">
                  <option value="Lilongwe, Malawi">Lilongwe, Malawi</option>
                  <option value="Lusaka, Zambia">Lusaka, Zambia</option>
                  <option value="Gaborone, Botswana">Gaborone, Botswana</option>
                  <option value="Johannesburg, South Africa">Johannesburg, South Africa</option>
                </optgroup>
              </select>
            </div>

            <div className={styles.formGroupFull}>
              <label className={styles.label}>Parent/Guardian Contact</label>
              <input 
                type="tel" required className={styles.input}
                placeholder="+254 700 000000"
                value={parentContact} onChange={(e) => setParentContact(e.target.value)} disabled={loading}
              />
            </div>

            <div className={styles.formGroupFull}>
              <label className={styles.label}>Profile Photo Upload</label>
              <div className={styles.photoUploadWrapper}>
                <input 
                  type="file" accept="image/*" required id="photo-file"
                  className={styles.fileInputHidden} onChange={handlePhotoChange} disabled={loading}
                />
                <label htmlFor="photo-file" className={styles.fileLabelBtn}>
                  <FaCamera /> Choose Attendee Image
                </label>
                {photoPreview && <img src={photoPreview} alt="Preview" className={styles.inputThumbPreview} />}
              </div>
            </div>

          </div>

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? <><FaSpinner className={styles.spin} /> Processing Assets...</> : <><FaUserPlus /> Save & Create Gate-Pass</>}
          </button>
        </form>

        {/* Hidden vector generator reference buffer container */}
        <div style={{ display: 'none' }} ref={qrRef}>
          {generatedQRValue && <QRCodeSVG value={generatedQRValue} size={256} level="H" includeMargin={true} />}
        </div>
      </div>

      {/* Printable Badge Preview Panel Side UI Card Layout view box element */}
      {success && finalAttendeeData && (
        <div className={styles.badgeWrapper}>
          <div className={styles.badgeIdCard}>
            <div className={styles.badgeHeader}>
              <h4>BAL-BALIKA SHIBIR 2026</h4>
              <p>EAST AFRICA SYSTEM MANAGER</p>
            </div>
            
            <div className={styles.badgeBodyContent}>
              {finalAttendeeData.photoUrl ? (
                <img src={finalAttendeeData.photoUrl} alt="Attendee" className={styles.badgeAvatarPhoto} />
              ) : (
                <div className={styles.badgeAvatarPlaceholder}><FaCamera /></div>
              )}
              
              <div className={styles.badgeTextMeta}>
                <h3>{finalAttendeeData.name}</h3>
                <span className={styles.badgeCenterTag}>{finalAttendeeData.center}</span>
              </div>

              <div className={styles.badgeQrBlock}>
                <QRCodeSVG value={generatedQRValue} size={110} level="M" includeMargin={false} />
              </div>
            </div>
          </div>
          
          {downloadUrl && (
            <a href={downloadUrl} target="_blank" rel="noreferrer" download={`${finalAttendeeData.name.replace(/\s+/g, '_')}_qr.svg`} className={styles.downloadLink}>
              <FaDownload /> Download QR Gate-Pass (SVG)
            </a>
          )}
        </div>
      )}
    </div>
  );
}