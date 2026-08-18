import React, { useState, useEffect, useRef, useCallback } from "react";
import Cropper from "react-easy-crop";
import {
  FaPlus,
  FaUser,
  FaCamera,
  FaMagnifyingGlass,
  FaCheck,
  FaCircleCheck,
  FaCircleXmark,
  FaXmark,
  FaChevronDown,
} from "react-icons/fa6";
import { karayakars as karayakarsApi, upload } from "../../apiClient";
import styles from "./KarayakarForm.module.css";

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
      "Akshardham",
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
      "Rwanda",
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
      "Durban",
    ],
  },
};

const ALL_REGIONS = Object.keys(regionDataset);
const TSHIRT_REGIONS = [
  "South Africa",
  "Botswana",
  "Kenya",
  "Tanzania",
  "Uganda",
  "Malawi",
  "Zambia",
];
const TSHIRT_SIZES = ["XXXS", "XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL"];
const SEVA_DESIGNATIONS = [
  "AKSHARDHAM",
  "NC",
  "I-NC",
  "NOC",
  "I-NOC",
  "RC",
  "I-RC",
  "Tech Team",
  "BST Sanchalak",
  "BST Sah-Sanchalak",
  "BST IC",
  "BST Sanchalika",
  "BST Sah-Sanchalika",
  "BST Balika IC",
  "Shishu Sanchalak",
  "Shishu Sah-Sanchalak",
  "Shishu I.C",
  "Shishu Helper",
  "Shishika Sanchalak",
  "Shishika Sah-Sanchalak",
  "Shishika I.C",
  "Shishika Helper",
  "Bal Sanchalak",
  "Bal Sah-Sanchalak",
  "Bal I.C",
  "Bal Helper",
  "Balika Sanchalak",
  "Balika Sah-Sanchalak",
  "Balika I.C",
  "Balika Helper",
  "Volunteer",
  "BK",
  "IT Team",
  "Kishore Sampark Karyakar",
  "Kishore IC",
  "National Exam Cordinator",
  "Kitchen Team",
  "Kishore Ghosthi Sanchalak",
  "Kishore Sanchalak",
  "KST Sah Sanchalak",
  "KST IC",
  "Bal Sanskar Sah Sanchalak",
  "Room Sevak",
  "Balika Sanskar Sanchalika",
  "Balika Sanskar Sah Sanchalika",
  "Balika Sanskar IC",
  "iKST Sanchalika",
  "i-Admin",
  "i-IT Team"
];

// Helper function to render cropped canvas and output Blob / File
const getCroppedImg = async (imageSrc, pixelCrop) => {
  const image = new Image();
  image.src = imageSrc;
  await new Promise((resolve) => {
    image.onload = resolve;
  });

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("No 2d context");
  }

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Canvas is empty"));
        return;
      }
      blob.name = "cropped_avatar.jpeg";
      resolve(blob);
    }, "image/jpeg");
  });
};

