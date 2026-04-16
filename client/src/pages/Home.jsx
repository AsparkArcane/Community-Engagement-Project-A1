import React from 'react';
import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="home-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-base)' }}>
      {/* Navbar */}
      <nav className="navbar" style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border-color)' }}>
        <div className="navbar-brand">
          <Link to="/" className="text-gradient" style={{ fontWeight: 'bold', fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <img src="/vjti-logo.png" alt="VJTI Logo" style={{ height: '32px', width: 'auto', objectFit: 'contain' }} />
            VJTI Energy
          </Link>
        </div>
        
        <div className="navbar-tabs" style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
          <Link to="/" className="nav-link active" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Home</Link>
          <Link to="/login" className="nav-link" style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>Dashboard</Link>
          <Link to="/login" className="nav-link" style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>Classrooms</Link>
          <Link to="/login" className="nav-link" style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>Settings</Link>
        </div>

        <div className="navbar-user">
          <Link to="/login" className="btn btn-primary" style={{ padding: '0.5rem 1.5rem', borderRadius: 'var(--radius-full)' }}>Login</Link>
        </div>
      </nav>

      {/* Hero Section */}
      <header style={{ 
        position: 'relative', 
        width: '100%', 
        height: '60vh', 
        minHeight: '400px',
        display: 'flex', 
        alignItems: 'flex-end', 
        justifyContent: 'flex-end',
        padding: '4rem',
        backgroundImage: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 50%), url("/hero-bg.jpg")',
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}>
        <h1 style={{ 
          color: 'white', 
          fontSize: '3.5rem', 
          fontWeight: 700, 
          textShadow: '0 4px 12px rgba(0,0,0,0.5)',
          maxWidth: '600px',
          textAlign: 'right'
        }}>
          Saving energy here in VJTI
        </h1>
      </header>

      {/* Content Section */}
      <main style={{ flex: 1, padding: '5rem 2rem', display: 'flex', justifyContent: 'center', backgroundColor: 'var(--bg-surface)' }}>
        <div style={{ maxWidth: '800px', width: '100%' }}>
          <h2 style={{ fontSize: '2rem', marginBottom: '1.5rem', color: 'var(--text-primary)', textAlign: 'center' }}>Our Idea</h2>
          <p style={{ fontSize: '1.125rem', lineHeight: 1.8, color: 'var(--text-secondary)', textAlign: 'justify' }}>
            The Electrical Appliance Manager is a smart campus solution designed
            to optimize energy efficiency and streamline maintenance through real-
            time monitoring of college infrastructure. By integrating a centralized
            database with live power-usage tracking, the platform cross-references
            actual consumption data with classroom lecture schedules to identify
            energy waste in unoccupied rooms. Beyond simple monitoring, the
            system assesses the operational health of individual appliances and
            provides data-driven recommendations for energy-efficient upgrades,
            transforming traditional facility management into a proactive, cost-
            effective digital ecosystem.
          </p>
        </div>
      </main>
      
      {/* Footer */}
      <footer style={{ padding: '2rem', textAlign: 'center', borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--bg-surface)' }}>
        <p style={{ color: 'var(--text-muted)' }}>&copy; {new Date().getFullYear()} VJTI Energy System.</p>
      </footer>
    </div>
  );
}
