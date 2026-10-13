
export const TOKEN_KEY = "pharmacore_token";

export const getStoredToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const setStoredToken = (token) => {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // localStorage unavailable — ignore
  }
};

export const clearStoredToken = () => {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // localStorage unavailable — ignore
  }
};