import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  // 🔹 Wait for Firebase to finish checking auth
  if (loading) {
    return <p>Loading...</p>;
  }

  // 🔹 If no user, redirect to login
  if (!user) {
    return <Navigate to="/login" />;
  }

  return children;
}
