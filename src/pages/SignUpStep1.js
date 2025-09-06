import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";

export default function SignupStep1() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();

  // Email validation
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Password validation
  const validatePassword = (password) => {
    return password.length >= 6; // Firebase minimum
  };

  const handleNext = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Validation checks
    if (!validateEmail(email)) {
      setError("Please enter a valid email address.");
      setLoading(false);
      return;
    }

    if (!validatePassword(password)) {
      setError("Password must be at least 6 characters long.");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    try {
      // Create user account with Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Navigate to step 2 with user data
      navigate("/signup-step2", { 
        state: { 
          user: {
            uid: user.uid,
            email: user.email
          }
        } 
      });
    } catch (err) {
      console.error("Signup error:", err);
      
      // Handle specific Firebase errors
      switch (err.code) {
        case 'auth/email-already-in-use':
          setError("This email is already registered. Try logging in instead.");
          break;
        case 'auth/weak-password':
          setError("Password is too weak. Please choose a stronger password.");
          break;
        case 'auth/invalid-email':
          setError("Invalid email address format.");
          break;
        default:
          setError("Failed to create account. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="card" style={{ maxWidth: 500, margin: "0 auto" }}>
        <h1>Create Account - Step 1</h1>
        <p>Enter your email and password to get started</p>
        
        <form onSubmit={handleNext}>
          <div style={{ marginBottom: 20 }}>
            <label>Email Address *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="your.email@example.com"
              style={{ 
                width: "100%", 
                padding: 12, 
                marginTop: 5,
                border: `2px solid ${!validateEmail(email) && email ? '#dc3545' : '#e0e0e0'}`
              }}
            />
            {email && !validateEmail(email) && (
              <small style={{ color: '#dc3545' }}>Please enter a valid email address</small>
            )}
          </div>

          <div style={{ marginBottom: 20 }}>
            <label>Password *</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Minimum 6 characters"
              style={{ 
                width: "100%", 
                padding: 12, 
                marginTop: 5,
                border: `2px solid ${!validatePassword(password) && password ? '#dc3545' : '#e0e0e0'}`
              }}
            />
            {password && !validatePassword(password) && (
              <small style={{ color: '#dc3545' }}>Password must be at least 6 characters</small>
            )}
          </div>

          <div style={{ marginBottom: 30 }}>
            <label>Confirm Password *</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="Re-enter your password"
              style={{ 
                width: "100%", 
                padding: 12, 
                marginTop: 5,
                border: `2px solid ${password !== confirmPassword && confirmPassword ? '#dc3545' : '#e0e0e0'}`
              }}
            />
            {confirmPassword && password !== confirmPassword && (
              <small style={{ color: '#dc3545' }}>Passwords do not match</small>
            )}
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
            disabled={loading || !email || !password || !confirmPassword}
            style={{ 
              width: "100%", 
              padding: "12px",
              fontSize: "16px",
              cursor: loading ? "not-allowed" : "pointer"
            }}
          >
            {loading ? "Creating Account..." : "Next: Complete Profile"}
          </button>
        </form>

        <div style={{ 
          marginTop: 30, 
          textAlign: "center",
          padding: "15px",
          backgroundColor: "#e3f2fd",
          borderRadius: "8px"
        }}>
          <p style={{ margin: 0, fontSize: "14px" }}>
            Already have an account? <a href="/login">Sign in here</a>
          </p>
        </div>
      </div>
    </div>
  );
}

