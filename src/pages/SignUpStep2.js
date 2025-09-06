import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { db } from "../firebase";
import { doc, setDoc } from "firebase/firestore";

export default function SignUpStep2() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [chapterLocation, setChapterLocation] = useState("");
  const [role, setRole] = useState("student");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Get user data from previous step
  const user = location.state?.user;

  const CHAPTER_LOCATIONS = [
    "Lincoln High School",
    "Leon High School", 
    "James S. Rickards High School",
    "Florida State University School",
    "Lawton Chiles High School",
    "Florida A&M University",
    "Tallahassee Community College"
  ];

  useEffect(() => {
    // If no user data, redirect back to step 1
    if (!user) {
      navigate("/signup-step1");
    }
  }, [user, navigate]);

  // Phone number validation
  const validatePhone = (phone) => {
    // Remove all non-digits
    const digitsOnly = phone.replace(/\D/g, '');
    
    // US phone numbers should have 10 digits
    return digitsOnly.length === 10;
  };

  // Format phone number as user types
  const formatPhoneNumber = (value) => {
    // Remove all non-digits
    const digitsOnly = value.replace(/\D/g, '');
    
    // Format as (XXX) XXX-XXXX
    if (digitsOnly.length >= 6) {
      return `(${digitsOnly.slice(0, 3)}) ${digitsOnly.slice(3, 6)}-${digitsOnly.slice(6, 10)}`;
    } else if (digitsOnly.length >= 3) {
      return `(${digitsOnly.slice(0, 3)}) ${digitsOnly.slice(3)}`;
    } else {
      return digitsOnly;
    }
  };

  const handlePhoneChange = (e) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhone(formatted);
  };

  // Name validation
  const validateName = (name) => {
    return name.trim().length >= 2 && /^[a-zA-Z\s'-]+$/.test(name);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Validation checks
    if (!validateName(fullName)) {
      setError("Please enter a valid full name (letters, spaces, hyphens, and apostrophes only).");
      setLoading(false);
      return;
    }

    if (!validatePhone(phone)) {
      setError("Please enter a valid 10-digit US phone number.");
      setLoading(false);
      return;
    }

    if (!chapterLocation) {
      setError("Please select a chapter location.");
      setLoading(false);
      return;
    }

    try {
      // Save profile info to Firestore (note: collection should be "users" not "user")
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        fullName: fullName.trim(),
        phone: phone.replace(/\D/g, ''), // Store digits only
        chapterLocation,
        role,
        createdAt: new Date(),
        profileComplete: true
      });

      // Success! Navigate to dashboard
      navigate("/dashboard");
      
    } catch (err) {
      console.error("Profile save error:", err);
      setError("Failed to save your profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Don't render if no user data
  if (!user) {
    return <div>Redirecting...</div>;
  }

  return (
    <div className="container">
      <div className="card" style={{ maxWidth: 500, margin: "0 auto" }}>
        <h1>Complete Your Profile - Step 2</h1>
        <p>Just a few more details to get you started!</p>
        
        <div style={{
          padding: "10px",
          backgroundColor: "#e3f2fd",
          borderRadius: "8px",
          marginBottom: "20px",
          fontSize: "14px"
        }}>
          Creating account for: <strong>{user.email}</strong>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 20 }}>
            <label>Full Name *</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              placeholder="Enter your full name"
              style={{ 
                width: "100%",
                padding: 12,
                marginTop: 5,
                border: `2px solid ${!validateName(fullName) && fullName ? '#dc3545' : '#e0e0e0'}`
              }}
            />
            {fullName && !validateName(fullName) && (
              <small style={{ color: '#dc3545' }}>
                Name must be at least 2 characters and contain only letters, spaces, hyphens, and apostrophes
              </small>
            )}
          </div>

          <div style={{ marginBottom: 20 }}>
            <label>Phone Number *</label>
            <input
              type="tel"
              value={phone}
              onChange={handlePhoneChange}
              required
              placeholder="(555) 123-4567"
              maxLength={14} // Formatted length
              style={{ 
                width: "100%",
                padding: 12,
                marginTop: 5,
                border: `2px solid ${!validatePhone(phone) && phone ? '#dc3545' : '#e0e0e0'}`
              }}
            />
            {phone && !validatePhone(phone) && (
              <small style={{ color: '#dc3545' }}>Please enter a valid 10-digit phone number</small>
            )}
          </div>

          <div style={{ marginBottom: 20 }}>
            <label>I am a *</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              required
              style={{ 
                width: "100%",
                padding: 12,
                marginTop: 5
              }}
            >
              <option value="student">Student</option>
              <option value="chapterLeader">Chapter Leader</option>
            </select>
          </div>

          <div style={{ marginBottom: 30 }}>
            <label>Chapter Location *</label>
            <select
              value={chapterLocation}
              onChange={(e) => setChapterLocation(e.target.value)}
              required
              style={{ 
                width: "100%",
                padding: 12,
                marginTop: 5
              }}
            >
              <option value="">-- Select Your Chapter --</option>
              {CHAPTER_LOCATIONS.map((location) => (
                <option key={location} value={location}>
                  {location}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div style={{
              padding: "12px",
              backgroundColor: "#f8d7da",
              border: "1px solid #f5c6cb",
              borderRadius: "8px",
              color: "#721c24",
              marginBottom: "20px"
            }}>
              {error}
            </div>
          )}

          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={loading || !fullName || !phone || !chapterLocation}
            style={{ 
              width: "100%",
              padding: "12px",
              fontSize: "16px",
              cursor: loading ? "not-allowed" : "pointer"
            }}
          >
            {loading ? "Creating Profile..." : "Complete Registration"}
          </button>
        </form>

        <div style={{
          marginTop: "30px",
          padding: "15px",
          backgroundColor: "#fff3cd",
          border: "1px solid #ffeaa7",
          borderRadius: "8px",
          fontSize: "14px"
        }}>
          <strong>Privacy Note:</strong> Your information is secure and will only be used for 
          book sharing coordination within your chapter.
        </div>
      </div>
    </div>
  );
}
