import React, { useState, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import { QRCodeSVG } from 'qrcode.react';
import { FaUserPlus, FaDownload, FaSpinner, FaCheckCircle, FaCamera, FaInfoCircle, FaExclamationTriangle } from 'react-icons/fa';
import styles from './PublicRegister.module.css';

export default function PublicRegister() {
  // Name Split States
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('Balak'); // This represents Mandal
  const [center, setCenter] = useState('Nairobi, Kenya');
  const [parentContact, setParentContact] = useState('');
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  
  // Validation and UI states
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formError, setFormError] = useState('');
  const [generatedQRValue, setGeneratedQRValue] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');
  const [finalAttendeeData, setFinalAttendeeData] = useState(null);
  
  const qrRef = useRef(null);

  // Photo Validation (Max 2.5MB and valid image type)
  const handlePhotoChange = (e) => {
    setFormError('');
    const file = e.target.files[0];
    
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setFormError('Unsupported file format. Please upload a clear JPG, PNG, or WEBP image.');
      e.target.value = ''; 
      return;
    }

    const maxSizeInBytes = 2.5 * 1024 * 1024; 
    if (file.size > maxSizeInBytes) {
      setFormError('The selected image is too large. Photo size must be under 2.5MB.');
      e.target.value = '';
      return;
    }

    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  // Form Sanitization & Validation
  const validateForm = () => {
    const cleanFirst = firstName.trim();
    const cleanMiddle = middleName.trim();
    const cleanLast = lastName.trim();
    const cleanContact = parentContact.trim();

    if (cleanFirst.length < 2) {
      setFormError("Please enter a valid First Name (at least 2 characters).");
      return false;
    }

    if (cleanLast.length < 2) {
      setFormError("Please enter a valid Last Name (at least 2 characters).");
      return false;
    }

    const parsedAge = parseInt(age);
    if (isNaN(parsedAge) || parsedAge < 3 || parsedAge > 18) {
      setFormError('Invalid Age. Shibir registration is strictly limited to children aged between 3 and 18.');
      return false;
    }

    if (!gender) {
      setFormError('Please select a mandal designation category.');
      return false;
    }

    const phoneRegex = /^\+?[1-9]\d{1,14}$/; 
    const strippedContact = cleanContact.replace(/[\s\-()]/g, ''); 
    if (!phoneRegex.test(strippedContact)) {
      setFormError("Please enter a valid Parent's WhatsApp number including country code (e.g., +254700000000).");
      return false;
    }

    if (!photoFile) {
      setFormError('A clear portrait photo profile image is mandatory.');
      return false;
    }

    // Construct full structural name string safely
    const constructedFullName = cleanMiddle 
      ? `${cleanFirst} ${cleanMiddle} ${cleanLast}` 
      : `${cleanFirst} ${cleanLast}`;

    return { constructedFullName, parsedAge, cleanContact };
  };

  const uploadProfilePhoto = async (recordId, childName) => {
    if (!photoFile) return null;
    
    const fileExt = photoFile.name.split('.').pop().toLowerCase();
    const cleanName = childName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const fileName = `public_profile_${recordId}_${cleanName}.${fileExt}`;
    
    const { error } = await supabase.storage
      .from('attendee-profiles')
      .upload(fileName, photoFile, { cacheControl: '3600', upsert: true });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('attendee-profiles')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const uploadQRToSupabase = async (recordId, childName) => {
    try {
      const svgElement = qrRef.current.querySelector('svg');
      const svgString = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      
      const fileExt = 'svg';
      const fileName = `public_qr_${recordId}_${childName.replace(/\s+/g, '_').toLowerCase()}.${fileExt}`;
      
      const { error } = await supabase.storage
        .from('shibir-qr-codes')
        .upload(fileName, svgBlob, { cacheControl: '3600', upsert: true });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('shibir-qr-codes')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (err) {
      console.error("QR Pipeline failure: ", err.message);
      return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    
    const validatedFields = validateForm();
    if (!validatedFields) return; 

    setLoading(true);
    setSuccess(false);
    setDownloadUrl('');
    setFinalAttendeeData(null);

    const { constructedFullName, parsedAge, cleanContact } = validatedFields;

    // Database payload commit
    const { data: insertData, error: insertError } = await supabase
      .from('attendees')
      .insert([
        { 
          name: constructedFullName, 
          age: parsedAge, 
          gender: gender, 
          center: center, 
          parent_contact: cleanContact,
          status: 'Pending'
        }
      ])
      .select()
      .single();

    if (insertError) {
      setFormError(`Registration rejected by server: ${insertError.message}`);
      setLoading(false);
      return;
    }

    if (insertData) {
      try {
        const profileUrl = await uploadProfilePhoto(insertData.id, insertData.name);
        
        const shibirToken = String(insertData.id).toUpperCase().trim();
        setGeneratedQRValue(shibirToken);

        setTimeout(async () => {
          const qrPublicUrl = await uploadQRToSupabase(insertData.id, insertData.name);
          
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
            gender: insertData.gender,
            photoUrl: profileUrl
          });

          setSuccess(true);
          setLoading(false);
          
          // Flash clean states to prevent redundant execution clicks
          setFirstName('');
          setMiddleName('');
          setLastName('');
          setAge('');
          setGender('Balak');
          setParentContact('');
          setPhotoFile(null);
          setPhotoPreview('');
        }, 600);

      } catch (uploadErr) {
        setFormError(`Media engine asset upload failed: ${uploadErr.message}`);
        setLoading(false);
      }
    }
  };

  return (
    <div className={styles.publicWrapper}>
      <header className={styles.publicHeader}>
        <h1>Making the Right Choice</h1>
        <p>Bal-Balika Shibir Africa 2026</p>
      </header>

      <div className={styles.containerSplit}>
        <div className={styles.card}>
          <div className={styles.infoBanner}>
            <FaInfoCircle style={{ flexShrink: 0, marginTop: '2px' }} />
            <p>Please complete this form accurately.</p>
          </div>

          {formError && (
            <div className={styles.bannerError}>
              <FaExclamationTriangle style={{ flexShrink: 0 }} />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className={styles.formGrid}>
              
              {/* ROW 1: Names (3 Columns on Desktop) */}
              <div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>First Name</label>
                  <input 
                    type="text" required className={styles.input}
                    placeholder="First Name"
                    value={firstName} onChange={(e) => setFirstName(e.target.value)} disabled={loading}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Middle Name</label>
                  <input 
                    type="text" className={styles.input}
                    placeholder="Middle Name (Optional)"
                    value={middleName} onChange={(e) => setMiddleName(e.target.value)} disabled={loading}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Last Name</label>
                  <input 
                    type="text" required className={styles.input}
                    placeholder="Surname / Last Name"
                    value={lastName} onChange={(e) => setLastName(e.target.value)} disabled={loading}
                  />
                </div>
              </div>

              {/* ROW 2: Demographics & Contact (4 Columns on Desktop) */}
              <div>
                <div className={styles.formGroup} style={{ flex: '0 0 15%' }}>
                  <label className={styles.label}>Age</label>
                  <input 
                    type="number" required min="3" max="18" className={styles.input}
                    placeholder="e.g. 11"
                    value={age} onChange={(e) => setAge(e.target.value)} disabled={loading}
                  />
                </div>

                <div className={styles.formGroup} style={{ flex: '0 0 20%' }}>
                  <label className={styles.label}>Mandal</label>
                  <select 
                    className={styles.select} 
                    value={gender} 
                    onChange={(e) => setGender(e.target.value)} 
                    disabled={loading}
                  >
                    <option value="Balak">Balak</option>
                    <option value="Balika">Balika</option>
                    <option value="Shishu">Shishu</option>
                    <option value="Shishika">Shishika</option>
                  </select>
                </div>

                <div className={styles.formGroup} style={{ flex: '1' }}>
                  <label className={styles.label}>Center</label>
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
                    <optgroup label="Other African Regions">
                      <option value="Lilongwe, Malawi">Lilongwe, Malawi</option>
                      <option value="Lusaka, Zambia">Lusaka, Zambia</option>
                      <option value="Gaborone, Botswana">Gaborone, Botswana</option>
                      <option value="Johannesburg, South Africa">Johannesburg, South Africa</option>
                    </optgroup>
                  </select>
                </div>

                <div className={styles.formGroup} style={{ flex: '1' }}>
                  <label className={styles.label}>Parent's WhatsApp Number</label>
                  <input 
                    type="tel" required className={styles.input}
                    placeholder="e.g. +254 700 000 000"
                    value={parentContact} onChange={(e) => setParentContact(e.target.value)} disabled={loading}
                  />
                </div>
              </div>

              {/* ROW 3: Full Width Photo Profile Section */}
              <div className={styles.formGroupFull}>
                <label className={styles.label}>Profile Picture (Clear Passport Style Shot)</label>
                <div className={styles.photoUploadWrapper}>
                  <input 
                    type="file" accept="image/jpeg,image/png,image/webp" id="public-photo"
                    className={styles.fileInputHidden} onChange={handlePhotoChange} disabled={loading}
                  />
                  <label htmlFor="public-photo" className={styles.fileLabelBtn}>
                    <FaCamera /> Select Portrait Image
                  </label>
                  {photoPreview && <img src={photoPreview} alt="Preview" className={styles.inputThumbPreview} />}
                  <span className={styles.fileHint}>Max size 2.5MB (JPG, PNG)</span>
                </div>
              </div>

            </div>

            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? <><FaSpinner className={styles.spin} /> Registering...</> : <><FaUserPlus /> Complete Registration</>}
            </button>
          </form>

          <div style={{ display: 'none' }} ref={qrRef}>
            {generatedQRValue && <QRCodeSVG value={generatedQRValue} size={256} level="H" includeMargin={true} />}
          </div>
        </div>

        {/* Dynamic Ticket Delivery Card */}
        {success && finalAttendeeData && (
          <div className={styles.badgeWrapper}>
            <div className={styles.successBanner}>
              <FaCheckCircle size={20} style={{ flexShrink: 0 }} />
              <div>
                <strong>Registration Secured!</strong>
                <p>Download your digital gate-pass credential sheet below.</p>
              </div>
            </div>

            <div className={styles.badgeIdCard}>
              <div className={styles.badgeHeader}>
                <h4>BAL-BALIKA SHIBIR 2026</h4>
                <p>OFFICIAL ENTRY DELEGATE PASS</p>
              </div>
              
              <div className={styles.badgeBodyContent}>
                <img src={finalAttendeeData.photoUrl} alt="Attendee" className={styles.badgeAvatarPhoto} />
                
                <div className={styles.badgeTextMeta}>
                  <h3>{finalAttendeeData.name}</h3>
                  <div className={styles.badgeRowTags}>
                    <span className={styles.badgeCenterTag}>{finalAttendeeData.center}</span>
                    <span className={`${styles.badgeGenderTag} ${
                      ['Balak', 'Shishu'].includes(finalAttendeeData.gender) ? styles.tagBalak : styles.tagBalika
                    }`}>
                      {finalAttendeeData.gender}
                    </span>
                  </div>
                </div>

                <div className={styles.badgeQrBlock}>
                  <QRCodeSVG value={generatedQRValue} size={120} level="M" includeMargin={false} />
                </div>
              </div>
            </div>
            
            {downloadUrl && (
              <a href={downloadUrl} target="_blank" rel="noreferrer" download={`${finalAttendeeData.name.replace(/\s+/g, '_')}_shibir_pass.svg`} className={styles.downloadLink}>
                <FaDownload /> Save Gate Pass to Device (SVG)
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}