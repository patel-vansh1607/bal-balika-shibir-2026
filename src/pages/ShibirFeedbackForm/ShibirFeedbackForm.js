import React, { useState, useEffect, useRef } from "react";
import {
  FaStar,
  FaChevronDown,
  FaMagnifyingGlass,
  FaPaperPlane,
  FaVideo,
  FaTrash,
  FaUserCheck,
  FaImage,
  FaXmark,
} from "react-icons/fa6";
import { feedback as feedbackApi } from "../../apiClient";
import styles from "./ShibirFeedbackForm.module.css";

import logo from "../../assets/images/Making the Right Choices - Logo_ColorScalable.svg";
import rightchampion from "../../assets/images/Trophy Design-01.png";

const regionDataset = {
  Kenya: [
    "Nairobi", "Mombasa", "Kisumu", "Nakuru", "Eldoret", "Thika", "Malindi",
    "Kericho", "Kakamega", "Nyeri", "Machakos", "Meru", "Kitale", "Garissa",
    "Voi", "Naivasha", "Narok", "Embu", "Lamu", "Nanyuki", "Athi River",
    "Nyahururu", "Bomet", "Busia", "Homabay", "Kisii", "Bungoma"
  ],
  Tanzania: [
    "Akshardham", "Dar es Salaam", "Arusha", "Mwanza", "Zanzibar City",
    "Dodoma", "Moshi", "Tanga", "Morogoro", "Mbeya", "Iringa", "Kigoma",
    "Songea", "Tabora", "Musoma", "Shinyanga", "Sumbawanga", "Lindi", "Singida", "Bukoba"
  ],
  // Uganda: [
  //   "Kampala", "Entebbe", "Jinja", "Rwanda", "Mbarara", "Gulu", "Mbale",
  //   "Masaka", "Arua", "Lira", "Fort Portal", "Kabale", "Tororo", "Soroti",
  //   "Mukono", "Hoima", "Kasese", "Busia", "Iganga", "Wakiso", "Mityana",
  //   "Mubende", "Luwero", "Kyenjojo", "Masindi", "Kitgum"
  // ],
  // Zambia: [
  //   "Lusaka", "Kitwe", "Ndola", "Livingstone", "Kabwe", "Chingola", "Mufulira",
  //   "Luanshya", "Kasama", "Chipata", "Chinsali", "Mansa", "Solwezi", "Mongu",
  //   "Mazabuka", "Monze", "Choma", "Kapiri Mposhi"
  // ],
  // Malawi: [
  //   "Lilongwe", "Blantyre", "Mzuzu", "Zomba", "Kasungu", "Mangochi", "Karonga",
  //   "Salima", "Nkhotakota", "Liwonde", "Balaka", "Luchenza", "Dedza", "Mchinji",
  //   "Chikwawa", "Nsanje", "Rumphi"
  // ],
  // Botswana: [
  //   "Gaborone", "Francistown", "Molepolole", "Maun", "Mogoditshane", "Serowe",
  //   "Selebi-Phikwe", "Kanye", "Lobatse", "Palapye", "Mahalapye", "Mochudi",
  //   "Ghanzi", "Kasane", "Orapa", "Jwaneng", "Sowa"
  // ],
  // "South Africa": [
  //   "Benoni", "Cape Town", "Germiston", "Laudium", "Lenasia", "Louis Trichardt",
  //   "Mayfair", "Mogwase", "Rustenburg", "Tzaneen", "Northriding", "Durban"
  // ]
};

const COUNTRIES = Object.keys(regionDataset);

