import React from "react";
import { Navigate } from "react-router-dom";
import { getToken } from "../../apiClient";

export default function ProtectedRoute({ children }) {
  const token = getToken();
  if (!token) return <Navigate to="/" replace />;
  return children;
}
