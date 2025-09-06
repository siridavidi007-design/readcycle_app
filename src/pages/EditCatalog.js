import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc 
} from "firebase/firestore";
import { useAuth } from "../context/AuthContext";

export default function EditCatalog() {
  const { user, role, chapterLocation } = useAuth();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingBook, setEditingBook] = useState(null);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  // Form states for editing
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [isbn, setIsbn] = useState("");
  const [condition, setCondition] = useState("");
  const [subject, setSubject] = useState("");
  const [level, setLevel] = useState("");
  const [publishingCompany, setPublishingCompany] = useState("");
  const [unusedTests, setUnusedTests] = useState("");
  const [description, setDescription] = useState("");
  const [returnDate, setReturnDate] = useState("");

  useEffect(() => {
    fetchBooks();
  }, [chapterLocation]);

  const fetchBooks = async () => {
    if (!chapterLocation) return;
    try {
      const q = query(
        collection(db, "books"),
        where("chapterLocation", "==", chapterLocation)
      );
      const snapshot = await getDocs(q);
      const bookList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setBooks(bookList);
    } catch (err) {
      console.error("Error fetching books:", err);
      setError("Failed to load books.");
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (book) => {
    setEditingBook(book.id);
    setTitle(book.title || "");
    setAuthor(book.author || "");
    setIsbn(book.isbn || "");
    setCondition(book.condition || "");
    setSubject(book.subject || "");
    setLevel(book.level || "");
    setPublishingCompany(book.publishingCompany || "");
    setUnusedTests(book.unusedTests || "");
    setDescription(book.description || "");
    setReturnDate(book.returnDate || "");
  };

  const cancelEditing = () => {
    setEditingBook(null);
    clearForm();
  };

  const clearForm = () => {
    setTitle("");
    setAuthor("");
    setIsbn("");
    setCondition("");
    setSubject("");
    setLevel("");
    setPublishingCompany("");
    setUnusedTests("");
    setDescription("");
    setReturnDate("");
  };

  const saveChanges = async () => {
    if (!editingBook) return;
    
    try {
      const bookRef = doc(db, "books", editingBook);
      await updateDoc(bookRef, {
        title,
        author,
        isbn,
        condition,
        subject,
        level,
        publishingCompany,
        unusedTests,
        description,
        returnDate,
        lastModified: new Date()
      });

      setSuccess("Book updated successfully!");
      setError("");
      setEditingBook(null);
      clearForm();
      await fetchBooks(); // Refresh the list
    } catch (err) {
      console.error("Error updating book:", err);
      setError("Failed to update book.");
    }
  };

  const deleteBook = async (bookId) => {
    if (!window.confirm("Are you sure you want to delete this book? This action cannot be undone.")) {
      return;
    }

    try {
      await deleteDoc(doc(db, "books", bookId));
      setSuccess("Book deleted successfully!");
      setError("");
      await fetchBooks(); // Refresh the list
    } catch (err) {
      console.error("Error deleting book:", err);
      setError("Failed to delete book.");
    }
  };

  if (role !== "chapterLeader") {
    return (
      <div className="container">
        <div className="card">
          <h2>Access Denied</h2>
          <p>Only chapter leaders can edit the book catalog.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container">
        <div className="card">
          <p>Loading books...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <h1>Edit Book Catalog</h1>
      
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

      {books.length === 0 ? (
        <div className="card">
          <p>No books in your chapter's catalog yet.</p>
        </div>
      ) : (
        <div className="card">
          <h2>Books in {chapterLocation} Chapter</h2>
          <div style={{ overflowX: "auto" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Author</th>
                  <th>Subject</th>
                  <th>Condition</th>
                  <th>Status</th>
                  <th>Return Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {books.map((book) => (
                  <tr key={book.id}>
                    <td>{book.title}</td>
                    <td>{book.author}</td>
                    <td>{book.subject}</td>
                    <td>{book.condition}</td>
                    <td>
                      <span className={`status-${book.status || 'available'}`}>
                        {book.status || 'available'}
                      </span>
                    </td>
                    <td>
                      {book.returnDate 
                        ? new Date(book.returnDate).toLocaleDateString() 
                        : "-"
                      }
                    </td>
                    <td>
                      <button
                        className="btn btn-primary"
                        onClick={() => startEditing(book)}
                        style={{ marginRight: 8 }}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-secondary"
                        onClick={() => deleteBook(book.id)}
                        style={{ backgroundColor: "#dc3545", borderColor: "#dc3545" }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Book Modal */}
      {editingBook && (
        <div className="modal">
          <div className="modal-content" style={{ maxWidth: "600px", width: "90%" }}>
            <h3>Edit Book</h3>
            
            <div style={{ marginBottom: 15 }}>
              <label>Title:</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                style={{ width: "100%", padding: 8, marginTop: 5 }}
              />
            </div>

            <div style={{ marginBottom: 15 }}>
              <label>Author:</label>
              <input
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                required
                style={{ width: "100%", padding: 8, marginTop: 5 }}
              />
            </div>

            <div style={{ display: "flex", gap: "15px", marginBottom: 15 }}>
              <div style={{ flex: 1 }}>
                <label>Subject:</label>
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  style={{ width: "100%", padding: 8, marginTop: 5 }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label>Level:</label>
                <input
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  style={{ width: "100%", padding: 8, marginTop: 5 }}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: "15px", marginBottom: 15 }}>
              <div style={{ flex: 1 }}>
                <label>Condition:</label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  style={{ width: "100%", padding: 8, marginTop: 5 }}
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
                <label>ISBN:</label>
                <input
                  value={isbn}
                  onChange={(e) => setIsbn(e.target.value)}
                  style={{ width: "100%", padding: 8, marginTop: 5 }}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: "15px", marginBottom: 15 }}>
              <div style={{ flex: 1 }}>
                <label>Publishing Company:</label>
                <input
                  value={publishingCompany}
                  onChange={(e) => setPublishingCompany(e.target.value)}
                  style={{ width: "100%", padding: 8, marginTop: 5 }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label>Unused Tests:</label>
                <input
                  value={unusedTests}
                  onChange={(e) => setUnusedTests(e.target.value)}
                  style={{ width: "100%", padding: 8, marginTop: 5 }}
                />
              </div>
            </div>

            <div style={{ marginBottom: 15 }}>
              <label>Return Date (if borrowed):</label>
              <input
                type="date"
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
                style={{ width: "100%", padding: 8, marginTop: 5 }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label>Description:</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                style={{ width: "100%", padding: 8, marginTop: 5 }}
              />
            </div>

            <div style={{ textAlign: "right" }}>
              <button
                className="btn btn-secondary"
                onClick={cancelEditing}
                style={{ marginRight: 10 }}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={saveChanges}
              >
                {editingBook === 'new' ? 'Add Book' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}