import React, { useState, useEffect, useRef } from "react";
import { FaStar, FaChevronDown, FaMagnifyingGlass, FaPaperPlane } from "react-icons/fa6";
import styles from "./ShibirFeedbackForm.module.css";

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
  Uganda: [
    "Kampala", "Entebbe", "Jinja", "Rwanda", "Mbarara", "Gulu", "Mbale",
    "Masaka", "Arua", "Lira", "Fort Portal", "Kabale", "Tororo", "Soroti",
    "Mukono", "Hoima", "Kasese", "Busia", "Iganga", "Wakiso", "Mityana",
    "Mubende", "Luwero", "Kyenjojo", "Masindi", "Kitgum"
  ],
  Zambia: [
    "Lusaka", "Kitwe", "Ndola", "Livingstone", "Kabwe", "Chingola", "Mufulira",
    "Luanshya", "Kasama", "Chipata", "Chinsali", "Mansa", "Solwezi", "Mongu",
    "Mazabuka", "Monze", "Choma", "Kapiri Mposhi"
  ],
  Malawi: [
    "Lilongwe", "Blantyre", "Mzuzu", "Zomba", "Kasungu", "Mangochi", "Karonga",
    "Salima", "Nkhotakota", "Liwonde", "Balaka", "Luchenza", "Dedza", "Mchinji",
    "Chikwawa", "Nsanje", "Rumphi"
  ],
  Botswana: [
    "Gaborone", "Francistown", "Molepolole", "Maun", "Mogoditshane", "Serowe",
    "Selebi-Phikwe", "Kanye", "Lobatse", "Palapye", "Mahalapye", "Mochudi",
    "Ghanzi", "Kasane", "Orapa", "Jwaneng", "Sowa"
  ],
  "South Africa": [
    "Benoni", "Cape Town", "Germiston", "Laudium", "Lenasia", "Louis Trichardt",
    "Mayfair", "Mogwase", "Rustenburg", "Tzaneen", "Northriding", "Durban"
  ]
};

const COUNTRIES = Object.keys(regionDataset);

export default function ShibirFeedbackForm({ onSubmitSuccess }) {
  const [form, setForm] = useState({
    country: "",
    center: "",
    fullName: "",
    response: "",
    rating: 0,
  });

  const [hoverRating, setHoverRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Searchable dropdown states
  const [countrySearch, setCountrySearch] = useState("");
  const [showCountryList, setShowCountryList] = useState(false);
  const [centerSearch, setCenterSearch] = useState("");
  const [showCenterList, setShowCenterList] = useState(false);

  const countryRef = useRef(null);
  const centerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (countryRef.current && !countryRef.current.contains(event.target)) {
        setShowCountryList(false);
      }
      if (centerRef.current && !centerRef.current.contains(event.target)) {
        setShowCenterList(false);
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

  const handleCountrySelect = (country) => {
    setForm((f) => ({ ...f, country, center: "" }));
    setCountrySearch(country);
    setCenterSearch("");
    setShowCountryList(false);
  };

  const handleCenterSelect = (center) => {
    setForm((f) => ({ ...f, center }));
    setCenterSearch(center);
    setShowCenterList(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.country) return alert("Please select a country.");
    if (!form.center) return alert("Please select a center.");
    if (!form.fullName.trim()) return alert("Please enter your full name.");
    if (!form.response.trim()) return alert("Please write your response/feedback.");
    if (form.rating === 0) return alert("Please select a star rating.");

    setSubmitting(true);

    try {
      // API call to store feedback
      const payload = {
        country: form.country,
        center: form.center,
        full_name: form.fullName.trim(),
        response: form.response.trim(),
        rating: form.rating,
        submitted_at: new Date().toISOString(),
      };

      // Replace with your actual API endpoint e.g., await forumApi.submitFeedback(payload)
      console.log("Submitting Feedback:", payload);

      setSubmitting(false);
      setSubmitted(true);

      if (onSubmitSuccess) onSubmitSuccess(payload);
    } catch (err) {
      console.error("Submission failed:", err);
      alert("Failed to submit feedback. Please try again.");
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setForm({
      country: "",
      center: "",
      fullName: "",
      response: "",
      rating: 0,
    });
    setCountrySearch("");
    setCenterSearch("");
    setHoverRating(0);
    setSubmitted(false);
  };

  if (submitted) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.card}>
          <div className={styles.successState}>
            <div className={styles.successIcon}>
              <FaStar />
            </div>
            <h2>Thank You!</h2>
            <p>Your feedback has been submitted successfully.</p>
            <button className={styles.submitBtn} onClick={handleReset}>
              Submit Another Response
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <div className={styles.headerGroup}>
          <h2 className={styles.title}>Shibir Forum Update</h2>
          <p className={styles.subtitle}>
            Please share your feedback and experience regarding the shibir.
          </p>
        </div>

        <form onSubmit={handleSubmit} className={styles.formElement}>
          {/* Country & Center Row */}
          <div className={styles.formRow}>
            {/* Country Dropdown */}
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
                    className={`${styles.chevronIcon} ${showCountryList ? styles.rotateChevron : ""}`}
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

            {/* Center Dropdown */}
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
                    className={`${styles.chevronIcon} ${showCenterList ? styles.rotateChevron : ""}`}
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

          {/* Full Name */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              Full Name <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              className={styles.input}
              placeholder="e.g. Jayesh Patel"
              value={form.fullName}
              onChange={(e) =>
                setForm((f) => ({ ...f, fullName: e.target.value }))
              }
            />
          </div>

          {/* Response / Feedback Text area */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              Response / Feedback <span className={styles.required}>*</span>
            </label>
            <textarea
              className={styles.textarea}
              rows={4}
              placeholder="Write your feedback, experiences, or recommendations..."
              value={form.response}
              onChange={(e) =>
                setForm((f) => ({ ...f, response: e.target.value }))
              }
            />
          </div>

          {/* Rating (out of 5 stars) */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              Rating <span className={styles.required}>*</span>
            </label>
            <div className={styles.starRatingContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className={`${styles.starBtn} ${
                    star <= (hoverRating || form.rating) ? styles.starActive : ""
                  }`}
                  onClick={() => setForm((f) => ({ ...f, rating: star }))}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                >
                  <FaStar />
                </button>
              ))}
              <span className={styles.ratingText}>
                {form.rating > 0 ? `${form.rating} / 5 Stars` : "Select Rating"}
              </span>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className={styles.submitBtn}
            disabled={submitting}
          >
            {submitting ? (
              <div className={styles.btnLoadingState}>
                <div className={styles.spinner} /> Submitting...
              </div>
            ) : (
              <>
                <FaPaperPlane className={styles.btnIcon} /> Submit Feedback
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}