export default function KarayakarForm() {
  const currentRegionSetting =
    localStorage.getItem("selected_shibir_region") || "Kenya";
  const isGlobalAdmin = currentRegionSetting === "All";

  const [form, setForm] = useState({
    fullName: "",
    region: isGlobalAdmin ? "" : currentRegionSetting,
    center: "",
    sevaDesignation: [],
    tshirtSize: "",
    profilePhoto: null,
  });

  const [submitting, setSubmitting] = useState(false);
  const [preview, setPreview] = useState(null);

  // Cropper states
  const [imageToCrop, setImageToCrop] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);

  const [toast, setToast] = useState({
    show: false,
    type: "",
    title: "",
    message: "",
  });

  const [regionSearch, setRegionSearch] = useState("");
  const [showRegionList, setShowRegionList] = useState(false);
  const [centerSearch, setCenterSearch] = useState("");
  const [showCenterList, setShowCenterList] = useState(false);

  const [sevaSearch, setSevaSearch] = useState("");
  const [showSevaList, setShowSevaList] = useState(false);

  const regionRef = useRef(null);
  const centerRef = useRef(null);
  const sevaRef = useRef(null);
  const fileInputRef = useRef(null);

  const showNotification = (type, title, message) => {
    setToast({ show: true, type, title, message });
  };

  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(
        () => setToast((t) => ({ ...t, show: false })),
        5000
      );
      return () => clearTimeout(timer);
    }
  }, [toast.show]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (regionRef.current && !regionRef.current.contains(event.target))
        setShowRegionList(false);
      if (centerRef.current && !centerRef.current.contains(event.target))
        setShowCenterList(false);
      if (sevaRef.current && !sevaRef.current.contains(event.target))
        setShowSevaList(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const initialRegion = isGlobalAdmin ? "" : currentRegionSetting;
    setForm((f) => ({
      ...f,
      region: initialRegion,
      center: "",
      tshirtSize: "",
    }));
    setRegionSearch(initialRegion);
    setCenterSearch("");
  }, [currentRegionSetting, isGlobalAdmin]);

  const needsTshirt = form.region ? TSHIRT_REGIONS.includes(form.region) : true;
  const availableCenters = regionDataset[form.region]?.centers || [];

  const filteredRegions = ALL_REGIONS.filter((r) =>
    r.toLowerCase().includes(regionSearch.toLowerCase())
  );
  const filteredCenters = availableCenters.filter((c) =>
    c.toLowerCase().includes(centerSearch.toLowerCase())
  );
  const filteredSeva = SEVA_DESIGNATIONS.filter((d) =>
    d.toLowerCase().includes(sevaSearch.toLowerCase())
  );

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const maxBytes = 2 * 1024 * 1024;
    if (file.size > maxBytes) {
      showNotification(
        "error",
        "File limit exceeded",
        "Please select a photo smaller than 2MB."
      );
      e.target.value = null;
      return;
    }

    const reader = new FileReader();
    reader.addEventListener("load", () => {
      setImageToCrop(reader.result);
      setZoom(1);
      setCrop({ x: 0, y: 0 });
      setIsCropModalOpen(true);
    });
    reader.readAsDataURL(file);
    e.target.value = null;
  };

  const onCropComplete = useCallback((_croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleCropSave = async () => {
    try {
      if (imageToCrop && croppedAreaPixels) {
        const croppedBlob = await getCroppedImg(imageToCrop, croppedAreaPixels);
        const croppedFile = new File([croppedBlob], "avatar.jpg", {
          type: "image/jpeg",
        });

        setForm((f) => ({ ...f, profilePhoto: croppedFile }));
        setPreview(URL.createObjectURL(croppedBlob));
        setIsCropModalOpen(false);
        setImageToCrop(null);
      }
    } catch (e) {
      showNotification(
        "error",
        "Crop Error",
        "Failed to crop the image. Please try again."
      );
    }
  };

  const handleCropCancel = () => {
    setIsCropModalOpen(false);
    setImageToCrop(null);
  };

  const handleSevaToggle = (designation) => {
    setForm((f) => {
      const alreadySelected = f.sevaDesignation.includes(designation);
      const updated = alreadySelected
        ? f.sevaDesignation.filter((item) => item !== designation)
        : [...f.sevaDesignation, designation];
      return { ...f, sevaDesignation: updated };
    });
  };

  const handleClearAllSeva = (e) => {
    e.stopPropagation();
    setForm((f) => ({ ...f, sevaDesignation: [] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const finalCenterInput = centerSearch.trim() || form.center.trim();

    setSubmitting(true);
    try {
      let photo_url = "";
      if (form.profilePhoto) {
        const ext = form.profilePhoto.name.split(".").pop();
        const filename = `karayakar_${Date.now()}.${ext}`;
        const res = await upload.photo(form.profilePhoto, filename);
        photo_url = res.url || "";
      }

      let processedSize = form.tshirtSize || null;
      let processedCenter = finalCenterInput;

      if (processedSize === "XXXL") {
        processedSize = "XXL";
        processedCenter = processedCenter ? `${processedCenter}_3XL` : "_3XL";
      } else if (processedSize === "XXXS") {
        processedSize = "XS";
        processedCenter = processedCenter ? `${processedCenter}_3XS` : "_3XS";
      }

      await karayakarsApi.create({
        full_name: form.fullName.trim(),
        region: form.region || "",
        center: processedCenter || "",
        seva_designation: form.sevaDesignation.join(", "),
        photo_url,
        tshirt_size: processedSize,
      });

      showNotification(
        "success",
        "Registration Successful",
        `${form.fullName.trim() || "Karyakar"} has been added safely to the directory.`
      );

      setForm({
        fullName: "",
        region: isGlobalAdmin ? "" : currentRegionSetting,
        center: "",
        sevaDesignation: [],
        tshirtSize: "",
        profilePhoto: null,
      });
      setPreview(null);
      setRegionSearch(isGlobalAdmin ? "" : currentRegionSetting);
      setCenterSearch("");
      setSevaSearch("");
    } catch (err) {
      showNotification(
        "error",
        "Registration Failed",
        err.message || "System encountered an execution error."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      {toast.show && (
        <div
          className={`${styles.toastPopup} ${toast.type === "success" ? styles.toastSuccess : styles.toastError}`}
        >
          <div className={styles.toastIconWrapper}>
            {toast.type === "success" ? <FaCircleCheck /> : <FaCircleXmark />}
          </div>
          <div className={styles.toastBody}>
            <span className={styles.toastTitle}>{toast.title}</span>
            <p className={styles.toastMessage}>{toast.message}</p>
          </div>
          <button
            className={styles.toastCloseBtn}
            onClick={() => setToast((t) => ({ ...t, show: false }))}
          >
            <FaXmark />
          </button>
        </div>
      )}

      <div className={styles.card}>
        <div className={styles.headerGroup}>
          <h2 className={styles.title}>Register Karayakar</h2>
          <p className={styles.subtitle}>
            Fill in credentials to register karyakars.
          </p>
        </div>

        <form onSubmit={handleSubmit} className={styles.formElement}>
          <div className={styles.avatarSection}>
            <label className={styles.photoUploadTrigger}>
              <div className={styles.photoUpload}>
                {preview ? (
                  <img src={preview} alt="Preview" className={styles.preview} />
                ) : (
                  <FaUser className={styles.placeholderIcon} />
                )}
                <div className={styles.cameraOverlay}>
                  <FaCamera />
                </div>
              </div>
              <span className={styles.uploadText}>
                Upload Photo (Max 2MB)
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                hidden
              />
            </label>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Full Name</label>
            <input
              className={styles.input}
              placeholder="e.g. Jayesh Patel"
              value={form.fullName}
              onChange={(e) =>
                setForm((f) => ({ ...f, fullName: e.target.value }))
              }
            />
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup} ref={regionRef}>
              <label className={styles.label}>Region</label>
              {isGlobalAdmin ? (
                <div className={styles.searchDropdownWrapper}>
                  <div className={styles.inputWithIcon}>
                    <FaMagnifyingGlass className={styles.searchFieldIcon} />
                    <input
                      type="text"
                      className={styles.input}
                      placeholder="Search Region..."
                      value={regionSearch}
                      onFocus={() => setShowRegionList(true)}
                      onChange={(e) => {
                        setRegionSearch(e.target.value);
                        setForm((f) => ({ ...f, region: e.target.value, center: "" }));
                        setCenterSearch("");
                      }}
                    />
                  </div>
                  {showRegionList && (
                    <ul className={styles.dropdownResultsList}>
                      {filteredRegions.length > 0 ? (
                        filteredRegions.map((r) => (
                          <li
                            key={r}
                            onClick={() => {
                              setForm((f) => ({
                                ...f,
                                region: r,
                                center: "",
                                tshirtSize: "",
                              }));
                              setRegionSearch(r);
                              setShowRegionList(false);
                            }}
                          >
                            {r}
                          </li>
                        ))
                      ) : (
                        <li className={styles.noResults}>No regions found</li>
                      )}
                    </ul>
                  )}
                </div>
              ) : (
                <input
                  className={styles.inputReadOnly}
                  readOnly
                  value={form.region}
                />
              )}
            </div>

            <div className={styles.formGroup} ref={centerRef}>
              <label className={styles.label}>Center</label>
              <div className={styles.searchDropdownWrapper}>
                <div className={styles.inputWithIcon}>
                  <FaMagnifyingGlass className={styles.searchFieldIcon} />
                  <input
                    type="text"
                    className={styles.input}
                    placeholder="Search or enter Center..."
                    value={centerSearch}
                    onFocus={() => setShowCenterList(true)}
                    onChange={(e) => {
                      setCenterSearch(e.target.value);
                      setForm((f) => ({ ...f, center: e.target.value }));
                    }}
                  />
                </div>
                {showCenterList && availableCenters.length > 0 && (
                  <ul className={styles.dropdownResultsList}>
                    {filteredCenters.length > 0 ? (
                      filteredCenters.map((c) => (
                        <li
                          key={c}
                          onClick={() => {
                            setForm((f) => ({ ...f, center: c }));
                            setCenterSearch(c);
                            setShowCenterList(false);
                          }}
                        >
                          {c}
                        </li>
                      ))
                    ) : (
                      <li className={styles.noResults}>
                        No matching centers found
                      </li>
                    )}
                  </ul>
                )}
              </div>
            </div>
          </div>

          <div className={styles.formGroup} ref={sevaRef}>
            <label className={styles.label}>Seva Designation</label>

            <div className={styles.searchDropdownWrapper}>
              <div
                className={`${styles.customDropdownTrigger} ${showSevaList ? styles.dropdownTriggerActive : ""}`}
                onClick={() => setShowSevaList(!showSevaList)}
              >
                <div className={styles.triggerSelectionArea}>
                  {form.sevaDesignation.length === 0 ? (
                    <span className={styles.placeholderText}>
                      Choose Designations...
                    </span>
                  ) : (
                    <div className={styles.selectedTagsContainer}>
                      {form.sevaDesignation.map((d) => (
                        <span
                          key={d}
                          className={styles.selectedTagItem}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {d}
                          <button
                            type="button"
                            className={styles.removeTagBtn}
                            onClick={() => handleSevaToggle(d)}
                          >
                            <FaXmark />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className={styles.triggerActionControls}>
                  {form.sevaDesignation.length > 0 && (
                    <button
                      type="button"
                      className={styles.clearAllSelectionsBtn}
                      onClick={handleClearAllSeva}
                      title="Clear all"
                    >
                      <FaXmark />
                    </button>
                  )}
                  <FaChevronDown
                    className={`${styles.chevronIndicatorIcon} ${showSevaList ? styles.rotateChevron : ""}`}
                  />
                </div>
              </div>

              {showSevaList && (
                <div className={styles.dropdownResultsPanel}>
                  <div
                    className={styles.panelSearchContainer}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <FaMagnifyingGlass className={styles.panelSearchIcon} />
                    <input
                      type="text"
                      className={styles.panelSearchInput}
                      placeholder="Filter designations..."
                      value={sevaSearch}
                      onChange={(e) => setSevaSearch(e.target.value)}
                    />
                  </div>

                  <ul className={styles.panelItemsList}>
                    {filteredSeva.length > 0 ? (
                      filteredSeva.map((d) => {
                        const isSelected = form.sevaDesignation.includes(d);
                        return (
                          <li
                            key={d}
                            className={`${styles.panelListItem} ${isSelected ? styles.panelListItemActive : ""}`}
                            onClick={() => handleSevaToggle(d)}
                          >
                            <span className={styles.itemCheckbox}>
                              {isSelected && (
                                <FaCheck className={styles.checkboxCheckIcon} />
                              )}
                            </span>
                            <span className={styles.itemLabelText}>{d}</span>
                          </li>
                        );
                      })
                    ) : (
                      <li className={styles.noResults}>
                        No designations found
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {needsTshirt && (
            <div className={styles.formGroup}>
              <label className={styles.label}>T-Shirt Size</label>
              <div className={styles.selectWrapper}>
                <select
                  className={styles.selectInput}
                  value={form.tshirtSize}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, tshirtSize: e.target.value }))
                  }
                >
                  <option value="">Select size</option>
                  {TSHIRT_SIZES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={submitting}
          >
            {submitting ? (
              <div className={styles.btnLoadingState}>
                <div className={styles.spinner} /> Processing...
              </div>
            ) : (
              <>
                <FaPlus className={styles.btnIcon} /> Add Karyakar
              </>
            )}
          </button>
        </form>

        {/* Image Cropping Modal */}
        {isCropModalOpen && imageToCrop && (
          <div className={styles.cropModalOverlay}>
            <div className={styles.cropModalCard}>
              <div className={styles.cropModalHeader}>
                <h3>Crop Profile Photo</h3>
                <button
                  type="button"
                  className={styles.cropCloseBtn}
                  onClick={handleCropCancel}
                >
                  <FaXmark />
                </button>
              </div>

              <div className={styles.cropperAreaContainer}>
                <Cropper
                  image={imageToCrop}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  cropShape="round"
                  showGrid={false}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                />
              </div>

              <div className={styles.cropZoomControlGroup}>
                <label className={styles.zoomLabel}>Zoom</label>
                <input
                  type="range"
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.1}
                  aria-labelledby="Zoom"
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className={styles.zoomRangeInput}
                />
              </div>

              <div className={styles.cropModalFooter}>
                <button
                  type="button"
                  className={styles.cropCancelBtn}
                  onClick={handleCropCancel}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={styles.cropApplyBtn}
                  onClick={handleCropSave}
                >
                  Save & Apply
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}