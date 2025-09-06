import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { db } from "../firebase";
import { doc, getDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";

export default function BookDetails() {
  const { id } = useParams();
  const { user, role, chapterLocation } = useAuth();
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  // FIX: Add state variables for submitting and error
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchBook = async () => {
      try {
        const ref = doc(db, "books", id);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          setBook({ id: snap.id, ...snap.data() });
        }
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    fetchBook();
  }, [id]);

  const handleRequest = async () => {
    if (!user) {
      setMsg("You must log in to request a book.");
      return;
    }
    try {
      setSubmitting(true);
      setError("");
      const userRef = doc(db, "user", user.uid);      
      const userSnap = await getDoc(userRef);         
      const userData = userSnap.exists() ? userSnap.data() : {};
      await addDoc(collection(db, "requests"), {
        bookId: id,
        bookTitle: book.title,
        requestedBy: user.uid,
        requestedByEmail: user.email,
        requestedByName: userData?.fullName || "",
        requestedByPhone: userData?.phone || "",
        status: "pending",
        chapterLocation: book.chapterLocation,
        timestamp: new Date(),
      });
      setMsg("✅ Request submitted!");
      setError(""); // Resetting error on success
    } catch (e) {
      console.error(e);
      setMsg("❌ Failed to submit request.");
      setError("Failed to submit request."); // Setting error on failure
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <p>Loading book...</p>;
  if (!book) return <p>Book not found.</p>;

  return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      <h1>{book.title}</h1>
      <p><strong>Subject:</strong> {book.subject}</p>
      <p><strong>Level:</strong> {book.level}</p>
      <p><strong>Status:</strong> {book.status}</p>
      <p><strong>Publishing Company:</strong> {book.publishingCompany}</p>
      <p><strong>Unused Tests:</strong> {book.numberOfUnusedTests}</p>
      <p><strong>Chapter Location:</strong> {book.chapterLocation}</p>

      {user && role !== "chapterLeader" && (
        <button onClick={handleRequest} disabled={submitting}>📥 Request this book</button>
      )}

      {msg && <p>{msg}</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
}
