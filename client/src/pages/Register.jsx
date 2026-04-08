import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import api from '../api';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Create user
      await api.post('/auth/register', { name, email, password, role });
      
      toast.success('Registration Successful, Please Login');
      setTimeout(() => navigate('/'), 1500); // Redirect to login
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-container">
      <Toaster position="top-right" />
      <div className="register-box card animate-fade-in-up">
        <div className="text-center mb-4">
          <h1 className="text-gradient">Register</h1>
          <p className="text-muted">Create a new VJTI Energy Account</p>
        </div>

        <form onSubmit={handleRegister} className="flex" style={{ flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label className="text-secondary" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Full Name</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="Enter your name" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-secondary" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Email Address</label>
            <input 
              type="email" 
              className="input-field" 
              placeholder="Enter your email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
             <label className="text-secondary" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Password</label>
            <input 
              type="password" 
              className="input-field" 
              placeholder="Enter a strong password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div>
             <label className="text-secondary" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Role</label>
             <select 
               className="input-field" 
               value={role} 
               onChange={(e) => setRole(e.target.value)}
             >
                <option value="student">Student</option>
                <option value="hod">HOD</option>
                <option value="admin">Admin</option>
             </select>
          </div>

          <button type="submit" className="btn btn-primary mt-4 w-full" disabled={loading}>
            {loading ? 'Registering...' : 'Register Account'}
          </button>
        </form>
        
        <div className="mt-4 text-center">
          <p className="text-muted" style={{ fontSize: '0.875rem' }}>
            Already have an account? <Link to="/" className="text-brand hover-underline" style={{ color: 'var(--brand-primary)', textDecoration: 'none' }}>Sign In here</Link>
          </p>
        </div>
      </div>

      <style>{`
        .register-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
        }
        .register-box {
          width: 100%;
          max-width: 420px;
          padding: 2.5rem 2rem;
        }
      `}</style>
    </div>
  );
}
