/**
 * Validates that a name has a first name and at least the first initial of a last name.
 *
 * Valid examples:   "James S", "James S.", "James Smith", "Mary Jane Watson"
 * Invalid examples: "James", "J", "123", "!!!"
 */
function validateName(input) {
  const trimmed = input.trim();

  // Collapse multiple spaces
  const normalized = trimmed.replace(/\s+/g, ' ');

  // Must have at least two parts
  const parts = normalized.split(' ');
  if (parts.length < 2) {
    return {
      valid: false,
      reason: 'Please include your first name and at least the first initial of your last name (e.g., **James S** or **James Smith**).',
    };
  }

  const firstName = parts[0];
  const rest = parts.slice(1).join(' ');

  // First name must be at least 2 alphabetic characters
  if (!/^[a-zA-Z\u00C0-\u024F'-]{2,}$/.test(firstName)) {
    return {
      valid: false,
      reason: 'Your first name should be at least 2 letters.',
    };
  }

  // Last name / initial must start with a letter (allow trailing period for initials)
  const lastPart = rest.replace(/\.$/, '');
  if (!/^[a-zA-Z\u00C0-\u024F'-]+/.test(lastPart)) {
    return {
      valid: false,
      reason: 'Your last name (or initial) should start with a letter.',
    };
  }

  // Format the display name: capitalize each part
  const displayName = normalized
    .split(' ')
    .map((p) => {
      // Handle initials like "S." — uppercase the letter
      if (/^[a-zA-Z]\.?$/.test(p)) {
        return p.charAt(0).toUpperCase() + (p.length === 1 ? '' : '.');
      }
      return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
    })
    .join(' ');

  return { valid: true, displayName };
}

module.exports = { validateName };
