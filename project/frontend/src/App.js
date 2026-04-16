import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import LoginPage from "./pages/LoginPage";
import DocsPage from "./pages/DocsPage";
import ChatPage from "./pages/ChatPage";
import Navbar from "./components/Navbar";

function PrivateRoute({ children }) {
  return localStorage.getItem("token") ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<PrivateRoute><Navbar /><DocsPage /></PrivateRoute>} />
        <Route path="/chat" element={<PrivateRoute><Navbar /><ChatPage /></PrivateRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
