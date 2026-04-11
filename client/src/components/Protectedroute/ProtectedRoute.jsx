import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { getMe } from "../../../services/API/AuthService/authService";

export function AdminRoute({ children }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    getMe()
      .then((res) => setUser(res.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading...</div>;

  if (!user) return <Navigate to="/login" replace />;

  if (!user.isSystemAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}


export function UserRoute({ children }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    getMe()
      .then((res) => setUser(res.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading...</div>;

  if (!user) return <Navigate to="/login" replace />;

  if (user.isSystemAdmin) {
    return <Navigate to="/admin" replace />;
  }

  return children;
}