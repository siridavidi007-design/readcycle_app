import React, { useState } from "react";
import { db } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";

export default function CreateEvent() {
  const { user, role, chapterLocation } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (role !== "chapterLeader") {
    return (
      <div className="container">
        <div className="card">
          <h2>Access Denied</h2>
          <p>Only chapter leaders can create events.</p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      // Create the event
      await addDoc(collection(db, "events"), {
        title,
        description,
        date,
        location,
        chapterLocation,
        createdBy: user.email,
        timestamp: serverTimestamp(),
      });

      // Clear form
      setTitle("");
      setDescription("");
      setDate("");
      setLocation("");
      setSuccess(`Event "${title}" created successfully!`);

      // TODO: Add student notifications later
      console.log("Event created for chapter:", chapterLocation);

    } catch (err) {
      console.error("Error creating event:", err);
      setError("Failed to create event. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container">
      <div className="card">
        <h1>Create New Event</h1>
        
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 20 }}>
            <label>Event Title:</label>
            <input 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              required 
              placeholder="e.g., Study Group Meeting"
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label>Description:</label>
            <textarea 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              required 
              rows={4}
              placeholder="Describe the event details..."
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label>Event Date:</label>
            <input 
              type="date" 
              value={date} 
              onChange={(e) => setDate(e.target.value)} 
              required 
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          <div style={{ marginBottom: 30 }}>
            <label>Location:</label>
            <input 
              value={location} 
              onChange={(e) => setLocation(e.target.value)} 
              required 
              placeholder="e.g., School Library, Room 201"
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={submitting}
          >
            {submitting ? "Creating Event..." : "Create Event"}
          </button>
        </form>

        {success && (
          <div style={{
            padding: "15px",
            backgroundColor: "#d4edda",
            border: "1px solid #c3e6cb",
            borderRadius: "8px",
            color: "#155724",
            marginTop: "20px"
          }}>
            {success}
          </div>
        )}

        {error && (
          <div style={{
            padding: "15px",
            backgroundColor: "#f8d7da",
            border: "1px solid #f5c6cb",
            borderRadius: "8px",
            color: "#721c24",
            marginTop: "20px"
          }}>
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
