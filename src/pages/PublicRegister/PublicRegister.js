import React, { useState, useRef, useEffect } from "react";
import {
  attendees as attendeesApi,
  upload,
  email as emailApi,
} from "../../apiClient";
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
  FaEdit,
  FaCheck,
  FaCloudDownloadAlt,
} from "react-icons/fa";
import shirtChartImg from "../../assets/images/t_shirt_size_guide.jpeg";
import styles from "./PublicRegister.module.css";
import confetti from "canvas-confetti";
export default function PublicRegister() {
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState("");
  const [regionSearchQuery, setRegionSearchQuery] = useState("");
  const [isRegionDropdownOpen, setIsRegionDropdownOpen] = useState(false);

  const [selectedCenter, setSelectedCenter] = useState("");
  const [centerSearchQuery, setCenterSearchQuery] = useState("");
  const [isCenterDropdownOpen, setIsCenterDropdownOpen] = useState(false);

  const [parentEmail, setParentEmail] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formError, setFormError] = useState("");
  const [generatedQRValue, setGeneratedQRValue] = useState("");
  const [finalAttendeeData, setFinalAttendeeData] = useState(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [tshirtSize, setTshirtSize] = useState("");
  const closedRegions = ["Malawi", "Tanzania","Kenya", "Zambia"]; // Define your list of closed regions
  const [formMode, setFormMode] = useState("form"); // "form" | "review"

  const phoneRef = useRef(null);
  const shirtRef = useRef(null);
  const regionRef = useRef(null);
  const centerRef = useRef(null);
  const qrRef = useRef(null);
  const firstNameRef = useRef(null);
  const middleNameRef = useRef(null);
  const lastNameRef = useRef(null);
  const ageRef = useRef(null);
  const emailRef = useRef(null);
  const genderRef = useRef(null);
  const termsRef = useRef(null);

  const regionDataset = {
    Kenya: {
      code: "+254",
      centers: [
        "Nairobi",
        "Mombasa",
        "Kisumu",
        "Nakuru",
        "Eldoret",
        "Thika",
        "Malindi",
        "Kericho",
        "Kakamega",
        "Nyeri",
        "Machakos",
        "Meru",
        "Kitale",
        "Garissa",
        "Voi",
        "Naivasha",
        "Narok",
        "Embu",
        "Lamu",
        "Nanyuki",
        "Athi River",
        "Nyahururu",
        "Bomet",
        "Busia",
        "Homabay",
        "Kisii",
        "Bungoma",
      ],
    },
    Tanzania: {
      code: "+255",
      centers: [
        "Dar es Salaam",
        "Arusha",
        "Mwanza",
        "Zanzibar City",
        "Dodoma",
        "Moshi",
        "Tanga",
        "Morogoro",
        "Mbeya",
        "Iringa",
        "Kigoma",
        "Songea",
        "Tabora",
        "Musoma",
        "Shinyanga",
        "Sumbawanga",
        "Lindi",
        "Singida",
        "Bukoba",
      ],
    },
    Uganda: {
      code: "+256",
      centers: [
        "Kampala",
        "Entebbe",
        "Jinja",
        "Mbarara",
        "Gulu",
        "Mbale",
        "Masaka",
        "Arua",
        "Lira",
        "Fort Portal",
        "Kabale",
        "Tororo",
        "Soroti",
        "Mukono",
        "Hoima",
        "Kasese",
        "Busia",
        "Iganga",
        "Wakiso",
        "Mityana",
        "Mubende",
        "Luwero",
        "Kyenjojo",
        "Masindi",
        "Kitgum",
      ],
    },
    Zambia: {
      code: "+260",
      centers: [
        "Lusaka",
        "Kitwe",
        "Ndola",
        "Livingstone",
        "Kabwe",
        "Chingola",
        "Mufulira",
        "Luanshya",
        "Kasama",
        "Chipata",
        "Chinsali",
        "Mansa",
        "Solwezi",
        "Mongu",
        "Mazabuka",
        "Monze",
        "Choma",
        "Kapiri Mposhi",
      ],
    },
    Malawi: {
      code: "+265",
      centers: [
        "Lilongwe",
        "Blantyre",
        "Mzuzu",
        "Zomba",
        "Kasungu",
        "Mangochi",
        "Karonga",
        "Salima",
        "Nkhotakota",
        "Liwonde",
        "Balaka",
        "Luchenza",
        "Dedza",
        "Mchinji",
        "Chikwawa",
        "Nsanje",
        "Rumphi",
      ],
    },
    Botswana: {
      code: "+267",
      centers: [
        "Gaborone",
        "Francistown",
        "Molepolole",
        "Maun",
        "Mogoditshane",
        "Serowe",
        "Selebi-Phikwe",
        "Kanye",
        "Lobatse",
        "Palapye",
        "Mahalapye",
        "Mochudi",
        "Ghanzi",
        "Kasane",
        "Orapa",
        "Jwaneng",
        "Sowa",
      ],
    },
    "South Africa": {
      code: "+27",
      centers: [
        "Benoni",
        "Cape Town",
        "Germiston",
        "Laudium",
        "Lenasia",
        "Louis Trichardt",
        "Mayfair",
        "Mogwase",
        "Rustenburg",
        "Tzaneen",
        "Northriding",
      ],
    },
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (regionRef.current && !regionRef.current.contains(event.target))
        setIsRegionDropdownOpen(false);
      if (centerRef.current && !centerRef.current.contains(event.target))
        setIsCenterDropdownOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // NEW CODE
  const allCountries = Object.keys(regionDataset);

  const filteredCountries = allCountries.filter((c) =>
    c.toLowerCase().includes(regionSearchQuery.toLowerCase().trim()),
  );
  const availableCenters = selectedRegion
    ? regionDataset[selectedRegion.trim()]?.centers || []
    : [];
  const filteredCenters = availableCenters.filter((c) =>
    c.toLowerCase().includes(centerSearchQuery.toLowerCase().trim()),
  );

  const handleSelectCountry = (countryName) => {
    const clean = countryName.trim();
    setSelectedRegion(clean);
    setRegionSearchQuery("");
    setIsRegionDropdownOpen(false);
    setSelectedCenter("");
    setCenterSearchQuery("");
    setTshirtSize("");

    const countryDialCode = regionDataset[clean]?.code || "";
    setPhoneNumber(`${countryDialCode} `);
  };

  const handleSelectCenter = (centerName) => {
    setSelectedCenter(centerName.trim());
    setCenterSearchQuery("");
    setIsCenterDropdownOpen(false);
  };

  const handlePhoneChange = (e) => {
    const value = e.target.value;
    const currentCode = selectedRegion
      ? regionDataset[selectedRegion]?.code || ""
      : "";

    if (currentCode) {
      if (!value.startsWith(currentCode)) {
        setPhoneNumber(`${currentCode} `);
        return;
      }

      const remainingPart = value.substring(currentCode.length);
      const digitsOnly = remainingPart.replace(/\D/g, "");
      const limitedDigits = digitsOnly.slice(0, 9);

      setPhoneNumber(`${currentCode} ${limitedDigits}`);
    } else {
      const digitsOnly = value.replace(/\D/g, "");
      setPhoneNumber(digitsOnly.slice(0, 15));
    }
  };

  const validateForm = () => {
    const cf = firstName.trim(),
      cm = middleName.trim(),
      cl = lastName.trim();
    const ce = parentEmail.trim();
    const fail = (msg, ref) => {
      setFormError(msg);
      ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return false;
    };
    if (!cf || cf.length < 2)
      return fail("Enter a valid First Name.", firstNameRef);
    if (!cm || cm.length < 2)
      return fail("Enter a valid Middle Name.", middleNameRef);
    if (!cl || cl.length < 2)
      return fail("Enter a valid Last Name.", lastNameRef);
    const pa = parseInt(age);
    if (isNaN(pa) || pa < 7 || pa > 14)
      return fail("Age must be between 7 and 14.", ageRef);
    if (!gender) return fail("Please select a Mandal.", genderRef);
    if (!selectedRegion) return fail("Please select your Country.", regionRef);
    if (!selectedCenter) return fail("Please select your Center.", centerRef);
    const closedRegions = ["Malawi", "Tanzania","Kenya","Zambia"];
    if (closedRegions.includes(selectedRegion)) {
      return fail(
        "Registration for this region is currently closed.",
        regionRef,
      );
    }
    const strippedPhone = phoneNumber ? phoneNumber.replace(/\s/g, "") : "";
    const currentCode = regionDataset[selectedRegion]?.code || "";
    const digitsAfterPrefix = strippedPhone.substring(currentCode.length);

    if (digitsAfterPrefix.length !== 9) {
      return fail(
        "Phone number must contain exactly 9 digits after the country code prefix.",
        phoneRef,
      );
    }

    const needsTshirt =
      selectedRegion === "Botswana" ||
      selectedRegion === "South Africa" ||
      selectedRegion === "Malawi" ||
      selectedRegion === "Zambia" ||
      selectedRegion === "Uganda";
    if (needsTshirt && !tshirtSize) {
      return fail("Please select a T-shirt size.", shirtRef);
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ce))
      return fail("Enter a valid email address.", emailRef);
    if (!acceptedTerms)
      return fail("Please accept the Terms and Conditions.", termsRef);

    return {
      constructedFullName: `${cf} ${cm} ${cl}`,
      parsedAge: pa,
      strippedContact: strippedPhone,
      cleanEmail: ce,
    };
  };

  // Step 1: Open Preview Box Mode
  const handleTriggerReview = (e) => {
    e.preventDefault();
    setFormError("");
    const validated = validateForm();
    if (!validated) return;

    setFormMode("review");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Step 2: Full Database Transmission Workflow Sequence
  const handleCommitFinalRegistration = async () => {
    setFormError("");
    const validated = validateForm();
    if (!validated) {
      setFormMode("form");
      return;
    }

    const {
      constructedFullName: rawFullName,
      parsedAge,
      strippedContact,
      cleanEmail,
    } = validated;

    const constructedFullName = rawFullName
      ? rawFullName
          .trim()
          .split(/\s+/)
          .map(
            (word) =>
              word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
          )
          .join(" ")
      : "";

    setLoading(true);

    try {
      const { data: insertData } = await attendeesApi.create({
        name: constructedFullName,
        age: parsedAge,
        gender,
        region: selectedRegion,
        center: selectedCenter,
        parent_contact: strippedContact,
        parent_email: cleanEmail,
        phone_number: strippedContact,
        tshirt_size: tshirtSize,
        status: "Pending",
      });

      const rawId = insertData._raw_id;
      const trueMemberId = insertData.member_id;
      setGeneratedQRValue(trueMemberId);

      const cleanName = constructedFullName
        .replace(/[^a-zA-Z0-9]/g, "_")
        .toLowerCase();

      let profileUrl = null;
      if (photoFile) {
        const ext = photoFile.name.split(".").pop().toLowerCase();
        const photoFilename = `public_profile_${rawId}_${cleanName}.${ext}`;
        const { url } = await upload.photo(photoFile, photoFilename);
        profileUrl = url;
      }

      await new Promise((resolve) => {
        setTimeout(async () => {
          const svgElement = qrRef.current?.querySelector("svg");
          let qrUrl = null;
          if (svgElement) {
            const svgString = new XMLSerializer().serializeToString(svgElement);
            const svgBlob = new Blob([svgString], {
              type: "image/svg+xml;charset=utf-8",
            });
            const qrFilename = `public_qr_${rawId}_${cleanName}.svg`;
            const { url } = await upload.qr(svgBlob, qrFilename);
            qrUrl = url;
          }

          await attendeesApi.update(rawId, {
            photo_url: profileUrl,
            qr_code_url: qrUrl,
          });

          emailApi
            .sendRegistration({
              email: cleanEmail,
              name: constructedFullName,
              memberId: trueMemberId,
              region: selectedRegion,
              center: selectedCenter,
            })
            .catch(console.warn);

          setFinalAttendeeData({
            memberId: trueMemberId,
            name: constructedFullName,
            region: selectedRegion,
            center: selectedCenter,
          });

          // --- SUCCESS CELEBRATION ---
          confetti({
            particleCount: 200,
            spread: 100,
            origin: { y: 0.6 },
            colors: ["#8a151b", "#ffffff", "#2d2926"],
          });

          setSuccess(true);
          setFormMode("form");

          setFirstName("");
          setMiddleName("");
          setLastName("");
          setAge("");
          setGender("");
          setSelectedRegion("");
          setRegionSearchQuery("");
          setSelectedCenter("");
          setCenterSearchQuery("");
          setParentEmail("");
          setPhotoFile(null);
          setPhoneNumber("");
          setTshirtSize("");

          resolve();
        }, 600);
      });
    } catch (uploadErr) {
      setFormError(`Registration failed: ${uploadErr.message}`);
    } finally {
      setLoading(false);
    }
  };
  const handleResetFormView = () => {
    setSuccess(false);
    setFinalAttendeeData(null);
    setFormError("");
    setFormMode("form");
  };

  return (
    <div className={styles.publicWrapper}>
      <header className={styles.publicHeader}>
        <h1>Making the Right Choices</h1>
        <p>Bal-Balika Shibir, Africa - 2026</p>
      </header>

      <div className={styles.containerSingle}>
        <div className={styles.card}>
          {success && finalAttendeeData ? (
            /* ==========================================
               STAGE 1: CONFIRMATION SUCCESS VIEW CARD
               ========================================== */
            <div
              className={styles.fullSuccessContainer}
              style={{ textAlign: "center", padding: "40px 20px" }}
            >
              <div style={{ color: "#34a853", marginBottom: "20px" }}>
                <FaCheckCircle size={64} />
              </div>
              <h2
                style={{
                  fontSize: "26px",
                  color: "#137333",
                  marginBottom: "14px",
                  fontWeight: "700",
                }}
              >
                Thanks for your submission!
              </h2>
              <p
                style={{
                  fontSize: "16px",
                  color: "#5f6368",
                  lineHeight: "1.6",
                  maxWidth: "500px",
                  margin: "0 auto 24px auto",
                }}
              >
                You will get a confirmation in your email shortly. Entry details
                for <strong>{finalAttendeeData.name}</strong> have been
                processed with Shibir ID Number:
              </p>
              <div
                style={{
                  background: "#f1f3f4",
                  padding: "14px 24px",
                  borderRadius: "8px",
                  display: "inline-block",
                  fontSize: "20px",
                  fontWeight: "700",
                  letterSpacing: "1px",
                  color: "#202124",
                  marginBottom: "16px",
                  border: "1px solid #dadce0",
                }}
              >
                {finalAttendeeData.memberId}
              </div>
              <p
                style={{
                  fontSize: "14px",
                  color: "#70757a",
                  margin: "0 0 40px 0",
                }}
              >
                Region & Center: {finalAttendeeData.center},{" "}
                {finalAttendeeData.region}
              </p>
              <hr
                style={{
                  border: "0",
                  height: "1px",
                  background: "#dadce0",
                  margin: "0 auto 32px auto",
                  maxWidth: "400px",
                }}
              />
              <button
                type="button"
                onClick={handleResetFormView}
                className={styles.submitBtn}
                style={{
                  maxWidth: "320px",
                  margin: "0 auto",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                }}
              >
                <FaPlusCircle /> Register Another Person
              </button>
            </div>
          ) : formMode === "review" ? (
            /* ==========================================
               STAGE 2: PRE-SUBMIT PREVIEW WINDOW PANEL
               ========================================== */
            <div className={styles.previewContainer}>
              <div className={styles.previewHeaderBanner}>
                <FaInfoCircle className={styles.previewHeaderIcon} />
                <div>
                  <h3>Review Details / Preview Details</h3>
                  <p>Please ensure all details match before confirming.</p>
                </div>
              </div>

              {formError && (
                <div
                  className={styles.bannerError}
                  style={{ marginBottom: "20px" }}
                >
                  <FaExclamationTriangle style={{ flexShrink: 0 }} />
                  <span>{formError}</span>
                </div>
              )}
              {selectedRegion === "Uganda" && (
                <div className={styles.regionNoticeBox}>
                  <span className={styles.noticeTitle}>For Uganda Parents</span>
                  <p className={styles.noticeText}>
                    Kindly ensure that your Shibir registration fee of UGX
                    25,000 is submitted to the Accounts Department to finalize
                    your registration.
                  </p>
                </div>
              )}

               {selectedRegion === "South Africa" && (
                <div className={styles.regionNoticeBox}>
                  <span className={styles.noticeTitle}>
                    For South Africa Parents
                  </span>
                  <div className={styles.noticeText}>
                    <p style={{ marginBottom: "12px", fontWeight: "600" }}>
                      Kindly note the following key processing details to
                      finalize your registration:
                    </p>

                    <ol
                      style={{
                        paddingLeft: "20px",
                        margin: "0 0 12px 0",
                        lineHeight: "1.6",
                      }}
                    >
                      <li>
                        Cost of the Shibir is{" "}
                        <strong>R300 per Balak/Balika</strong>.
                      </li>
                      <li style={{ marginTop: "8px" }}>
                        EFT can be made into the following Account:
                        <ul
                          style={{
                            paddingLeft: "20px",
                            marginTop: "4px",
                            listStyleType: "disc",
                          }}
                        >
                          <li>
                            <strong>Account Name:</strong> BAPS Joburg
                          </li>
                          <li>
                            <strong>Account Number:</strong> 402131231
                          </li>
                          <li>
                            <strong>Bank:</strong> Standard Bank
                          </li>
                          <li>
                            <strong>Branch Code:</strong> 051001
                          </li>
                          <li>
                            <strong>Account Type:</strong> Current
                          </li>
                        </ul>
                      </li>
                      <li style={{ marginTop: "8px" }}>
                        Please send the Proof of Payment to{" "}
                        <strong>acct.za04@africa.baps.org</strong>
                      </li>
                      <li style={{ marginTop: "8px" }}>
                        Once registration is complete, parents will receive an
                        indemnity form from their local Sanchalak (this form
                        must be completed in order for registration to be
                        valid).
                      </li>
                    </ol>
                  </div>
                </div>
              )}

              <div className={styles.previewGridSummary}>
                <div className={styles.previewRow}>
                  <span className={styles.previewLabel}>Full Name:</span>
                  <span className={styles.previewValue}>
                    {firstName} {middleName} {lastName}
                  </span>
                </div>
                <div className={styles.previewRow}>
                  <span className={styles.previewLabel}>Age:</span>
                  <span className={styles.previewValue}>{age} Years Old</span>
                </div>
                <div className={styles.previewRow}>
                  <span className={styles.previewLabel}>Mandal:</span>
                  <span className={styles.previewValue}>{gender}</span>
                </div>
                <div className={styles.previewRow}>
                  <span className={styles.previewLabel}>Country:</span>
                  <span className={styles.previewValue}>{selectedRegion}</span>
                </div>
                <div className={styles.previewRow}>
                  <span className={styles.previewLabel}>Center:</span>
                  <span className={styles.previewValue}>{selectedCenter}</span>
                </div>
                <div className={styles.previewRow}>
                  <span className={styles.previewLabel}>Parents Mobile:</span>
                  <span className={styles.previewValue}>{phoneNumber}</span>
                </div>
                <div className={styles.previewRow}>
                  <span className={styles.previewLabel}>Parents Email:</span>
                  <span className={styles.previewValue}>{parentEmail}</span>
                </div>
                {tshirtSize && (
                  <div className={styles.previewRow}>
                    <span className={styles.previewLabel}>T-Shirt Size:</span>
                    <span className={styles.previewValue}>{tshirtSize}</span>
                  </div>
                )}
              </div>

              <div className={styles.previewActionControlBlock}>
                <button
                  type="button"
                  className={styles.backEditBtn}
                  onClick={() => setFormMode("form")}
                  disabled={loading}
                >
                  <FaEdit /> Go Back & Change
                </button>
                <button
                  type="button"
                  className={styles.confirmFinalSubmitBtn}
                  onClick={handleCommitFinalRegistration}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <FaSpinner className={styles.spin} /> Registering...
                    </>
                  ) : (
                    <>
                      <FaCheck /> Confirm & Submit Registration
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* ==========================================
               STAGE 3: STANDARD REGISTRATION FORMS
               ========================================== */
            <>
              <div className={styles.infoBanner}>
                <FaInfoCircle style={{ flexShrink: 0, marginTop: "2px" }} />
                <p>
                  All fields are required. Please check that details are correct
                  before sending.
                </p>
              </div>
              {formError && (
                <div className={styles.bannerError}>
                  <FaExclamationTriangle style={{ flexShrink: 0 }} />
                  <span>{formError}</span>
                </div>
              )}
              <form onSubmit={handleTriggerReview} noValidate>
                <div className={styles.formGrid}>
                  <div className={styles.rowFieldContainer}>
                    <div className={styles.formGroup} ref={firstNameRef}>
                      <label className={styles.label}>First Name *</label>
                      <input
                        type="text"
                        className={`${styles.input} ${formError && !firstName.trim() ? styles.inputError : ""}`}
                        placeholder="e.g. Vansh"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        disabled={loading}
                      />
                    </div>
                    <div className={styles.formGroup} ref={middleNameRef}>
                      <label className={styles.label}>Middle Name *</label>
                      <input
                        type="text"
                        className={`${styles.input} ${formError && !middleName.trim() ? styles.inputError : ""}`}
                        placeholder="e.g. Vimalkumar"
                        value={middleName}
                        onChange={(e) => setMiddleName(e.target.value)}
                        disabled={loading}
                      />
                    </div>
                    <div className={styles.formGroup} ref={lastNameRef}>
                      <label className={styles.label}>Last Name *</label>
                      <input
                        type="text"
                        className={`${styles.input} ${formError && !lastName.trim() ? styles.inputError : ""}`}
                        placeholder="e.g. Patel"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div className={styles.rowFieldContainer}>
                    <div className={styles.formGroup} ref={ageRef}>
                      <label className={styles.label}>Age *</label>
                      <input
                        type="number"
                        min="7"
                        max="14"
                        className={`${styles.input} ${formError && !age ? styles.inputError : ""}`}
                        placeholder="e.g. 11"
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        disabled={loading}
                      />
                    </div>
                    <div className={styles.formGroup} ref={genderRef}>
                      <label className={styles.label}>Mandal *</label>
                      <select
                        className={`${styles.select} ${formError && !gender ? styles.inputError : ""}`}
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                        disabled={loading}
                        required
                      >
                        <option value="" disabled hidden>
                          — Select Mandal —
                        </option>
                        <option value="Balak">Balak</option>
                        <option value="Balika">Balika</option>
                      </select>
                    </div>
                  </div>

                  <div className={styles.rowFieldContainer}>
                    <div className={styles.formGroup} ref={regionRef}>
                      <label className={styles.label}>Country *</label>
                      <div className={styles.searchDropdownContainer}>
                        <div
                          className={`${styles.customSelectTrigger} ${loading ? styles.triggerDisabled : ""} ${formError && !selectedRegion ? styles.inputError : ""}`}
                          onClick={() =>
                            !loading &&
                            setIsRegionDropdownOpen(!isRegionDropdownOpen)
                          }
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
                                onChange={(e) =>
                                  setRegionSearchQuery(e.target.value)
                                }
                                onClick={(e) => e.stopPropagation()}
                                autoFocus
                              />
                            </div>
                            <ul className={styles.dropdownListOptions}>
                              {filteredCountries.length > 0 ? (
                                filteredCountries.map((country) => {
                                  const isClosed =
                                    closedRegions.includes(country);

                                  return (
                                    <li
                                      key={country}
                                      className={`${styles.dropdownOptionItem} ${isClosed ? styles.itemDisabled : ""} ${selectedRegion === country ? styles.itemSelected : ""}`}
                                      onClick={() =>
                                        !isClosed &&
                                        handleSelectCountry(country)
                                      }
                                    >
                                      {country}
                                      {isClosed && (
                                        <span
                                          style={{
                                            marginLeft: "10px",
                                            fontSize: "10px",
                                            color: "#d93025",
                                            fontWeight: "bold",
                                          }}
                                        >
                                          REGISTRATION CLOSED - CONTACT YOUR
                                          NOC/NC
                                        </span>
                                      )}
                                    </li>
                                  );
                                })
                              ) : (
                                <li className={styles.noResultsFoundItem}>
                                  No matching countries found
                                </li>
                              )}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className={styles.formGroup} ref={centerRef}>
                      <label className={styles.label}>Center *</label>
                      <div className={styles.searchDropdownContainer}>
                        <div
                          className={`${styles.customSelectTrigger} ${!selectedRegion || loading ? styles.triggerDisabled : ""} ${formError && !selectedCenter ? styles.inputError : ""}`}
                          onClick={() =>
                            selectedRegion &&
                            !loading &&
                            setIsCenterDropdownOpen(!isCenterDropdownOpen)
                          }
                        >
                          <span>
                            {selectedCenter ||
                              (selectedRegion
                                ? "Select Center... *"
                                : "-- Choose Country First --")}
                          </span>
                          <FaChevronDown className={styles.arrowIcon} />
                        </div>
                        {isCenterDropdownOpen && selectedRegion && (
                          <div className={styles.dropdownOverlayMenu}>
                            <div className={styles.dropdownSearchHeader}>
                              <FaSearch className={styles.searchIconInline} />
                              <input
                                type="text"
                                className={styles.dropdownSearchInput}
                                placeholder="Search center..."
                                value={centerSearchQuery}
                                onChange={(e) =>
                                  setCenterSearchQuery(e.target.value)
                                }
                                onClick={(e) => e.stopPropagation()}
                                autoFocus
                              />
                            </div>
                            <ul className={styles.dropdownListOptions}>
                              {filteredCenters.length > 0 ? (
                                filteredCenters.map((co) => (
                                  <li
                                    key={co}
                                    className={`${styles.dropdownOptionItem} ${selectedCenter === co ? styles.itemSelected : ""}`}
                                    onClick={() => handleSelectCenter(co)}
                                  >
                                    {co}
                                  </li>
                                ))
                              ) : (
                                <li className={styles.noResultsFoundItem}>
                                  No matching centers found
                                </li>
                              )}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className={styles.rowFieldContainer}>
                    <div className={styles.formGroup} ref={phoneRef}>
                      <label className={styles.label}>
                        Parents Mobile Number *
                      </label>
                      <input
                        type="tel"
                        className={`${styles.input} ${formError && (!phoneNumber.trim() || phoneNumber.replace(/\s/g, "").substring(regionDataset[selectedRegion]?.code?.length || 0).length !== 9) ? styles.inputError : ""}`}
                        placeholder={
                          selectedRegion
                            ? `Enter 9 digits after ${regionDataset[selectedRegion]?.code}`
                            : "-- Choose Country First --"
                        }
                        value={phoneNumber}
                        onChange={handlePhoneChange}
                        disabled={loading || !selectedRegion}
                      />
                    </div>
                    <div className={styles.formGroup} ref={emailRef}>
                      <label className={styles.label}>
                        Parent's Email Address *
                      </label>
                      <input
                        type="email"
                        className={`${styles.input} ${formError && !parentEmail.trim() ? styles.inputError : ""}`}
                        placeholder="e.g. email@example.com"
                        value={parentEmail}
                        onChange={(e) => setParentEmail(e.target.value)}
                        disabled={loading}
                      />
                    </div>
                  </div>
                  {(selectedRegion === "Botswana" ||
                    selectedRegion === "South Africa" ||
                    selectedRegion === "Malawi" ||
                    selectedRegion === "Zambia" ||
                    selectedRegion === "Uganda") && (
                    <>
                      <div className={styles.rowFieldContainer} ref={shirtRef}>
                        <div className={styles.formGroup}>
                          <div className={styles.labelWithHelper}>
                            <label className={styles.label}>
                              T-Shirt Size *
                            </label>

                            {/* Sizing Info Helper (Visible only for Uganda) */}
                            {(selectedRegion === "Uganda" ||
                              selectedRegion === "South Africa") && (
                              <div className={styles.helperTooltipContainer}>
                                <button
                                  type="button"
                                  className={styles.helperBtn}
                                  onClick={() => setIsModalOpen(true)}
                                  aria-label="View T-shirt size chart"
                                >
                                  <span className={styles.infoIcon}>ℹ</span>{" "}
                                  View Size Chart
                                </button>
                                <div className={styles.tooltipText}>
                                  Click to open sizing guide image
                                </div>
                              </div>
                            )}
                          </div>

                          <select
                            className={`${styles.select} ${formError && !tshirtSize ? styles.inputError : ""}`}
                            value={tshirtSize}
                            onChange={(e) => setTshirtSize(e.target.value)}
                            disabled={loading}
                          >
                            <option value="">Select Size</option>
                            {/* Wrap the OR checks in parentheses to isolate them from any surrounding && logic */}
                            {selectedRegion === "Uganda" ||
                            selectedRegion === "South Africa" ? (
                              /* Custom Alphabetical Sizes */
                              <>
                                <option value="XXXS">XXXS - 57-62cm</option>
                                <option value="XXS">XXS - 62-67cm</option>
                                <option value="XS">XS - 67-72cm</option>
                                <option value="S">S - 72-75cm</option>
                                <option value="M">M - 77-82cm</option>
                                <option value="L">L - 82-88cm</option>
                                <option value="XL">XL - 88-93cm</option>
                                <option value="XXL">XXL - 93-98cm</option>
                                <option value="XXXL">XXXL - 98-103cm</option>
                              </>
                            ) : (
                              /* Classic Numeric Sizes */
                              <>
                                <option value="24">24</option>
                                <option value="26">26</option>
                                <option value="28">28</option>
                                <option value="30">30</option>
                                <option value="32">32</option>
                                <option value="34">34</option>
                                <option value="36">36</option>
                                <option value="38">38</option>
                                <option value="40">40</option>
                                <option value="42">42</option>
                              </>
                            )}
                          </select>
                        </div>
                      </div>

                      {/* Sizing Image Modal Popup */}
                      {isModalOpen && (
                        <div
                          className={styles.modalOverlay}
                          onClick={() => setIsModalOpen(false)}
                        >
                          <div
                            className={styles.modalContent}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className={styles.modalHeader}>
                              <h4 className={styles.modalTitle}>
                                {" "}
                                T-Shirt Size Guide
                              </h4>

                              <div className={styles.modalHeaderActions}>
                                {/* Download Button */}
                                <a
                                  href={shirtChartImg}
                                  download="TShirt_Size_Guide.png"
                                  className={styles.modalDownloadBtn}
                                  title="Download Sizing Chart"
                                >
                                  <FaCloudDownloadAlt />
                                  Download
                                </a>

                                <button
                                  type="button"
                                  className={styles.modalCloseBtn}
                                  onClick={() => setIsModalOpen(false)}
                                >
                                  &times;
                                </button>
                              </div>
                            </div>

                            {/* Zoom-on-mouse-move Container */}
                            <div
                              className={styles.modalImageContainer}
                              onMouseMove={(e) => {
                                const { left, top, width, height } =
                                  e.currentTarget.getBoundingClientRect();
                                const x = ((e.clientX - left) / width) * 100;
                                const y = ((e.clientY - top) / height) * 100;
                                e.currentTarget.style.setProperty(
                                  "--x",
                                  `${x}%`,
                                );
                                e.currentTarget.style.setProperty(
                                  "--y",
                                  `${y}%`,
                                );
                              }}
                            >
                              <img
                                src={shirtChartImg}
                                alt=" T-Shirt Sizing Grid Dimensions"
                                className={styles.chartImage}
                              />
                            </div>
                            <p className={styles.zoomHint}>
                              Move your mouse over the image to zoom in on
                              details
                            </p>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                  {selectedRegion === "Uganda" && (
                    <div className={styles.regionNoticeBox}>
                      <span className={styles.noticeTitle}>
                        For Uganda Parents
                      </span>
                      <p className={styles.noticeText}>
                        Kindly ensure that your Shibir registration fee of UGX
                        25,000 is submitted to the Accounts Department to
                        finalize your registration.
                      </p>
                    </div>
                  )}

                  {selectedRegion === "South Africa" && (
                    <div className={styles.regionNoticeBox}>
                      <span className={styles.noticeTitle}>
                        For South Africa Parents
                      </span>
                      <div className={styles.noticeText}>
                        <p style={{ marginBottom: "12px", fontWeight: "600" }}>
                          Kindly note the following key processing details to
                          finalize your registration:
                        </p>

                        <ol
                          style={{
                            paddingLeft: "20px",
                            margin: "0 0 12px 0",
                            lineHeight: "1.6",
                          }}
                        >
                          <li>
                            Cost of the Shibir is{" "}
                            <strong>R300 per Balak/Balika</strong>.
                          </li>
                          <li style={{ marginTop: "8px" }}>
                            EFT can be made into the following Account:
                            <ul
                              style={{
                                paddingLeft: "20px",
                                marginTop: "4px",
                                listStyleType: "disc",
                              }}
                            >
                              <li>
                                <strong>Account Name:</strong> BAPS Joburg
                              </li>
                              <li>
                                <strong>Account Number:</strong> 402131231
                              </li>
                              <li>
                                <strong>Bank:</strong> Standard Bank
                              </li>
                              <li>
                                <strong>Branch Code:</strong> 051001
                              </li>
                              <li>
                                <strong>Account Type:</strong> Current
                              </li>
                            </ul>
                          </li>
                          <li style={{ marginTop: "8px" }}>
                            Please send the Proof of Payment to{" "}
                            <strong>acct.za04@africa.baps.org</strong>
                          </li>
                          <li style={{ marginTop: "8px" }}>
                            Once registration is complete, parents will receive
                            an indemnity form from their local Sanchalak (this
                            form must be completed in order for registration to
                            be valid).
                          </li>
                        </ol>
                      </div>
                    </div>
                  )}
                  <div className={styles.termsSection} ref={termsRef}>
                    <div className={styles.checkboxWrapper}>
                      <label
                        className={styles.termsLabel}
                        style={{
                          color:
                            !acceptedTerms && formError ? "#d93025" : "#202124",
                          fontWeight:
                            !acceptedTerms && formError ? "bold" : "normal",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={acceptedTerms}
                          onChange={(e) => setAcceptedTerms(e.target.checked)}
                          disabled={loading}
                        />
                        <span>
                          I understand and accept the registration terms *
                        </span>
                      </label>
                    </div>
                    <div className={styles.termsDisplayBox}>
                      <p className={styles.termsHeading}>
                        Terms and Conditions:
                      </p>
                      <ul className={styles.termsList}>
                        <li>
                          Registration is open to children of ages 7 to 14.
                        </li>
                        <li>
                          All information provided must be accurate; incorrect
                          details may delay registration.
                        </li>
                        <li>
                          Your data is used solely for the Bal-Balika Shibir.
                        </li>
                        <li>
                          By registering, you consent to receive
                          communications/updates in regards to the Shibir.
                        </li>
                        <li>
                          By filling this form, you are allowing your child to
                          attend this event.
                        </li>
                        <li>
                          The organizers are not liable for any injuries,
                          damages, or losses incurred during the event.
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className={styles.submitBtn}
                  disabled={loading}
                >
                  <FaUserPlus style={{ color: "#1b1b1b" }} />
                  <span style={{ color: "#1b1b1b" }}>
                    Review Registration Details
                  </span>
                </button>
              </form>
            </>
          )}
          <div style={{ display: "none" }} ref={qrRef}>
            {generatedQRValue && (
              <QRCodeSVG
                value={generatedQRValue}
                size={256}
                level="H"
                includeMargin={true}
                fgColor="#000000"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
