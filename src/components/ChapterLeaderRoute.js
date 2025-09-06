// src/components/ChapterLeaderRoute.js
import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ChapterLeaderRoute({ children }) {
  const { user, role, loading } = useAuth();

  if (loading) return <p>Loading...</p>;
  if (!user) return <Navigate to="/login" />;
  if (role !== "chapterLeader") return <Navigate to="/dashboard" />;

  return children;
}
