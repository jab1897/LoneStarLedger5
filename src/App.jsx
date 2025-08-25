import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Layout from "./shell/Layout";
import Home from "./pages/Home";
import Districts from "./pages/Districts";
import DistrictDetail from "./pages/DistrictDetail";
import Campuses from "./pages/Campuses";
import CampusDetail from "./pages/CampusDetail";
import NotFound from "./pages/NotFound";
import About from "./pages/About";
import ErrorBoundary from "./shell/ErrorBoundary";

// Lazy-load Spending so it doesn't evaluate unless visited
const Spending = lazy(() => import("./pages/Spending"));

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <ErrorBoundary>
          <Suspense fallback={<div className="spinner" />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/districts" element={<Districts />} />
              <Route path="/district/:id" element={<DistrictDetail />} />
              <Route path="/campuses" element={<Campuses />} />
              <Route path="/campus/:id" element={<CampusDetail />} />
              <Route path="/spending" element={<Spending />} />
              <Route path="/about" element={<About />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </Layout>
    </BrowserRouter>
  );
}
