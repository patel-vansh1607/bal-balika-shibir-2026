import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  FaUser,
  FaSpinner,
  FaTrash,
  FaFileExport,
  FaCheck,
  FaXmark,
  FaPenToSquare,
  FaMagnifyingGlass,
  FaEllipsisVertical,
  FaCircleCheck,
  FaCircleXmark,
  FaCamera,
  FaWallet,
  FaChevronDown,
  FaQrcode,
  FaBed,
  FaDownload,
  FaImage,
} from "react-icons/fa6";
import { karayakars as karayakarsApi, upload } from "../../apiClient";
import styles from "./KarayakarList.module.css";
import toast from "react-hot-toast";
import JSZip from "jszip";
import { saveAs } from "file-saver";

const REGIONS = [
  "All",
  "Kenya",
  "Tanzania",
  "Uganda",
  "Zambia",
  "Malawi",
  "Botswana",
  "South Africa",
];

const REGION_CENTERS = {
  All: [],
  Kenya: [
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
  Tanzania: [
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
  Uganda: [
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
  Zambia: [
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
  Malawi: [
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
  Botswana: [
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
  "South Africa": [
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
};

REGION_CENTERS.All = Object.values(REGION_CENTERS).flat();

const SEVA_DESIGNATIONS = [
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
];
const TSHIRT_SIZES = ["XXXS", "XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL"];

export default function KarayakarList({ defaultRegion = "" }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  const [region, setRegion] = useState(defaultRegion || "All");
  const [centerFilter, setCenterFilter] = useState("All");
  const [nameSearch, setNameSearch] = useState("");
  const [sevaFilter, setSevaFilter] = useState("");
  const [genderFilter, setGenderFilter] = useState("All");

  const [activeMenuId, setActiveMenuId] = useState(null);

  const [deleting, setDeleting] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [modalUploading, setModalUploading] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: "",
    center: "",
    sevaDesignation: [],
    tshirt_size: "",
    is_paid: 0,
    photo_url: "",
    newFile: null,
  });

  const [editPreview, setEditPreview] = useState(null);
  const [isSevaDropdownOpen, setIsSevaDropdownOpen] = useState(false);

  const [isGeneratingQr, setIsGeneratingQr] = useState(false);
  const [isDownloadingBatch, setIsDownloadingBatch] = useState(false);
  const [isDownloadingPhotos, setIsDownloadingPhotos] = useState(false);

  const menuRef = useRef(null);
  const sevaDropdownRef = useRef(null);

  const userRole = localStorage.getItem("user_role");
  const canDelete = ["master_admin", "super_admin"].includes(userRole);
  const canEdit = ["master_admin", "super_admin", "admin"].includes(userRole);
  const canGenerateQr = ["master_admin", "super_admin"].includes(userRole);

  const parseIncomingList = (data) => {
    if (!Array.isArray(data)) return [];
    return data.map((k) => {
      let size = k.tshirt_size;
      let center = k.center || "";

      if (center.includes("_3XL")) {
        size = "XXXL";
        center = center.replace("_3XL", "");
      } else if (center.includes("_3XS")) {
        size = "XXXS";
        center = center.replace("_3XS", "");
      } else if (size === "3XL") {
        size = "XXXL";
      } else if (k.full_name && k.full_name.includes(" [SIZE:XXXL]")) {
        size = "XXXL";
        k.full_name = k.full_name.replace(" [SIZE:XXXL]", "");
      }
      return { ...k, tshirt_size: size, center: center };
    });
  };

  const fetchData = useCallback(() => {
    setLoading(true);
    karayakarsApi
      .list(region && region !== "All" ? { region } : {})
      .then((res) => {
        const normalizedData = parseIncomingList(res.data || []);
        setList(normalizedData);
      })
      .catch((err) => console.error("Fetch error:", err))
      .finally(() => setLoading(false));
  }, [region]);

  useEffect(() => {
    setCenterFilter("All");
  }, [region]);

  useEffect(() => {
    fetchData();

    function closeDropdownsOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setActiveMenuId(null);
      }
      if (
        sevaDropdownRef.current &&
        !sevaDropdownRef.current.contains(e.target)
      ) {
        setIsSevaDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", closeDropdownsOutside);
    return () =>
      document.removeEventListener("mousedown", closeDropdownsOutside);
  }, [fetchData]);

  const handleTogglePayment = async (karyakar) => {
    const newStatus = Number(karyakar.is_paid) === 1 ? 0 : 1;

    let processedSize = karyakar.tshirt_size || null;
    let processedCenter = karyakar.center;

    if (processedSize === "XXXL") {
      processedSize = "XXL";
      processedCenter = `${processedCenter}_3XL`;
    } else if (processedSize === "XXXS") {
      processedSize = "XS";
      processedCenter = `${processedCenter}_3XS`;
    }

    const payload = {
      ...karyakar,
      center: processedCenter,
      tshirt_size: processedSize,
      is_paid: newStatus,
    };

    try {
      await karayakarsApi.update(karyakar.id, payload);
      setList((prev) =>
        prev.map((k) =>
          k.id === karyakar.id ? { ...k, is_paid: newStatus } : k,
        ),
      );
      setActiveMenuId(null);
      toast.success(
        `${karyakar.full_name} is now ${newStatus === 1 ? "Paid" : "Unpaid"}`,
      );
    } catch (err) {
      console.error(err);
      toast.error("Failed to update status");
    }
  };

  const getIsFemale = (karyakar) => {
    if (!karyakar.seva_designation) return false;

    const designations =
      typeof karyakar.seva_designation === "string"
        ? karyakar.seva_designation.split(", ")
        : Array.isArray(karyakar.seva_designation)
          ? karyakar.seva_designation
          : [];

    return designations.some((role) => {
      const r = role.toUpperCase();

      const matchesExisting =
        r === "I-NC" ||
        r === "I-NOC" ||
        r === "I-RC" ||
        r.includes("SHISHIKA") ||
        r.includes("BALIKA");

      const isBstFemaleRole =
        r === "BST SANCHALIKA" ||
        r === "BST SAH-SANCHALIKA" ||
        r === "BST BALIKA IC";

      return matchesExisting || isBstFemaleRole;
    });
  };

  const baseFilteredList = list.filter((k) => {
    const matchesCenter = centerFilter === "All" || k.center === centerFilter;
    const matchesSeva =
      !sevaFilter.trim() ||
      k.seva_designation
        ?.toLowerCase()
        .includes(sevaFilter.toLowerCase().trim());
    const matchesName =
      !nameSearch.trim() ||
      k.full_name?.toLowerCase().includes(nameSearch.toLowerCase().trim());
    return matchesCenter && matchesSeva && matchesName;
  });

  const getDynamicGenderStats = () => {
    let male = 0;
    let female = 0;
    baseFilteredList.forEach((k) => {
      const isFemale = getIsFemale(k);
      if (isFemale) female++;
      else male++;
    });
    return { male, female };
  };

  const { male: maleCount, female: femaleCount } = getDynamicGenderStats();

  const filteredList = baseFilteredList.filter((k) => {
    const isFemale = getIsFemale(k);
    return (
      genderFilter === "All" ||
      (genderFilter === "Female" && isFemale) ||
      (genderFilter === "Male" && !isFemale)
    );
  });

  const handleConfirmDelete = async (id) => {
    setDeleting(id);
    try {
      await karayakarsApi.remove(id);
      setList((prev) => prev.filter((k) => k.id !== id));
      setConfirmDeleteId(null);
      setActiveMenuId(null);
      toast.success("Member removed from directory");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete member");
    } finally {
      setDeleting(null);
    }
  };

  const handleOpenEditModal = (karyakar) => {
    setEditingItem(karyakar);
    let currentDesignations = [];
    if (karyakar.seva_designation) {
      currentDesignations =
        typeof karyakar.seva_designation === "string"
          ? karyakar.seva_designation.split(", ").filter(Boolean)
          : Array.isArray(karyakar.seva_designation)
            ? karyakar.seva_designation
            : [];
    }

    setEditForm({
      full_name: karyakar.full_name || "",
      center: karyakar.center || "",
      sevaDesignation: currentDesignations,
      tshirt_size: karyakar.tshirt_size || "",
      is_paid: Number(karyakar.is_paid) === 1 ? 1 : 0,
      photo_url: karyakar.photo_url || "",
      newFile: null,
    });
    setEditPreview(karyakar.photo_url || null);
    setIsSevaDropdownOpen(false);
    setIsEditModalOpen(true);
    setActiveMenuId(null);
  };

  const handleModalFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const maxBytes = 2 * 1024 * 1024;
    if (file.size > maxBytes) {
      toast.error("Please select a photo smaller than 2MB.");
      e.target.value = null;
      return;
    }

    setEditForm((prev) => ({ ...prev, newFile: file }));
    setEditPreview(URL.createObjectURL(file));
  };

  const handleModalSevaToggle = (designation) => {
    setEditForm((prev) => {
      const exists = prev.sevaDesignation.includes(designation);
      const updated = exists
        ? prev.sevaDesignation.filter((d) => d !== designation)
        : [...prev.sevaDesignation, designation];
      return { ...prev, sevaDesignation: updated };
    });
  };

  const handleSaveModalEdit = async () => {
    if (!editForm.full_name.trim())
      return toast.error("Name field is required");
    if (!editForm.center) return toast.error("Please select a center");
    if (editForm.sevaDesignation.length === 0)
      return toast.error("Select at least one designation");

    setModalUploading(true);
    try {
      let finalPhotoUrl = editForm.photo_url;
      if (editForm.newFile) {
        const ext = editForm.newFile.name.split(".").pop();
        const filename = `karayakar_${Date.now()}.${ext}`;
        const res = await upload.photo(editForm.newFile, filename);
        finalPhotoUrl = res.url || "";
      }

      let processedSize = editForm.tshirt_size || null;
      let processedCenter = editForm.center;

      if (processedSize === "XXXL") {
        processedSize = "XXL";
        processedCenter = `${processedCenter}_3XL`;
      } else if (processedSize === "XXXS") {
        processedSize = "XS";
        processedCenter = `${processedCenter}_3XS`;
      }

      const updatePayload = {
        id: editingItem.id,
        full_name: editForm.full_name.trim(),
        region: editingItem.region,
        center: processedCenter,
        seva_designation: editForm.sevaDesignation.join(", "),
        tshirt_size: processedSize,
        is_paid: Number(editForm.is_paid),
        photo_url: finalPhotoUrl,
      };

      await karayakarsApi.update(editingItem.id, updatePayload);

      const updatedLocalItem = {
        ...updatePayload,
        center: editForm.center,
        tshirt_size: editForm.tshirt_size,
      };

      setList((prev) =>
        prev.map((item) =>
          item.id === editingItem.id ? updatedLocalItem : item,
        ),
      );
      setIsEditModalOpen(false);
      setEditingItem(null);
      toast.success("Profile updated successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update profile changes.");
    } finally {
      setModalUploading(false);
    }
  };

  const handleGenerateAllQr = async () => {
    setIsGeneratingQr(true);
    try {
      const res = await karayakarsApi.generateQr();
      toast.success(
        `QR codes generated: ${res.generated} done${res.failed ? `, ${res.failed} failed` : ""}.`,
      );
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error("QR generation failed: " + (err.message || "Unknown error"));
    } finally {
      setIsGeneratingQr(false);
    }
  };

  // Helper to construct ID-first filename
  const getFormattedFileName = (karyakar, extension = "png") => {
    const idPrefix = karyakar.member_id || karyakar.id || "ID";
    const sanitizedName = (karyakar.full_name || "Member")
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .trim();
    return `${idPrefix}_${sanitizedName}.${extension}`;
  };

  // Safe fetch helper converts cross-origin images to Blob
  const urlToBlob = async (url) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Canvas conversion failed"));
        }, "image/png");
      };
      img.onerror = () => {
        fetch(url, { mode: "cors" })
          .then((res) => res.blob())
          .then(resolve)
          .catch(reject);
      };
      img.src = url;
    });
  };

  const handleBatchDownloadQr = async () => {
    const listWithQr = filteredList.filter((k) => k.qr_code_url);
    if (listWithQr.length === 0) {
      return toast.error("No QR codes available to download for the current filter.");
    }

    setIsDownloadingBatch(true);
    const toastId = toast.loading(`Preparing ${listWithQr.length} QR codes...`);

    try {
      const zip = new JSZip();
      const qrFolder = zip.folder("QR_Codes");

      const downloadPromises = listWithQr.map(async (k) => {
        try {
          const blob = await urlToBlob(k.qr_code_url);
          const fileName = getFormattedFileName(k, "png");
          qrFolder.file(fileName, blob);
        } catch (error) {
          console.error(`Failed to download QR code for ${k.full_name}`, error);
        }
      });

      await Promise.all(downloadPromises);

      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `QR_Codes_${region}_${Date.now()}.zip`);

      toast.success("QR Codes downloaded successfully!", { id: toastId });
    } catch (err) {
      console.error("Batch QR Download Error:", err);
      toast.error("Failed to generate QR ZIP file.", { id: toastId });
    } finally {
      setIsDownloadingBatch(false);
    }
  };

  const handleBatchDownloadPhotos = async () => {
    const listWithPhotos = filteredList.filter((k) => k.photo_url);
    if (listWithPhotos.length === 0) {
      return toast.error("No profile photos available to download for the current filter.");
    }

    setIsDownloadingPhotos(true);
    const toastId = toast.loading(`Preparing ${listWithPhotos.length} profile photos...`);

    try {
      const zip = new JSZip();
      const photosFolder = zip.folder("Profile_Photos");

      const downloadPromises = listWithPhotos.map(async (k) => {
        try {
          const blob = await urlToBlob(k.photo_url);

          let ext = "jpg";
          if (blob.type === "image/png") ext = "png";
          else if (blob.type === "image/webp") ext = "webp";
          else if (k.photo_url.includes(".")) {
            const urlExt = k.photo_url.split(".").pop().split("?")[0];
            if (urlExt && urlExt.length <= 4) ext = urlExt;
          }

          const fileName = getFormattedFileName(k, ext);
          photosFolder.file(fileName, blob);
        } catch (error) {
          console.error(`Failed to download profile photo for ${k.full_name}`, error);
        }
      });

      await Promise.all(downloadPromises);

      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `Profile_Photos_${region}_${Date.now()}.zip`);

      toast.success("Profile photos downloaded successfully!", { id: toastId });
    } catch (err) {
      console.error("Batch Photo Download Error:", err);
      toast.error("Failed to generate Photos ZIP file.", { id: toastId });
    } finally {
      setIsDownloadingPhotos(false);
    }
  };

  const handleExportCSV = () => {
    if (filteredList.length === 0) return;

    const headers = [
      "No.",
      "Member ID",
      "Full Name",
      "Gender",
      "Region",
      "Center",
      "Seva Designations",
      "T-Shirt Size",
      "Payment Status",
      ...(region.toLowerCase() === "kenya" ? ["Accommodation"] : []),
    ];

    const rows = filteredList.map((k, idx) => {
      const rowData = [
        idx + 1,
        `"${k.member_id || ""}"`,
        `"${k.full_name || ""}"`,
        `"${getIsFemale(k) ? "Female" : "Male"}"`,
        `"${k.region || ""}"`,
        `"${k.center || ""}"`,
        `"${k.seva_designation || "None"}"`,
        `"${k.tshirt_size || "N/A"}"`,
        Number(k.is_paid) === 1 ? "Paid" : "Unpaid",
      ];
      if (region.toLowerCase() === "kenya") {
        rowData.push(
          `"${k.accomodation || k.accommodation || "Not Assigned"}"`,
        );
      }
      return rowData;
    });

    const csvContent = [
      headers.join(","),
      ...rows.map((r) => r.join(",")),
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Karyakar_Report.csv`;
    link.click();
  };

  const selectedSevaCount = editForm.sevaDesignation.length;

  const showRegionColumn = region === "All";
  const showAccommodationColumn = region.toLowerCase() === "kenya";

  let totalColumns = 10;
  if (showRegionColumn) totalColumns += 1;
  if (showAccommodationColumn) totalColumns += 1;
  if (canEdit || canDelete) totalColumns += 1;

  return (
    <div className={styles.rosterContainer}>
      <div className={styles.directoryBentoStats}>
        <div
          className={`${styles.statBox} ${genderFilter === "All" ? styles.statBoxActive : ""}`}
          onClick={() => setGenderFilter("All")}
          style={{ cursor: "pointer" }}
        >
          <span className={styles.statLabel}>TOTAL REGISTERED</span>
          <span className={styles.statCount}>{baseFilteredList.length}</span>
        </div>
        <div
          className={`${styles.statBoxBlue} ${genderFilter === "Male" ? styles.statBoxBlueActive : ""}`}
          onClick={() => setGenderFilter("Male")}
          style={{ cursor: "pointer" }}
        >
          <span className={styles.statLabelBlue}>MALE</span>
          <span className={styles.statCountBlue}>{maleCount}</span>
        </div>
        <div
          className={`${styles.statBoxRed} ${genderFilter === "Female" ? styles.statBoxRedActive : ""}`}
          onClick={() => setGenderFilter("Female")}
          style={{ cursor: "pointer" }}
        >
          <span className={styles.statLabelRed}>FEMALE</span>
          <span className={styles.statCountRed}>{femaleCount}</span>
        </div>
      </div>

      <div className={styles.contentCard}>
        <div className={styles.searchFilterControlBlock}>
          <div className={styles.searchBarWrapper}>
            <FaMagnifyingGlass className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search by name..."
              value={nameSearch}
              onChange={(e) => setNameSearch(e.target.value)}
              className={styles.mainSearchBar}
            />
          </div>

          <div className={styles.filterActionLayoutRow}>
            {!defaultRegion && (
              <div className={styles.selectWrapper}>
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className={styles.styledSelect}
                >
                  {REGIONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className={styles.selectWrapper}>
              <select
                value={centerFilter}
                onChange={(e) => setCenterFilter(e.target.value)}
                className={styles.styledSelect}
              >
                <option value="All">All Center Branches</option>
                {(REGION_CENTERS[region] || []).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.selectWrapper}>
              <select
                value={genderFilter}
                onChange={(e) => setGenderFilter(e.target.value)}
                className={styles.styledSelect}
              >
                <option value="All">All Genders</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>

            <div className={styles.searchBarWrapperHalf}>
              <input
                type="text"
                placeholder="All Mandals / Designations..."
                value={sevaFilter}
                onChange={(e) => setSevaFilter(e.target.value)}
                className={styles.mandalSearchBar}
              />
            </div>

           <div className={styles.actionButtonGroup}>
  <button
    onClick={handleExportCSV}
    className={styles.exportExcelButton}
    disabled={filteredList.length === 0}
  >
    <FaFileExport /> Export to Excel
  </button>

  <button
    onClick={handleBatchDownloadPhotos}
    className={`${styles.exportExcelButton} ${styles.secondaryActionButton}`}
    disabled={isDownloadingPhotos || filteredList.length === 0}
  >
    {isDownloadingPhotos ? (
      <FaSpinner className={styles.spin} />
    ) : (
      <FaImage />
    )}
    {isDownloadingPhotos ? " Archiving..." : " Download Photos"}
  </button>

  <button
    onClick={handleBatchDownloadQr}
    className={`${styles.exportExcelButton} ${styles.secondaryActionButton}`}
    disabled={isDownloadingBatch || filteredList.length === 0}
  >
    {isDownloadingBatch ? (
      <FaSpinner className={styles.spin} />
    ) : (
      <FaDownload />
    )}
    {isDownloadingBatch ? " Archiving..." : " Download QR Codes"}
  </button>

  {canGenerateQr && (
    <button
      onClick={handleGenerateAllQr}
      className={styles.exportExcelButton}
      disabled={isGeneratingQr}
    >
      {isGeneratingQr ? (
        <FaSpinner className={styles.spin} />
      ) : (
        <FaQrcode />
      )}
      {isGeneratingQr ? " Generating..." : " Generate QR Codes"}
    </button>
  )}
</div>
          </div>
        </div>

        <div className={styles.tableContainer}>
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th> No.</th>
                <th>Member ID</th>
                <th>QR Code</th>
                <th>Profile</th>
                <th>Full Name</th>
                {showRegionColumn && <th>Region</th>}
                <th>Center</th>
                {showAccommodationColumn && <th>Accommodation</th>}
                <th>Seva Designation</th>
                <th>T-Shirt</th>
                <th>Status</th>
                {(canEdit || canDelete) && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={totalColumns}
                    className={styles.emptyTablePlaceholder}
                  >
                    <FaSpinner className={styles.spin} /> Loading directory
                    records...
                  </td>
                </tr>
              ) : filteredList.length === 0 ? (
                <tr>
                  <td
                    colSpan={totalColumns}
                    className={styles.emptyTablePlaceholder}
                  >
                    No registered members found matching filters.
                  </td>
                </tr>
              ) : (
                filteredList.map((k, index) => (
                  <tr
                    key={k.id}
                    className={
                      confirmDeleteId === k.id ? styles.rowWarningHighlight : ""
                    }
                  >
                    <td className={styles.centerAlignCell}>{index + 1}</td>
                    <td
                      className={`${styles.centerAlignCell} ${styles.monospaceId}`}
                    >
                      {k.member_id || "—"}
                    </td>
                    <td className={styles.centerAlignCell}>
                      {k.qr_code_url ? (
                        <a
                          href={k.qr_code_url}
                          target="_blank"
                          rel="noreferrer"
                          title={`QR for ${k.member_id}`}
                        >
                          <img
                            src={k.qr_code_url}
                            alt="QR"
                            className={styles.qrThumbnail}
                          />
                        </a>
                      ) : (
                        <span className={styles.textHyphen}>—</span>
                      )}
                    </td>
                    <td className={styles.centerAlignCell}>
                      <div className={styles.avatarFrame}>
                        {k.photo_url ? (
                          <img
                            src={k.photo_url}
                            alt=""
                            className={styles.tableImage}
                          />
                        ) : (
                          <FaUser className={styles.avatarPlaceholder} />
                        )}
                      </div>
                    </td>
                    <td
                      className={`${styles.boldText} ${styles.centerAlignCell}`}
                    >
                      {k.full_name}
                    </td>
                    {showRegionColumn && (
                      <td className={styles.centerAlignCell}>
                        <span className={styles.regionTag}>{k.region}</span>
                      </td>
                    )}
                    <td className={styles.centerAlignCell}>
                      <span className={styles.centerText}>
                        {k.center || "—"}
                      </span>
                    </td>

                    {showAccommodationColumn && (
                      <td className={styles.centerAlignCell}>
                        {k.accomodation || k.accommodation ? (
                          <span
                            className={styles.badgeGenderTag}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                            }}
                          >
                            <FaBed style={{ fontSize: "12px" }} />
                            {k.accomodation || k.accommodation}
                          </span>
                        ) : (
                          <span
                            style={{
                              color: "var(--text-muted)",
                              fontSize: "12px",
                              fontStyle: "italic",
                            }}
                          >
                            Not Assigned
                          </span>
                        )}
                      </td>
                    )}

                    <td className={styles.centerAlignCell}>
                      <div className={styles.sevaBadgeContainer}>
                        {k.seva_designation ? (
                          (typeof k.seva_designation === "string"
                            ? k.seva_designation.split(", ")
                            : k.seva_designation
                          ).map((role, idx) => (
                            <span key={idx} className={styles.sevaTableBadge}>
                              {role}
                            </span>
                          ))
                        ) : (
                          <span className={styles.noSevaText}>
                            None assigned
                          </span>
                        )}
                      </div>
                    </td>
                    <td className={styles.centerAlignCell}>
                      {k.tshirt_size ? (
                        <span className={styles.tshirtTag}>
                          <code>{k.tshirt_size}</code>
                        </span>
                      ) : (
                        <span className={styles.textHyphen}>—</span>
                      )}
                    </td>
                    <td className={styles.centerAlignCell}>
                      {Number(k.is_paid) === 1 ? (
                        <span className={styles.paidBadge}>
                          <FaCircleCheck /> Paid
                        </span>
                      ) : (
                        <span className={styles.unpaidBadge}>
                          <FaCircleXmark /> Unpaid
                        </span>
                      )}
                    </td>
                    {(canEdit || canDelete) && (
                      <td className={styles.centerAlignCell}>
                        <div
                          className={styles.actionMenuRelativeAnchor}
                          ref={activeMenuId === k.id ? menuRef : null}
                        >
                          <button
                            className={styles.ellipsisTriggerBtn}
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuId(
                                activeMenuId === k.id ? null : k.id,
                              );
                            }}
                          >
                            <FaEllipsisVertical />
                          </button>

                          {activeMenuId === k.id && (
                            <div className={styles.actionDropdownMenu}>
                              {canEdit && (
                                <button
                                  className={styles.dropdownMenuItem}
                                  onClick={() => handleOpenEditModal(k)}
                                >
                                  <FaPenToSquare /> Edit Profile
                                </button>
                              )}

                              {canEdit && (
                                <button
                                  className={styles.dropdownMenuItem}
                                  onClick={() => handleTogglePayment(k)}
                                >
                                  <FaWallet />
                                  {Number(k.is_paid) === 1
                                    ? "Mark as Unpaid"
                                    : "Mark as Paid"}
                                </button>
                              )}

                              {canDelete && (
                                <>
                                  {confirmDeleteId === k.id ? (
                                    <div className={styles.deleteConfirmPanel}>
                                      <p className={styles.confirmDeletePrompt}>
                                        Confirm removal?
                                      </p>
                                      <div className={styles.confirmActionRow}>
                                        <button
                                          className={styles.confirmYesBtn}
                                          disabled={deleting === k.id}
                                          onClick={() =>
                                            handleConfirmDelete(k.id)
                                          }
                                        >
                                          {deleting === k.id ? (
                                            <FaSpinner className={styles.spin} />
                                          ) : (
                                            <FaCheck />
                                          )}
                                        </button>
                                        <button
                                          className={styles.confirmNoBtn}
                                          onClick={() =>
                                            setConfirmDeleteId(null)
                                          }
                                        >
                                          <FaXmark />
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <button
                                      className={styles.dropdownMenuItemDanger}
                                      onClick={() => setConfirmDeleteId(k.id)}
                                    >
                                      <FaTrash /> Delete Member
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isEditModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard}>
            <div className={styles.modalHeader}>
              <h3>Edit Member Profile</h3>
              <button
                className={styles.closeModalBtn}
                onClick={() => setIsEditModalOpen(false)}
              >
                <FaXmark />
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.modalPhotoSection}>
                <div className={styles.modalAvatarPreview}>
                  {editPreview ? (
                    <img src={editPreview} alt="Preview" />
                  ) : (
                    <FaUser />
                  )}
                </div>
                <label className={styles.uploadPhotoBtn}>
                  <FaCamera /> Change Photo
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleModalFileChange}
                    hidden
                  />
                </label>
              </div>

              <div className={styles.formGroup}>
                <label>Full Name</label>
                <input
                  type="text"
                  value={editForm.full_name}
                  onChange={(e) =>
                    setEditForm({ ...editForm, full_name: e.target.value })
                  }
                  className={styles.styledInput}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Center</label>
                <select
                  value={editForm.center}
                  onChange={(e) =>
                    setEditForm({ ...editForm, center: e.target.value })
                  }
                  className={styles.styledSelect}
                >
                  <option value="">Select Center</option>
                  {(
                    REGION_CENTERS[editingItem?.region] || REGION_CENTERS.All
                  ).map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup} ref={sevaDropdownRef}>
                <label>Seva Designation</label>
                <div
                  className={styles.multiSelectTrigger}
                  onClick={() => setIsSevaDropdownOpen(!isSevaDropdownOpen)}
                >
                  <span>
                    {selectedSevaCount > 0
                      ? `${selectedSevaCount} Selected`
                      : "Select Designations"}
                  </span>
                  <FaChevronDown />
                </div>

                {isSevaDropdownOpen && (
                  <div className={styles.multiSelectDropdown}>
                    {SEVA_DESIGNATIONS.map((role) => (
                      <label key={role} className={styles.checkboxRow}>
                        <input
                          type="checkbox"
                          checked={editForm.sevaDesignation.includes(role)}
                          onChange={() => handleModalSevaToggle(role)}
                        />
                        <span>{role}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className={styles.formGroup}>
                <label>T-Shirt Size</label>
                <select
                  value={editForm.tshirt_size}
                  onChange={(e) =>
                    setEditForm({ ...editForm, tshirt_size: e.target.value })
                  }
                  className={styles.styledSelect}
                >
                  <option value="">Select Size</option>
                  {TSHIRT_SIZES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label>Payment Status</label>
                <select
                  value={editForm.is_paid}
                  onChange={(e) =>
                    setEditForm({ ...editForm, is_paid: Number(e.target.value) })
                  }
                  className={styles.styledSelect}
                >
                  <option value={0}>Unpaid</option>
                  <option value={1}>Paid</option>
                </select>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                className={styles.cancelBtn}
                onClick={() => setIsEditModalOpen(false)}
              >
                Cancel
              </button>
              <button
                className={styles.saveBtn}
                onClick={handleSaveModalEdit}
                disabled={modalUploading}
              >
                {modalUploading ? (
                  <>
                    <FaSpinner className={styles.spin} /> Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}