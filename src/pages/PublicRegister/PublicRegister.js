import React, { useState, useRef, useEffect } from "react";
import { attendees as attendeesApi, upload, email as emailApi } from "../../apiClient";
import { QRCodeSVG } from "qrcode.react";
import {
  FaUserPlus,
  FaSpinner,
  FaCheckCircle,
  FaInfoCircle,
  FaExclamationTriangle,
  FaChevronDown,
  FaSearch,
  FaPlusCircle,
} from "react-icons/fa";
import styles from "./PublicRegister.module.css";

export default function PublicRegister() {
  const [firstName, setFirstName]   = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName]     = useState("");
  const [age, setAge]               = useState("");
  const [gender, setGender]         = useState("Balak");

  const [selectedRegion, setSelectedRegion]       = useState("");
  const [regionSearchQuery, setRegionSearchQuery] = useState("");
  const [isRegionDropdownOpen, setIsRegionDropdownOpen] = useState(false);

  const [selectedCenter, setSelectedCenter]       = useState("");
  const [centerSearchQuery, setCenterSearchQuery] = useState("");
  const [isCenterDropdownOpen, setIsCenterDropdownOpen] = useState(false);

  const [parentContact, setParentContact] = useState("");
  const [parentEmail, setParentEmail]     = useState("");
  const [photoFile, setPhotoFile]         = useState(null);
  const [loading, setLoading]             = useState(false);
  const [success, setSuccess]             = useState(false);
  const [formError, setFormError]         = useState("");
  const [generatedQRValue, setGeneratedQRValue] = useState("");
  const [finalAttendeeData, setFinalAttendeeData] = useState(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const regionRef    = useRef(null);
  const centerRef    = useRef(null);
  const qrRef        = useRef(null);
  const firstNameRef = useRef(null);
  const middleNameRef= useRef(null);
  const lastNameRef  = useRef(null);
  const ageRef       = useRef(null);
  const emailRef     = useRef(null);
  const photoRef     = useRef(null);
  const genderRef    = useRef(null);
  const contactRef   = useRef(null);
  const termsRef     = useRef(null);

  const regionDataset = {
    Kenya:        { code: "+254", centers: ["Nairobi","Mombasa","Kisumu","Nakuru","Eldoret","Thika","Malindi","Kericho","Kakamega","Nyeri","Machakos","Meru","Kitale","Garissa","Voi","Naivasha","Narok","Embu","Lamu","Nanyuki"] },
    Tanzania:     { code: "+255", centers: ["Dar es Salaam","Arusha","Mwanza","Zanzibar City","Dodoma","Moshi","Tanga","Morogoro","Mbeya","Iringa","Kigoma","Songea","Tabora","Musoma","Shinyanga","Sumbawanga","Lindi","Singida","Bukoba"] },
    Uganda:       { code: "+256", centers: ["Campala","Entebbe","Jinja","Mbarara","Gulu","Mbale","Masaka","Arua","Lira","Fort Portal","Kabale","Tororo","Soroti","Mukono","Hoima","Kasese","Busia","Iganga","Wakiso"] },
    Zambia:       { code: "+260", centers: ["Lusaka","Kitwe","Ndola","Livingstone","Kabwe","Chingola","Mufulira","Luanshya","Kasama","Chipata","Chinsali","Mansa","Solwezi","Mongu","Mazabuka","Monze","Choma","Kapiri Mposhi"] },
    Malawi:       { code: "+265", centers: ["Lilongwe","Blantyre","Mzuzu","Zomba","Kasungu","Mangochi","Karonga","Salima","Nkhotakota","Liwonde","Balaka","Luchenza","Dedza","Mchinji","Chikwawa","Nsanje","Rumphi"] },
    Botswana:     { code: "+267", centers: ["Gaborone","Francistown","Molepolole","Maun","Mogoditshane","Serowe","Selebi-Phikwe","Kanye","Lobatse","Palapye","Mahalapye","Mochudi","Ghanzi","Kasane","Orapa","Jwaneng","Sowa"] },
    "South Africa":{ code: "+27",  centers: ["Johannesburg","Cape Town","Durban","Pretoria","Port Elizabeth","Bloemfontein","East London","Polokwane","Nelspruit","Kimberley","Pietermaritzburg","Rustenburg","George","Welkom","Klerksdorp","Vereeniging","Stellenbosch","Paarl","Upington","Mthatha","Soweto","Benoni","Tembisa"] },
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (regionRef.current && !regionRef.current.contains(event.target)) setIsRegionDropdownOpen(false);
      if (centerRef.current && !centerRef.current.contains(event.target))  setIsCenterDropdownOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredCountries = Object.keys(regionDataset).filter((c) =>
    c.toLowerCase().includes(regionSearchQuery.toLowerCase().trim())
  );
  const availableCenters  = selectedRegion ? (regionDataset[selectedRegion.trim()]?.centers || []) : [];
  const filteredCenters   = availableCenters.filter((c) =>
    c.toLowerCase().includes(centerSearchQuery.toLowerCase().trim())
  );

  const handleSelectCountry = (countryName) => {
    const clean = countryName.trim();
    setSelectedRegion(clean);
    setRegionSearchQuery("");
    setIsRegionDropdownOpen(false);
    setSelectedCenter("");
    setCenterSearchQuery("");
    setParentContact(regionDataset[clean]?.code || "");
  };

  const handleSelectCenter = (centerName) => {
    setSelectedCenter(centerName.trim());
    setCenterSearchQuery("");
    setIsCenterDropdownOpen(false);
  };



  const validateForm = () => {
    const cf = firstName.trim(), cm = middleName.trim(), cl = lastName.trim();
    const cc = parentContact.trim(), ce = parentEmail.trim();
    const fail = (msg, ref) => { setFormError(msg); ref.current?.scrollIntoView({ behavior: "smooth", block: "center" }); return false; };
    if (!cf || cf.length < 2)   return fail("Enter a valid First Name.",   firstNameRef);
    if (!cm || cm.length < 2)   return fail("Enter a valid Middle Name.",  middleNameRef);
    if (!cl || cl.length < 2)   return fail("Enter a valid Last Name.",    lastNameRef);
    const pa = parseInt(age);
    if (isNaN(pa) || pa < 3 || pa > 18) return fail("Age must be between 3 and 18.", ageRef);
    if (!gender)         return fail("Please select a Mandal.",   genderRef);
    if (!selectedRegion) return fail("Please select your Country.", regionRef);
    if (!selectedCenter) return fail("Please select your Center.", centerRef);
    const stripped = cc.replace(/[\s\-()]/g, "");
    if (!/^\+[1-9]\d{6,14}$/.test(stripped)) return fail("Invalid phone format (e.g. +254700111222).", contactRef);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ce)) return fail("Enter a valid email address.", emailRef);
    if (!photoFile)      return fail("A portrait photo is mandatory.", photoRef);
    if (!acceptedTerms)  return fail("Please accept the Terms and Conditions.", termsRef);
    return { constructedFullName: `${cf} ${cm} ${cl}`, parsedAge: pa, strippedContact: stripped, cleanEmail: ce };
  };
