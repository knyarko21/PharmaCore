
const TOKEN_KEY = "pharmacore_token";

export const getStoredToken = () => {
  try {
    // Remove any old token saved by the previous implementation.
    localStorage.removeItem(TOKEN_KEY);

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

    // Clean up the old localStorage token.
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Ignore if storage is unavailable.
  }
};

export const clearStoredToken = () => {
  try {
    sessionStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Ignore if storage is unavailable.
  }
};

export { TOKEN_KEY };