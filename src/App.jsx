import { useState } from 'react'
import './App.css'

const Sparkle = () => <span className="brand-mark" aria-hidden="true">✦</span>

function App() {
  const [screen, setScreen] = useState('login')
  const [role, setRole] = useState('CANDIDATE')
  const [showPassword, setShowPassword] = useState(false)
  const [notice, setNotice] = useState('')
  const isLogin = screen === 'login'

  const switchScreen = (nextScreen) => { setScreen(nextScreen); setNotice('') }
  const submitForm = (event) => {
    event.preventDefault()
    const name = new FormData(event.currentTarget).get('name')
    setNotice(isLogin
      ? `Welcome back${name ? `, ${name}` : ''}! Login API connect hote hi aap dashboard par jayenge.`
      : `Account details ready for ${role === 'CANDIDATE' ? 'candidate' : 'recruiter'} registration. Backend API connect hote hi account create ho jayega.`)
  }

  return <main className="auth-shell">
    <section className="brand-panel">
      <a className="logo" href="#top" aria-label="SmartHire AI home"><Sparkle /> SmartHire<span className="logo-ai">AI</span></a>
      <div className="brand-copy"><p className="eyebrow">THE SMARTER WAY TO HIRE</p><h1>Find the right fit, faster.</h1><p>Bring candidates, recruiters, and meaningful AI insights together in one hiring workspace.</p></div>
      <div className="insight-card"><div className="insight-icon">✦</div><div><strong>AI-powered matching</strong><span>See the skills that matter most for every role.</span></div></div>
      <p className="panel-footer">© 2026 SmartHire AI</p>
    </section>
    <section className="form-panel" id="top">
      <div className="mobile-logo"><Sparkle /> SmartHire<span>AI</span></div>
      <div className="form-wrap">
        <div className="form-heading"><p className="eyebrow">{isLogin ? 'WELCOME BACK' : 'CREATE YOUR ACCOUNT'}</p><h2>{isLogin ? 'Sign in to SmartHire' : 'Start hiring smarter today'}</h2><p>{isLogin ? 'Enter your details to continue.' : 'Choose your role and create your workspace.'}</p></div>
        <form onSubmit={submitForm}>
          {!isLogin && <><label>I’m joining as</label><div className="role-picker">
            <button type="button" className={role === 'CANDIDATE' ? 'role-card selected' : 'role-card'} onClick={() => setRole('CANDIDATE')}><span className="role-icon">◉</span><span><b>Candidate</b><small>Find your next opportunity</small></span></button>
            <button type="button" className={role === 'RECRUITER' ? 'role-card selected' : 'role-card'} onClick={() => setRole('RECRUITER')}><span className="role-icon">▣</span><span><b>Recruiter</b><small>Discover great talent</small></span></button>
          </div><label htmlFor="name">Full name</label><input id="name" name="name" type="text" placeholder="e.g. Alex Morgan" required /></>}
          <label htmlFor="email">Email address</label><input id="email" name="email" type="email" placeholder="you@example.com" required />
          <label htmlFor="password">Password</label><div className="password-field"><input id="password" name="password" type={showPassword ? 'text' : 'password'} placeholder="Enter your password" minLength="8" required /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? 'Hide' : 'Show'}</button></div>
          {isLogin && <button type="button" className="text-link forgot" onClick={() => setNotice('Password-reset flow will be connected with the authentication API.')}>Forgot password?</button>}
          {!isLogin && <p className="terms">By continuing, you agree to our <a href="#terms">Terms of Service</a> and <a href="#privacy">Privacy Policy</a>.</p>}
          <button className="primary-button" type="submit">{isLogin ? 'Sign in' : 'Create account'} <span>→</span></button>{notice && <p className="notice" role="status">{notice}</p>}
        </form>
        <p className="switch-copy">{isLogin ? 'New to SmartHire?' : 'Already have an account?'} <button className="text-link" type="button" onClick={() => switchScreen(isLogin ? 'register' : 'login')}>{isLogin ? 'Create an account' : 'Sign in'}</button></p>
      </div>
    </section>
  </main>
}

export default App
