import React, { Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import Home from "./pages/Home";
import DistrictDetail from "./pages/DistrictDetail";
import CampusDetail from "./pages/CampusDetail";
import NotFound from "./pages/NotFound";
import ErrorBoundary from "./shell/ErrorBoundary";

export default function App() {
  return (
    <BrowserRouter>
      <Header />
      <ErrorBoundary>
        <Suspense fallback={<div className="spinner" />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/district/:id" element={<DistrictDetail />} />
            <Route path="/campus/:id" element={<CampusDetail />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </BrowserRouter>
  );
}