// Add this temporary placeholder at the top of your component 
// if you aren't ready to delete all the logic yet:
const setPhotoPreview = () => {};
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    const validated = validateForm();
    if (!validated) return;
    const { constructedFullName, parsedAge, strippedContact, cleanEmail } = validated;

    setLoading(true);
    setSuccess(false);
    setFinalAttendeeData(null);

    try {
      const { data: insertData } = await attendeesApi.create({
        name: constructedFullName,
        age: parsedAge,
        gender,
        region: selectedRegion,
        center: selectedCenter,
        parent_contact: strippedContact,
        parent_email: cleanEmail,
        status: "Pending",
      });

      const rawId       = insertData._raw_id;
      const trueMemberId = insertData.member_id;
      setGeneratedQRValue(trueMemberId);

      // Upload photo
      const ext       = photoFile.name.split(".").pop().toLowerCase();
      const cleanName = constructedFullName.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
      const photoFilename = `public_profile_${rawId}_${cleanName}.${ext}`;
      const { url: profileUrl } = await upload.photo(photoFile, photoFilename);

      setTimeout(async () => {
        const svgElement = qrRef.current?.querySelector("svg");
        let qrUrl = null;
        if (svgElement) {
          const svgString = new XMLSerializer().serializeToString(svgElement);
          const svgBlob   = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
          const qrFilename = `public_qr_${rawId}_${cleanName}.svg`;
          const { url } = await upload.qr(svgBlob, qrFilename);
          qrUrl = url;
        }

        await attendeesApi.update(rawId, { photo_url: profileUrl, qr_code_url: qrUrl });

        // Send confirmation email (non-blocking)
        emailApi.sendRegistration({
          email: cleanEmail,
          name: constructedFullName,
          memberId: trueMemberId,
          region: selectedRegion,
          center: selectedCenter,
        }).catch(console.warn);

        setFinalAttendeeData({ memberId: trueMemberId, name: constructedFullName, region: selectedRegion, center: selectedCenter });
        setSuccess(true);
        setLoading(false);

        setFirstName(""); setMiddleName(""); setLastName(""); setAge("");
        setGender("Balak"); setSelectedRegion(""); setRegionSearchQuery("");
        setSelectedCenter(""); setCenterSearchQuery("");
        setParentContact(""); setParentEmail("");
        setPhotoFile(null); setPhotoPreview("");
      }, 600);
    } catch (uploadErr) {
      setFormError(`Registration failed: ${uploadErr.message}`);
      setLoading(false);
    }
  };

  const handleResetFormView = () => { setSuccess(false); setFinalAttendeeData(null); setFormError(""); };

  return (
    <div className={styles.publicWrapper}>
      <header className={styles.publicHeader}>
        <h1>Making the Right Choices</h1>
        <p>Bal-Balika Shibir Africa 2026</p>
      </header>

      <div className={styles.containerSingle}>
        <div className={styles.card}>
          {success && finalAttendeeData ? (
            <div className={styles.fullSuccessContainer} style={{ textAlign: "center", padding: "40px 20px" }}>
              <div style={{ color: "#34a853", marginBottom: "20px" }}><FaCheckCircle size={64} /></div>
              <h2 style={{ fontSize: "26px", color: "#137333", marginBottom: "14px", fontWeight: "700" }}>Thanks for your submission!</h2>
              <p style={{ fontSize: "16px", color: "#5f6368", lineHeight: "1.6", maxWidth: "500px", margin: "0 auto 24px auto" }}>
                You will get a confirmation in your email shortly. Entry details for <strong>{finalAttendeeData.name}</strong> have been processed with Shibir ID Number:
              </p>
              <div style={{ background: "#f1f3f4", padding: "14px 24px", borderRadius: "8px", display: "inline-block", fontSize: "20px", fontWeight: "700", letterSpacing: "1px", color: "#202124", marginBottom: "16px", border: "1px solid #dadce0" }}>
                {finalAttendeeData.memberId}
              </div>
              <p style={{ fontSize: "14px", color: "#70757a", margin: "0 0 40px 0" }}>Region & Center: {finalAttendeeData.center}, {finalAttendeeData.region}</p>
              <hr style={{ border: "0", height: "1px", background: "#dadce0", margin: "0 auto 32px auto", maxWidth: "400px" }} />
              <button type="button" onClick={handleResetFormView} className={styles.submitBtn} style={{ maxWidth: "320px", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                <FaPlusCircle /> Register Another Person
              </button>
            </div>
          ) : (
            <>
              <div className={styles.infoBanner}>
                <FaInfoCircle style={{ flexShrink: 0, marginTop: "2px" }} />
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
                    <div className={styles.formGroup} ref={firstNameRef}>
                      <label className={styles.label}>First Name *</label>
                      <input type="text" className={`${styles.input} ${formError && !firstName.trim() ? styles.inputError : ""}`} placeholder="e.g. Vansh" value={firstName} onChange={(e) => setFirstName(e.target.value)} disabled={loading} />
                    </div>
                    <div className={styles.formGroup} ref={middleNameRef}>
                      <label className={styles.label}>Middle Name *</label>
                      <input type="text" required className={`${styles.input} ${formError && !middleName.trim() ? styles.inputError : ""}`} placeholder="e.g. Vimalkumar" value={middleName} onChange={(e) => setMiddleName(e.target.value)} disabled={loading} />
                    </div>
                    <div className={styles.formGroup} ref={lastNameRef}>
                      <label className={styles.label}>Last Name *</label>
                      <input type="text" required className={`${styles.input} ${formError && !firstName.trim() ? styles.inputError : ""}`} placeholder="e.g. Patel" value={lastName} onChange={(e) => setLastName(e.target.value)} disabled={loading} />
                    </div>
                  </div>

                  <div className={styles.rowFieldContainer}>
                    <div className={styles.formGroup} ref={ageRef}>
                      <label className={styles.label}>Age *</label>
                      <input type="number" required min="3" max="18" className={`${styles.input} ${formError && !age ? styles.inputError : ""}`} placeholder="e.g. 11" value={age} onChange={(e) => setAge(e.target.value)} disabled={loading} />
                    </div>
                    <div className={styles.formGroup} ref={genderRef}>
                      <label className={styles.label}>Mandal *</label>
                      <select className={`${styles.select} ${formError && !gender ? styles.inputError : ""}`} required value={gender} onChange={(e) => setGender(e.target.value)} disabled={loading}>
                        <option value="Balak">Balak</option>
                        <option value="Balika">Balika</option>
                      </select>
                    </div>
                  </div>

                  <div className={styles.rowFieldContainer}>
                    <div className={styles.formGroup} ref={regionRef}>
                      <label className={styles.label}>Country *</label>
                      <div className={styles.searchDropdownContainer}>
                        <div className={`${styles.customSelectTrigger} ${loading ? styles.triggerDisabled : ""} ${formError && !selectedRegion ? styles.inputError : ""}`} onClick={() => !loading && setIsRegionDropdownOpen(!isRegionDropdownOpen)}>
                          <span>{selectedRegion || "Select Country... *"}</span>
                          <FaChevronDown className={styles.arrowIcon} />
                        </div>
                        {isRegionDropdownOpen && (
                          <div className={styles.dropdownOverlayMenu}>
                            <div className={styles.dropdownSearchHeader}>
                              <FaSearch className={styles.searchIconInline} />
                              <input type="text" className={styles.dropdownSearchInput} placeholder="Search countries..." value={regionSearchQuery} onChange={(e) => setRegionSearchQuery(e.target.value)} onClick={(e) => e.stopPropagation()} autoFocus />
                            </div>
                            <ul className={styles.dropdownListOptions}>
                              {filteredCountries.length > 0 ? filteredCountries.map((country) => (
                                <li key={country} className={`${styles.dropdownOptionItem} ${selectedRegion === country ? styles.itemSelected : ""}`} onClick={() => handleSelectCountry(country)}>{country}</li>
                              )) : <li className={styles.noResultsFoundItem}>No matching countries found</li>}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className={styles.formGroup} ref={centerRef}>
                      <label className={styles.label}>Center *</label>
                      <div className={styles.searchDropdownContainer}>
                        <div className={`${styles.customSelectTrigger} ${!selectedRegion || loading ? styles.triggerDisabled : ""} ${formError && !selectedCenter ? styles.inputError : ""}`} onClick={() => selectedRegion && !loading && setIsCenterDropdownOpen(!isCenterDropdownOpen)}>
                          <span>{selectedCenter || (selectedRegion ? "Select Center... *" : "-- Choose Country First --")}</span>
                          <FaChevronDown className={styles.arrowIcon} />
                        </div>
                        {isCenterDropdownOpen && selectedRegion && (
                          <div className={styles.dropdownOverlayMenu}>
                            <div className={styles.dropdownSearchHeader}>
                              <FaSearch className={styles.searchIconInline} />
                              <input type="text" className={styles.dropdownSearchInput} placeholder="Search center..." value={centerSearchQuery} onChange={(e) => setCenterSearchQuery(e.target.value)} onClick={(e) => e.stopPropagation()} autoFocus />
                            </div>
                            <ul className={styles.dropdownListOptions}>
                              {filteredCenters.length > 0 ? filteredCenters.map((co) => (
                                <li key={co} className={`${styles.dropdownOptionItem} ${selectedCenter === co ? styles.itemSelected : ""}`} onClick={() => handleSelectCenter(co)}>{co}</li>
                              )) : <li className={styles.noResultsFoundItem}>No matching centers found</li>}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className={styles.rowFieldContainer}>
                    {/* <div className={styles.formGroup} ref={contactRef}>
                      <label className={styles.label}>Parent's WhatsApp Contact *</label>
                      <input type="tel" required maxLength="13" className={`${styles.input} ${formError && parentContact.length !== 13 ? styles.inputError : ""}`} placeholder="+254748660944" value={parentContact} onChange={(e) => { const v = e.target.value.replace(/[^\d+]/g,""); if (v.length <= 13) setParentContact(v); }} disabled={loading} />
                    </div> */}
                    <div className={styles.formGroup} ref={emailRef}>
                      <label className={styles.label}>Parent's Email Address *</label>
                      <input type="email" required className={`${styles.input} ${formError && !parentEmail.trim() ? styles.inputError : ""}`} placeholder="e.g. vansh.patel@gmail.com" value={parentEmail} onChange={(e) => setParentEmail(e.target.value)} disabled={loading} />
                    </div>
                  </div>

                  {/* <div className={styles.formGroupFull} ref={photoRef}>
                    <label className={styles.label}>Profile Picture (Clear Passport Style Shot) *</label>
                    <div className={styles.photoUploadWrapper}>
                      <input type="file" required accept="image/jpeg,image/png,image/webp" id="public-photo" className={styles.fileInputHidden} onChange={handlePhotoChange} disabled={loading} />
                      <label htmlFor="public-photo" className={`${styles.fileLabelBtn} ${formError && !photoFile ? styles.inputError : ""}`}><FaCamera /> Select Portrait Image *</label>
                      {photoPreview && <img src={photoPreview} alt="Preview" className={styles.inputThumbPreview} />}
                      <span className={styles.fileHint}>Required: Size must be under 2.5MB (JPG, PNG, WEBP)</span>
                    </div>
                  </div> */}

                  <div className={styles.termsSection}>
                    <div className={styles.checkboxWrapper}>
                      <label className={styles.termsLabel} style={{ color: !acceptedTerms && formError ? "#d93025" : "#202124", fontWeight: !acceptedTerms && formError ? "bold" : "normal" }}>
                        <input type="checkbox" checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)} />
                        <span>I understand and accept the registration terms *</span>
                      </label>
                    </div>
                    <div className={styles.termsDisplayBox}>
                      <p className={styles.termsHeading}>Terms and Conditions:</p>
                      <ul className={styles.termsList}>
                        <li>Registration is open to children from Grades 1 to 8.</li>
                        <li>A clear, recent passport-style photograph is required for identification.</li>
                        <li>All information provided must be accurate; incorrect details may delay registration.</li>
                        <li>Your data is used solely for organizing the Bal-Balika Shibir event.</li>
                        <li>By registering, you consent to receive communication regarding Shibir updates.</li>
                        <li>By filling this form, you are allowing your child to attend this event, and the organizers are not responsible for any mishaps</li>
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
          <div style={{ display: "none" }} ref={qrRef}>
            {generatedQRValue && <QRCodeSVG value={generatedQRValue} size={256} level="H" includeMargin={true} fgColor="#000000" />}
          </div>
        </div>
      </div>
    </div>
  );
}
