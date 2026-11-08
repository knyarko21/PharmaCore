
import { useAuth } from "../context/AuthContext";

export const RoleGate = ({
  allowedRoles = [],
  children,
  fallback = null,
}) => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    return fallback;
  }

  if (allowedRoles.length === 0) {
    return children;
  }

  const hasAccess = allowedRoles.some(
    (role) => user.role === role
  );

  if (!hasAccess) {
    return fallback;
  }

  return children;
};