import React, { useState } from "react";
import { db } from "../firebase";
import { collection, addDoc, doc, getDoc } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";

export default function DonateBook() {
  const { user, chapterLocation, role } = useAuth();
  
  // Form state
  const [bookTitle, setBookTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [isbn, setIsbn] = useState("");
  const [subject, setSubject] = useState("");
  const [level, setLevel] = useState("");
  const [condition, setCondition] = useState("");
  const [publishingCompany, setPublishingCompany] = useState("");
  const [unusedTests, setUnusedTests] = useState("");
  const [description, setDescription] = useState("");
  const [returnDate, setReturnDate] = useState("");
  
  // Donor information
  const [donorName, setDonorName] = useState("");
  const [donorPhone, setDonorPhone] = useState("");
  
  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  // Set default return date (30 days from now)
  React.useEffect(() => {
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 30);
    setReturnDate(defaultDate.toISOString().split('T')[0]);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!user) {
      setError("You must be logged in to donate a book.");
      return;
    }

    if (role !== "student") {
      setError("Only students can donate books.");
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      // Get user data for additional information
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      const userData = userSnap.exists() ? userSnap.data() : {};

      // Submit donation request
      await addDoc(collection(db, "donations"), {
        bookTitle,
        author,
        isbn,
        subject,
        level,
        condition,
        publishingCompany,
        unusedTests,
        description,
        returnDate, // Required field
        donorName: donorName || userData?.fullName || "",
        donorPhone: donorPhone || userData?.phone || "",
        donatedByEmail: user.email,
        donatedBy: user.uid,
        chapterLocation,
        status: "pending",
        timestamp: new Date(),
      });

      setSuccess(`Donation request submitted successfully! Your book "${bookTitle}" will be reviewed by your chapter leader. Expected return date: ${new Date(returnDate).toLocaleDateString()}`);
      
      // Clear form
      setBookTitle("");
      setAuthor("");
      setIsbn("");
      setSubject("");
      setLevel("");
      setCondition("");
      setPublishingCompany("");
      setUnusedTests("");
      setDescription("");
      setDonorName("");
      setDonorPhone("");
      
      // Reset return date to 30 days from now
      const newDefaultDate = new Date();
      newDefaultDate.setDate(newDefaultDate.getDate() + 30);
      setReturnDate(newDefaultDate.toISOString().split('T')[0]);
      
    } catch (err) {
      console.error("Error submitting donation:", err);
      setError("Failed to submit donation request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="container">
        <div className="card">
          <h2>Login Required</h2>
          <p>Please log in to donate a book.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="card">
        <h1>Donate a Book</h1>
        <p>Share your textbooks with other students in your chapter!</p>
        
        {success && (
          <div style={{
            padding: "15px",
            backgroundColor: "#d4edda",
            border: "1px solid #c3e6cb",
            borderRadius: "8px",
            color: "#155724",
            marginBottom: "20px"
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
            marginBottom: "20px"
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Book Information */}
          <h3 style={{ marginBottom: 20, color: "#5CBCC9" }}>Book Information</h3>
          
          <div style={{ marginBottom: 20 }}>
            <label>Book Title *</label>
            <input
              value={bookTitle}
              onChange={(e) => setBookTitle(e.target.value)}
              required
              placeholder="Enter the book title"
              style={{ width: "100%", padding: 10, marginTop: 5 }}
            />
          </div>

          <div style={{ display: "flex", gap: "15px", marginBottom: 20 }}>
            <div style={{ flex: 1 }}>
              <label>Author *</label>
              <input
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                required
                placeholder="Book author"
                style={{ width: "100%", padding: 10, marginTop: 5 }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label>ISBN</label>
              <input
                value={isbn}
                onChange={(e) => setIsbn(e.target.value)}
                placeholder="ISBN number (optional)"
                style={{ width: "100%", padding: 10, marginTop: 5 }}
              />
            </div>
          </div>

          <div style={{ display: "flex", gap: "15px", marginBottom: 20 }}>
            <div style={{ flex: 1 }}>
              <label>Subject</label>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g., Math, Science, History"
                style={{ width: "100%", padding: 10, marginTop: 5 }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label>Grade Level</label>
              <input
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                placeholder="e.g., 9th Grade, College"
                style={{ width: "100%", padding: 10, marginTop: 5 }}
              />
            </div>
          </div>

          <div style={{ display: "flex", gap: "15px", marginBottom: 20 }}>
            <div style={{ flex: 1 }}>
              <label>Condition *</label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                required
                style={{ width: "100%", padding: 10, marginTop: 5 }}
              >
                <option value="">Select condition</option>
                <option value="New">New</option>
                <option value="Like New">Like New</option>
                <option value="Good">Good</option>
                <option value="Fair">Fair</option>
                <option value="Poor">Poor</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label>Publishing Company</label>
              <input
                value={publishingCompany}
                onChange={(e) => setPublishingCompany(e.target.value)}
                placeholder="e.g., Pearson, McGraw Hill"
                style={{ width: "100%", padding: 10, marginTop: 5 }}
              />
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label>Unused Tests/Materials</label>
            <input
              value={unusedTests}
              onChange={(e) => setUnusedTests(e.target.value)}
              placeholder="Number of unused tests, access codes, etc."
              style={{ width: "100%", padding: 10, marginTop: 5 }}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label>Return Date Required *</label>
            <input
              type="date"
              value={returnDate}
              onChange={(e) => setReturnDate(e.target.value)}
              required
              min={new Date().toISOString().split('T')[0]}
              style={{ width: "100%", padding: 10, marginTop: 5 }}
            />
            <small style={{ color: '#666', fontSize: '14px' }}>
              When should this book be returned? Students will get reminders before this date.
            </small>
          </div>

          <div style={{ marginBottom: 30 }}>
            <label>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Additional notes about the book condition, missing pages, etc."
              rows={4}
              style={{ width: "100%", padding: 10, marginTop: 5, resize: "vertical" }}
            />
          </div>

          {/* Donor Information */}
          <h3 style={{ marginBottom: 20, color: "#5CBCC9" }}>Your Contact Information</h3>
          
          <div style={{ display: "flex", gap: "15px", marginBottom: 30 }}>
            <div style={{ flex: 1 }}>
              <label>Your Name</label>
              <input
                value={donorName}
                onChange={(e) => setDonorName(e.target.value)}
                placeholder="Full name (optional if in profile)"
                style={{ width: "100%", padding: 10, marginTop: 5 }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label>Phone Number</label>
              <input
                value={donorPhone}
                onChange={(e) => setDonorPhone(e.target.value)}
                placeholder="Contact number (optional)"
                style={{ width: "100%", padding: 10, marginTop: 5 }}
              />
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={submitting}
              style={{ 
                padding: "12px 30px", 
                fontSize: "16px",
                cursor: submitting ? "not-allowed" : "pointer"
              }}
            >
              {submitting ? "Submitting Donation..." : "Submit Donation Request"}
            </button>
          </div>
        </form>

        <div style={{
          marginTop: "30px",
          padding: "15px",
          backgroundColor: "#e3f2fd",
          border: "1px solid #bbdefb",
          borderRadius: "8px",
          fontSize: "14px"
        }}>
          <strong>How it works:</strong>
          <ul style={{ marginTop: 10, paddingLeft: 20 }}>
            <li>Submit your book donation request</li>
            <li>Your chapter leader will review and approve it</li>
            <li>You'll get meeting details for book handover</li>
            <li>Your book will be added to the chapter catalog</li>
            <li>Students can request to borrow it until the return date</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
