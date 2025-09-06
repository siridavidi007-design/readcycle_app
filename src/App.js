// src/App.js
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Reminders from "./pages/Reminders";
import Opportunities from "./pages/Opportunities";
import DonateBook from "./pages/DonateBook";
import SignupStep1 from "./pages/SignUpStep1";
import SignupStep2 from "./pages/SignUpStep2";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import EditCatalog from "./pages/EditCatalog";
import DonateRequest from "./pages/DonateRequest";
import Books from "./pages/Books";
import BookDetails from "./pages/BookDetails";
import MyRequests from "./pages/MyRequests";
import DonationOpportunities from "./pages/DonationOpportunities";
import CreateEvent from "./pages/CreateEvents";
import ProtectedRoute from "./components/ProtectedRoute";
import ChapterLeaderRoute from "./components/ChapterLeaderRoute";
import Home from "./pages/Home";




function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} /> 
        <Route path="/signupstep1" element={<SignupStep1 />} />
        <Route path="/signupstep2" element={<SignupStep2 />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/create-event"
          element={
        <ChapterLeaderRoute>
      <CreateEvent />
    </ChapterLeaderRoute>
  }
/>

      <Route
        path="/opportunities"
        element={
          <ProtectedRoute>
            <DonationOpportunities />
          </ProtectedRoute>
        }
      />
      <Route path="/donate" element={<DonateBook />} />
      <Route path="/my-requests" element={<MyRequests />} />
      <Route path="/book/:id" element={<BookDetails />} />
      <Route path="/edit-catalog" element={<EditCatalog />} />
      <Route path="/signup-step1" element={<SignupStep1 />} />
      <Route path="/signup-step2" element={<SignupStep2 />} />  
      <Route path="/books" element={<Books />} />
      <Route path="/my-requests" element={<MyRequests />} />
      <Route path="/reminders" element={<Reminders />} />
      <Route path="/opportunities" element={<Opportunities />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route path="/books" element={<Books />} />
        <Route path="/book/:id" element={<BookDetails />} />

        <Route
          path="/edit-catalog"
          element={
            <ChapterLeaderRoute>
              <EditCatalog />
            </ChapterLeaderRoute>
          }
        />

        <Route
          path="/my-requests"
          element={
            <ProtectedRoute>
              <MyRequests />
            </ProtectedRoute>
          }
        />

        <Route path="/donate-request" element={<DonateRequest />} />
      </Routes>
    </Router>
  );
}

export default App;


