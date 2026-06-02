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

  /**
   * Reads the raw upload file, draws it onto an internal HTML5 canvas matrix,
   * resizes it to a 300x300 center-cropped profile square, and compresses it to a lightweight JPEG blob.
   */
  const processAndCompressPhoto = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          // Set target grid dimensions for the portal roster circles
          const targetWidth = 300;
          const targetHeight = 300;
          canvas.width = targetWidth;
          canvas.height = targetHeight;
          
          // Calculate center crop ratios
          let srcX = 0;
          let srcY = 0;
          let srcWidth = img.width;
          let srcHeight = img.height;
          
          if (img.width > img.height) {
            srcWidth = img.height;
            srcX = (img.width - img.height) / 2;
          } else {
            srcHeight = img.width;
            srcY = (img.height - img.width) / 2;
          }
          
          // Render the squashed array frame onto canvas layout map
          ctx.drawImage(img, srcX, srcY, srcWidth, srcHeight, 0, 0, targetWidth, targetHeight);
          
          // Export down to an optimized 85% high efficiency JPEG file payload blob
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error("Canvas compression trace returned null raw stream."));
            }
          }, 'image/jpeg', 0.85);
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const uploadQRToSupabase = async (recordId, childName) => {
    try {
      const svgElement = qrRef.current.querySelector('svg');
      if (!svgElement) return null;
      
      const svgString = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const fileName = `qr_${recordId}.svg`;
      
      const { error } = await supabase.storage
        .from('shibir-qr-codes')
        .upload(fileName, svgBlob, { cacheControl: '3600', upsert: true });

      if (error) throw error;

      const { data } = supabase.storage
        .from('shibir-qr-codes')
        .getPublicUrl(fileName);

      return data.publicUrl;
    } catch (err) {
      console.error("QR upload error:", err.message);
      return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!photoFile) {
      alert("Please upload a profile photo before submitting.");
      return;
    }

    setLoading(true);
    setSuccess(false);
    setDownloadUrl('');
    setFinalAttendeeData(null);

    try {
      // Step 1: Compress the raw image payload into a lightweight JPEG (~150KB max)
      const compressedPhotoBlob = await processAndCompressPhoto(photoFile);

      // Step 2: Insert text data first to instantly get a reliable database Row ID
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

      if (insertError) throw insertError;

      if (insertData) {
        const attendeeId = insertData.id;
        const photoFileName = `${attendeeId}.jpg`;

        // Step 3: Upload the lightweight photo named exactly after the row ID
        const { error: uploadError } = await supabase.storage
          .from('attendee-profiles')
          .upload(photoFileName, compressedPhotoBlob, { 
            cacheControl: '0', 
            upsert: true,
            contentType: 'image/jpeg'
          });

        if (uploadError) throw uploadError;

        // Step 4: Extract public Cdn asset reference link
        const { data: pathData } = supabase.storage
          .from('attendee-profiles')
          .getPublicUrl(photoFileName);

        const absolutePhotoUrl = pathData.publicUrl;
        const shibirToken = `SHIBIR2026_ID_${attendeeId}`;
        setGeneratedQRValue(shibirToken);

        // Step 5: Patch both URLs back to the row entry in one final non-blocking call
        setTimeout(async () => {
          try {
            const qrPublicUrl = await uploadQRToSupabase(attendeeId, insertData.name);
            
            await supabase
              .from('attendees')
              .update({ 
                photo_url: absolutePhotoUrl,
                qr_code_url: qrPublicUrl 
              })
              .eq('id', attendeeId);

            setDownloadUrl(qrPublicUrl);
            setFinalAttendeeData({
              name: insertData.name,
              center: insertData.center,
              photoUrl: absolutePhotoUrl
            });

            setSuccess(true);
            setFullName('');
            setAge('');
            setParentContact('');
            setPhotoFile(null);
            setPhotoPreview('');
          } catch (patchErr) {
            console.error("Error updates trace failed:", patchErr.message);
          } finally {
            setLoading(false);
          }
        }, 300);
      }
    } catch (err) {
      alert(`Asset submission stream rejected: ${err.message}`);
      setLoading(false);
    }
  };

  return (
    <div className={styles.containerSplit}>
      <div className={styles.card}>
        {success && (
          <div className={styles.bannerSuccess}>
            <p style={{ margin: 0, fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
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

        <div style={{ display: 'none' }} ref={qrRef}>
          {generatedQRValue && <QRCodeSVG value={generatedQRValue} size={256} level="H" includeMargin={true} />}
        </div>
      </div>

      {success && finalAttendeeData && (
        <div className={styles.badgeWrapper}>
          <div className={styles.badgeIdCard}>
            <div className={styles.badgeHeader}>
              <h4>BAL-BALIKA SHIBIR 2026</h4>
              <p>EAST AFRICA SYSTEM MANAGER</p>
            </div>
            
            <div className={styles.badgeBodyContent}>
              <img src={finalAttendeeData.photoUrl} alt="Attendee" className={styles.badgeAvatarPhoto} />
              
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