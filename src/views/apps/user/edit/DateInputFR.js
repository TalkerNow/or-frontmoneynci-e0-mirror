import React, { useState, useEffect } from "react";
import InputMask from "react-input-mask";

const PLACEHOLDER = "JJ/MM/AAAA";

const isoToFr = (iso) => {
  if (!iso || typeof iso !== "string") return "";
  const parts = iso.split("-");
  if (parts.length < 3) return "";
  const [y, m, d] = parts;
  if (!/^\d{4}$/.test(y) || !/^\d{2}$/.test(m) || !/^\d{2}$/.test(d.slice(0, 2))) return "";
  return `${d.slice(0, 2)}/${m}/${y}`;
};

const frToIso = (fr) => {
  if (!fr) return "";
  const parts = fr.split("/");
  if (parts.length !== 3) return "";
  const [d, m, y] = parts;
  if (!/^\d{2}$/.test(d) || !/^\d{2}$/.test(m) || !/^\d{4}$/.test(y)) return "";
  const dN = parseInt(d, 10);
  const mN = parseInt(m, 10);
  if (dN < 1 || dN > 31 || mN < 1 || mN > 12) return "";
  return `${y}-${m}-${d}`;
};

const DateInputFR = ({ value = "", onChange, ...rest }) => {
  const [text, setText] = useState(isoToFr(value));

  useEffect(() => {
    // Ne resynchronise le texte depuis la prop que si l'ISO entrant diffère de
    // la saisie locale courante. Sinon une saisie partielle (ex: "15/03/202",
    // dont l'ISO est vide) serait écrasée par "" → tout le champ s'effaçait
    // après une seule touche « supprimer ». setText fonctionnel = pas besoin de
    // `text` dans les deps (évite le warning react-hooks/exhaustive-deps).
    setText((prev) => (frToIso(prev) === value ? prev : isoToFr(value)));
  }, [value]);

  const handleChange = (e) => {
    const raw = e.target.value;
    setText(raw);
    if (!onChange) return;
    const iso = frToIso(raw);
    const target = { ...e.target, value: iso };
    onChange({ ...e, target });
  };

  return (
    <InputMask
      mask="99/99/9999"
      maskChar={null}
      value={text}
      onChange={handleChange}
      placeholder={PLACEHOLDER}
      {...rest}
    />
  );
};

export default DateInputFR;
