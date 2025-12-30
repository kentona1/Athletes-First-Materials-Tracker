// Convert inches to feet'inches format
export const formatHeight = (inches) => {
  if (!inches) return '';

  const totalInches = parseInt(inches);
  if (isNaN(totalInches)) return inches;

  const feet = Math.floor(totalInches / 12);
  const remainingInches = totalInches % 12;

  return `${feet}'${remainingInches}"`;
};

// Convert feet'inches format to inches
export const parseHeight = (heightStr) => {
  if (!heightStr) return '';

  const match = heightStr.match(/(\d+)'(\d+)"/);
  if (match) {
    const feet = parseInt(match[1]);
    const inches = parseInt(match[2]);
    return (feet * 12) + inches;
  }

  return heightStr;
};
