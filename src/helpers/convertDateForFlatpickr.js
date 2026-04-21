export default (dateStr) => {
  if (!dateStr) return "";

  const parts = dateStr.split("-");
  if (parts.length === 3) {
    let year, month, day;

    // Si c'est yyyy-mm-dd (ex: 2021-12-20)
    if (parts[0].length === 4) {
      year = parseInt(parts[0]);
      month = parseInt(parts[1]) - 1; // JavaScript compte les mois de 0 à 11
      day = parseInt(parts[2]);
    }
    // Si c'est mm-dd-yyyy (ex: 12-20-2021)
    else if (parts[0].length <= 2 && parseInt(parts[0]) <= 12) {
      month = parseInt(parts[0]) - 1;
      day = parseInt(parts[1]);
      year = parseInt(parts[2]);
    }

    if (year && month !== undefined && day) {
      const resultDate = new Date(year, month, day);
      return resultDate;
    }
  }

  return dateStr;
};
