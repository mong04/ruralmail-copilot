// src/utils/addressFormat.ts
export const formatAddressForDisplay = (fullAddress: string) => {
  if (!fullAddress) return { number: '', street: 'Unknown', secondary: '' };
  
  // Split by comma to strip city/state
  const parts = fullAddress.split(',');
  const streetPart = parts[0].trim();
  
  // Try to separate House Number from Street Name
  // Regex looks for leading digits
  const match = streetPart.match(/^(\d+)\s+(.*)/);
  
  if (match) {
    return {
      number: match[1], // "333"
      street: match[2], // "Fleming Road"
      secondary: parts.length > 1 ? parts[1].trim() : '' // "Sarver" (Optional context)
    };
  }
  
  return { number: '', street: streetPart, secondary: '' };
};