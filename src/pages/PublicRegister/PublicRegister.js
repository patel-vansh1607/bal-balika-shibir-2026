import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { QRCodeSVG } from 'qrcode.react';
import { 
  FaUserPlus, 
  FaSpinner, 
  FaCheckCircle, 
  FaCamera, 
  FaInfoCircle, 
  FaExclamationTriangle,
  FaChevronDown,
  FaSearch,
  FaPlusCircle
} from 'react-icons/fa';
import styles from './PublicRegister.module.css';

export default function PublicRegister() {
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('Balak'); 
  
  const [selectedRegion, setSelectedRegion] = useState('');
  const [regionSearchQuery, setRegionSearchQuery] = useState('');
  const [isRegionDropdownOpen, setIsRegionDropdownOpen] = useState(false);

  const [selectedCenter, setSelectedCenter] = useState('');
  const [centerSearchQuery, setCenterSearchQuery] = useState('');
  const [isCenterDropdownOpen, setIsCenterDropdownOpen] = useState(false);
  
  const [parentContact, setParentContact] = useState('');
  const [parentEmail, setParentEmail] = useState(''); 
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formError, setFormError] = useState('');
  const [generatedQRValue, setGeneratedQRValue] = useState('');
  const [finalAttendeeData, setFinalAttendeeData] = useState(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  
  const regionRef = useRef(null);
  const centerRef = useRef(null);
  const qrRef = useRef(null);

  const regionDataset = {
    'Kenya': { 
      code: '+254', 
      idAbbreviation: 'KE',
      centers: ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Thika', 'Malindi', 'Kericho', 'Kakamega', 'Nyeri', 'Machakos', 'Meru', 'Kitale', 'Garissa', 'Voi', 'Naivasha', 'Narok', 'Embu', 'Lamu', 'Nanyuki'] 
    },
    'Tanzania': { 
      code: '+255', 
      idAbbreviation: 'TZ',
      centers: ['Dar es Salaam', 'Arusha', 'Mwanza', 'Zanzibar City', 'Dodoma', 'Moshi', 'Tanga', 'Morogoro', 'Mbeya', 'Iringa', 'Kigoma', 'Songea', 'Tabora', 'Musoma', 'Shinyanga', 'Sumbawanga', 'Lindi', 'Singida', 'Bukoba'] 
    },
    'Uganda': { 
      code: '+256', 
      idAbbreviation: 'UG',
      centers: ['Campala', 'Entebbe', 'Jinja', 'Mbarara', 'Gulu', 'Mbale', 'Masaka', 'Arua', 'Lira', 'Fort Portal', 'Kabale', 'Tororo', 'Soroti', 'Mukono', 'Hoima', 'Kasese', 'Busia', 'Iganga', 'Wakiso'] 
    },
    'Zambia': { 
      code: '+260', 
      idAbbreviation: 'ZM',
      centers: ['Lusaka', 'Kitwe', 'Ndola', 'Livingstone', 'Kabwe', 'Chingola', 'Mufulira', 'Luanshya', 'Kasama', 'Chipata', 'Chinsali', 'Mansa', 'Solwezi', 'Mongu', 'Mazabuka', 'Monze', 'Choma', 'Kapiri Mposhi'] 
    },
    'Malawi': { 
      code: '+265', 
      idAbbreviation: 'MW',
      centers: ['Lilongwe', 'Blantyre', 'Mzuzu', 'Zomba', 'Kasungu', 'Mangochi', 'Karonga', 'Salima', 'Nkhotakota', 'Liwonde', 'Balaka', 'Luchenza', 'Dedza', 'Mchinji', 'Chikwawa', 'Nsanje', 'Rumphi'] 
    },
    'Botswana': { 
      code: '+267', 
      idAbbreviation: 'BW',
      centers: ['Gaborone', 'Francistown', 'Molepolole', 'Maun', 'Mogoditshane', 'Serowe', 'Selebi-Phikwe', 'Kanye', 'Lobatse', 'Palapye', 'Mahalapye', 'Mochudi', 'Ghanzi', 'Kasane', 'Orapa', 'Jwaneng', 'Sowa'] 
    },
    'South Africa': { 
      code: '+27', 
      idAbbreviation: 'SA',
      centers: ['Johannesburg', 'Cape Town', 'Durban', 'Pretoria', 'Port Elizabeth', 'Bloemfontein', 'East London', 'Polokwane', 'Nelspruit', 'Kimberley', 'Pietermaritzburg', 'Rustenburg', 'George', 'Welkom', 'Klerksdorp', 'Vereeniging', 'Stellenbosch', 'Paarl', 'Upington', 'Mthatha', 'Soweto', 'Benoni', 'Tembisa'] 
    }
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (regionRef.current && !regionRef.current.contains(event.target)) {
        setIsRegionDropdownOpen(false);
      }
      if (centerRef.current && !centerRef.current.contains(event.target)) {
        setIsCenterDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredCountries = Object.keys(regionDataset).filter((country) =>
    country.toLowerCase().includes(regionSearchQuery.toLowerCase().trim())
  );

  const availableCenters = selectedRegion && regionDataset[selectedRegion.trim()] 
    ? regionDataset[selectedRegion.trim()].centers 
    : [];

  const filteredCenters = availableCenters.filter((center) =>
    center.toLowerCase().includes(centerSearchQuery.toLowerCase().trim())
  );

  const handleSelectCountry = (countryName) => {
    const cleanCountry = countryName.trim();
    setSelectedRegion(cleanCountry);
    setRegionSearchQuery(''); // Clear the query string so dropdown list works correctly next click
    setIsRegionDropdownOpen(false);
    setSelectedCenter('');
    setCenterSearchQuery('');

    if (regionDataset[cleanCountry]) {
      setParentContact(regionDataset[cleanCountry].code);
    } else {
      setParentContact('');
    }
  };

  const handleSelectCenter = (centerName) => {
    setSelectedCenter(centerName.trim());
    setCenterSearchQuery(''); // Clear the query string so it doesn't leave filters stuck
    setIsCenterDropdownOpen(false);
  };

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

  const validateForm = () => {
    const cleanFirst = firstName.trim();
    const cleanMiddle = middleName.trim();
    const cleanLast = lastName.trim();
    const cleanContact = parentContact.trim();
    const cleanEmail = parentEmail.trim();

    if (!cleanFirst || cleanFirst.length < 2) {
      setFormError("Please enter a valid First Name (at least 2 characters).");
      return false;
    }
    if (!cleanLast || cleanLast.length < 2) {
      setFormError("Please enter a valid Last Name (at least 2 characters).");
      return false;
    }
    if (!acceptedTerms) {
  setFormError("Action Required: Please accept the Terms and Conditions to proceed with your registration.");
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

    if (!selectedRegion) {
      setFormError('Please select your Country option.');
      return false;
    }

    if (!selectedCenter) {
      setFormError('Please select your Center Hub configuration location.');
      return false;
    }

    const phoneRegex = /^\+[1-9]\d{6,14}$/;
    const strippedContact = cleanContact.replace(/[\s\-()]/g, ''); 
    if (!phoneRegex.test(strippedContact)) {
      setFormError("Invalid phone structure. Please follow international code guidelines (e.g. +254700111222).");
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      setFormError("Please enter a valid email address for communications.");
      return false;
    }

    if (!photoFile) {
      setFormError('A clear portrait photo profile image is mandatory.');
      return false;
    }

    const constructedFullName = cleanMiddle 
      ? `${cleanFirst} ${cleanMiddle} ${cleanLast}` 
      : `${cleanFirst} ${cleanLast}`;

    return { constructedFullName, parsedAge, strippedContact, cleanEmail };
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

  const uploadQRToSupabase = async (recordId, tokenValue, childName) => {
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
    setFinalAttendeeData(null);

    const { constructedFullName, parsedAge, strippedContact, cleanEmail } = validatedFields;

    const { data: insertData, error: insertError } = await supabase
      .from('attendees')
      .insert([
        { 
          name: constructedFullName, 
          age: parsedAge, 
          gender: gender, 
          region: selectedRegion, 
          center: selectedCenter, 
          parent_contact: strippedContact,
          parent_email: cleanEmail, 
          status: 'Pending'
        }
      ])
      .select('id, name, region, center, member_id') 
      .single();

    if (insertError) {
      setFormError(`Registration rejected by server: ${insertError.message}`);
      setLoading(false);
      return;
    }

    if (insertData) {
      try {
        const profileUrl = await uploadProfilePhoto(insertData.id, insertData.name);
        const trueMemberId = insertData.member_id;
        setGeneratedQRValue(trueMemberId);

        setTimeout(async () => {
          const qrUrl = await uploadQRToSupabase(insertData.id, trueMemberId, insertData.name);
          
          await supabase
            .from('attendees')
            .update({ photo_url: profileUrl, qr_code_url: qrUrl })
            .eq('id', insertData.id);

          await supabase.functions.invoke('send-registration-email', {
            body: {
              email: cleanEmail,
              name: insertData.name,
              memberId: trueMemberId,
              region: selectedRegion,
              center: selectedCenter,
              qrUrl: qrUrl
            }
          });

          setFinalAttendeeData({
  memberId: trueMemberId,
  name: insertData.name,
  region: selectedRegion, // <--- Forces "South Africa" directly from the dropdown selection
  center: selectedCenter
});

          setSuccess(true);
          setLoading(false);

          setFirstName('');
          setMiddleName('');
          setLastName('');
          setAge('');
          setGender('Balak');
          setSelectedRegion('');
          setRegionSearchQuery('');
          setSelectedCenter('');
          setCenterSearchQuery('');
          setParentContact('');
          setParentEmail(''); 
          setPhotoFile(null);
          setPhotoPreview('');
        }, 600);

      } catch (uploadErr) {
        setFormError(`Media engine asset upload failed: ${uploadErr.message}`);
        setLoading(false);
      }
    }
  };

  const handleResetFormView = () => {
    setSuccess(false);
    setFinalAttendeeData(null);
    setFormError('');
  };

  return (
    <div className={styles.publicWrapper}>
      <header className={styles.publicHeader}>
        <h1>Making the Right Choices</h1>
        <p>Bal-Balika Shibir Africa 2026</p>
      </header>

      <div className={styles.containerSingle}>
        <div className={styles.card}>
          
          {success && finalAttendeeData ? (
            <div className={styles.fullSuccessContainer} style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ color: '#34a853', marginBottom: '20px' }}>
                <FaCheckCircle size={64} />
              </div>
              
              <h2 style={{ fontSize: '26px', color: '#137333', marginBottom: '14px', fontWeight: '700' }}>
                Thanks for your submission!
              </h2>
              
              <p style={{ fontSize: '16px', color: '#5f6368', lineHeight: '1.6', maxWidth: '500px', margin: '0 auto 24px auto' }}>
                You will get a confirmation in your email shortly. Entry details for <strong>{finalAttendeeData.name}</strong> have been processed with Shibir ID Number:
              </p>

              <div style={{ background: '#f1f3f4', padding: '14px 24px', borderRadius: '8px', display: 'inline-block', fontSize: '20px', fontWeight: '700', letterSpacing: '1px', color: '#202124', marginBottom: '16px', border: '1px solid #dadce0' }}>
                {finalAttendeeData.memberId}
              </div>

              <p style={{ fontSize: '14px', color: '#70757a', margin: '0 0 40px 0' }}>
                Region & Center: {finalAttendeeData.center}, {finalAttendeeData.region}
              </p>

              <hr style={{ border: '0', height: '1px', background: '#dadce0', margin: '0 auto 32px auto', maxWidth: '400px' }} />

              <button 
                type="button" 
                onClick={handleResetFormView}
                className={styles.submitBtn}
                style={{ maxWidth: '320px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <FaPlusCircle /> Register Another Person
              </button>
            </div>
          ) : (
            <>
              <div className={styles.infoBanner}>
                <FaInfoCircle style={{ flexShrink: 0, marginTop: '2px' }} />
                <p>All fields are required. Please check that details are correct before sending.</p>
              </div>

              {formError && (
                <div className={styles.bannerError}>
                  <FaExclamationTriangle style={{ flexShrink: 0 }} />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate>
                <div className={styles.formGrid}>
                  
                  <div className={styles.rowFieldContainer}>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>First Name *</label>
                      <input 
                        type="text" required className={styles.input}
                        placeholder="e.g. Vansh"
                        value={firstName} onChange={(e) => setFirstName(e.target.value)} disabled={loading}
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.label}>Middle Name</label>
                      <input 
                        type="text" className={styles.input}
                        placeholder="e.g. Vimalkumar"
                        value={middleName} onChange={(e) => setMiddleName(e.target.value)} disabled={loading}
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.label}>Last Name *</label>
                      <input 
                        type="text" required className={styles.input}
                        placeholder="e.g. Patel"
                        value={lastName} onChange={(e) => setLastName(e.target.value)} disabled={loading}
                      />
                    </div>
                  </div>

                  <div className={styles.rowFieldContainer}>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>Age *</label>
                      <input 
                        type="number" required min="3" max="18" className={styles.input}
                        placeholder="e.g. 11"
                        value={age} onChange={(e) => setAge(e.target.value)} disabled={loading}
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.label}>Mandal *</label>
                      <select 
                        className={styles.select} required
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
                  </div>

                  <div className={styles.rowFieldContainer}>
                    <div className={styles.formGroup} ref={regionRef}>
                      <label className={styles.label}>Country *</label>
                      <div className={styles.searchDropdownContainer}>
                        <div 
                          className={`${styles.customSelectTrigger} ${loading ? styles.triggerDisabled : ''} ${!selectedRegion ? styles.requiredHighlight : ''}`}
                          onClick={() => !loading && setIsRegionDropdownOpen(!isRegionDropdownOpen)}
                        >
                          <span>{selectedRegion || "Select Country... *"}</span>
                          <FaChevronDown className={styles.arrowIcon} />
                        </div>

                        {isRegionDropdownOpen && (
                          <div className={styles.dropdownOverlayMenu}>
                            <div className={styles.dropdownSearchHeader}>
                              <FaSearch className={styles.searchIconInline} />
                              <input 
                                type="text" 
                                className={styles.dropdownSearchInput}
                                placeholder="Search countries..."
                                value={regionSearchQuery}
                                onChange={(e) => setRegionSearchQuery(e.target.value)}
                                onClick={(e) => e.stopPropagation()} 
                                autoFocus
                              />
                            </div>
                            <ul className={styles.dropdownListOptions}>
                              {filteredCountries.length > 0 ? (
                                filteredCountries.map((country) => (
                                  <li 
                                    key={country} 
                                    className={`${styles.dropdownOptionItem} ${selectedRegion === country ? styles.itemSelected : ''}`}
                                    onClick={() => handleSelectCountry(country)}
                                  >
                                    {country}
                                  </li>
                                ))
                              ) : (
                                <li className={styles.noResultsFoundItem}>No matching countries found</li>
                              )}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className={styles.formGroup} ref={centerRef}>
                      <label className={styles.label}>Center Hub *</label>
                      <div className={styles.searchDropdownContainer}>
                        <div 
                          className={`${styles.customSelectTrigger} ${(!selectedRegion || loading) ? styles.triggerDisabled : ''} ${!selectedCenter ? styles.requiredHighlight : ''}`}
                          onClick={() => selectedRegion && !loading && setIsCenterDropdownOpen(!isCenterDropdownOpen)}
                        >
                          <span>{selectedCenter || (selectedRegion ? "Select Center Location... *" : "-- Choose Country First --")}</span>
                          <FaChevronDown className={styles.arrowIcon} />
                        </div>

                        {isCenterDropdownOpen && selectedRegion && (
                          <div className={styles.dropdownOverlayMenu}>
                            <div className={styles.dropdownSearchHeader}>
                              <FaSearch className={styles.searchIconInline} />
                              <input 
                                type="text" 
                                className={styles.dropdownSearchInput}
                                placeholder="Search center hubs..."
                                value={centerSearchQuery}
                                onChange={(e) => setCenterSearchQuery(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                autoFocus
                              />
                            </div>
                            <ul className={styles.dropdownListOptions}>
                              {filteredCenters.length > 0 ? (
                                filteredCenters.map((centerOption) => (
                                  <li 
                                    key={centerOption} 
                                    className={`${styles.dropdownOptionItem} ${selectedCenter === centerOption ? styles.itemSelected : ''}`}
                                    onClick={() => handleSelectCenter(centerOption)}
                                  >
                                    {centerOption}
                                  </li>
                                ))
                              ) : (
                                <li className={styles.noResultsFoundItem}>No matching centers found</li>
                              )}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className={styles.rowFieldContainer}>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>Parent's WhatsApp Contact *</label>
                      <input 
                        type="tel" required className={styles.input}
                        placeholder="e.g. +254700111222"
                        value={parentContact} 
                        onChange={(e) => setParentContact(e.target.value)} 
                        disabled={loading}
                      />
                    </div>
                    
                    <div className={styles.formGroup}>
                      <label className={styles.label}>Parent's Email Address *</label>
                      <input 
                        type="email" required className={styles.input}
                        placeholder="e.g. vansh.patel@gmail.com"
                        value={parentEmail} 
                        onChange={(e) => setParentEmail(e.target.value)} 
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div className={styles.formGroupFull}>
                    <label className={styles.label}>Profile Picture (Clear Passport Style Shot) *</label>
                    <div className={styles.photoUploadWrapper}>
                      <input 
                        type="file" required accept="image/jpeg,image/png,image/webp" id="public-photo"
                        className={styles.fileInputHidden} onChange={handlePhotoChange} disabled={loading}
                      />
                      <label htmlFor="public-photo" className={`${styles.fileLabelBtn} ${!photoFile ? styles.requiredHighlight : ''}`}>
                        <FaCamera /> Select Portrait Image *
                      </label>
                      {photoPreview && <img src={photoPreview} alt="Preview" className={styles.inputThumbPreview} />}
                      <span className={styles.fileHint}>Required: Size must be under 2.5MB (JPG, PNG, WEBP)</span>
                    </div>
                  </div>
<div className={styles.termsSection}>
  <div className={styles.checkboxWrapper}>
    <label className={styles.termsLabel} style={{ 
        color: (!acceptedTerms && formError) ? '#d93025' : '#202124',
        fontWeight: (!acceptedTerms && formError) ? 'bold' : 'normal'
      }}>
      <input 
        type="checkbox" 
        checked={acceptedTerms} 
        onChange={(e) => setAcceptedTerms(e.target.checked)} 
      />
      <span>I understand and accept the registration terms *</span>
    </label>
  </div>

  <div className={styles.termsDisplayBox}>
    <p className={styles.termsHeading}>Terms and Conditions:</p>
    <ul className={styles.termsList}>
      <li>Registration is open to children aged 3 to 18 years only.</li>
      <li>A clear, recent passport-style photograph is required for identification.</li>
      <li>All information provided must be accurate; incorrect details may delay registration.</li>
      <li>Your data is used solely for organizing the Bal-Balika Shibir event.</li>
      <li>By registering, you consent to receive communication regarding Shibir updates.</li>
    </ul>
  </div>
</div>
                </div>

                <button type="submit" className={styles.submitBtn} disabled={loading}>
                  {loading ? <><FaSpinner className={styles.spin} /> Registering...</> : <><FaUserPlus /> Complete Registration</>}
                </button>
              </form>
            </>
          )}

        <div style={{ display: 'none' }} ref={qrRef}>
  {generatedQRValue && (
    <QRCodeSVG 
      value={generatedQRValue} 
      size={256} 
      level="H" 
      includeMargin={true}
      fgColor="#1a73e8" // <--- Change this to your desired color (e.g., #d93025 for red)
    />
  )}
</div>
        </div>
      </div>
    </div>
  );
}