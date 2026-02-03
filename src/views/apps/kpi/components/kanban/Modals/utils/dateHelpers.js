/**
 * Utilitaires pour la gestion des dates dans le kanban
 */

export const formatDateTimeLabel = (date, hour) => {
  if (!date) return "Sélectionner une date";
  const time = hour || "00:00";
  const dt = new Date(`${date}T${time}`);
  const dateLabel = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(dt);
  return `${dateLabel}  •  ${time}`;
};

export const isMorning = () => {
  const now = new Date();
  return now.getHours() < 13;
};

export const getNextEligibleDate = () => {
  const now = new Date();
  const tomorrow = new Date(now);
  const daysToAdd = now.getDay() === 5 ? 3 : 1; // Si vendredi, ajouter 3 jours (lundi)
  tomorrow.setDate(tomorrow.getDate() + daysToAdd);
  return tomorrow.toISOString().split("T")[0];
};

export const formatSuggestedDate = (hour) => {
  const now = new Date();
  const tomorrow = new Date(now);
  const daysToAdd = now.getDay() === 5 ? 3 : 1;
  tomorrow.setDate(tomorrow.getDate() + daysToAdd);
  const dateLabel = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(tomorrow);
  return `${dateLabel} ${hour.replace(":", "h")}`;
};

export const getRelativeDateBadge = (dateString) => {
  if (!dateString) return null;
  const datePart = dateString.split("T")[0];
  const date = new Date(`${datePart}T00:00:00`);
  const today = new Date();
  const startOfToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const yesterday = new Date(startOfToday);
  yesterday.setDate(yesterday.getDate() - 1);
  const tomorrow = new Date(startOfToday);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const toKey = (d) => d.toISOString().split("T")[0];
  const dateKey = toKey(date);

  if (dateKey === toKey(startOfToday)) {
    return { label: "Aujourd'hui", color: "success" };
  }
  if (dateKey === toKey(tomorrow)) {
    return { label: "Demain", color: "primary" };
  }
  if (dateKey === toKey(yesterday)) {
    return { label: "Hier", color: "warning" };
  }

  return null;
};
