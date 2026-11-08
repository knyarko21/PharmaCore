
import { Navigate, useLocation } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

export const ProtectedRoute = ({
  children,
  roles = [],
  redirectTo = "/login",
}) => {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div>Loading session...</div>;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to={redirectTo} replace state={{ from: location }} />;
  }

  if (roles.length > 0) {
    const allowed = roles.some((role) => user.role === role);

    if (!allowed) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return children;
};