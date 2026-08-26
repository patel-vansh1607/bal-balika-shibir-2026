import React, { useState, useEffect, useRef } from "react";
import styles from "./SystemFeedback.module.css";
import logo from "../../assets/images/Making the Right Choices - Logo_ColorScalable.svg";
import { supabase } from "../../supabaseClient";

export default function SystemFeedback() {
  const [authorizedUsers, setAuthorizedUsers] = useState([]);
  const [submittedEmails, setSubmittedEmails] = useState([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  // Toast & Error state
  const [toastMessage, setToastMessage] = useState("");
  const [errorField, setErrorField] = useState(null);

  const fieldRefs = {
    userSelect: useRef(null),
    q1: useRef(null), q2: useRef(null), q3: useRef(null),
    q4: useRef(null), q5: useRef(null), q6: useRef(null),
    q7: useRef(null), q8: useRef(null), q9: useRef(null),
    q10: useRef(null), q11: useRef(null), feedbackText: useRef(null)
  };

  const [formData, setFormData] = useState({
    q1: null, q2: null, q3: null, q4: null, q5: null,
    q6: null, q7: null, q8: null, q9: null, q10: null,
    q11: null,
    feedbackText: ""
  });

  // Fetch authorized users and submitted emails on mount
  useEffect(() => {
    async function fetchData() {
      try {
        const { data: usersData, error: usersError } = await supabase
          .from("authorized_users")
          .select("id, name, email")
          .order("name", { ascending: true });

        if (usersError) console.error("Error fetching users:", usersError.message);
        else setAuthorizedUsers(usersData || []);

        const { data: subData, error: subError } = await supabase
          .from("system_feedbacks")
          .select("user_email");

        if (subError) {
          console.error("Error fetching submissions:", subError.message);
        } else if (subData) {
          setSubmittedEmails(subData.map((s) => s.user_email));
        }
      } catch (err) {
        console.error("Unexpected error:", err);
      } finally {
        setLoadingUsers(false);
      }
    }
    fetchData();
  }, []);

  // Filter out users who have already submitted from the dropdown list
  const availableUsers = authorizedUsers.filter(
    (user) => !submittedEmails.includes(user.email)
  );

  const handleUserChange = (e) => {
    setSelectedUser(e.target.value);
    setErrorField(null);
    setToastMessage("");
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage("");
    }, 5000);
  };

  const ratingOptions = [
    { value: 1, label: "Poor" },
    { value: 2, label: "Fair" },
    { value: 3, label: "Good" },
    { value: 4, label: "Very Good" },
    { value: 5, label: "Excellent" }
  ];

  const agreeOptions = [
    { value: 1, label: "Strongly Disagree" },
    { value: 2, label: "Disagree" },
    { value: 3, label: "Neutral" },
    { value: 4, label: "Agree" },
    { value: 5, label: "Strongly Agree" }
  ];

  const freqOptions = [
    { value: 1, label: "Never" },
    { value: 2, label: "Rarely" },
    { value: 3, label: "Sometimes" },
    { value: 4, label: "Often" },
    { value: 5, label: "Always" }
  ];

  const handleSelect = (questionKey, value) => {
    setFormData((prev) => ({ ...prev, [questionKey]: value }));
    if (errorField === questionKey) {
      setErrorField(null);
      setToastMessage("");
    }
  };

  const scrollToField = (key) => {
    if (fieldRefs[key] && fieldRefs[key].current) {
      fieldRefs[key].current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedUser) {
      setErrorField("userSelect");
      showToast("Please select your name from the dropdown.");
      scrollToField("userSelect");
      return;
    }

    // Double-check just in case they were filtered out or already submitted
    if (submittedEmails.includes(selectedUser)) {
      showToast("Access restricted: You have already submitted feedback.");
      return;
    }

    // Validate all questions are answered
    for (let i = 1; i <= 11; i++) {
      const qKey = `q${i}`;
      if (formData[qKey] === null) {
        setErrorField(qKey);
        showToast(`Question ${i} is required. Please provide a rating.`);
        scrollToField(qKey);
        return;
      }
    }

    // Validate open feedback box
    if (!formData.feedbackText.trim()) {
      setErrorField("feedbackText");
      showToast("Please provide your open feedback/suggestions in question 12.");
      scrollToField("feedbackText");
      return;
    }

    const currentUser = authorizedUsers.find((u) => u.email === selectedUser);
    if (!currentUser) {
      showToast("Invalid user selection.");
      return;
    }

    setSubmitting(true);

    // FIX APPLIED HERE: Mapped feedbackText to feedback_text to match database schema
    const payload = {
      user_name: currentUser.name,
      user_email: currentUser.email,
      q1: formData.q1,
      q2: formData.q2,
      q3: formData.q3,
      q4: formData.q4,
      q5: formData.q5,
      q6: formData.q6,
      q7: formData.q7,
      q8: formData.q8,
      q9: formData.q9,
      q10: formData.q10,
      q11: formData.q11,
      feedback_text: formData.feedbackText
    };

    try {
      const { error } = await supabase.from("system_feedbacks").insert([payload]);

      if (error) {
        if (error.code === "23505") {
          showToast("You have already submitted your feedback.");
        } else {
          console.error("Submission Error:", error.message);
          showToast("Failed to submit feedback. Please try again.");
        }
      } else {
        setSubmitted(true);
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      showToast("An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.card} style={{ textAlign: "center" }}>
          <h2 className={styles.title}>Thank You!</h2>
          <p className={styles.subtitle} style={{ marginTop: "16px" }}>Your system feedback has been successfully recorded.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      {toastMessage && (
        <div className={styles.toastNotification}>
          <span>⚠️ {toastMessage}</span>
        </div>
      )}

      <div className={styles.card}>
        <div className={styles.headerGroup}>
          <div className={styles.logoAndTitleInline}>
            <img src={logo} alt="Shibir Logo" className={styles.logoInline} />
            <div className={styles.titleTextGroup}>
              <h2 className={styles.title}>Making the Right Choices</h2>
              <p className={styles.titleSubtext}>Bal-Balika Shibir, Africa - 2026</p>
            </div>
          </div>
          <p className={styles.subtitle}>PORTAL FEEDBACK</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.formContainer}>

          {/* USER SELECTION DROPDOWN */}
          <div className={styles.questionSection} ref={fieldRefs.userSelect}>
            <label className={styles.questionTitle} htmlFor="userSelect">
              Select Your Name:
            </label>
            <select
              id="userSelect"
              className={`${styles.selectDropdown} ${errorField === "userSelect" ? styles.errorHighlight : ""}`}
              value={selectedUser}
              onChange={handleUserChange}
              disabled={loadingUsers}
              required
            >
              <option value="" disabled>
                {loadingUsers ? "Loading authorized users..." : "-- Choose your name --"}
              </option>
              {availableUsers.map((user, index) => (
                <option key={user.id} value={user.email}>
                  {index + 1}. {user.name} ({user.email})
                </option>
              ))}
            </select>
          </div>

          {/* INTERFACE & NAVIGATION */}
          <div className={styles.sectionHeader}>Interface & Navigation</div>
          <div ref={fieldRefs.q1}><QuestionBlock number="1" title="How clean, professional, and visually appealing was the overall website design?" options={ratingOptions} selectedValue={formData.q1} onSelect={(val) => handleSelect("q1", val)} styles={styles} isError={errorField === "q1"} /></div>
          <div ref={fieldRefs.q2}><QuestionBlock number="2" title="How intuitive was the navigation structure in helping you find pages or menus quickly?" options={ratingOptions} selectedValue={formData.q2} onSelect={(val) => handleSelect("q2", val)} styles={styles} isError={errorField === "q2"} /></div>
          <div ref={fieldRefs.q3}><QuestionBlock number="3" title="How responsive and smooth was the system performance on your browser?" options={ratingOptions} selectedValue={formData.q3} onSelect={(val) => handleSelect("q3", val)} styles={styles} isError={errorField === "q3"} /></div>

          {/* REGISTRATION & ROSTER */}
          <div className={styles.sectionHeader}>Registration & Roster Management</div>
          <div ref={fieldRefs.q4}><QuestionBlock number="4" title="How smooth and straightforward was the online registration process for Balaks/Balikas?" options={ratingOptions} selectedValue={formData.q4} onSelect={(val) => handleSelect("q4", val)} styles={styles} isError={errorField === "q4"} /></div>
          <div ref={fieldRefs.q5}><QuestionBlock number="5" title="How clear and prompt were the automated confirmation details and QR passes sent out?" options={ratingOptions} selectedValue={formData.q5} onSelect={(val) => handleSelect("q5", val)} styles={styles} isError={errorField === "q5"} /></div>
          <div ref={fieldRefs.q6}><QuestionBlock number="6" title="How efficiently did the Registered Roster and duplicate management tools handle attendee data?" options={ratingOptions} selectedValue={formData.q6} onSelect={(val) => handleSelect("q6", val)} styles={styles} isError={errorField === "q6"} /></div>

          {/* SESSION SCANNING & ATTENDANCE */}
          <div className={styles.sectionHeader}>Session Scanning & Attendance</div>
          <div ref={fieldRefs.q7}><QuestionBlock number="7" title="How fast and responsive was the QR code camera scanner when checking attendees into sessions?" options={ratingOptions} selectedValue={formData.q7} onSelect={(val) => handleSelect("q7", val)} styles={styles} isError={errorField === "q7"} /></div>
          <div ref={fieldRefs.q8}><QuestionBlock number="8" title="Did you experience any freezing, lag, or scanning errors during peak entry rushes?" options={freqOptions} selectedValue={formData.q8} onSelect={(val) => handleSelect("q8", val)} styles={styles} isError={errorField === "q8"} /></div>
          <div ref={fieldRefs.q9}><QuestionBlock number="9" title="How easy was it to manage multiple session timings and track live headcounts using the Session Master?" options={ratingOptions} selectedValue={formData.q9} onSelect={(val) => handleSelect("q9", val)} styles={styles} isError={errorField === "q9"} /></div>
          <div ref={fieldRefs.q10}><QuestionBlock number="10" title="How reliable was the system in preventing duplicate or invalid scans at session entrances?" options={agreeOptions} selectedValue={formData.q10} onSelect={(val) => handleSelect("q10", val)} styles={styles} isError={errorField === "q10"} /></div>
          <div ref={fieldRefs.q11}><QuestionBlock number="11" title="Overall, how effectively did this digital system replace traditional paperwork and streamline operations?" options={agreeOptions} selectedValue={formData.q11} onSelect={(val) => handleSelect("q11", val)} styles={styles} isError={errorField === "q11"} /></div>
          
          {/* OPEN FEEDBACK */}
          <div className={styles.questionSection} ref={fieldRefs.feedbackText}>
            <h3 className={styles.questionTitle}>
              12. What specific technical features, performance fixes, or UI changes should be added for future shibirs?
            </h3>
            <textarea
              className={`${styles.textArea} ${errorField === "feedbackText" ? styles.errorHighlight : ""}`}
              placeholder="Describe any bugs encountered, feature requests, or suggestions for improvement..."
              value={formData.feedbackText}
              onChange={(e) => {
                setFormData({ ...formData, feedbackText: e.target.value });
                if (errorField === "feedbackText") setErrorField(null);
              }}
              rows={4}
            />
          </div>

          <button type="submit" className={styles.submitBtn} disabled={submitting}>
            {submitting ? "Submitting..." : "Submit System Feedback"}
          </button>
        </form>
      </div>
    </div>
  );
}

function QuestionBlock({ number, title, options, selectedValue, onSelect, styles, isError }) {
  return (
    <div className={`${styles.questionSection} ${isError ? styles.questionErrorBox : ""}`}>
      <h3 className={styles.questionTitle}>
        {number}. {title}
      </h3>
      <div className={styles.optionsRow}>
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={`${styles.optionBtn} ${
              selectedValue === opt.value ? styles.optionBtnSelected : ""
            }`}
            onClick={() => onSelect(opt.value)}
          >
            <span className={styles.optionNumber}>{opt.value}</span>
            <span className={styles.optionLabel}>{opt.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}