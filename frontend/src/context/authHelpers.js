
const TOKEN_KEY = "pharmacore_token";

export const getStoredToken = () => {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const setStoredToken = (token) => {
  try {
    if (token) {
      sessionStorage.setItem(TOKEN_KEY, token);
    } else {
      sessionStorage.removeItem(TOKEN_KEY);
    }

    // Remove any old token from localStorage.
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      // Ignore if localStorage is unavailable.
    }
  } catch {
    // Ignore if sessionStorage is unavailable.
  }
};

export const clearStoredToken = () => {
  try {
    sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    // Ignore if sessionStorage is unavailable.
  }

  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Ignore if localStorage is unavailable.
  }
};

export { TOKEN_KEY };