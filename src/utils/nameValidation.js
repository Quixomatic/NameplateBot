const NAME_MODES = {
  first_only: {
    label: 'First name only',
    format: 'Your first name',
    examples: '`James`, `Mary`',
  },
  first_initial: {
    label: 'First name + last initial',
    format: 'First name and at least your last initial',
    examples: '`James S`, `James Smith`, `Mary Jane W.`',
  },
  full_name: {
    label: 'First and last name',
    format: 'Your first and last name',
    examples: '`James Smith`, `Mary Jane Watson`',
  },
};

/**
 * Validates a name based on the given mode.
 * @param {string} input - The name to validate
 * @param {string} mode - One of: first_only, first_initial, full_name
 */
function validateName(input, mode = 'first_initial') {
  const trimmed = input.trim();
  const normalized = trimmed.replace(/\s+/g, ' ');
  const parts = normalized.split(' ');
  const modeInfo = NAME_MODES[mode] || NAME_MODES.first_initial;

  const firstName = parts[0];

  // First name must be at least 2 alphabetic characters
  if (!firstName || !/^[a-zA-Z\u00C0-\u024F'-]{2,}$/.test(firstName)) {
    return {
      valid: false,
      reason: `Your first name should be at least 2 letters.\n**Format:** ${modeInfo.format}\n**Examples:** ${modeInfo.examples}`,
    };
  }

  if (mode === 'first_only') {
    const displayName = capitalize(firstName);
    return { valid: true, displayName };
  }

  // Modes requiring a last name/initial
  if (parts.length < 2) {
    return {
      valid: false,
      reason: `Please provide your ${mode === 'full_name' ? 'first and last name' : 'first name and at least your last initial'}.\n**Examples:** ${modeInfo.examples}`,
    };
  }

  const rest = parts.slice(1);
  const lastPart = rest[rest.length - 1].replace(/\.$/, '');

  if (!/^[a-zA-Z\u00C0-\u024F'-]+$/.test(lastPart)) {
    return {
      valid: false,
      reason: `Your last name${mode === 'first_initial' ? ' (or initial)' : ''} should contain only letters.`,
    };
  }

  if (mode === 'full_name' && lastPart.length < 2) {
    return {
      valid: false,
      reason: `Please provide your full last name (not just an initial).\n**Examples:** ${modeInfo.examples}`,
    };
  }

  // Format the display name: capitalize each part
  const displayName = parts.map((p) => {
    if (/^[a-zA-Z]\.?$/.test(p)) {
      return p.charAt(0).toUpperCase() + (p.length === 1 ? '' : '.');
    }
    return capitalize(p);
  }).join(' ');

  return { valid: true, displayName };
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

module.exports = { validateName, NAME_MODES };
