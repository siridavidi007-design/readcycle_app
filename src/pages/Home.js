import React from "react";
import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div style={{ textAlign: "center", marginTop: "100px" }}>
      <h1>📚 Welcome to ReadCycle</h1>
      <p>Connecting students and chapters through books.</p>

      <div style={{ marginTop: "40px" }}>
        <Link to="/signupstep1">
          <button style={{ padding: "10px 20px", marginRight: "20px" }}>Sign Up</button>
        </Link>
        <Link to="/login">
          <button style={{ padding: "10px 20px" }}>Log In</button>
        </Link>
      </div>
    </div>
  );
}
