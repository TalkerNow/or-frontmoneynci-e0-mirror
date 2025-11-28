import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Nav,
  NavItem,
  NavLink,
  Card,
  CardBody,
  TabContent,
  TabPane,
  FormGroup,
  Collapse,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
} from "reactstrap";
import classnames from "classnames";
import ButtonRadioSwitch from "../../../../components/reactstrap/buttons/ButtonRadioSwitch";
import wordIcon2025 from "../../../../assets/img/icons/word-icon-2025.png";

// UI-only component: no calculation or API logic here per specs

export default function SimulatorHub({ id, alignOffset = 0, user = null }) {
  const [subTab, setSubTab] = useState("regimes");
  const [regimeTab, setRegimeTab] = useState("base");
  const [carriereLongue, setCarriereLongue] = useState(false);
  const [chomage, setChomage] = useState(false);
  const [sans, setSans] = useState(true); // default to true
  const [isSalaryProjected, setIsSalaryProjected] = useState(false);
  // Ajout: ligne "Salaire par défaut" (même comportement que les lignes Non)
  const [salaireDefautRow, setSalaireDefautRow] = useState({
    id: "def",
    value: "",
    fixed: false,
  });
  // Ajout: lignes dynamiques "Salaire jusqu’au départ"
  const [salaireJusquaDepartRows, setSalaireJusquaDepartRows] = useState([
    { id: 1, value: "", fixed: false },
  ]);
  const [projectMultiple, setProjectMultiple] = useState(false);
  const [retraiteProgressive, setRetraiteProgressive] = useState(false);
  const [cumulEmploiRetraite, setCumulEmploiRetraite] = useState(false);
  const [vplrChoice, setVplrChoice] = useState("incomplete");
  const [vplrEntries, setVplrEntries] = useState([]);
  // Retraite progressive: UI-only fields (date, %, salaire, surcôtisation)
  const [progStartDate, setProgStartDate] = useState("");
  const [progPct, setProgPct] = useState("");
  const [progSalary, setProgSalary] = useState("");
  const [progSurcotisation, setProgSurcotisation] = useState(false);
  const [progStartDateFixed, setProgStartDateFixed] = useState(false);
  const [progPctFixed, setProgPctFixed] = useState(false);
  const [progSalaryFixed, setProgSalaryFixed] = useState(false);
  // Chômage fixed states
  const [chomageJoursFixed, setChomageJoursFixed] = useState(false);
  const [chomageAnneesFixed, setChomageAnneesFixed] = useState(false);

  // Carrière longue: fixed for trimestres count per age
  const [clAvantFixed, setClAvantFixed] = useState({
    21: false,
    20: false,
    18: false,
    16: false,
  });
  // Chômage: UI-only fields for the panel opened when toggle is ON
  const [chomageJours, setChomageJours] = useState("");
  const [chomageAnnees, setChomageAnnees] = useState("");
  const [chomageStartDate, setChomageStartDate] = useState("");
  // Carrière longue: UI-only "Trimestres avant" (21/20/18/16)
  const [clAvantCount, setClAvantCount] = useState({
    21: "",
    20: "",
    18: "",
    16: "",
  });
  const [clAvantDates, setClAvantDates] = useState({
    21: { from: "", to: "" },
    20: { from: "", to: "" },
    18: { from: "", to: "" },
    16: { from: "", to: "" },
  });
  const [innerOffset, setInnerOffset] = useState(0);
  const [visible, setVisible] = useState(false);
  const [innerVisible, setInnerVisible] = useState(false);
  const arrcoIframeRef = useRef(null);
  const ircantecIframeRef = useRef(null);
  // (refs to Nav/innerNav removed to avoid function-component ref warnings)

  // const clientFullName = useMemo(() => {
  //   const pick = (val) => (typeof val === 'string' && val.trim().length ? val.trim() : '')
  //   const first = pick(user?.first_name) || pick(user?.firstname) || pick(user?.firstName) || pick(user?.prenom) || pick(user?.first) || ''
  //   const last = pick(user?.last_name) || pick(user?.lastname) || pick(user?.lastName) || pick(user?.nom) || ''
  //   const combined = `${first} ${last}`.replace(/\s+/g, ' ').trim()
  //   if (combined) {
  //     try { if (typeof localStorage !== 'undefined') localStorage.setItem('simu_last_client_name', combined) } catch {}
  //     return combined
  //   }
  //   try {
  //     if (typeof localStorage !== 'undefined') {
  //       const cached = localStorage.getItem('simu_last_client_name')
  //       if (cached) return cached
  //     }
  //   } catch {}
  //   return 'ce client'
  // }, [user])

  // Nouveaux états pour la refonte de l'onglet "bilan"
  const [retirementChoices, setRetirementChoices] = useState([
    {
      id: "legal",
      label: "Âge légal",
      age: "",
      date: "",
      selected: false,
      fixedAge: false,
      fixedDate: false,
    },
    {
      id: "full",
      label: "Âge du taux plein",
      age: "",
      date: "",
      selected: false,
      fixedAge: false,
      fixedDate: false,
    },
    {
      id: "auto67",
      label: "Âge du taux plein automatique",
      age: "67",
      date: "",
      selected: false,
      fixedAge: true,
      fixedDate: false,
    },
  ]);
  const [freeDates, setFreeDates] = useState([
    { id: 1, date: "", age: "", fixedAge: false },
  ]);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [bilanHistory, setBilanHistory] = useState([
    {
      id: "h1",
      name: "Bilan de base",
      age: "62 ans",
      type: "Base",
      date: "12/01/2024",
      rachat: "",
    },
    {
      id: "h2",
      name: "Simulation taux plein",
      age: "64 ans",
      type: "Taux plein",
      date: "08/07/2024",
      rachat: "",
    },
    {
      id: "h3",
      name: "Projection à 67 ans",
      age: "67 ans",
      type: "Projection",
      date: "15/02/2025",
      rachat: "",
    },
  ]);
  const [rciDashboardValues, setRciDashboardValues] = useState(() => {
    try {
      const savedValues = localStorage.getItem("rci_dashboard_values");
      if (savedValues) {
        return JSON.parse(savedValues);
      }
    } catch (e) {
      console.error("Failed to load saved RCI values", e);
    }
    // Default values if nothing in localStorage
    return {
      capitalDate: "",
      capitalAmount: "",
      projectionAge: "62",
      projectionAgeAmount: "",
      projection64Amount: "",
      projection67Amount: "",
    };
  });
  const [isRciDashboardOpen, setIsRciDashboardOpen] = useState(true);
  const [isRciCalculatorOpen, setIsRciCalculatorOpen] = useState(false);

  // Safe public URL (avoid ReferenceError when process is undefined)
  const publicUrl =
    typeof process !== "undefined" &&
    process &&
    process.env &&
    process.env.PUBLIC_URL
      ? process.env.PUBLIC_URL
      : "";

  // Defensive snapshots for possibly corrupted localStorage values
  const salaireDefautRowSafe =
    salaireDefautRow && typeof salaireDefautRow === "object"
      ? salaireDefautRow
      : { id: "def", value: "", fixed: false };
  const safeSalaireRows = Array.isArray(salaireJusquaDepartRows)
    ? salaireJusquaDepartRows.filter((r) => r && typeof r === "object")
    : [];
  const safeRetirementChoices = Array.isArray(retirementChoices)
    ? retirementChoices.filter((r) => r && typeof r === "object")
    : [];
  const safeFreeDates = Array.isArray(freeDates)
    ? freeDates.filter((r) => r && typeof r === "object")
    : [];
  const isRetraiteProgressiveLocked = cumulEmploiRetraite || carriereLongue;
  const isCumulLocked = retraiteProgressive;
  const isCarriereLongueLocked = retraiteProgressive;

  const computeInnerOffset = useCallback(() => {
    try {
      if (subTab !== "regimes") {
        setInnerOffset(0);
        return;
      }
      const baseSpan = document.getElementById("regimes-label");
      const firstText = document.getElementById("regime-base-text");
      if (baseSpan && firstText) {
        const baseLeft = baseSpan.getBoundingClientRect().left;
        const firstLeft = firstText.getBoundingClientRect().left;
        const delta = baseLeft - firstLeft;
        setInnerOffset(Math.round(delta));
      }
    } catch (e) {
      setInnerOffset(0);
    }
  }, [subTab]);

  useEffect(() => {
    computeInnerOffset();
  }, [computeInnerOffset]);
  // Keep submenu margin fixed from parent-provided offset (no recompute on clicks)
  useEffect(() => {
    const nav = document.getElementById("simu-subnav");
    if (nav)
      nav.style.marginLeft =
        String(Math.max(0, Number(alignOffset) || 0)) + "px";
  }, [alignOffset]);
  // Animate outer sub-nav on alignment or section change
  useEffect(() => {
    setVisible(false);
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, [alignOffset]);
  // Animate inner regimes sub-nav each time offset or tab changes
  useEffect(() => {
    if (subTab === "regimes") {
      setInnerVisible(false);
      const raf = requestAnimationFrame(() => setInnerVisible(true));
      return () => cancelAnimationFrame(raf);
    } else {
      setInnerVisible(false);
    }
  }, [subTab, innerOffset, regimeTab]);

  const hideSimulatorSaveButtons = useCallback(() => {
    [arrcoIframeRef.current, ircantecIframeRef.current].forEach((iframe) => {
      if (!iframe) return;
      try {
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!doc) return;
        const buttons = doc.querySelectorAll(".points-save-btn");
        buttons.forEach((btn) => {
          btn.style.display = "none";
        });
      } catch (e) {}
    });
  }, []);

  // HYDRATE: load persisted amounts on mount
  useEffect(() => {
    try {
      const storedDef = localStorage.getItem("hypotheses_salaire_defaut_row");
      if (storedDef) {
        const parsed = JSON.parse(storedDef);
        if (
          parsed &&
          typeof parsed === "object" &&
          typeof parsed.value === "string"
        ) {
          setSalaireDefautRow(parsed);
        }
      }
      const storedRows = localStorage.getItem("hypotheses_salaire_rows");
      if (storedRows) {
        const parsed = JSON.parse(storedRows);
        if (Array.isArray(parsed) && parsed.length) {
          setSalaireJusquaDepartRows(parsed);
        }
      }
    } catch (e) {
      /* noop */
    }
  }, []);

  // PERSIST: save on change
  useEffect(() => {
    try {
      localStorage.setItem(
        "hypotheses_salaire_defaut_row",
        JSON.stringify(salaireDefautRow)
      );
    } catch (e) {
      /* noop */
    }
  }, [salaireDefautRow]);

  useEffect(() => {
    try {
      localStorage.setItem(
        "hypotheses_salaire_rows",
        JSON.stringify(salaireJusquaDepartRows)
      );
    } catch (e) {
      /* noop */
    }
  }, [salaireJusquaDepartRows]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("hypotheses_project_multiple");
      if (stored != null) {
        setProjectMultiple(stored === "true" || stored === true);
      }
    } catch (e) {
      /* noop */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        "hypotheses_project_multiple",
        JSON.stringify(projectMultiple)
      );
    } catch (e) {
      /* noop */
    }
  }, [projectMultiple]);

  // Persist history edits (names/rachat) – UI-only, to avoid losing on refresh
  useEffect(() => {
    try {
      localStorage.setItem("bilan_history_ui", JSON.stringify(bilanHistory));
    } catch (e) {
      /* noop */
    }
  }, [bilanHistory]);

  // HYDRATE: load persisted history if available (defensive)
  useEffect(() => {
    try {
      const raw = localStorage.getItem("bilan_history_ui");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const cleaned = parsed
          .filter((x) => x && typeof x === "object")
          .map((x) => ({
            id: x.id || String(Date.now()),
            name: typeof x.name === "string" ? x.name : "",
            age: typeof x.age === "string" ? x.age : "",
            type: typeof x.type === "string" ? x.type : "",
            date: typeof x.date === "string" ? x.date : "",
            rachat: typeof x.rachat === "string" ? x.rachat : "",
          }));
        if (cleaned.length) setBilanHistory(cleaned);
      }
    } catch {
      /* noop */
    }
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("rci_dashboard_values");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return;
      setRciDashboardValues((prev) => ({
        ...prev,
        capitalDate: normalizeDate(parsed.capitalDate) || "",
        capitalAmount:
          typeof parsed.capitalAmount === "string" ? parsed.capitalAmount : "",
        projectionAge:
          typeof parsed.projectionAge === "string"
            ? parsed.projectionAge
            : typeof parsed.projectionAge === "number"
            ? String(parsed.projectionAge)
            : prev.projectionAge,
        projectionAgeAmount:
          typeof parsed.projectionAgeAmount === "string"
            ? parsed.projectionAgeAmount
            : "",
        projection64Amount:
          typeof parsed.projection64Amount === "string"
            ? parsed.projection64Amount
            : "",
        projection67Amount:
          typeof parsed.projection67Amount === "string"
            ? parsed.projection67Amount
            : "",
      }));
    } catch {
      /* noop */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        "rci_dashboard_values",
        JSON.stringify(rciDashboardValues)
      );
    } catch {
      /* noop */
    }
  }, [rciDashboardValues]);

  // Compatibility rules between hypotheses toggles
  useEffect(() => {
    if (isRetraiteProgressiveLocked && retraiteProgressive) {
      setRetraiteProgressive(false);
    }
  }, [isRetraiteProgressiveLocked, retraiteProgressive]);

  useEffect(() => {
    if (isCumulLocked && cumulEmploiRetraite) {
      setCumulEmploiRetraite(false);
    }
  }, [isCumulLocked, cumulEmploiRetraite]);

  useEffect(() => {
    if (isCarriereLongueLocked && carriereLongue) {
      setCarriereLongue(false);
    }
  }, [isCarriereLongueLocked, carriereLongue]);

  useEffect(() => {
    if (!retraiteProgressive && progSurcotisation) {
      setProgSurcotisation(false);
    }
  }, [retraiteProgressive, progSurcotisation]);

  useEffect(() => {
    if (
      vplrChoice !== "etude" &&
      Array.isArray(vplrEntries) &&
      vplrEntries.length
    ) {
      setVplrEntries([]);
    }
  }, [vplrChoice, vplrEntries]);

  // Sanitize input to digits and a single decimal separator (comma or dot)
  const sanitizeSalaryInput = (val) => {
    if (!val) return "";
    // remove everything except digits, comma, dot (no-useless-escape removed)
    const s = String(val).replace(/[^0-9,.]/g, "");
    // keep only the first separator (comma or dot), drop the rest
    let seenSep = false;
    let out = "";
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      if (ch === "," || ch === ".") {
        if (seenSep) continue;
        seenSep = true;
      }
      out += ch;
    }
    return out;
  };

  const isAllowedKey = (e) => {
    const allowedControlKeys = [
      "Backspace",
      "Delete",
      "Tab",
      "ArrowLeft",
      "ArrowRight",
      "Home",
      "End",
      "Enter",
    ];
    if (allowedControlKeys.includes(e.key)) return true;
    if (
      (e.ctrlKey || e.metaKey) &&
      ["a", "c", "v", "x"].includes(e.key.toLowerCase())
    )
      return true;
    if (e.key === "," || e.key === ".") return true;
    // digits
    return /^[0-9]$/.test(e.key);
  };

  // Strict digit-only keys (for age fields)
  const isDigitKeyOnly = (e) => {
    const allowed = [
      "Backspace",
      "Delete",
      "Tab",
      "ArrowLeft",
      "ArrowRight",
      "Home",
      "End",
      "Enter",
    ];
    if (allowed.includes(e.key)) return true;
    if (
      (e.ctrlKey || e.metaKey) &&
      ["a", "c", "v", "x"].includes(e.key.toLowerCase())
    )
      return true;
    if (e.key === "," || e.key === ".") return true;
    return /^\d$/.test(e.key);
  };

  const renderSalaireRows = (
    rows,
    { labelOffset = 1, canDeleteFirst = false } = {}
  ) => {
    const safeRows = Array.isArray(rows) ? rows : [];
    return safeRows.map((row, idx) => {
      const label = `Salaire ${idx + labelOffset}`;
      return (
        <div
          key={row.id || idx}
          className="hypo-salary-row"
          style={{ marginBottom: idx === safeRows.length - 1 ? 0 : 6 }}
        >
          <span className="hypo-salary-label">{label}</span>
          <div className="hypo-salary-inputwrap">
            <span
              aria-hidden="true"
              style={{
                position: "absolute",
                right: 10,
                top: "50%",
                transform: "translateY(-50%)",
                color: "#6e6b7b",
                pointerEvents: "none",
                fontWeight: 600,
              }}
            >
              €
            </span>
            {row && row.fixed ? (
              <input
                type="text"
                readOnly
                className="form-control"
                value={row.value ?? ""}
                onClick={() => {
                  setSalaireJusquaDepartRows((prev) =>
                    (Array.isArray(prev) ? prev : []).map((r) =>
                      r && r.id === row.id ? { ...r, fixed: false } : r
                    )
                  );
                  setTimeout(() => {
                    const el = document.getElementById(
                      `salaire-input-${row.id}`
                    );
                    if (el) {
                      el.focus();
                      const len = el.value.length;
                      el.setSelectionRange(len, len);
                    }
                  }, 0);
                }}
                title="Cliquez pour modifier"
                style={{
                  paddingRight: 26,
                  textAlign: "right",
                  borderRadius: 6,
                  background: "#fff",
                }}
              />
            ) : (
              <input
                id={`salaire-input-${row.id}`}
                type="text"
                inputMode="decimal"
                pattern="[0-9]*"
                className="form-control"
                value={row.value ?? ""}
                onKeyDown={(e) => {
                  if (!isAllowedKey(e)) e.preventDefault();
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const raw = ((row && row.value) || "")
                      .toString()
                      .replace(/\s/g, "")
                      .replace(",", ".");
                    const num = parseFloat(raw);
                    const formatted = isNaN(num)
                      ? row
                        ? row.value
                        : ""
                      : new Intl.NumberFormat("fr-FR", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }).format(num);
                    setSalaireJusquaDepartRows((prev) =>
                      (Array.isArray(prev) ? prev : []).map((r) =>
                        r && r.id === row.id
                          ? { ...r, value: formatted, fixed: true }
                          : r
                      )
                    );
                    e.currentTarget.blur();
                  }
                }}
                onChange={(e) => {
                  const val = sanitizeSalaryInput(e.target.value);
                  setSalaireJusquaDepartRows((prev) =>
                    (Array.isArray(prev) ? prev : []).map((r) =>
                      r && r.id === row.id ? { ...r, value: val } : r
                    )
                  );
                }}
                placeholder="0,00"
                style={{
                  paddingRight: 26,
                  textAlign: "right",
                  borderRadius: 6,
                  background: "#fff",
                }}
              />
            )}
          </div>
          <div className="hypo-date-row" style={{ marginLeft: 8 }}>
            <span className="hypo-date-sep">Du</span>
            <input
              type="date"
              className="hypo-date-input"
              value={normalizeDate(row && row.from)}
              onMouseDown={(e) => {
                try {
                  e.currentTarget.showPicker && e.currentTarget.showPicker();
                } catch {}
              }}
              onFocus={(e) => {
                try {
                  e.currentTarget.showPicker && e.currentTarget.showPicker();
                } catch {}
              }}
              onChange={(e) => {
                const v = e.currentTarget.value || "";
                setSalaireJusquaDepartRows((prev) =>
                  (Array.isArray(prev) ? prev : []).map((r) =>
                    r && r.id === row.id ? { ...r, from: v } : r
                  )
                );
              }}
              aria-label={`Date de début pour ${label}`}
            />
            <span className="hypo-date-sep">au</span>
            <input
              type="date"
              className="hypo-date-input"
              value={normalizeDate(row && row.to)}
              onMouseDown={(e) => {
                try {
                  e.currentTarget.showPicker && e.currentTarget.showPicker();
                } catch {}
              }}
              onFocus={(e) => {
                try {
                  e.currentTarget.showPicker && e.currentTarget.showPicker();
                } catch {}
              }}
              onChange={(e) => {
                const v = e.currentTarget.value || "";
                setSalaireJusquaDepartRows((prev) =>
                  (Array.isArray(prev) ? prev : []).map((r) =>
                    r && r.id === row.id ? { ...r, to: v } : r
                  )
                );
              }}
              aria-label={`Date de fin pour ${label}`}
            />
          </div>
          {(canDeleteFirst || idx > 0) && (
            <button
              type="button"
              onClick={() =>
                setSalaireJusquaDepartRows((prev) =>
                  (Array.isArray(prev) ? prev : []).filter(
                    (r) => r && r.id !== row.id
                  )
                )
              }
              aria-label="Supprimer cette ligne"
              title="Supprimer"
              className="action-btn danger"
              style={{ marginLeft: 8 }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
                <path d="M10 11v6"></path>
                <path d="M14 11v6"></path>
                <path d="M9 6V4h6v2"></path>
              </svg>
            </button>
          )}
        </div>
      );
    });
  };

  // Age helpers for "Âge calculé" (Dates libres)
  const getBirthDate = useCallback(() => {
    try {
      const ls = localStorage.getItem("user_birth_date");
      const raw =
        ls ||
        (window &&
          window.user &&
          (window.user.birthDate || window.user.birth_date)) ||
        null;
      if (!raw) return null;
      const d = new Date(raw);
      return isNaN(d.getTime()) ? null : d;
    } catch {
      return null;
    }
  }, []);

  const diffYearsAtDate = useCallback((dob, atDate) => {
    if (!dob || !atDate || isNaN(dob.getTime()) || isNaN(atDate.getTime()))
      return null;
    let age = atDate.getFullYear() - dob.getFullYear();
    const m = atDate.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && atDate.getDate() < dob.getDate())) age--;
    return age;
  }, []);

  // Safe date helper for type="date" inputs
  const normalizeDate = (v) => {
    try {
      const s = String(v || "");
      return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : "";
    } catch {
      return "";
    }
  };

  const handleRciDashboardChange = (field, value) => {
    let newValue = value;

    // Enforce limits for amount fields
    if (
      [
        "capitalAmount",
        "projectionAgeAmount",
        "projection64Amount",
        "projection67Amount",
      ].includes(field)
    ) {
      // Remove existing spaces to parse the number
      const cleanValue = newValue.replace(/\s/g, "");

      // Allow empty string to let user clear the input
      if (cleanValue === "") {
        setRciDashboardValues((prev) => ({ ...prev, [field]: "" }));
        return;
      }

      // Check if it's a valid number (allow digits only for now to avoid complexity with decimals if not needed, or standard float)
      // Using regex to allow only digits is safer for "text" inputs mimicking numbers
      if (!/^\d*$/.test(cleanValue)) {
        return; // Ignore non-numeric input
      }

      let numValue = parseInt(cleanValue, 10);

      if (!isNaN(numValue)) {
        if (numValue < 0) numValue = 0;
        if (numValue > 9999999) numValue = 9999999;

        // Format with spaces
        newValue = numValue.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
      }
    }

    setRciDashboardValues((prev) => ({ ...prev, [field]: newValue }));
  };

  // Auto-save RCI dashboard values to localStorage on every change
  useEffect(() => {
    localStorage.setItem(
      "rci_dashboard_values",
      JSON.stringify(rciDashboardValues)
    );
  }, [rciDashboardValues]);

  // Handle Enter key (blur on Enter for better UX)
  const handleRciKeyDown = (e) => {
    if (e.key === "Enter") {
      e.target.blur(); // Remove focus when Enter is pressed
    }
  };

  const handleRetraiteToggle = useCallback(
    (next) => {
      if (isRetraiteProgressiveLocked && next) return;
      const nextValue = !!next;
      setRetraiteProgressive(nextValue);
      if (nextValue) {
        setCumulEmploiRetraite(false);
        setCarriereLongue(false);
      } else {
        setProgSurcotisation(false);
      }
    },
    [isRetraiteProgressiveLocked]
  );

  const handleCumulToggle = useCallback(
    (next) => {
      if (isCumulLocked && next) return;
      const nextValue = !!next;
      setCumulEmploiRetraite(nextValue);
      if (nextValue) {
        setRetraiteProgressive(false);
      }
    },
    [isCumulLocked]
  );

  const handleCarriereLongueToggle = useCallback(
    (next) => {
      if (isCarriereLongueLocked && next) return;
      const nextValue = !!next;
      setCarriereLongue(nextValue);
      if (nextValue) {
        setRetraiteProgressive(false);
      }
    },
    [isCarriereLongueLocked]
  );

  return (
    <div>
      {/* Responsive layout helpers for the Hypothèses section + bilan table */}
      <>
        <style>{`
        .hypo-grid { display: flex; flex-direction: column; gap: 20px; }
        .hypo-indent-lg { padding: 24px 40px !important; }
        @media (max-width: 576px) { .hypo-indent-lg { padding: 20px 16px !important; } }
        .hypo-row { display: flex; align-items: center; gap: 12px; padding: 6px 0; }
        .hypo-row + .hypo-row { margin-top: 4px; }
        .hypo-ctrl { display: inline-flex; align-items: center; gap: 12px; }
        /* Unify label width so all switches are aligned */
        .hypo-label { flex: 0 0 280px; max-width: 280px; font-weight: 500; color: var(--bs-body-color, #4b4b4b); line-height: 1.3; }
        .hypo-label.nowrap { white-space: nowrap; }
        .hypo-label.spacer { flex: 0 0 0; max-width: 0; visibility: hidden; padding: 0; margin: 0; }
        .label-with-info { display: inline-flex; align-items: flex-start; gap: 6px; flex-wrap: wrap; row-gap: 4px; }
        .vplr-stack { flex: 1 1 auto; display: flex; flex-direction: column; gap: 10px; width: 100%; }
        .vplr-switch-line { display: inline-flex; align-items: center; gap: 12px; flex-wrap: wrap; }
        .vplr-toggle { gap: 12px; }
        .vplr-toggle > span {
          font-size: 0;
          line-height: 1.2;
          position: relative;
        }
        .vplr-toggle > span::before {
          content: attr(data-label);
          font-size: 0.95rem;
          font-weight: 600;
          color: #6B7280;
        }
        .vplr-toggle > span:first-of-type::before { content: 'Année incomplète'; }
        .vplr-toggle > span:last-of-type::before { content: "Rachat année d'étude"; }
        .vplr-toggle.primary-left > span:first-of-type::before,
        .vplr-toggle.primary-right > span:last-of-type::before { color: var(--bs-primary, #7367F0); }
        .vplr-toggle span[role='switch'] { margin: 0 4px; }
        .vplr-add-btn {
          border: 1px solid var(--bs-primary, #7367F0);
          color: var(--bs-primary, #7367F0);
          background: #fff;
          border-radius: 50%;
          padding: 0;
          width: 28px;
          height: 28px;
          line-height: 1;
          cursor: pointer;
          font-weight: 700;
          font-size: 1rem;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .vplr-entries { display: flex; flex-direction: column; gap: 10px; width: 100%; margin-top: 6px; }
        .vplr-entry-row { display: inline-flex; align-items: center; gap: 10px; flex-wrap: nowrap; }
        .vplr-entry-label { font-weight: 600; color: var(--bs-body-color, #4b4b4b); white-space: nowrap; }
        .vplr-entry-input { width: 110px; max-width: 100%; text-align: center; }
        .hypo-info-icon {
          position: relative;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          border: 1px solid #D1D5DB;
          background: #fff;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 8.5px;
          transition: transform 140ms ease, box-shadow 140ms ease;
        }
        .hypo-info-icon:hover { transform: translateY(-1px); box-shadow: 0 6px 14px rgba(17, 24, 39, 0.12); }
        .hypo-info-icon:focus-visible { outline: 2px solid #C7D2FE; outline-offset: 2px; }
        .hypo-tooltip {
          position: absolute;
          bottom: calc(100% + 12px);
          left: 50%;
          background-color: #fff;
          color: #4B5563;
          padding: 12px 14px;
          border-radius: 12px;
          border: 1px solid #E5E7EB;
          box-shadow: 0 14px 34px rgba(17, 24, 39, 0.16);
          font-size: 0.9rem;
          line-height: 1.45;
          opacity: 0;
          pointer-events: none;
          transform: translate(-50%, 6px);
          transition: opacity 140ms ease, transform 140ms ease;
          max-width: min(360px, calc(100vw - 32px));
          width: max-content;
          z-index: 5;
          white-space: normal;
          text-align: center;
        }
        .hypo-tooltip::before {
          content: '';
          position: absolute;
          top: 100%;
          left: 50%;
          transform: translateX(-50%);
          border-width: 9px 9px 0 9px;
          border-style: solid;
          border-color: #E5E7EB transparent transparent transparent;
        }
        .hypo-tooltip::after {
          content: '';
          position: absolute;
          top: 100%;
          left: 50%;
          transform: translateX(-50%);
          border-width: 8px 8px 0 8px;
          border-style: solid;
          border-color: #fff transparent transparent transparent;
          filter: drop-shadow(0 4px 6px rgba(17, 24, 39, 0.16));
        }
        .hypo-info-icon:hover .hypo-tooltip,
        .hypo-info-icon:focus-visible .hypo-tooltip { opacity: 1; transform: translate(-50%, 0); pointer-events: auto; }
        .ui-disabled { opacity: 0.55; filter: grayscale(0.25); transition: opacity 0.2s ease; }
        .ui-disabled,
        .ui-disabled * { cursor: not-allowed !important; }
        .ui-disabled .hypo-ctrl,
        .ui-disabled .hypo-panel,
        .ui-disabled .prog-field,
        .ui-disabled .prog-surco-row,
        .ui-disabled input,
        .ui-disabled button,
        .ui-disabled .btn,
        .ui-disabled .action-btn,
        .ui-disabled .inline-input { pointer-events: none !important; }
        .ui-disabled .hypo-label,
        .ui-disabled .prog-label { color: #9CA3AF !important; }
        .hypo-ctrl { flex: 1 1 auto; min-width: 180px; }
        .hypo-panel { background: #f8f8f8; border: 1px solid #e9e9e9; border-radius: 8px; padding: 8px 10px; width: 100%; max-width: 640px; }
        .hypo-panel-header { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: nowrap; }
        .hypo-panel-header > span { min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .hypo-panel-header > button { flex: 0 0 auto; align-self: center !important; }
        .hypo-salary-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .hypo-salary-row.nowrap { flex-wrap: nowrap; }
        .hypo-salary-label { margin-right: 6px; min-width: 70px; color: var(--bs-body-color, #4b4b4b); font-weight: 600; font-size: 0.95rem; }
        .hypo-salary-inputwrap { position: relative; width: 110px; max-width: 100%; }
        .hypo-date-row { display: inline-flex; align-items: center; gap: 6px; }
        .hypo-date-input { width: 140px; height: 32px; padding: 6px 8px; border: 1px solid #E5E7EB; border-radius: 6px; background: #fff; font-size: 0.9rem; }
        .hypo-date-sep { width: 24px; text-align: center; color: #6B7280; display: inline-block; }
        .hypo-date-input:focus { outline: none; border-color: #A5B4FC; box-shadow: 0 0 0 3px rgba(99,102,241,0.2); }
        .hypo-salary-toggle { display: inline-flex; align-items: center; gap: 10px; margin-left: 12px; flex-wrap: wrap; }
        .hypo-salary-toggle.inline { flex-wrap: nowrap; white-space: nowrap; }
        .hypo-salary-toggle span.label { font-weight: 600; color: var(--bs-body-color, #4b4b4b); }
        /* Chômage panel */
        .chomage-panel-fields { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
        .chomage-field { display: inline-flex; align-items: center; gap: 8px; }
        .chomage-field label { margin: 0; font-weight: 600; color: var(--bs-body-color, #4b4b4b); }
        .chomage-days { width: 80px; text-align: center; }
        .chomage-days::placeholder { text-align: center; }
        /* Vendor placeholder alignment (Safari/Chrome) */
        .chomage-days::-webkit-input-placeholder { text-align: center; }
        .chomage-trim { width: 100%; text-align: center; }
        .chomage-row { display: grid; grid-template-columns: 180px 80px 24px 140px 24px 140px; column-gap: 8px; align-items: center; }
        .chomage-dual-row {
          display: grid;
          grid-template-columns: 120px 220px 140px 100px 40px 100px 80px;
          column-gap: 10px;
          align-items: center;
        }
        /* Retraite progressive panel */
        .prog-panel-fields { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
        .prog-panel-fields.nowrap { flex-wrap: nowrap; }
        .prog-field { display: inline-flex; align-items: center; gap: 8px; flex: 0 0 auto; }
        .prog-field label { margin: 0; font-weight: 600; color: var(--bs-body-color, #4b4b4b); white-space: nowrap; }
        .prog-inputwrap { position: relative; width: 110px; max-width: 100%; }
        .prog-date { width: 140px; }
        .prog-pct { width: 100%; text-align: center; }
        .prog-pct::placeholder { text-align: center; }
        .prog-pct::-webkit-input-placeholder { text-align: center; }
        .prog-surco-row { display: flex; align-items: center; gap: 12px; margin-top: 8px; }
        .prog-surco-row .prog-label { font-weight: 600; color: var(--bs-body-color, #4b4b4b); min-width: 265px; flex: 0 0 240px; max-width: 240px; }
        .prog-salary-wrap { position: relative; width: 100px; max-width: 100%; }

        /* Variables + table skin (same as your CNAV snippet) */
        :root { --border:#ddd; --bg:#fff; --alt:#f7f7fb; --accent:#7367f0; --head: var(--accent); }
        .regime-table { width:100%; border-collapse:collapse; font-size:13px; background: var(--bg); }
        .regime-table thead th {
          background-color: var(--head);
          color:#fff;
          border:1px solid var(--border);
          padding:8px;
          text-align:center;
          font-size: 0.9rem;        /* reduced for compact headers */
        }
        .regime-table td { border:1px solid var(--border); padding:8px; vertical-align: middle; text-align:center; }
        .regime-table tbody tr:nth-child(even) { background-color: var(--alt); }

        /* Wrapper: comfortable max width, left-aligned */
        .bilan-wrap {
          border: 1px solid #e9e9e9; border-radius: 0; overflow: hidden;
          box-shadow: 0 6px 20px rgba(16,24,40,.04); background: #fff;
          width: 100%; max-width: 820px; display: block;
        }
        .bilan-wrap .table-responsive { width: 100%; max-width: 100%; }
        /* Ensure responsive scroll on narrow screens */
        .bilan-wrap .table-responsive { overflow-x: auto; -webkit-overflow-scrolling: touch; }

        /* Optional: tighten table padding inside the wrap */
        .bilan-wrap .table th, .bilan-wrap .table td { vertical-align: middle; }
        .bilan-wrap .table thead th { background: #fafafa; font-weight: 600; }

        /* New: bigger helper text and inputs */
        .bilan-controls { display: flex; gap: 16px; flex-wrap: wrap; align-items: flex-end; }
        .bilan-help {
          font-size: 1.05rem;
          font-weight: 400;
          color: var(--bs-body-color, #4b4b4b);
          display: block;          /* full row */
          flex-basis: 100%;        /* push fields below */
          width: 100%;
        }
        .bilan-field { min-width: 180px; display: flex; flex-direction: column; } /* make vertical */
        .bilan-field label.form-label { display: block; font-size: 0.95rem; font-weight: 600; margin-bottom: 6px; color: var(--bs-body-color, #4b4b4b); } /* label above */
        .bilan-input { font-size: 1rem; line-height: 1.25; height: 44px; padding: 10px 12px; }
        /* New: read-only age display styled like an input */
        .bilan-age-display {
          font-size: 1rem;
          font-weight: 700;
          color: #2f2f39;
          padding: 10px 12px;
          min-height: 44px;
          border: 1px solid #e9e9e9;
          border-radius: 6px;
          background: #f7f7fb;
        }
        /* New: compact size for DOB and age */
        .bilan-input.sm { height: 36px; padding: 6px 10px; font-size: 0.9rem; width: 180px; }
        .bilan-age-display.sm { min-height: 36px; padding: 6px 10px; font-size: 0.9rem; width: 180px; }

        /* Summary (Bilan retraite du client) */
        .summary-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
        .summary-card {
          border: 1px solid #e9e9e9; border-radius: 12px; background: #fff;
          box-shadow: 0 6px 20px rgba(16,24,40,.04); padding: 14px 16px;
        }
        .summary-title { margin: 0 0 6px; font-weight: 600; color: #4b4b57; font-size: 1.1rem; }
        .section-title { font-size: clamp(1.2rem, 1.1vw + 1rem, 1.5rem); font-weight: 700; color: #2f2f39; }
        /* prevent wrap for the last word + emoji on tiny screens */
        .nowrap-chunk { white-space: nowrap; }
        /* below 320px, allow wrapping again */
        @media (max-width: 323px) { .nowrap-chunk { white-space: normal; } }
        .summary-value { font-size: 1.8rem; font-weight: 800; color: #000; line-height: 1.1; }
        /* Force black even if accent/ok/warn is applied to the value */
        .summary-value.accent,
        .summary-value.ok,
        .summary-value.warn { color: #000 !important; }

        .summary-desc { margin-top: 4px; color: #6e6b7b; font-size: 0.92rem; }
        .accent { color: var(--bs-primary, #7367F0); }
        .ok { color: #28a745; font-weight: 700; }
        .warn { color: #dc3545; font-weight: 700; }
        @media (max-width: 576px) { .summary-grid { grid-template-columns: 1fr; } }

        @media (max-width: 768px) {
          .hypo-label { flex: 0 0 240px; max-width: 240px; }
        }
        @media (max-width: 576px) {
          .hypo-row { flex-direction: column; align-items: flex-start; gap: 6px; }
          .hypo-label { flex: none; width: auto; max-width: none; }
          .hypo-label.nowrap { white-space: normal; }
          .hypo-ctrl { width: 100%; padding-left: 12px; }
          .hypo-panel { max-width: 100%; }
          .hypo-panel-header { flex-direction: row; align-items: center; justify-content: space-between; flex-wrap: nowrap; }
          .hypo-salary-row { flex-direction: column; align-items: stretch; }
          .hypo-salary-row.nowrap { flex-wrap: wrap; }
          .hypo-salary-label { min-width: 0; margin-right: 0; }
          .hypo-salary-inputwrap { width: 100%; }
          .hypo-date-row { margin-left: 0 !important; width: 100%; }
          .hypo-date-input { width: 100%; }
          .chomage-panel-fields { flex-direction: column; align-items: stretch; }
        .chomage-row { grid-template-columns: 1fr; row-gap: 6px; }
        .chomage-dual-row { grid-template-columns: 1fr; row-gap: 6px; }
        .chomage-days { width: 100%; }
          .vplr-stack { width: 100%; }
          .vplr-entry-row { width: 100%; justify-content: flex-start; }
          .vplr-entry-input { width: 100%; }
          .vplr-entries { align-items: stretch; }
          .vplr-switch-line { width: 100%; }
          .prog-panel-fields { flex-direction: column; align-items: stretch; }
          .prog-field { justify-content: space-between; width: 100%; flex-wrap: wrap; }
          .prog-field label { width: 100%; margin-bottom: 6px; }
          .prog-field .form-control { width: 100%; }
          .prog-inputwrap { width: 100%; }
          .prog-date { width: 100%; }
          .prog-pct { width: 100%; }
          .prog-surco-row { justify-content: space-between; flex-wrap: wrap; }
          .prog-surco-row > div { margin-left: 12px; }
          .prog-surco-row .prog-label { min-width: 0; flex: 0 0 100%; max-width: 100%; margin-bottom: 6px; }
          .prog-salary-wrap { width: 100%; }
          .prog-panel-fields.nowrap { flex-wrap: wrap; }
        }

        /* Ultra-narrow devices: keep labels and inputs paired per line */
        @media (max-width: 480px) {
          .hypo-date-row { display: grid; grid-template-columns: auto 1fr; column-gap: 8px; row-gap: 6px; }
          .hypo-date-input { width: 100%; min-width: 0; }
        }

        .dob-click-wrap { display: inline-block; cursor: pointer; }
        .dob-click-wrap:focus { outline: 2px solid var(--bs-primary, #7367F0); outline-offset: 2px; }

        /* Age table responsiveness and uniformity */
        .bilan-table-wrapper {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }
        .bilan-table-wrapper::-webkit-scrollbar { height: 8px; }
        .bilan-table-wrapper::-webkit-scrollbar-thumb {
          background: rgba(0,0,0,0.12);
          border-radius: 8px;
        }

        .regime-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
          background: var(--bg);
          table-layout: fixed; /* uniform column widths */
        }
        .regime-table thead th {
          position: sticky; /* keep header visible when scrolling */
          top: 0;
          z-index: 1;
        }
        .regime-table th, .regime-table td {
          padding: 10px;
          text-align: center;
          vertical-align: middle;
          word-break: break-word; /* prevent overflow for long headers */
        }

        /* Wider min-width on medium screens to avoid squashing */
        @media (max-width: 992px) {
          .regime-table { min-width: 840px; }
        }
        /* Compact mode on small screens */
        @media (max-width: 576px) {
          .regime-table { min-width: 680px; }
          .regime-table thead th { font-size: 12px; padding: 7px; } /* slightly larger on mobile */
          .regime-table td { font-size: 12px; padding: 8px; }
        }

        /* RCI Specific Styles to match IRCANTEC */
        .sim-title { font-weight: 800; text-transform: uppercase; letter-spacing: .02em; margin: 6px 0 8px; font-size: 20px; color: #1f2d3d; }
        .points-section { display: flex; flex-direction: column; gap: 15px; margin-top: 0.75rem; padding: 0 16px 16px; }
        .points-row { display: flex; align-items: center; justify-content: flex-start; margin-bottom: 15px; gap: 10px; flex-wrap: wrap; }
        
        /* Fixed width for the left column (labels) */
        .points-label { display: inline-block; width: 100%; min-width: 0; margin-right: 0; font-size: 14px; font-weight: 600; color: #1f2d3d; text-transform: none; }
        @media (min-width: 769px) {
          .points-label { width: 350px; min-width: 350px; }
        }
        
        /* Special case for the date row where the "label" is a wrapper containing text + input */
        .rci-date-wrapper { width: 350px; min-width: 350px; display: flex; align-items: center; gap: 10px; }
        .rci-date-wrapper .points-label { width: auto; min-width: auto; margin-right: 0; }

        /* Special case for "Projection rente capital à [Age] ans" */
        .rci-age-wrapper { width: 350px; min-width: 350px; display: flex; align-items: center; }
        .rci-age-wrapper .points-label { width: auto; min-width: auto; margin-right: 10px; }

        .points-input { width: 150px; padding: 6px 8px; border: 1px solid #ddd; border-radius: 6px; outline: none; display: block; background-color: #fff; color: #1f2d3d; }

        @media (max-width: 768px) {
          .points-row { flex-direction: column; align-items: flex-start; gap: 6px; }
          .points-label, .rci-date-wrapper, .rci-age-wrapper { width: 100%; min-width: 0; }
          .points-input { width: 100% !important; }
          .rci-date-wrapper, .rci-age-wrapper { justify-content: space-between; }
        }
      `}</style>

        <style>{`
        /* Titles: uniform and larger */
        .section-title { font-size: 1.35rem; font-weight: 700; margin: 0 0 10px; }
        /* Make legend title match section-title look */
        fieldset > legend.h6 { font-size: 1.35rem; font-weight: 700; margin: 0 0 10px; color: #2f2f39; }

        .choice-table, .history-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
          background: #fff;
          table-layout: fixed;
          max-width: 100%;
          margin-left: 0;
          padding: 0 8px;
        }
        .choice-table tbody td,
        .history-table tbody td {
          min-height: 48px;
        }
        @media (min-width: 1200px) {
          .choice-table,
          .history-table {
            max-width: 100%;
          }
        }
        .history-table-wrap {
          width: 100%;
          overflow-x: visible;
        }
        /* Equal widths (disabled to allow custom colgroup widths) */
        .choice-table.cols-3 th, .choice-table.cols-3 td { width: auto; }
        .history-table.cols-5 th, .history-table.cols-5 td { width: auto; }
        .history-table.cols-6 th, .history-table.cols-6 td { width: auto; }
        /* Age column layout: label left, value right */
        .age-cell { display: flex; align-items: center; justify-content: space-between; gap: 8px; width: 100%; padding: 0 8px; }
        .age-label { flex: 1 1 auto; min-width: 0; font-weight: 600; color: #374151; text-align: left; }
        .age-value { flex: 0 0 auto; display: inline-flex; align-items: center; gap: 6px; justify-content: flex-end; min-width: 90px; }
        .choice-table thead th, .history-table thead th {
          background: var(--bs-primary, #7367F0);
          color: #fff;
          border: 1px solid #E5E7EB;
          padding: 8px;          /* align header height with simulators */
          text-align: left;
          font-weight: 600;
          font-size: 0.9rem;     /* reduced for compact headers */
          line-height: 1.1;
          white-space: nowrap;
        }
        .choice-table td, .history-table td {
          border: 1px solid #E5E7EB;
          padding: 8px;          /* reduce cell padding */
          vertical-align: middle;
          background: #fff;
        }
        /* Narrow actions column for history table */
        .history-table th.actions-col, .history-table td.actions-col { width: 110px; text-align: center; }
        .history-table td { padding: 6px 8px; } /* even tighter for history */
        .choice-table tbody tr:nth-child(even) td,
        .history-table tbody tr:nth-child(even) td { background: #F9FAFB; }
        .choice-table tbody tr:hover td,
        .history-table tbody tr:hover td { background: #EEF2FF; }
        .inline-input { width: 100%; border: 1px solid #E5E7EB; border-radius: 6px; padding: 6px 8px; background: #fff; }
        .inline-input:focus { outline: none; border-color: #A5B4FC; box-shadow: 0 0 0 3px rgba(99,102,241,0.2); }
        .action-btn {
          background:#fff;
          border:1px solid #E5E7EB;
          border-radius:10px;
          padding:6px 10px;
          min-width:40px;
          height:34px;
          line-height:0;
          cursor:pointer;
          color:#4B5563;
          display:inline-flex;
          align-items:center;
          justify-content:center;
          transition: background 140ms ease, transform 120ms ease;
        }
        .action-btn svg { width: 16px; height: 16px; }
        .action-btn:hover { background:#EEF2FF; color:#111827; transform: translateY(-1px); }
        .action-btn:active { transform: translateY(0); }
        .action-btn.danger {
          color: #B91C1C;
          border-color: #FECACA;
          background: #FFF5F5;
        }
        .action-btn.danger:hover {
          background: #FEE2E2;
          color: #991B1B;
        }

        /* Remove outer card visual in Bilan so only the table block width shows */
        .bilan-card { background: transparent; border: 0; box-shadow: none; }
        .bilan-card > .card-body { padding-left: 0; padding-right: 0; }

        /* Responsive: use full width on small screens and allow horizontal scroll if needed */
        @media (max-width: 992px) {
          .bilan-wrap { max-width: 100%; }
          .choice-table col, .history-table col { width: auto !important; }
        }
        @media (max-width: 768px) {
          .choice-table { min-width: 640px; }
          .history-table { min-width: 720px; }
          .choice-table thead th, .history-table thead th { font-size: 11px; padding: 7px; }
          .choice-table td { padding: 6px; }
          /* Stack the age value under the label to avoid overflow */
          .age-cell { flex-direction: column; align-items: flex-start; gap: 2px; padding: 0 8px; }
          .age-value { justify-content: flex-start; min-width: 0; }
        }
        .file-controls { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        .file-hidden-input { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
        .file-empty { color: #6B7280; background: #F9FAFB; border: 1px dashed #E5E7EB; border-radius: 8px; padding: 10px 12px; font-size: 0.92rem; }
        .file-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px 12px; border: 1px solid #E5E7EB; border-radius: 8px; background: #fff; }
        .file-meta { display: flex; flex-direction: column; }
        .file-name { font-weight: 600; color: #111827; }
        .file-date { font-size: 0.85rem; color: #6B7280; }
        .btn-pastel { background: #EEF2FF; border: 1px solid #E5E7EB; color: #374151; border-radius: 6px; padding: 8px 10px; font-weight: 600; }
        .btn-pastel:hover { background: #E0E7FF; color: #111827; }

        .manual-table-wrap { width: 100% !important; max-width: 100% !important; overflow-x: auto; -webkit-overflow-scrolling: touch; padding-bottom: 6px; }
        .manual-table-wrap .table-responsive { width: 100%; overflow-x: visible; }
        .manual-table { width: 100%; border-collapse: collapse; background: #fff; min-width: 960px; }
        .manual-table thead th {
          background: var(--bs-primary, #7367F0);
          color: #FFFFFF;
          border: 1px solid #E5E7EB;
          padding: 12px;
          font-size: 0.9rem;
          text-align: center;
          font-weight: 600;
          white-space: nowrap;
          min-width: 100px;
        }
        .manual-table td {
          border: 1px solid #E5E7EB;
          padding: 12px;
          vertical-align: middle;
          text-align: center;
        }
        .manual-table th.large-column,
        .manual-table td.large-column { min-width: 180px; }
        .manual-table th.narrow,
        .manual-table td.narrow { min-width: 90px; }
        .manual-table th.medium,
        .manual-table td.medium { min-width: 110px; }
        .manual-table th.actions-col,
        .manual-table td.actions-col { min-width: 110px; text-align: center; }
        .manual-num { width: 100%; border: 1px solid #E5E7EB; border-radius: 6px; padding: 6px 8px; background: #fff; text-align: center; }
        .manual-num:focus { outline: none; border-color: #A5B4FC; box-shadow: 0 0 0 3px rgba(99,102,241,0.2); }
        /* Horizontal scroll for small screens */
        .table-responsive { overflow-x: auto; -webkit-overflow-scrolling: touch; }
        .manual-input { width: 100%; border: 1px solid #E5E7EB; border-radius: 6px; padding: 6px 8px; background: #fff; }
        .manual-input:focus { outline: none; border-color: #A5B4FC; box-shadow: 0 0 0 3px rgba(99,102,241,0.2); }
        .manual-input.err { border-color: #ef4444; box-shadow: 0 0 0 2px rgba(239,68,68,0.15); }
        .manual-actions { display: inline-flex; gap: 6px; }
        .manual-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }
        .manual-header-actions { display: flex; align-items: center; gap: 8px; margin-left: auto; }
        .manual-entry-actions { display: flex; justify-content: flex-end; }

        /* RCI Tab - Ircantec Clone Styles */
        .points-collapsible { margin: 0 12px 16px; }
        .collapsible { 
          border:1px solid #ddd; 
          border-radius:16px; 
          background:#fff; 
          box-shadow:0 12px 30px rgba(15,23,42,0.08); 
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", "Liberation Sans", sans-serif;
        }
        .collapsible-header { width:100%; display:flex; align-items:center; justify-content:space-between; gap:12px; padding:12px 16px; border:0; background:transparent; cursor:pointer; border-radius:16px; font-size:18px; font-weight:700; color:#1f2d3d; }
        .collapsible-header .chevron { transition: transform .25s ease; color:#6b7280; }
        .collapsible-header.open .chevron { transform: rotate(180deg); }
        
        .points-suffix { font-size: 14px; color: #6b7280; font-weight: 500; text-transform: lowercase; }
        
        .rci-card-height { min-height: 1150px; }
        
        /* RCI Responsive Styles */
        @media (max-width: 768px) {
          .rci-card-height { min-height: auto !important; }
          .points-row { 
            flex-direction: column !important; 
            align-items: flex-start !important; 
            gap: 8px !important;
          }
          .points-row > div[style*="minWidth"],
          .rci-date-wrapper,
          .rci-age-wrapper {
            min-width: 100% !important;
            width: 100% !important;
            flex-direction: column !important;
            align-items: flex-start !important;
          }
          .rci-age-wrapper .points-label {
            margin-right: 0 !important;
            margin-bottom: 4px !important;
            width: 100% !important;
          }
          .points-label {
            min-width: auto !important;
            width: 100% !important;
            margin-right: 0 !important;
            margin-bottom: 4px !important;
          }
          .points-input {
            width: 100% !important;
            max-width: 100% !important;
          }
          .points-section {
            padding: 12px !important;
          }
          .collapsible-header {
            font-size: 16px !important;
            padding: 10px 12px !important;
          }
          .sim-title {
            font-size: 16px !important;
          }
        }
        
        @media (max-width: 640px) {
          .points-row { flex-direction:column; align-items:flex-start; }
          .points-row .points-input { width:100%; }
          .points-label { min-width:0; }
        }

        .hypo-flex-container { display: flex; flex-direction: column; gap: 24px; align-items: flex-start; width: 100%; }
        .hypo-col-form { width: 100%; max-width: 100%; } /* Prend toute la largeur disponible */
        .hypo-col-table { width: 100%; min-width: 0; }
        
        @media (max-width: 992px) {
          .hypo-col-form, .hypo-col-table { width: 100%; max-width: 100%; }
        }

      `}</style>
      </>

      <Nav
        id="simu-subnav"
        tabs
        className="mb-1"
        style={{
          marginLeft: Math.max(0, Number(alignOffset) || 0),
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(-6px)",
          transition:
            "margin-left 220ms cubic-bezier(0.16, 1, 0.3, 1), opacity 140ms ease, transform 220ms cubic-bezier(0.16, 1, 0.3, 1)",
          willChange: "margin-left, transform, opacity",
        }}
      >
        <NavItem>
          <NavLink
            id="regimes-link"
            className={classnames({ active: subTab === "regimes" })}
            onClick={() => setSubTab("regimes")}
          >
            <span id="regimes-label">Régimes de retraite</span>
          </NavLink>
        </NavItem>
        <NavItem>
          <NavLink
            className={classnames({ active: subTab === "hypotheses" })}
            onClick={() => setSubTab("hypotheses")}
          >
            Hypothèses fin de carrière
          </NavLink>
        </NavItem>
        <NavItem>
          <NavLink
            className={classnames({ active: subTab === "bilan" })}
            onClick={() => setSubTab("bilan")}
          >
            Bilan retraite
          </NavLink>
        </NavItem>
      </Nav>

      <TabContent activeTab={subTab}>
        <TabPane tabId="regimes">
          <Nav
            tabs
            className="mb-1"
            style={{
              marginLeft: innerOffset,
              opacity: innerVisible ? 1 : 0,
              transform: innerVisible ? "translateY(0)" : "translateY(-6px)",
              transition:
                "margin-left 220ms cubic-bezier(0.16, 1, 0.3, 1), opacity 140ms ease, transform 220ms cubic-bezier(0.16, 1, 0.3, 1)",
              willChange: "margin-left, transform, opacity",
            }}
          >
            <NavItem>
              <NavLink
                className={classnames({ active: regimeTab === "base" })}
                onClick={() => setRegimeTab("base")}
              >
                <span id="regime-base-text">Régime de base</span>
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink
                className={classnames({ active: regimeTab === "arrco" })}
                onClick={() => setRegimeTab("arrco")}
              >
                ARRCO AGIRC
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink
                className={classnames({ active: regimeTab === "ircantec" })}
                onClick={() => setRegimeTab("ircantec")}
              >
                IRCANTEC
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink
                className={classnames({ active: regimeTab === "rci" })}
                onClick={() => setRegimeTab("rci")}
              >
                RCI
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink
                className={classnames({ active: regimeTab === "per" })}
                onClick={() => setRegimeTab("per")}
              >
                PER
              </NavLink>
            </NavItem>
          </Nav>
          <TabContent activeTab={regimeTab}>
            <TabPane tabId="base">
              <Card className="mb-1">
                <CardBody>
                  <iframe
                    title="cnav-simulator"
                    src={`${publicUrl}/cnav-simulator.html`}
                    style={{
                      width: "100%",
                      height: "1800px",
                      border: "0",
                      borderRadius: "8px",
                      background: "transparent",
                    }}
                  />
                </CardBody>
              </Card>
            </TabPane>

            <TabPane tabId="arrco">
              <Card className="mb-1">
                <CardBody>
                  <iframe
                    title="arrco-agirc-simulator"
                    src={`${publicUrl}/arrco-simulator.html`}
                    ref={arrcoIframeRef}
                    onLoad={hideSimulatorSaveButtons}
                    style={{
                      width: "100%",
                      height: "1150px",
                      border: "0",
                      borderRadius: "8px",
                      background: "transparent",
                    }}
                  />
                </CardBody>
              </Card>
            </TabPane>

            <TabPane tabId="ircantec">
              <Card className="mb-1">
                <CardBody>
                  <iframe
                    title="ircantec-simulator"
                    src={`${publicUrl}/ircantec-simulator.html`}
                    ref={ircantecIframeRef}
                    onLoad={hideSimulatorSaveButtons}
                    style={{
                      width: "100%",
                      height: "1150px",
                      border: "0",
                      borderRadius: "8px",
                      background: "transparent",
                    }}
                  />
                </CardBody>
              </Card>
            </TabPane>

            <TabPane tabId="rci">
              <Card className="mb-1 rci-card-height">
                <CardBody>
                  <div className="points-collapsible">
                    <div className="collapsible">
                      <button
                        type="button"
                        className={classnames("collapsible-header", {
                          open: isRciDashboardOpen,
                        })}
                        onClick={() => setIsRciDashboardOpen((prev) => !prev)}
                        aria-expanded={isRciDashboardOpen}
                        aria-controls="rci-dashboard-panel"
                      >
                        <span className="sim-title" style={{ margin: 0 }}>
                          TABLEAU DE BORD
                        </span>
                        <span className="chevron" aria-hidden="true">
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="6 9 12 15 18 9"></polyline>
                          </svg>
                        </span>
                      </button>
                      <Collapse isOpen={isRciDashboardOpen}>
                        <div
                          id="rci-dashboard-panel"
                          className="points-section"
                        >
                          <div className="points-row">
                            <div className="rci-date-wrapper">
                              <label
                                className="points-label"
                                htmlFor="rci-capital-date"
                              >
                                Capital acquis au
                              </label>
                              <input
                                type="date"
                                id="rci-capital-date"
                                className="points-input"
                                value={normalizeDate(
                                  rciDashboardValues.capitalDate
                                )}
                                onClick={(e) => {
                                  try {
                                    e.currentTarget.showPicker();
                                  } catch (err) {}
                                }}
                                onChange={(e) =>
                                  handleRciDashboardChange(
                                    "capitalDate",
                                    normalizeDate(e.target.value)
                                  )
                                }
                                onKeyDown={handleRciKeyDown}
                                style={{ width: "130px" }}
                              />
                            </div>
                            <input
                              type="text"
                              id="rci-capital-amount"
                              className="points-input"
                              placeholder="Montant (€)"
                              inputMode="numeric"
                              value={rciDashboardValues.capitalAmount}
                              style={{ width: "150px" }}
                              onChange={(e) =>
                                handleRciDashboardChange(
                                  "capitalAmount",
                                  e.target.value
                                )
                              }
                              onKeyDown={handleRciKeyDown}
                            />
                          </div>

                          <div className="points-row">
                            <div className="rci-age-wrapper">
                              <label
                                className="points-label"
                                htmlFor="rci-projection-age-amount"
                              >
                                Projection rente capital à
                              </label>
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "6px",
                                }}
                              >
                                <input
                                  type="number"
                                  id="rci-projection-age-input"
                                  className="points-input"
                                  style={{ width: "60px", textAlign: "center" }}
                                  aria-label="Âge de projection"
                                  min="0"
                                  max="99"
                                  step="1"
                                  inputMode="numeric"
                                  value={rciDashboardValues.projectionAge}
                                  onChange={(e) =>
                                    handleRciDashboardChange(
                                      "projectionAge",
                                      e.target.value
                                    )
                                  }
                                  onKeyDown={handleRciKeyDown}
                                />
                                <span className="points-suffix">ans</span>
                              </div>
                            </div>
                            <input
                              type="text"
                              id="rci-projection-age-amount"
                              className="points-input"
                              placeholder="Montant rente (€)"
                              inputMode="numeric"
                              value={rciDashboardValues.projectionAgeAmount}
                              style={{ width: "150px" }}
                              onChange={(e) =>
                                handleRciDashboardChange(
                                  "projectionAgeAmount",
                                  e.target.value
                                )
                              }
                              onKeyDown={handleRciKeyDown}
                            />
                          </div>

                          <div className="points-row">
                            <label
                              className="points-label"
                              htmlFor="rci-projection-64"
                            >
                              Projection rente capital à 64 ans
                            </label>
                            <input
                              type="text"
                              id="rci-projection-64"
                              className="points-input"
                              placeholder="Montant rente (€)"
                              inputMode="numeric"
                              value={rciDashboardValues.projection64Amount}
                              style={{ width: "150px" }}
                              onChange={(e) =>
                                handleRciDashboardChange(
                                  "projection64Amount",
                                  e.target.value
                                )
                              }
                              onKeyDown={handleRciKeyDown}
                            />
                          </div>

                          <div className="points-row">
                            <label
                              className="points-label"
                              htmlFor="rci-projection-67"
                            >
                              Projection rente capital à 67 ans
                            </label>
                            <input
                              type="text"
                              id="rci-projection-67"
                              className="points-input"
                              placeholder="Montant rente (€)"
                              inputMode="numeric"
                              value={rciDashboardValues.projection67Amount}
                              style={{ width: "150px" }}
                              onChange={(e) =>
                                handleRciDashboardChange(
                                  "projection67Amount",
                                  e.target.value
                                )
                              }
                              onKeyDown={handleRciKeyDown}
                            />
                          </div>
                        </div>
                      </Collapse>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </TabPane>
            <TabPane tabId="per">
              <Card className="mb-1">
                <CardBody>
                  <p className="mb-0 text-muted">Paramètres PER.</p>
                </CardBody>
              </Card>
            </TabPane>
          </TabContent>
        </TabPane>

        <TabPane tabId="hypotheses">
          <Card className="mb-1 bilan-card">
            <CardBody className="hypo-indent-lg">
              <div className="hypo-flex-container">
                <div className="hypo-col-form">
                  <FormGroup tag="fieldset" style={{ fontSize: "1rem" }}>
                    <legend className="h6">
                      Hypothèses de fin de carrière
                    </legend>
                    <div className="hypo-grid" style={{ marginBottom: 8 }}>
                      {/* Sans */}
                      <div className="hypo-row">
                        <span className="hypo-label">Sans</span>
                        <div className="hypo-ctrl">
                          <ButtonRadioSwitch
                            noLabel
                            checked={sans}
                            onChange={(e) => setSans(e.target.checked)}
                          />
                        </div>
                      </div>

                      {/* Rachat de trimestres (VPLR) */}
                      <div className="hypo-row">
                        <span className="hypo-label">
                          Rachat de trimestres (VPLR)
                        </span>
                        <div className="hypo-ctrl">
                          <div className="vplr-stack">
                            <div className="vplr-switch-line">
                              <ButtonRadioSwitch
                                noLabel
                                className={classnames(
                                  "vplr-toggle",
                                  vplrChoice === "etude"
                                    ? "primary-right"
                                    : "primary-left"
                                )}
                                checked={vplrChoice === "etude"}
                                onChange={(e) =>
                                  setVplrChoice(
                                    e.target.checked ? "etude" : "incomplete"
                                  )
                                }
                              />
                              {vplrChoice === "etude" && (
                                <button
                                  type="button"
                                  className="vplr-add-btn"
                                  style={{
                                    width: 28,
                                    height: 28,
                                    borderRadius: "45%",
                                    padding: 0,
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                  }}
                                  onClick={() =>
                                    setVplrEntries((prev) => [
                                      ...(Array.isArray(prev) ? prev : []),
                                      {
                                        id: Date.now(),
                                        year: "",
                                        trimestres: "",
                                      },
                                    ])
                                  }
                                  aria-label="Ajouter un rachat d'année d'étude"
                                >
                                  +
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      <Collapse isOpen={vplrChoice === "etude"}>
                        <div
                          className="hypo-row"
                          style={{ paddingTop: 0, gap: 0 }}
                        >
                          <span
                            className="hypo-label spacer"
                            aria-hidden="true"
                          />
                          <div className="hypo-ctrl">
                            <div
                              className="hypo-panel"
                              style={{ marginTop: 8, maxWidth: 480 }}
                            >
                              {Array.isArray(vplrEntries) &&
                              vplrEntries.length ? (
                                <div className="vplr-entries">
                                  {vplrEntries.map((row) => (
                                    <div
                                      key={row.id}
                                      className="vplr-entry-row"
                                    >
                                      <span className="vplr-entry-label">
                                        Année
                                      </span>
                                      <input
                                        type="number"
                                        className="inline-input vplr-entry-input"
                                        value={(row && row.year) || ""}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          setVplrEntries((prev) =>
                                            (Array.isArray(prev)
                                              ? prev
                                              : []
                                            ).map((r) =>
                                              r && r.id === row.id
                                                ? { ...r, year: val }
                                                : r
                                            )
                                          );
                                        }}
                                        min="0"
                                        inputMode="numeric"
                                      />
                                      <span className="vplr-entry-label">
                                        Nombre de trimestres
                                      </span>
                                      <input
                                        type="number"
                                        className="inline-input vplr-entry-input"
                                        value={(row && row.trimestres) || ""}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          setVplrEntries((prev) =>
                                            (Array.isArray(prev)
                                              ? prev
                                              : []
                                            ).map((r) =>
                                              r && r.id === row.id
                                                ? { ...r, trimestres: val }
                                                : r
                                            )
                                          );
                                        }}
                                        min="0"
                                        inputMode="numeric"
                                      />
                                      <button
                                        type="button"
                                        className="action-btn danger"
                                        aria-label="Supprimer cette ligne"
                                        onClick={() =>
                                          setVplrEntries((prev) =>
                                            Array.isArray(prev)
                                              ? prev.filter(
                                                  (r) => r && r.id !== row.id
                                                )
                                              : []
                                          )
                                        }
                                      >
                                        <svg
                                          width="16"
                                          height="16"
                                          viewBox="0 0 24 24"
                                          fill="none"
                                          stroke="currentColor"
                                          strokeWidth="2"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          aria-hidden="true"
                                        >
                                          <polyline points="3 6 5 6 21 6"></polyline>
                                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
                                          <path d="M10 11v6"></path>
                                          <path d="M14 11v6"></path>
                                          <path d="M9 6V4h6v2"></path>
                                        </svg>
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p
                                  className="mb-0 text-muted"
                                  style={{ fontSize: "0.9rem" }}
                                >
                                  Ajoutez vos années à racheter avec le bouton
                                  +.
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </Collapse>

                      {/* Salaire par défaut jusqu'au départ (même comportement que les lignes Non) */}
                      <div
                        className="hypo-row"
                        style={{ display: sans ? undefined : "none" }}
                      >
                        <div className="hypo-label label-with-info">
                          <span className="nowrap">Salaire(s) à projeter</span>
                          {!isSalaryProjected && (
                            <span
                              className="hypo-info-icon"
                              aria-label="Informations sur la projection de salaire"
                              tabIndex={0}
                            >
                              i
                              <span className="hypo-tooltip">
                                Prise en compte par défaut des dernières
                                rémunérations enregistrées
                              </span>
                            </span>
                          )}
                        </div>
                        <div className="hypo-ctrl">
                          <ButtonRadioSwitch
                            noLabel
                            checked={isSalaryProjected}
                            onChange={(e) =>
                              setIsSalaryProjected(e.target.checked)
                            }
                          />
                        </div>
                      </div>
                    </div>

                    {/* Panel animé pour le cas Oui: saisir le salaire par défaut */}
                    <Collapse isOpen={isSalaryProjected && !!sans}>
                      <div
                        className="hypo-panel mb-50"
                        style={{ marginTop: 12, maxWidth: "70%" }}
                      >
                        <div
                          className="hypo-salary-row nowrap"
                          style={{
                            marginBottom: 0,
                            alignItems: "center",
                            flexWrap: "nowrap",
                            gap: 12,
                          }}
                        >
                          <span className="hypo-salary-label">
                            Salaire actuel jusqu’au départ
                          </span>
                          <div className="hypo-salary-inputwrap">
                            <span
                              aria-hidden="true"
                              style={{
                                position: "absolute",
                                right: 10,
                                top: "50%",
                                transform: "translateY(-50%)",
                                color: "#6e6b7b",
                                pointerEvents: "none",
                                fontWeight: 600,
                              }}
                            >
                              €
                            </span>

                            {salaireDefautRowSafe.fixed ? (
                              <input
                                type="text"
                                readOnly
                                className="form-control"
                                value={salaireDefautRowSafe.value ?? ""}
                                onClick={() => {
                                  setSalaireDefautRow((prev) => ({
                                    ...(prev && typeof prev === "object"
                                      ? prev
                                      : { id: "def", value: "", fixed: false }),
                                    fixed: false,
                                  }));
                                  setTimeout(() => {
                                    const el = document.getElementById(
                                      "salaire-defaut-input"
                                    );
                                    if (el) {
                                      el.focus();
                                      const len = el.value.length;
                                      el.setSelectionRange(len, len);
                                    }
                                  }, 0);
                                }}
                                title="Cliquez pour modifier"
                                style={{
                                  paddingRight: 26,
                                  textAlign: "right",
                                  borderRadius: 6,
                                  background: "#fff",
                                }}
                              />
                            ) : (
                              <input
                                id="salaire-defaut-input"
                                type="text"
                                inputMode="decimal"
                                pattern="[0-9]*"
                                className="form-control"
                                value={salaireDefautRowSafe.value ?? ""}
                                onKeyDown={(e) => {
                                  if (!isAllowedKey(e)) e.preventDefault();
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    const raw = (
                                      (salaireDefautRowSafe &&
                                        salaireDefautRowSafe.value) ||
                                      ""
                                    )
                                      .toString()
                                      .replace(/\s/g, "")
                                      .replace(",", ".");
                                    const num = parseFloat(raw);
                                    const formatted = isNaN(num)
                                      ? salaireDefautRowSafe
                                        ? salaireDefautRowSafe.value
                                        : ""
                                      : new Intl.NumberFormat("fr-FR", {
                                          minimumFractionDigits: 2,
                                          maximumFractionDigits: 2,
                                        }).format(num);
                                    setSalaireDefautRow((prev) => ({
                                      ...(prev && typeof prev === "object"
                                        ? prev
                                        : {
                                            id: "def",
                                            value: "",
                                            fixed: false,
                                          }),
                                      value: formatted,
                                      fixed: true,
                                    }));
                                    e.currentTarget.blur();
                                  }
                                }}
                                onChange={(e) => {
                                  const val = sanitizeSalaryInput(
                                    e.target.value
                                  );
                                  setSalaireDefautRow((prev) => ({
                                    ...(prev && typeof prev === "object"
                                      ? prev
                                      : { id: "def", value: "", fixed: false }),
                                    value: val,
                                  }));
                                }}
                                placeholder="0,00"
                                style={{
                                  paddingRight: 26,
                                  textAlign: "right",
                                  borderRadius: 6,
                                  background: "#fff",
                                }}
                              />
                            )}
                          </div>
                          <div
                            className="hypo-date-row"
                            style={{ marginLeft: 8 }}
                          >
                            <span className="hypo-date-sep">Du</span>
                            <input
                              type="date"
                              className="hypo-date-input"
                              value={normalizeDate(
                                salaireDefautRowSafe &&
                                  salaireDefautRowSafe.from
                              )}
                              onMouseDown={(e) => {
                                try {
                                  e.currentTarget.showPicker &&
                                    e.currentTarget.showPicker();
                                } catch {}
                              }}
                              onFocus={(e) => {
                                try {
                                  e.currentTarget.showPicker &&
                                    e.currentTarget.showPicker();
                                } catch {}
                              }}
                              onChange={(e) => {
                                const v = e.currentTarget.value || "";
                                setSalaireDefautRow((prev) => ({
                                  ...(prev && typeof prev === "object"
                                    ? prev
                                    : { id: "def", value: "", fixed: false }),
                                  from: v,
                                }));
                              }}
                              aria-label="Date de début (salaire actuel)"
                            />
                            <span className="hypo-date-sep">au</span>
                            <input
                              type="date"
                              className="hypo-date-input"
                              value={normalizeDate(
                                salaireDefautRowSafe && salaireDefautRowSafe.to
                              )}
                              onMouseDown={(e) => {
                                try {
                                  e.currentTarget.showPicker &&
                                    e.currentTarget.showPicker();
                                } catch {}
                              }}
                              onFocus={(e) => {
                                try {
                                  e.currentTarget.showPicker &&
                                    e.currentTarget.showPicker();
                                } catch {}
                              }}
                              onChange={(e) => {
                                const v = e.currentTarget.value || "";
                                setSalaireDefautRow((prev) => ({
                                  ...(prev && typeof prev === "object"
                                    ? prev
                                    : { id: "def", value: "", fixed: false }),
                                  to: v,
                                }));
                              }}
                              aria-label="Date de fin (salaire actuel)"
                            />
                          </div>
                          <div className="hypo-salary-toggle inline">
                            <span className="label">
                              Projeter plusieurs salaires&nbsp;?
                            </span>
                            <ButtonRadioSwitch
                              noLabel
                              checked={projectMultiple}
                              onChange={(e) =>
                                setProjectMultiple(e.target.checked)
                              }
                            />
                          </div>
                        </div>
                      </div>
                      {projectMultiple && (
                        <div
                          className="hypo-panel mb-50"
                          style={{ marginTop: 16, maxWidth: 640 }}
                        >
                          <div className="hypo-panel-header mb-1">
                            <span
                              className="text-body"
                              style={{ fontWeight: 600 }}
                            >
                              Salaire(s) supplémentaires
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setSalaireJusquaDepartRows((prev) => [
                                  ...(Array.isArray(prev) ? prev : []),
                                  { id: Date.now(), value: "", fixed: false },
                                ])
                              }
                              aria-label="Ajouter un salaire supplémentaire"
                              style={{
                                border: "1px solid var(--bs-primary, #7367F0)",
                                color: "var(--bs-primary, #7367F0)",
                                background: "#fff",
                                borderRadius: 20,
                                padding: "2px 8px",
                                lineHeight: 1.2,
                                cursor: "pointer",
                                fontWeight: 600,
                                alignSelf: "flex-start",
                                width: "auto",
                                display: "inline-flex",
                              }}
                            >
                              +
                            </button>
                          </div>
                          <div>
                            {renderSalaireRows(safeSalaireRows, {
                              labelOffset: 2,
                              canDeleteFirst: true,
                            })}
                          </div>
                        </div>
                      )}
                    </Collapse>

                    {/* Zone dynamique "Salaire(s) jusqu’au départ" quand Non */}
                    {/* <Collapse isOpen={!isSalaryProjected && !!sans}>
                  <div
                    className='hypo-panel mb-50'
                    style={{ marginTop: 12, maxWidth: 640 }}
                  >
                    <div className='hypo-panel-header mb-1'>
                      <span className='text-body' style={{ fontWeight: 600 }}>Salaire(s) jusqu’au départ</span>
                    </div>

                    <div>
                      {renderSalaireRows(safeSalaireRows, { labelOffset: 1, canDeleteFirst: false })}
                    </div>
                  </div>
                </Collapse> */}

                    {/* Autres switches */}
                    <div className="hypo-grid" style={{ marginTop: 16 }}>
                      <div className="hypo-row">
                        <span className="hypo-label">Chômage</span>
                        <div className="hypo-ctrl">
                          <ButtonRadioSwitch
                            noLabel
                            checked={chomage}
                            onChange={(e) => setChomage(e.target.checked)}
                          />
                        </div>
                      </div>

                      {/* Pavé Chômage – visible quand Oui */}
                      <Collapse isOpen={!!chomage}>
                        <div
                          className="hypo-panel mb-50"
                          style={{ maxWidth: "57%" }}
                        >
                          <div className="chomage-panel-fields">
                            <div className="chomage-dual-row">
                              <span
                                className="hypo-salary-label"
                                style={{ minWidth: "auto" }}
                              >
                                À partir de
                              </span>
                              <input
                                type="date"
                                className="hypo-date-input"
                                value={normalizeDate(chomageStartDate)}
                                onMouseDown={(e) => {
                                  try {
                                    e.currentTarget.showPicker &&
                                      e.currentTarget.showPicker();
                                  } catch {}
                                }}
                                onFocus={(e) => {
                                  try {
                                    e.currentTarget.showPicker &&
                                      e.currentTarget.showPicker();
                                  } catch {}
                                }}
                                onChange={(e) =>
                                  setChomageStartDate(
                                    e.currentTarget.value || ""
                                  )
                                }
                                placeholder="JJ/MM/AAAA"
                              />
                              <span
                                className="hypo-salary-label"
                                style={{ minWidth: "auto" }}
                              >
                                Nombre de jours
                              </span>
                              {chomageJoursFixed ? (
                                <input
                                  type="number"
                                  readOnly
                                  className="form-control chomage-days"
                                  value={chomageJours}
                                  onClick={() => {
                                    setChomageJoursFixed(false);
                                    setTimeout(() => {
                                      const el =
                                        document.getElementById(
                                          "chomage-jours"
                                        );
                                      if (el) {
                                        el.focus();
                                        const len = el.value.length;
                                        el.setSelectionRange(len, len);
                                      }
                                    }, 0);
                                  }}
                                  title="Cliquez pour modifier"
                                  placeholder="0"
                                />
                              ) : (
                                <input
                                  id="chomage-jours"
                                  type="number"
                                  min={0}
                                  step={1}
                                  className="form-control chomage-days"
                                  value={chomageJours}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      setChomageJoursFixed(true);
                                      e.currentTarget.blur();
                                    }
                                  }}
                                  onChange={(e) =>
                                    setChomageJours(
                                      e.target.value.replace(/[^0-9]/g, "")
                                    )
                                  }
                                  placeholder="0"
                                />
                              )}
                              <span />
                              <span
                                className="hypo-salary-label"
                                style={{ minWidth: "auto" }}
                              >
                                Années
                              </span>
                              {chomageAnneesFixed ? (
                                <input
                                  type="number"
                                  readOnly
                                  className="form-control chomage-days"
                                  value={chomageAnnees}
                                  onClick={() => {
                                    setChomageAnneesFixed(false);
                                    setTimeout(() => {
                                      const el =
                                        document.getElementById(
                                          "chomage-annees"
                                        );
                                      if (el) {
                                        el.focus();
                                        const len = el.value.length;
                                        el.setSelectionRange(len, len);
                                      }
                                    }, 0);
                                  }}
                                  title="Cliquez pour modifier"
                                  placeholder="0"
                                />
                              ) : (
                                <input
                                  id="chomage-annees"
                                  type="number"
                                  min={0}
                                  step={1}
                                  className="form-control chomage-days"
                                  value={chomageAnnees}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      setChomageAnneesFixed(true);
                                      e.currentTarget.blur();
                                    }
                                  }}
                                  onChange={(e) =>
                                    setChomageAnnees(
                                      e.target.value.replace(/[^0-9]/g, "")
                                    )
                                  }
                                  placeholder="0"
                                />
                              )}
                            </div>
                          </div>
                        </div>
                      </Collapse>

                      <div
                        className={classnames("hypo-row", {
                          "ui-disabled": isCarriereLongueLocked,
                        })}
                        aria-disabled={isCarriereLongueLocked}
                      >
                        <span className="hypo-label">Carrière longue</span>
                        <div className="hypo-ctrl">
                          <ButtonRadioSwitch
                            noLabel
                            checked={carriereLongue}
                            onToggle={handleCarriereLongueToggle}
                          />
                        </div>
                      </div>

                      {/* Pavé Carrière longue – visible quand Oui */}
                      <Collapse isOpen={!!carriereLongue}>
                        <div
                          className="hypo-panel mb-50"
                          style={{ marginTop: 0, maxWidth: 650 }}
                        >
                          <div className="chomage-panel-fields">
                            {[21, 20, 18, 16].map((age) => (
                              <div
                                key={age}
                                className="chomage-row"
                                style={{ marginBottom: 6 }}
                              >
                                <span
                                  className="hypo-salary-label"
                                  style={{ marginRight: 0, minWidth: "auto" }}
                                >{`Trimestre avant ${age} ans`}</span>
                                {clAvantFixed[String(age)] ? (
                                  <input
                                    type="number"
                                    readOnly
                                    className="form-control chomage-trim"
                                    value={clAvantCount[String(age)]}
                                    onClick={() =>
                                      setClAvantFixed((prev) => ({
                                        ...(prev || {}),
                                        [String(age)]: false,
                                      }))
                                    }
                                    title="Cliquez pour modifier"
                                    placeholder="0"
                                  />
                                ) : (
                                  <input
                                    id={`cl-trim-avant-${age}`}
                                    type="number"
                                    min={0}
                                    step={1}
                                    className="form-control chomage-trim"
                                    value={clAvantCount[String(age)]}
                                    max={172}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        e.preventDefault();
                                        setClAvantFixed((prev) => ({
                                          ...(prev || {}),
                                          [String(age)]: true,
                                        }));
                                        e.currentTarget.blur();
                                      }
                                    }}
                                    onChange={(e) => {
                                      const raw = (
                                        e.target.value || ""
                                      ).replace(/[^0-9]/g, "");
                                      if (raw === "") {
                                        setClAvantCount((prev) => ({
                                          ...(prev || {}),
                                          [String(age)]: "",
                                        }));
                                        return;
                                      }
                                      let n = parseInt(raw, 10);
                                      if (isNaN(n)) n = 0;
                                      if (n < 0) n = 0;
                                      if (n > 172) n = 172;
                                      setClAvantCount((prev) => ({
                                        ...(prev || {}),
                                        [String(age)]: String(n),
                                      }));
                                    }}
                                    placeholder="0"
                                  />
                                )}
                                <span className="hypo-date-sep">Du</span>
                                <input
                                  type="date"
                                  className="hypo-date-input"
                                  value={normalizeDate(
                                    clAvantDates[String(age)] &&
                                      clAvantDates[String(age)].from
                                  )}
                                  onMouseDown={(e) => {
                                    try {
                                      e.currentTarget.showPicker &&
                                        e.currentTarget.showPicker();
                                    } catch {}
                                  }}
                                  onFocus={(e) => {
                                    try {
                                      e.currentTarget.showPicker &&
                                        e.currentTarget.showPicker();
                                    } catch {}
                                  }}
                                  onChange={(e) => {
                                    const v = e.currentTarget.value || "";
                                    setClAvantDates((prev) => ({
                                      ...(prev || {}),
                                      [String(age)]: {
                                        ...(prev && prev[String(age)]
                                          ? prev[String(age)]
                                          : { from: "", to: "" }),
                                        from: v,
                                      },
                                    }));
                                  }}
                                  aria-label={`Date de début pour trimestre avant ${age} ans (Carrière longue)`}
                                />
                                <span className="hypo-date-sep">au</span>
                                <input
                                  type="date"
                                  className="hypo-date-input"
                                  value={normalizeDate(
                                    clAvantDates[String(age)] &&
                                      clAvantDates[String(age)].to
                                  )}
                                  onMouseDown={(e) => {
                                    try {
                                      e.currentTarget.showPicker &&
                                        e.currentTarget.showPicker();
                                    } catch {}
                                  }}
                                  onFocus={(e) => {
                                    try {
                                      e.currentTarget.showPicker &&
                                        e.currentTarget.showPicker();
                                    } catch {}
                                  }}
                                  onChange={(e) => {
                                    const v = e.currentTarget.value || "";
                                    setClAvantDates((prev) => ({
                                      ...(prev || {}),
                                      [String(age)]: {
                                        ...(prev && prev[String(age)]
                                          ? prev[String(age)]
                                          : { from: "", to: "" }),
                                        to: v,
                                      },
                                    }));
                                  }}
                                  aria-label={`Date de fin pour trimestre avant ${age} ans (Carrière longue)`}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      </Collapse>

                      <div
                        className={classnames("hypo-row", {
                          "ui-disabled": isRetraiteProgressiveLocked,
                        })}
                        style={{ marginBottom: 0 }}
                        aria-disabled={isRetraiteProgressiveLocked}
                      >
                        <span className="hypo-label">Retraite progressive</span>
                        <div className="hypo-ctrl">
                          <ButtonRadioSwitch
                            noLabel
                            checked={retraiteProgressive}
                            onToggle={handleRetraiteToggle}
                          />
                        </div>
                      </div>

                      {/* Pavé Retraite progressive – visible quand Oui */}
                      <Collapse isOpen={!!retraiteProgressive}>
                        <div
                          className="hypo-panel mb-50"
                          style={{
                            marginTop: 0,
                            maxWidth: 705,
                            background: "#fff",
                            border: "1px solid #E5E7EB",
                            borderRadius: 8,
                            padding: "1rem",
                          }}
                        >
                          {/* Partie 1 — Données principales */}
                          <div className="prog-panel-fields nowrap">
                            {/* Date de début */}
                            <div className="prog-field">
                              <label htmlFor="prog-start">Date de début</label>
                              {progStartDateFixed ? (
                                <input
                                  type="date"
                                  readOnly
                                  className="form-control hypo-date-input prog-date"
                                  value={normalizeDate(progStartDate)}
                                  onClick={() => {
                                    setProgStartDateFixed(false);
                                    setTimeout(() => {
                                      const el =
                                        document.getElementById("prog-start");
                                      if (el) el.focus();
                                    }, 0);
                                  }}
                                  title="Cliquez pour modifier"
                                />
                              ) : (
                                <input
                                  id="prog-start"
                                  type="date"
                                  className="form-control hypo-date-input prog-date"
                                  value={normalizeDate(progStartDate)}
                                  onMouseDown={(e) => {
                                    try {
                                      e.currentTarget.showPicker &&
                                        e.currentTarget.showPicker();
                                    } catch {}
                                  }}
                                  onFocus={(e) => {
                                    try {
                                      e.currentTarget.showPicker &&
                                        e.currentTarget.showPicker();
                                    } catch {}
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      setProgStartDateFixed(true);
                                      e.currentTarget.blur();
                                    }
                                  }}
                                  onChange={(e) =>
                                    setProgStartDate(
                                      e.currentTarget.value || ""
                                    )
                                  }
                                />
                              )}
                            </div>

                            {/* Pourcentage d’activité */}
                            <div className="prog-field">
                              <label htmlFor="prog-pct">
                                Pourcentage d’activité
                              </label>
                              <div className="prog-inputwrap">
                                {progPctFixed ? (
                                  <input
                                    type="number"
                                    readOnly
                                    className="form-control prog-pct"
                                    value={progPct}
                                    onClick={() => setProgPctFixed(false)}
                                    title="Cliquez pour modifier"
                                    placeholder="0"
                                    style={{
                                      textAlign: "center",
                                      paddingRight: 22,
                                    }}
                                  />
                                ) : (
                                  <input
                                    id="prog-pct"
                                    type="number"
                                    min={0}
                                    max={100}
                                    step={1}
                                    className="form-control prog-pct"
                                    value={progPct}
                                    onKeyDown={(e) => {
                                      if (!isDigitKeyOnly(e))
                                        e.preventDefault();
                                      if (e.key === "Enter") {
                                        e.preventDefault();
                                        setProgPctFixed(true);
                                        e.currentTarget.blur();
                                      }
                                    }}
                                    onChange={(e) => {
                                      const raw = (
                                        e.target.value || ""
                                      ).replace(/[^0-9]/g, "");
                                      if (raw === "") {
                                        setProgPct("");
                                        return;
                                      }
                                      let n = parseInt(raw, 10);
                                      if (isNaN(n)) n = 0;
                                      if (n < 0) n = 0;
                                      if (n > 100) n = 100;
                                      setProgPct(String(n));
                                    }}
                                    placeholder="0"
                                    style={{
                                      textAlign: "center",
                                      paddingRight: 22,
                                    }}
                                  />
                                )}
                                <span
                                  aria-hidden="true"
                                  style={{
                                    position: "absolute",
                                    right: 10,
                                    top: "50%",
                                    transform: "translateY(-50%)",
                                    color: "#6e6b7b",
                                    pointerEvents: "none",
                                    fontWeight: 600,
                                  }}
                                >
                                  %
                                </span>
                              </div>
                            </div>

                            {/* Salaire */}
                            <div className="prog-field">
                              <label htmlFor="prog-salary">Salaire</label>
                              <div className="prog-salary-wrap">
                                {progSalaryFixed ? (
                                  <input
                                    type="text"
                                    readOnly
                                    className="form-control"
                                    value={progSalary}
                                    onClick={() => {
                                      setProgSalaryFixed(false);
                                      setTimeout(() => {
                                        const el =
                                          document.getElementById(
                                            "prog-salary"
                                          );
                                        if (el) {
                                          el.focus();
                                          const len = el.value.length;
                                          el.setSelectionRange(len, len);
                                        }
                                      }, 0);
                                    }}
                                    title="Cliquez pour modifier"
                                    placeholder="0,00"
                                    style={{
                                      textAlign: "center",
                                      paddingRight: 22,
                                    }}
                                  />
                                ) : (
                                  <input
                                    id="prog-salary"
                                    type="text"
                                    inputMode="decimal"
                                    pattern="[0-9]*"
                                    className="form-control"
                                    value={progSalary}
                                    onKeyDown={(e) => {
                                      if (!isAllowedKey(e)) e.preventDefault();
                                      if (e.key === "Enter") {
                                        e.preventDefault();
                                        setProgSalaryFixed(true);
                                        e.currentTarget.blur();
                                      }
                                    }}
                                    onChange={(e) =>
                                      setProgSalary(
                                        sanitizeSalaryInput(e.target.value)
                                      )
                                    }
                                    placeholder="0,00"
                                    style={{
                                      textAlign: "center",
                                      paddingRight: 22,
                                    }}
                                  />
                                )}
                                <span
                                  aria-hidden="true"
                                  style={{
                                    position: "absolute",
                                    right: 10,
                                    top: "50%",
                                    transform: "translateY(-50%)",
                                    color: "#6e6b7b",
                                    pointerEvents: "none",
                                    fontWeight: 600,
                                  }}
                                >
                                  €
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Partie 2 — Surcôtisation */}
                          {retraiteProgressive && (
                            <div className="prog-surco-row">
                              <span className="prog-label">Surcôtisation</span>
                              <div>
                                <ButtonRadioSwitch
                                  noLabel
                                  checked={progSurcotisation}
                                  onChange={(e) =>
                                    setProgSurcotisation(e.target.checked)
                                  }
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </Collapse>
                      {/* Cumul emploi de retraite */}
                      <div
                        className={classnames("hypo-row", {
                          "ui-disabled": isCumulLocked,
                        })}
                        aria-disabled={isCumulLocked}
                      >
                        <span className="hypo-label">
                          Cumul emploi de retraite
                        </span>
                        <div className="hypo-ctrl">
                          <ButtonRadioSwitch
                            noLabel
                            checked={cumulEmploiRetraite}
                            onToggle={handleCumulToggle}
                          />
                        </div>
                      </div>
                    </div>
                  </FormGroup>
                </div>
                <div className="hypo-col-table">
                  <div
                    className="bilan-wrap"
                    style={{
                      overflow: "hidden",
                      marginBottom: 16,
                      width: "100%",
                      margin: 0,
                    }}
                  >
                    <div className="table-responsive">
                      <table className="choice-table cols-3">
                        <colgroup>
                          <col style={{ width: "50%" }} />
                          <col style={{ width: "25%" }} />
                          <col style={{ width: "25%" }} />
                        </colgroup>
                        <thead>
                          <tr>
                            <th>Âge</th>
                            <th>Date correspondante</th>
                            <th>Choisir la date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {safeRetirementChoices.map((row) => (
                            <tr key={row.id}>
                              <td>
                                <div className="age-cell">
                                  <span className="age-label">{row.label}</span>
                                  {row.fixedAge ? (
                                    <span className="age-value">
                                      <input
                                        type="text"
                                        readOnly
                                        className="inline-input"
                                        value={(row && row.age) ?? ""}
                                        onClick={() =>
                                          setRetirementChoices((prev) =>
                                            prev.map((r) =>
                                              r && r.id === row.id
                                                ? { ...r, fixedAge: false }
                                                : r
                                            )
                                          )
                                        }
                                        style={{
                                          width: 90,
                                          textAlign: "center",
                                          background: "#F9FAFB",
                                          cursor: "pointer",
                                        }}
                                        aria-label={`Âge pour ${row.label}`}
                                      />
                                      <span>ans</span>
                                    </span>
                                  ) : (
                                    <span className="age-value">
                                      <input
                                        type="text"
                                        inputMode="decimal"
                                        pattern="[0-9,\\.]*"
                                        className="inline-input"
                                        style={{
                                          width: 90,
                                          textAlign: "center",
                                        }}
                                        value={(row && row.age) ?? ""}
                                        onChange={(e) =>
                                          setRetirementChoices((prev) =>
                                            prev.map((r) =>
                                              r && r.id === row.id
                                                ? { ...r, age: e.target.value }
                                                : r
                                            )
                                          )
                                        }
                                        onBlur={(e) => {
                                          const v = e.target.value.trim();
                                          const parts = v.split(/[,.]/);
                                          let next = "";
                                          if (parts.length) {
                                            next =
                                              parts[0] +
                                              (parts.length > 1
                                                ? "," +
                                                  parts
                                                    .slice(1)
                                                    .join("")
                                                    .replace(/,/g, "")
                                                : "");
                                          }
                                          const dob = getBirthDate();
                                          let nextDate =
                                            (row && row.date) || "";
                                          if (dob && next !== "") {
                                            const y = parseInt(next, 10);
                                            if (!Number.isNaN(y)) {
                                              const d = new Date(
                                                dob.getFullYear() + y,
                                                dob.getMonth(),
                                                dob.getDate()
                                              );
                                              if (!isNaN(d.getTime()))
                                                nextDate = d
                                                  .toISOString()
                                                  .slice(0, 10);
                                            }
                                          }
                                          setRetirementChoices((prev) =>
                                            prev.map((r) =>
                                              r && r.id === row.id
                                                ? {
                                                    ...r,
                                                    age: next,
                                                    date: nextDate,
                                                    fixedAge: true,
                                                  }
                                                : r
                                            )
                                          );
                                        }}
                                        onKeyDown={(e) => {
                                          if (!isDigitKeyOnly(e))
                                            e.preventDefault();
                                          if (e.key === "Enter") {
                                            const n = parseInt(
                                              (row && row.age) || "",
                                              10
                                            );
                                            if (!Number.isNaN(n)) {
                                              const clamped = Math.min(
                                                120,
                                                Math.max(18, n)
                                              );
                                              setRetirementChoices((prev) =>
                                                prev.map((r) =>
                                                  r && r.id === row.id
                                                    ? {
                                                        ...r,
                                                        age: String(clamped),
                                                        fixedAge: true,
                                                      }
                                                    : r
                                                )
                                              );
                                            } else {
                                              setRetirementChoices((prev) =>
                                                prev.map((r) =>
                                                  r && r.id === row.id
                                                    ? { ...r, fixedAge: true }
                                                    : r
                                                )
                                              );
                                            }
                                          }
                                        }}
                                        placeholder="Ex: 62"
                                        aria-label={`Âge pour ${row.label}`}
                                      />
                                      <span>ans</span>
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td>
                                {row.fixedDate ? (
                                  <input
                                    type="text"
                                    readOnly
                                    className="inline-input"
                                    onClick={() =>
                                      setRetirementChoices((prev) =>
                                        prev.map((r) =>
                                          r && r.id === row.id
                                            ? { ...r, fixedDate: false }
                                            : r
                                        )
                                      )
                                    }
                                    style={{
                                      width: 130,
                                      textAlign: "center",
                                      background: "#F9FAFB",
                                      cursor: "pointer",
                                    }}
                                    value={(row && row.date) ?? ""}
                                    aria-label={`Date correspondante pour ${row.label}`}
                                  />
                                ) : (
                                  <input
                                    type="date"
                                    className="inline-input"
                                    style={{
                                      width: 130,
                                      textAlign: "center",
                                      cursor: "pointer",
                                    }}
                                    value={(row && row.date) ?? ""}
                                    onMouseDown={(e) => {
                                      try {
                                        e.currentTarget.showPicker &&
                                          e.currentTarget.showPicker();
                                      } catch {}
                                    }}
                                    onFocus={(e) => {
                                      try {
                                        e.currentTarget.showPicker &&
                                          e.currentTarget.showPicker();
                                      } catch {}
                                    }}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      const dob = getBirthDate();
                                      let nextAge = (row && row.age) || "";
                                      if (dob && val) {
                                        const at = new Date(val);
                                        if (!isNaN(at.getTime())) {
                                          let age =
                                            at.getFullYear() -
                                            dob.getFullYear();
                                          const m =
                                            at.getMonth() - dob.getMonth();
                                          if (
                                            m < 0 ||
                                            (m === 0 &&
                                              at.getDate() < dob.getDate())
                                          )
                                            age--;
                                          if (age >= 0) nextAge = String(age);
                                        }
                                      }
                                      setRetirementChoices((prev) =>
                                        prev.map((r) =>
                                          r && r.id === row.id
                                            ? { ...r, date: val, age: nextAge }
                                            : r
                                        )
                                      );
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter")
                                        setRetirementChoices((prev) =>
                                          prev.map((r) =>
                                            r && r.id === row.id
                                              ? { ...r, fixedDate: true }
                                              : r
                                          )
                                        );
                                    }}
                                    aria-label={`Date correspondante pour ${row.label}`}
                                  />
                                )}
                              </td>
                              <td>
                                <ButtonRadioSwitch
                                  noLabel
                                  textWeight={700}
                                  checked={!!(row && row.selected)}
                                  onToggle={(val) =>
                                    setRetirementChoices((prev) =>
                                      (Array.isArray(prev) ? prev : []).map(
                                        (r) =>
                                          r && r.id === row.id
                                            ? !!r.selected === !!val
                                              ? r
                                              : { ...r, selected: !!val }
                                            : r
                                      )
                                    )
                                  }
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </TabPane>

        <TabPane tabId="bilan">
          <div
            style={{
              width: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
            }}
          >
            <Card className="mb-1" style={{ width: "100%" }}>
              <CardBody>
                {/* Dates libres */}
                <div style={{ marginTop: 16 }}>
                  <h6 className="mb-1 section-title">Dates libres</h6>
                  <div className="bilan-wrap" style={{ overflow: "hidden" }}>
                    <div className="table-responsive">
                      <table className="choice-table cols-3">
                        <colgroup>
                          <col style={{ width: "40%" }} />
                          <col style={{ width: "40%" }} />
                          <col style={{ width: "68px" }} />
                        </colgroup>
                        <thead>
                          <tr>
                            <th>Date libre</th>
                            <th>Âge calculé</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {safeFreeDates.map((row, idx) => (
                            <tr key={row.id}>
                              <td>
                                <input
                                  type="date"
                                  className="inline-input"
                                  style={{ width: 130, cursor: "pointer" }}
                                  value={(row && row.date) ?? ""}
                                  onMouseDown={(e) => {
                                    try {
                                      e.currentTarget.showPicker &&
                                        e.currentTarget.showPicker();
                                    } catch {}
                                  }}
                                  onFocus={(e) => {
                                    try {
                                      e.currentTarget.showPicker &&
                                        e.currentTarget.showPicker();
                                    } catch {}
                                  }}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setFreeDates((prev) =>
                                      (Array.isArray(prev) ? prev : []).map(
                                        (r) => {
                                          if (r && r.id === row.id) {
                                            const dob = getBirthDate();
                                            const at = val
                                              ? new Date(val)
                                              : null;
                                            const years =
                                              dob && at
                                                ? diffYearsAtDate(dob, at)
                                                : null;
                                            const newAge =
                                              years != null &&
                                              years >= 0 &&
                                              !r.fixedAge
                                                ? String(years)
                                                : r.age || "";
                                            return {
                                              ...r,
                                              date: val,
                                              age: newAge,
                                            };
                                          }
                                          return r;
                                        }
                                      )
                                    );
                                  }}
                                  aria-label={`Date libre ${idx + 1}`}
                                />
                              </td>
                              <td>
                                {(() => {
                                  const dob = getBirthDate();
                                  const at =
                                    row && row.date ? new Date(row.date) : null;
                                  const years =
                                    dob && at ? diffYearsAtDate(dob, at) : null;
                                  const computed =
                                    years != null && years >= 0
                                      ? String(years)
                                      : "";
                                  const current =
                                    row &&
                                    row.age != null &&
                                    String(row.age).trim() !== ""
                                      ? String(row.age)
                                      : computed;
                                  return (
                                    <div
                                      style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: 6,
                                      }}
                                    >
                                      <input
                                        type="text"
                                        inputMode="decimal"
                                        pattern="[0-9,\.]*"
                                        className="inline-input"
                                        style={{
                                          width: 90,
                                          textAlign: "center",
                                        }}
                                        value={current}
                                        onKeyDown={(e) => {
                                          if (!isDigitKeyOnly(e))
                                            e.preventDefault();
                                        }}
                                        onChange={(e) => {
                                          let v =
                                            e.target.value == null
                                              ? ""
                                              : String(e.target.value);
                                          v = v.replace(/\./g, ",");
                                          const parts = v
                                            .replace(/[^0-9,]/g, "")
                                            .split(",");
                                          v =
                                            parts[0] +
                                            (parts.length > 1
                                              ? "," +
                                                parts
                                                  .slice(1)
                                                  .join("")
                                                  .replace(/,/g, "")
                                              : "");
                                          setFreeDates((prev) =>
                                            (Array.isArray(prev)
                                              ? prev
                                              : []
                                            ).map((r) =>
                                              r && r.id === row.id
                                                ? { ...r, age: v }
                                                : r
                                            )
                                          );
                                        }}
                                        onBlur={(e) => {
                                          const v = e.target.value;
                                          if (v === "") return;
                                          const n = parseInt(v, 10);
                                          if (Number.isNaN(n)) return;
                                          const clamped = Math.min(
                                            120,
                                            Math.max(18, n)
                                          );
                                          setFreeDates((prev) =>
                                            (Array.isArray(prev)
                                              ? prev
                                              : []
                                            ).map((r) =>
                                              r && r.id === row.id
                                                ? { ...r, age: String(clamped) }
                                                : r
                                            )
                                          );
                                        }}
                                        placeholder="Ex: 62"
                                        aria-label={`Âge calculé pour la date libre ${
                                          idx + 1
                                        }`}
                                      />
                                      <span>ans</span>
                                    </div>
                                  );
                                })()}
                              </td>
                              <td>
                                <div style={{ display: "inline-flex", gap: 8 }}>
                                  {/* Bouton + seulement sur la première ligne */}
                                  {idx === 0 && (
                                    <button
                                      type="button"
                                      className="action-btn"
                                      title="Ajouter une date libre"
                                      onClick={() =>
                                        setFreeDates((prev) => [
                                          ...(Array.isArray(prev) ? prev : []),
                                          { id: Date.now(), date: "", age: "" },
                                        ])
                                      }
                                    >
                                      <svg
                                        width="14"
                                        height="14"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        aria-hidden="true"
                                      >
                                        <line
                                          x1="12"
                                          y1="5"
                                          x2="12"
                                          y2="19"
                                        ></line>
                                        <line
                                          x1="5"
                                          y1="12"
                                          x2="19"
                                          y2="12"
                                        ></line>
                                      </svg>
                                    </button>
                                  )}
                                  {idx > 0 && (
                                    <button
                                      type="button"
                                      className="action-btn danger"
                                      title="Supprimer cette date libre"
                                      onClick={() =>
                                        setFreeDates((prev) =>
                                          (Array.isArray(prev)
                                            ? prev
                                            : []
                                          ).filter((r) => r && r.id !== row.id)
                                        )
                                      }
                                    >
                                      <svg
                                        width="18"
                                        height="18"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        aria-hidden="true"
                                      >
                                        <polyline points="3 6 5 6 21 6"></polyline>
                                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
                                        <path d="M10 11v6"></path>
                                        <path d="M14 11v6"></path>
                                        <path d="M9 6V4h6v2"></path>
                                      </svg>
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>

            {/* Historique des bilans retraite */}
            <Card className="mb-1" style={{ width: "100%" }}>
              <CardBody>
                <h6 className="mb-1 section-title">
                  Historique des bilans retraite
                </h6>
                <div className="bilan-wrap" style={{ overflow: "hidden" }}>
                  <div className="history-table-wrap">
                    <table className="history-table">
                      <colgroup>
                        <col style={{ width: "25%" }} />
                        <col style={{ width: "14%" }} />
                        <col style={{ width: "20%" }} />
                        <col style={{ width: "14%" }} />
                        <col style={{ width: "20%" }} />
                        <col style={{ width: "110px" }} />
                      </colgroup>
                      <thead>
                        <tr>
                          <th>Nom du bilan</th>
                          <th>Âge simulé</th>
                          <th>Simulation réalisée</th>
                          <th>Date d’édition</th>
                          <th>Rachat / Quotement</th>
                          <th className="actions-col">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(Array.isArray(bilanHistory) ? bilanHistory : []).map(
                          (item) => (
                            <tr key={item.id}>
                              <td>
                                <input
                                  type="text"
                                  className="inline-input"
                                  value={item.name || ""}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setBilanHistory((prev) =>
                                      (Array.isArray(prev) ? prev : []).map(
                                        (r) =>
                                          r && r.id === item.id
                                            ? { ...r, name: val }
                                            : r
                                      )
                                    );
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      const trimmed = (
                                        e.currentTarget.value || ""
                                      ).toString();
                                      setBilanHistory((prev) =>
                                        (Array.isArray(prev) ? prev : []).map(
                                          (r) =>
                                            r && r.id === item.id
                                              ? { ...r, name: trimmed }
                                              : r
                                        )
                                      );
                                      e.currentTarget.blur();
                                      try {
                                        localStorage.setItem(
                                          "bilan_history_ui",
                                          JSON.stringify(
                                            Array.isArray(bilanHistory)
                                              ? bilanHistory
                                              : []
                                          )
                                        );
                                      } catch {}
                                    }
                                  }}
                                  placeholder="Nom du bilan"
                                  aria-label="Nom du bilan"
                                />
                              </td>
                              <td>{item.age}</td>
                              <td>{item.type}</td>
                              <td>{item.date}</td>
                              <td>
                                <input
                                  type="text"
                                  className="inline-input"
                                  value={item.rachat || ""}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setBilanHistory((prev) =>
                                      (Array.isArray(prev) ? prev : []).map(
                                        (r) =>
                                          r && r.id === item.id
                                            ? { ...r, rachat: val }
                                            : r
                                      )
                                    );
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      const trimmed = (
                                        e.currentTarget.value || ""
                                      ).toString();
                                      setBilanHistory((prev) =>
                                        (Array.isArray(prev) ? prev : []).map(
                                          (r) =>
                                            r && r.id === item.id
                                              ? { ...r, rachat: trimmed }
                                              : r
                                        )
                                      );
                                      e.currentTarget.blur();
                                      try {
                                        localStorage.setItem(
                                          "bilan_history_ui",
                                          JSON.stringify(
                                            Array.isArray(bilanHistory)
                                              ? bilanHistory
                                              : []
                                          )
                                        );
                                      } catch {}
                                    }
                                  }}
                                  placeholder="—"
                                  aria-label="Rachat / Quotement"
                                />
                              </td>
                              <td className="actions-col">
                                <div style={{ display: "inline-flex", gap: 4 }}>
                                  <button
                                    type="button"
                                    className="action-btn"
                                    title="Télécharger (Word)"
                                    onClick={(e) => {
                                      e.preventDefault(); /* à implémenter plus tard */
                                    }}
                                  >
                                    <img
                                      src={wordIcon2025}
                                      alt="Word"
                                      width={18}
                                      height={18}
                                      style={{ display: "block" }}
                                    />
                                  </button>
                                  <button
                                    type="button"
                                    className="action-btn danger"
                                    title="Supprimer le bilan"
                                    onClick={() => setDeleteConfirmId(item.id)}
                                    aria-label="Supprimer le bilan"
                                  >
                                    <svg
                                      width="14"
                                      height="14"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      aria-hidden="true"
                                    >
                                      <polyline points="3 6 5 6 21 6"></polyline>
                                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
                                      <path d="M10 11v6"></path>
                                      <path d="M14 11v6"></path>
                                      <path d="M9 6V4h6v2"></path>
                                    </svg>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Confirmation de suppression */}
                <Modal
                  isOpen={!!deleteConfirmId}
                  toggle={() => setDeleteConfirmId(null)}
                >
                  <ModalHeader toggle={() => setDeleteConfirmId(null)}>
                    Confirmation
                  </ModalHeader>
                  <ModalBody>
                    Êtes-vous sûr de vouloir supprimer ce bilan ?
                  </ModalBody>
                  <ModalFooter>
                    <Button
                      color="secondary"
                      onClick={() => setDeleteConfirmId(null)}
                    >
                      Non
                    </Button>{" "}
                    <Button
                      color="danger"
                      onClick={() => {
                        setBilanHistory((prev) =>
                          (Array.isArray(prev) ? prev : []).filter(
                            (r) => r && r.id !== deleteConfirmId
                          )
                        );
                        setDeleteConfirmId(null);
                      }}
                    >
                      Oui
                    </Button>
                  </ModalFooter>
                </Modal>
              </CardBody>
            </Card>
          </div>
        </TabPane>
      </TabContent>
    </div>
  );
}