export default function ShibirFeedbackForm({ onSubmitSuccess }) {
  const [showStinger, setShowStinger] = useState(true);
  const [isMorphing, setIsMorphing] = useState(false);

  const [form, setForm] = useState({
    category: "Balak/Balika",
    country: "",
    center: "",
    fullName: "",
    response: "",
    rating: 0,
  });

  const [attendeeList, setAttendeeList] = useState([]);
  const [loadingAttendees, setLoadingAttendees] = useState(false);

  const [photoFiles, setPhotoFiles] = useState([]);
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState([]);
  const [videoFile, setVideoFile] = useState(null);
  const [hoverRating, setHoverRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const [videoUploadStatus, setVideoUploadStatus] = useState(null);
  const [videoUploadProgress, setVideoUploadProgress] = useState(0);
  const [videoUploadError, setVideoUploadError] = useState("");
  const [photoUploadStatus, setPhotoUploadStatus] = useState(null);
  const [photoUploadProgress, setPhotoUploadProgress] = useState(0);
  const [photoUploadError, setPhotoUploadError] = useState("");
  const [pendingRecordId, setPendingRecordId] = useState(null);
  const pendingVideoFile = useRef(null);
  const pendingPhotoFiles = useRef([]);

  const [countrySearch, setCountrySearch] = useState("");
  const [showCountryList, setShowCountryList] = useState(false);
  const [centerSearch, setCenterSearch] = useState("");
  const [showCenterList, setShowCenterList] = useState(false);
  const [nameSearch, setNameSearch] = useState("");
  const [showNameList, setShowNameList] = useState(false);

  const countryRef = useRef(null);
  const centerRef = useRef(null);
  const nameRef = useRef(null);
  const photoInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    const urls = photoFiles.map((f) => URL.createObjectURL(f));
    setPhotoPreviewUrls(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [photoFiles]);

  useEffect(() => {
    const audioEl = audioRef.current;
    if (audioEl) {
      audioEl.volume = 0.5;
      const playPromise = audioEl.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.log("Autoplay prevented by browser. Audio will start on user interaction:", err);
          const handleFirstInteraction = () => {
            if (audioRef.current) audioRef.current.play();
            document.removeEventListener("click", handleFirstInteraction);
            document.removeEventListener("touchstart", handleFirstInteraction);
          };
          document.addEventListener("click", handleFirstInteraction);
          document.addEventListener("touchstart", handleFirstInteraction);
        });
      }
    }

    const handleVisibilityChange = () => {
      if (!audioRef.current) return;
      if (document.hidden) {
        let vol = audioRef.current.volume;
        const fadeInterval = setInterval(() => {
          if (vol > 0.05) {
            vol -= 0.05;
            try { audioRef.current.volume = Math.max(0, vol); } catch (e) {}
          } else {
            clearInterval(fadeInterval);
            audioRef.current.pause();
          }
        }, 30);
      } else {
        audioRef.current.volume = 0.5;
        audioRef.current.play().catch(() => {});
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    const morphTimer = setTimeout(() => {
      setIsMorphing(true);
    }, 7000);

    const removeTimer = setTimeout(() => {
      setShowStinger(false);
    }, 2800);

    return () => {
      clearTimeout(morphTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  useEffect(() => {
    async function fetchAttendees() {
      if (!form.country || !form.center) {
        setAttendeeList([]);
        return;
      }

      setLoadingAttendees(true);
      try {
        const { data } = await feedbackApi.attendees(form.country, form.center);
        setAttendeeList(data || []);
      } catch (err) {
        console.error("Error fetching attendees:", err);
        setAttendeeList([]);
      } finally {
        setLoadingAttendees(false);
      }
    }

    fetchAttendees();
  }, [form.country, form.center]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (countryRef.current && !countryRef.current.contains(event.target)) {
        setShowCountryList(false);
      }
      if (centerRef.current && !centerRef.current.contains(event.target)) {
        setShowCenterList(false);
      }
      if (nameRef.current && !nameRef.current.contains(event.target)) {
        setShowNameList(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const availableCenters = form.country ? regionDataset[form.country] || [] : [];

  const filteredCountries = COUNTRIES.filter((c) =>
    c.toLowerCase().includes(countrySearch.toLowerCase())
  );

  const filteredCenters = availableCenters.filter((c) =>
    c.toLowerCase().includes(centerSearch.toLowerCase())
  );

  const filteredAttendees = attendeeList.filter((item) => {
    const matchesCategory = item.category?.toLowerCase() === form.category.toLowerCase();
    const matchesSearch = item.full_name?.toLowerCase().includes(nameSearch.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleCountrySelect = (country) => {
    setForm((f) => ({ ...f, country, center: "", fullName: "" }));
    setCountrySearch(country);
    setCenterSearch("");
    setNameSearch("");
    setShowCountryList(false);
  };

  const handleCenterSelect = (center) => {
    setForm((f) => ({ ...f, center, fullName: "" }));
    setCenterSearch(center);
    setNameSearch("");
    setShowCenterList(false);
  };

  const handleNameSelect = (fullName) => {
    setForm((f) => ({ ...f, fullName }));
    setNameSearch(fullName);
    setShowNameList(false);
  };

  const handlePhotosChange = (e) => {
    const newFiles = Array.from(e.target.files);
    e.target.value = "";
    const valid = newFiles.filter((f) => {
      if (!f.type.startsWith("image/")) { alert(`${f.name} is not an image.`); return false; }
      if (f.size > 20 * 1024 * 1024) { alert(`${f.name} exceeds 20MB limit.`); return false; }
      return true;
    });
    setPhotoFiles((prev) => [...prev, ...valid]);
  };

  const handleRemovePhoto = (idx) => {
    setPhotoFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleVideoChange = (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 100 * 1024 * 1024) { alert("Video must be under 100MB."); return; }
    setVideoFile(file);
  };

  const startVideoUpload = (recordId, file) => {
    setVideoUploadStatus("uploading");
    setVideoUploadProgress(0);
    setVideoUploadError("");
    feedbackApi.uploadVideoWithProgress(recordId, file, (pct) => {
      setVideoUploadProgress(pct);
    }).then(() => {
      setVideoUploadStatus("done");
      setVideoUploadProgress(100);
    }).catch((err) => {
      setVideoUploadStatus("failed");
      setVideoUploadError(err.message);
    });
  };

  const startPhotoUpload = (recordId, files) => {
    setPhotoUploadStatus("uploading");
    setPhotoUploadProgress(0);
    setPhotoUploadError("");
    feedbackApi.uploadPhotos(recordId, files, (pct) => {
      setPhotoUploadProgress(pct);
    }).then(() => {
      setPhotoUploadStatus("done");
      setPhotoUploadProgress(100);
    }).catch((err) => {
      setPhotoUploadStatus("failed");
      setPhotoUploadError(err.message);
    });
  };
// Background Audio Autoplay Handler across all browsers
  useEffect(() => {
    const audioEl = audioRef.current;
    if (!audioEl) return;

    audioEl.volume = 0.5;

    // Try playing immediately on load
    const playAudio = async () => {
      try {
        await audioEl.play();
      } catch (err) {
        console.log("Autoplay blocked by browser policy. Waiting for first interaction...");
        
        // Fallback: Play on the absolute first user interaction anywhere on the document
        const triggerPlay = () => {
          audioEl.play().catch((e) => console.log("Play failed on interaction:", e));
          document.removeEventListener("click", triggerPlay);
          document.removeEventListener("touchstart", triggerPlay);
          document.removeEventListener("keydown", triggerPlay);
        };

        document.addEventListener("click", triggerPlay, { once: true });
        document.addEventListener("touchstart", triggerPlay, { once: true });
        document.addEventListener("keydown", triggerPlay, { once: true });
      }
    };

    playAudio();

    const handleVisibilityChange = () => {
      if (!audioRef.current) return;
      if (document.hidden) {
        let vol = audioRef.current.volume;
        const fadeInterval = setInterval(() => {
          if (vol > 0.05) {
            vol -= 0.05;
            try { audioRef.current.volume = Math.max(0, vol); } catch (e) {}
          } else {
            clearInterval(fadeInterval);
            audioRef.current.pause();
          }
        }, 30);
      } else {
        audioRef.current.volume = 0.5;
        audioRef.current.play().catch(() => {});
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);
  const handleRetryVideoUpload = () => {
    if (!pendingRecordId || !pendingVideoFile.current) return;
    startVideoUpload(pendingRecordId, pendingVideoFile.current);
  };

  const handleRetryPhotoUpload = () => {
    if (!pendingRecordId || !pendingPhotoFiles.current.length) return;
    startPhotoUpload(pendingRecordId, pendingPhotoFiles.current);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.country) return alert("Please select a country.");
    if (!form.center) return alert("Please select a center.");
    if (!form.fullName.trim()) return alert("Please select or enter full name.");
    if (!form.response.trim()) return alert("Please write your response/feedback.");
    if (form.rating === 0) return alert("Please select a star rating.");
    if (!videoFile && photoFiles.length === 0) return alert("Please attach at least one photo or video.");

    setSubmitting(true);

    try {
      const fields = {
        full_name: form.fullName,
        country:   form.country,
        center:    form.center,
        category:  form.category,
        response:  form.response,
        rating:    form.rating,
        region:    form.country,
      };

      const result = await feedbackApi.create(fields);
      const recordId = result?.data?.id;

      setSubmitting(false);
      setSubmitted(true);
      if (onSubmitSuccess) onSubmitSuccess({ ...form });

      if (recordId) {
        setPendingRecordId(recordId);
        if (videoFile) {
          pendingVideoFile.current = videoFile;
          startVideoUpload(recordId, videoFile);
        }
        if (photoFiles.length > 0) {
          pendingPhotoFiles.current = photoFiles;
          startPhotoUpload(recordId, photoFiles);
        }
      }
    } catch (err) {
      console.error("Submission error:", err);
      alert("Failed to submit feedback: " + err.message);
      setSubmitting(false);
      setUploadStatus("");
    }
  };

  const handleReset = () => {
    setForm({
      category: "Balak/Balika",
      country: "",
      center: "",
      fullName: "",
      response: "",
      rating: 0,
    });
    setPhotoFiles([]);
    setVideoFile(null);
    setCountrySearch("");
    setCenterSearch("");
    setNameSearch("");
    setHoverRating(0);
    setSubmitted(false);
    setUploadStatus("");
    setVideoUploadStatus(null);
    setVideoUploadProgress(0);
    setVideoUploadError("");
    setPhotoUploadStatus(null);
    setPhotoUploadProgress(0);
    setPhotoUploadError("");
    setPendingRecordId(null);
    pendingVideoFile.current = null;
    pendingPhotoFiles.current = [];
  };

  return (
    <div className={styles.wrapper}>
      <audio
        ref={audioRef}
        src="https://res.cloudinary.com/dxgkcyfrl/video/upload/v1787062968/Theme_Song_Instrumental_flwmap.wav"
        loop
        preload="auto"
      />

      {showStinger && (
        <div
          className={`${styles.stingerContainer} ${
            isMorphing ? styles.stingerFadeOut : ""
          }`}
        >
          <div className={styles.stingerContent}>
            <img
              src={rightchampion}
              alt="Shibir Logo"
              className={`${styles.stingerLogo} ${
                isMorphing ? styles.stingerLogoMorph : ""
              }`}
            />
            <h1
              className={`${styles.stingerWelcomeText} ${
                isMorphing ? styles.stingerTextFade : ""
              }`}
            >
              Welcome, Right Choice Champion
            </h1>
            <div
              className={`${styles.stingerSpinner} ${
                isMorphing ? styles.stingerTextFade : ""
              }`}
            />
          </div>
        </div>
      )}
   {submitted ? (
        <div className={styles.card}>
          <div className={styles.successState}>
            <div className={styles.successIcon}>
              <FaStar />
            </div>

            {/* ONLY show Thank You and Submit Another once uploads are completely done or finished */}
            {((!videoUploadStatus || videoUploadStatus === "done" || videoUploadStatus === "failed") &&
              (!photoUploadStatus || photoUploadStatus === "done" || photoUploadStatus === "failed")) ? (
              <>
                <h2>Thank You!</h2>
                <p>Your feedback has been submitted successfully.</p>
              </>
            ) : (
              <>
                <h2>Processing Your Submission...</h2>
                <p>Please wait while your files are being uploaded. Do not close this page.</p>
              </>
            )}

            {videoUploadStatus && (
              <div className={styles.videoUploadStatus}>
                {videoUploadStatus === "uploading" && (
                  <>
                    <div className={styles.progressLabel}>
                      <span>Uploading video...</span>
                      <span>{videoUploadProgress}%</span>
                    </div>
                    <div className={styles.progressBar}>
                      <div className={styles.progressFill} style={{ width: `${videoUploadProgress}%` }} />
                    </div>
                  </>
                )}
                {videoUploadStatus === "done" && (
                  <div className={styles.videoUploadDone}>
                    ✓ Review uploaded successfully
                  </div>
                )}
                {videoUploadStatus === "failed" && (
                  <div className={styles.videoUploadFailed}>
                    <span className={styles.videoUploadFailedMsg}>Video upload failed: {videoUploadError}</span>
                    <button className={styles.retryBtn} onClick={handleRetryVideoUpload}>Retry Video</button>
                  </div>
                )}
              </div>
            )}

            {photoUploadStatus && (
              <div className={styles.videoUploadStatus}>
                {photoUploadStatus === "uploading" && (
                  <>
                    <div className={styles.progressLabel}>
                      <span>Uploading {pendingPhotoFiles.current?.length || 0} photo(s)...</span>
                      <span>{photoUploadProgress}%</span>
                    </div>
                    <div className={styles.progressBar}>
                      <div className={styles.progressFill} style={{ width: `${photoUploadProgress}%` }} />
                    </div>
                  </>
                )}
                {photoUploadStatus === "done" && (
                  <div className={styles.videoUploadDone}>
                    ✓ Review uploaded successfully
                  </div>
                )}
                {photoUploadStatus === "failed" && (
                  <div className={styles.videoUploadFailed}>
                    <span className={styles.videoUploadFailedMsg}>Photo upload failed: {photoUploadError}</span>
                    <button className={styles.retryBtn} onClick={handleRetryPhotoUpload}>Retry Photos</button>
                  </div>
                )}
              </div>
            )}

            {/* ONLY show the reset button once file uploads are fully done, failed, or inactive */}
            {((!videoUploadStatus || videoUploadStatus === "done" || videoUploadStatus === "failed") &&
              (!photoUploadStatus || photoUploadStatus === "done" || photoUploadStatus === "failed")) && (
              <button className={styles.submitBtn} onClick={handleReset} style={{ marginTop: "20px" }}>
                Submit Another Response
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className={styles.card}>
          <div className={styles.headerGroup}>
            <div className={styles.logoAndTitleInline}>
              <img
                src={logo}
                alt="Shibir Logo"
                className={`${styles.logoInline} ${
                  !showStinger ? styles.logoHeaderVisible : styles.logoHeaderHidden
                }`}
              />
              <div className={styles.titleTextGroup}>
                <h2 className={styles.title}>Making the Right Choices</h2>
                <p className={styles.titleSubtext}>Bal-Balika Shibir, Africa - 2026</p>
              </div>
            </div>
            <p className={styles.subtitle}>HOW RIGHT WAS YOUR CHOICE?</p>
          </div>

          <form onSubmit={handleSubmit} className={styles.formElement}>
            <div className={styles.formGroup}>
              <label className={styles.label}>
                I am a <span className={styles.required}>*</span>
              </label>
              <div style={{ display: "flex", gap: "1rem", marginTop: "0.25rem" }}>
                {["Balak/Balika", "Karyakar"].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, category: cat, fullName: "" }))}
                    style={{
                      flex: 1,
                      padding: "0.75rem",
                      borderRadius: "0.75rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      border: form.category === cat ? "2px solid #f59e0b" : "2px solid #e2e8f0",
                      background: form.category === cat ? "#fef3c7" : "#ffffff",
                      color: form.category === cat ? "#d97706" : "#64748b",
                      transition: "all 0.2s ease",
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            <hr className={styles.divider} />
            <div className={styles.formRow}>
              <div className={styles.formGroup} ref={countryRef}>
                <label className={styles.label}>
                  Country <span className={styles.required}>*</span>
                </label>
                <div className={styles.searchDropdownWrapper}>
                  <div className={styles.inputWithIcon}>
                    <FaMagnifyingGlass className={styles.searchFieldIcon} />
                    <input
                      type="text"
                      className={styles.input}
                      placeholder="Select Country..."
                      value={countrySearch}
                      onFocus={() => setShowCountryList(true)}
                      onChange={(e) => {
                        setCountrySearch(e.target.value);
                        setShowCountryList(true);
                      }}
                    />
                    <FaChevronDown
                      className={`${styles.chevronIcon} ${
                        showCountryList ? styles.rotateChevron : ""
                      }`}
                    />
                  </div>
                  {showCountryList && (
                    <ul className={styles.dropdownResultsList}>
                      {filteredCountries.length > 0 ? (
                        filteredCountries.map((c) => (
                          <li key={c} onClick={() => handleCountrySelect(c)}>
                            {c}
                          </li>
                        ))
                      ) : (
                        <li className={styles.noResults}>No country found</li>
                      )}
                    </ul>
                  )}
                </div>
              </div>

              <div className={styles.formGroup} ref={centerRef}>
                <label className={styles.label}>
                  Center <span className={styles.required}>*</span>
                </label>
                <div className={styles.searchDropdownWrapper}>
                  <div className={styles.inputWithIcon}>
                    <FaMagnifyingGlass className={styles.searchFieldIcon} />
                    <input
                      type="text"
                      className={styles.input}
                      placeholder={
                        form.country ? "Select Center..." : "Select Country First"
                      }
                      disabled={!form.country}
                      value={centerSearch}
                      onFocus={() => form.country && setShowCenterList(true)}
                      onChange={(e) => {
                        setCenterSearch(e.target.value);
                        setShowCenterList(true);
                      }}
                    />
                    <FaChevronDown
                      className={`${styles.chevronIcon} ${
                        showCenterList ? styles.rotateChevron : ""
                      }`}
                    />
                  </div>
                  {showCenterList && availableCenters.length > 0 && (
                    <ul className={styles.dropdownResultsList}>
                      {filteredCenters.length > 0 ? (
                        filteredCenters.map((c) => (
                          <li key={c} onClick={() => handleCenterSelect(c)}>
                            {c}
                          </li>
                        ))
                      ) : (
                        <li className={styles.noResults}>No center found</li>
                      )}
                    </ul>
                  )}
                </div>
              </div>
            </div>
            <hr className={styles.divider} />
            <div className={styles.formGroup} ref={nameRef}>
              <label className={styles.label}>
                {form.category} Full Name <span className={styles.required}>*</span>
              </label>
              <div className={styles.searchDropdownWrapper}>
                <div className={styles.inputWithIcon}>
                  <FaUserCheck className={styles.searchFieldIcon} />
                  <input
                    type="text"
                    className={styles.input}
                    placeholder={
                      !form.center
                        ? "Select Country & Center First..."
                        : loadingAttendees
                        ? "Loading attendees..."
                        : `Select your name from ${form.center}...`
                    }
                    disabled={!form.center || loadingAttendees}
                    value={nameSearch}
                    onFocus={() => form.center && setShowNameList(true)}
                    onChange={(e) => {
                      setNameSearch(e.target.value);
                      setShowNameList(true);
                    }}
                  />
                  <FaChevronDown
                    className={`${styles.chevronIcon} ${
                      showNameList ? styles.rotateChevron : ""
                    }`}
                  />
                </div>
                {showNameList && (
                  <ul className={styles.dropdownResultsList}>
                    {filteredAttendees.length > 0 ? (
                      filteredAttendees.map((att, idx) => (
                        <li
                          key={idx}
                          onClick={() => handleNameSelect(att.full_name)}
                        >
                          {att.full_name}
                        </li>
                      ))
                    ) : (
                      <li className={styles.noResults}>
                        {loadingAttendees
                          ? "Loading..."
                          : "No attendee found for this center/category"}
                      </li>
                    )}
                  </ul>
                )}
              </div>
            </div>
            <hr className={styles.divider} />
          <div className={styles.formGroup}>
              <label className={styles.label}>
                {form.category === "Balak/Balika" ? "My Shibir Story & Learnings" : "Karyakar Reflection & Experience"} <span className={styles.required}>*</span>
              </label>
              
              {form.category === "Balak/Balika" ? (
                <div className={styles.guideBox}>
                  <ul className={styles.guideList}>
                    <li>What was your absolute favorite moment, activity, or game at the Shibir?</li>
                    <li>What is the most valuable lesson, value, or advice you've carried back home?</li>
                    <li>How did this Shibir help you grow, make new friends, or learn something new?</li>
                    <li>If you had to describe your Shibir experience, what would it be?</li>
                  </ul>
                </div>
              ) : (
                <div className={styles.guideBox}>
                  <ul className={styles.guideList}>
                    <li>What experience from the shibir will help you plan your upcoming sabhas? </li>
                    <li>What’s something that you’d wish to change in the shibir setup? </li>
                    <li>What segment helped you as a karyakar the most to learn about the bal/balikas?</li>
                  </ul>
                </div>
              )}

              <textarea
                className={styles.textarea}
                rows={4}
                placeholder={
                  form.category === "Balak/Balika"
                    ? "Share your favourite moments, coolest activities, and what you learned from the Shibir!..."
                    : "Share your reflections and key takeaways..."
                }
                value={form.response}
                onChange={(e) =>
                  setForm((f) => ({ ...f, response: e.target.value }))
                }
              />
            </div>
            <hr className={styles.divider} />
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Photos &amp; Video <span className={styles.required}>*</span>
                <span className={styles.optionalTag}> — at least one required</span>
              </label>

              <div className={styles.guideBox}>
                <ul className={styles.guideList}>
                  <li>Upload photos from the Shibir — photobooth, group shots, notes, artwork.</li>
                  <li>Record a quick 30–60 second video sharing your favorite highlight!</li>
                </ul>
              </div>

              <input type="file" ref={photoInputRef} accept="image/*" multiple className={styles.fileInputHidden} onChange={handlePhotosChange} />
              <input type="file" ref={videoInputRef} accept="video/*" className={styles.fileInputHidden} onChange={handleVideoChange} />

              <div className={styles.mediaButtons}>
                <button type="button" className={styles.mediaAddBtn} onClick={() => photoInputRef.current?.click()}>
                  <FaImage /> Add Photos
                </button>
                <button type="button" className={`${styles.mediaAddBtn} ${videoFile ? styles.mediaAddBtnActive : ""}`} onClick={() => videoInputRef.current?.click()}>
                  <FaVideo /> {videoFile ? "Change Video" : "Add Video"}
                </button>
              </div>

              {photoPreviewUrls.length > 0 && (
                <div className={styles.photoGrid}>
                  {photoPreviewUrls.map((url, i) => (
                    <div key={i} className={styles.photoThumb}>
                      <img src={url} alt={`Submission ${i + 1}`} className={styles.photoThumbImg} />
                      <button type="button" className={styles.removeThumbBtn} onClick={() => handleRemovePhoto(i)} title="Remove">
                        <FaXmark />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {videoFile && (
                <div className={styles.filePreviewCard}>
                  <div className={styles.filePreviewInfo}>
                    <FaVideo className={styles.fileIcon} />
                    <span className={styles.fileName}>{videoFile.name}</span>
                    <span className={styles.fileSize}>({(videoFile.size / (1024 * 1024)).toFixed(1)} MB)</span>
                  </div>
                  <button type="button" className={styles.removeFileBtn} onClick={() => setVideoFile(null)} title="Remove video">
                    <FaTrash />
                  </button>
                </div>
              )}

              {!videoFile && photoFiles.length === 0 && (
                <p className={styles.mediaHint}>Add at least one photo or video to continue.</p>
              )}
            </div>
            <hr className={styles.divider} />
            <div
              className={styles.ratingCardGroup}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.85rem",
                padding: "1.25rem 1.5rem",
                borderRadius: "1.25rem",
                background: "linear-gradient(145deg, #ffffff, #f8fafc)",
                border:
                  (hoverRating || form.rating) > 0
                    ? "2px solid #f59e0b"
                    : "2px solid #e2e8f0",
                boxShadow:
                  (hoverRating || form.rating) > 0
                    ? "0 10px 25px -5px rgba(245, 158, 11, 0.25), 0 8px 10px -6px rgba(245, 158, 11, 0.1)"
                    : "0 4px 12px rgba(0, 0, 0, 0.03)",
                transition: "all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)",
              }}
            >
              <label
                className={styles.label}
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
              >
                <span>
                  How Right Was This Choice? <span className={styles.required}>*</span>
                </span>
                {(hoverRating || form.rating) > 0 ? (
                  <span
                    style={{
                      fontSize: "0.85rem",
                      fontWeight: 800,
                      color: "#d97706",
                      backgroundColor: "#fef3c7",
                      padding: "0.2rem 0.65rem",
                      borderRadius: "1rem",
                    }}
                  >
                    {hoverRating || form.rating} / 5
                  </span>
                ) : (
                  <span
                    style={{
                      fontSize: "0.85rem",
                      fontWeight: 700,
                      color: "#94a3b8",
                      backgroundColor: "#f1f5f9",
                      padding: "0.2rem 0.65rem",
                      borderRadius: "1rem",
                    }}
                  >
                    0 / 5
                  </span>
                )}
              </label>

              <div
                className={styles.starRatingContainer}
                onMouseLeave={() => setHoverRating(0)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "0.75rem",
                  background: "transparent",
                  border: "none",
                  padding: 0,
                }}
              >
                <div
                  className={styles.starsWrapper}
                  style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
                >
                  {[1, 2, 3, 4, 5].map((star) => {
                    const activeValue =
                      hoverRating !== 0 ? hoverRating : form.rating || 0;
                    const isActive = star <= activeValue;
                    const isHovered = hoverRating === star;

                    return (
                      <button
                        key={star}
                        type="button"
                        className={`${styles.starBtn} ${
                          isActive ? styles.starActive : ""
                        }`}
                        onClick={() => setForm((f) => ({ ...f, rating: star }))}
                        onMouseEnter={() => setHoverRating(star)}
                        style={{
                          background: "transparent",
                          border: "none",
                          cursor: "pointer",
                          padding: "0.25rem",
                          fontSize: "2.2rem",
                          color: isActive ? "#f59e0b" : "#cbd5e1",
                          filter: isActive
                            ? "drop-shadow(0 0 10px rgba(245, 158, 11, 0.7))"
                            : "none",
                          transform: isHovered
                            ? "scale(1.35) rotate(-8deg)"
                            : isActive
                            ? "scale(1.1)"
                            : "scale(1)",
                          transition:
                            "transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), color 0.2s ease, filter 0.2s ease",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          outline: "none",
                        }}
                      >
                        <FaStar style={{ pointerEvents: "none" }} />
                      </button>
                    );
                  })}
                </div>

                <span
                  className={styles.ratingText}
                  style={{
                    fontSize: "0.88rem",
                    fontWeight: 700,
                    padding: "0.45rem 0.95rem",
                    borderRadius: "2rem",
                    background:
                      (hoverRating || form.rating) > 0
                        ? "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
                        : "#f1f5f9",
                    color:
                      (hoverRating || form.rating) > 0 ? "#ffffff" : "#94a3b8",
                    boxShadow:
                      (hoverRating || form.rating) > 0
                        ? "0 4px 12px rgba(245, 158, 11, 0.35)"
                        : "none",
                    transition: "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
                  }}
                >
                  {(hoverRating || form.rating) === 1 && "Needs Course Correction 🧭"}
                  {(hoverRating || form.rating) === 2 && "Getting There... 💡"}
                  {(hoverRating || form.rating) === 3 && "Solid Choice! 👍"}
                  {(hoverRating || form.rating) === 4 && "Wise Move! ⚡"}
                  {(hoverRating || form.rating) === 5 && "The Best Choice Ever! 🏆"}
                  {!(hoverRating || form.rating) && "Select Your Choice"}
                </span>
              </div>
            </div>

            <button
              type="submit"
              className={styles.submitBtn}
              disabled={submitting}
            >
              {submitting ? (
                <div className={styles.btnLoadingState}>
                  <div className={styles.spinner} />
                  <span>{uploadStatus || "Submitting..."}</span>
                </div>
              ) : (
                <>
                  <FaPaperPlane className={styles.btnIcon} /> Submit Feedback
                </>
              )}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
