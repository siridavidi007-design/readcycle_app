import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";

export default function Books() {
  const { user, role, chapterLocation } = useAuth();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const fetchBooks = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "books"));
        const bookList = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setBooks(bookList);
      } catch (e) {
        console.error(e);
        setErrorMsg("Failed to load books.");
      } finally {
        setLoading(false);
      }
    };
    fetchBooks();
  }, []);

  const handleRequest = async (book) => {
    if (!user) {
      alert("Please log in to request a book.");
      return;
    }
    try {
      await addDoc(collection(db, "requests"), {
        bookId: book.id,
        bookTitle: book.title,
        requestedBy: user.uid,
        requestedByEmail: user.email,
        chapterLocation: book.chapterLocation || "general",
        status: "pending",
        timestamp: serverTimestamp(),
      });
      alert(`Request sent for "${book.title}"!`);
    } catch (err) {
      console.error("Error requesting book:", err);
      alert("Failed to request book.");
    }
  };

  if (loading) return <p>Loading books...</p>;
  if (errorMsg) return <p style={{ color: "red" }}>{errorMsg}</p>;
  if (!books.length) return <p>No books available.</p>;

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: 16 }}>
      <h1>📚 Available Books</h1>
      <ul>
        {books.map((book) => (
          <li key={book.id} style={{ marginBottom: "1rem" }}>
            <strong>{book.title}</strong> ({book.level || "N/A"}) -{" "}
            {book.status || "N/A"}
            <br />
            {role === "student" && (
              <button onClick={() => handleRequest(book)}>📩 Request</button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

