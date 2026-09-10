import { useState } from 'react'
import './App.css'
import { login, register } from './api/auth'

const Sparkle = () => <span className="brand-mark" aria-hidden="true">✦</span>

function App() {
  const [screen, setScreen] = useState('login')
  const [role, setRole] = useState('CANDIDATE')
  const [showPassword, setShowPassword] = useState(false)
  const [notice, setNotice] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isLogin = screen === 'login'

  const switchScreen = (nextScreen) => { setScreen(nextScreen); setNotice('') }
  const submitForm = async (event) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const payload = { email: form.get('email'), password: form.get('password') }
    if (!isLogin) Object.assign(payload, { name: form.get('name'), role })

    setIsSubmitting(true)
    setNotice('')
    try {
      const result = isLogin ? await login(payload) : await register(payload)
      if (result?.token) localStorage.setItem('smarthire_token', result.token)
      setNotice(isLogin ? 'Login successful. Dashboard loading...' : 'Account created successfully. You can now sign in.')
    } catch (error) {
      setNotice(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return <main className="auth-shell">
    <section className="showcase-panel">
      <a className="logo" href="#top" aria-label="SmartHire AI home"><Sparkle /> SmartHire<span>AI</span></a>
      <div className="showcase-copy"><p className="eyebrow">INTELLIGENT HIRING, HUMAN FIRST</p><h1>The best teams start with the right <em>match.</em></h1><p>Move from resume to remarkable hire with an AI workspace built for people.</p></div>
      <div className="match-preview" aria-label="AI candidate match preview">
        <div className="preview-top"><span className="avatar">AM</span><div><b>Alex Morgan</b><small>Product Designer</small></div><span className="more">•••</span></div>
        <div className="match-row"><div><small>AI role match</small><strong>94% <span>Excellent fit</span></strong></div><div className="score-ring">94</div></div>
        <div className="skill-list"><span>Product strategy</span><span>Figma</span><span>Research</span></div>
      </div>
      <div className="social-proof"><div className="faces"><i>J</i><i>R</i><i>S</i><i>+</i></div><p><b>2,000+ professionals</b><br />are building their next chapter</p></div>
      <p className="panel-footer">© 2026 SmartHire AI <span>•</span> Built for better work</p>
    </section>

    <section className="form-panel" id="top">
      <div className="mobile-logo"><Sparkle /> SmartHire<span>AI</span></div>
      <div className="form-wrap">
        <div className="form-heading"><p className="eyebrow">{isLogin ? 'WELCOME BACK' : 'CREATE YOUR ACCOUNT'}</p><h2>{isLogin ? 'Good to see you again.' : 'Let’s get you started.'}</h2><p>{isLogin ? 'Sign in to continue your hiring journey.' : 'Create your SmartHire workspace in a few moments.'}</p></div>
        <form onSubmit={submitForm}>
          {!isLogin && <><label>I want to</label><div className="role-picker">
            <button type="button" className={role === 'CANDIDATE' ? 'role-card selected' : 'role-card'} onClick={() => setRole('CANDIDATE')}><span className="role-icon">⌁</span><span><b>Find a role</b><small>I’m a candidate</small></span></button>
            <button type="button" className={role === 'RECRUITER' ? 'role-card selected' : 'role-card'} onClick={() => setRole('RECRUITER')}><span className="role-icon">✦</span><span><b>Find talent</b><small>I’m a recruiter</small></span></button>
          </div><label htmlFor="name">Full name</label><input id="name" name="name" type="text" placeholder="e.g. Alex Morgan" required /></>}
          <label htmlFor="email">Work email</label><input id="email" name="email" type="email" placeholder="name@company.com" required />
          <div className="label-row"><label htmlFor="password">Password</label>{isLogin && <button type="button" className="text-link" onClick={() => setNotice('Password reset will be added to the Auth Service.')}>Forgot password?</button>}</div>
          <div className="password-field"><input id="password" name="password" type={showPassword ? 'text' : 'password'} placeholder="At least 8 characters" minLength="8" required /><button type="button" onClick={() => setShowPassword(!showPassword)}>{showPassword ? 'Hide' : 'Show'}</button></div>
          {!isLogin && <p className="terms">By continuing, you agree to our <a href="#terms">Terms</a> and <a href="#privacy">Privacy Policy</a>.</p>}
          <button className="primary-button" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Please wait...' : isLogin ? 'Continue to SmartHire' : 'Create my account'} <span>→</span></button>{notice && <p className="notice" role="status">{notice}</p>}
        </form>
        <div className="form-divider"><span>or</span></div>
        <button className="google-button" type="button" onClick={() => setNotice('Google sign-in will be available through the Auth Service.')}><span className="google-g">G</span> Continue with Google</button>
        <p className="switch-copy">{isLogin ? 'New to SmartHire?' : 'Already part of SmartHire?'} <button className="text-link" type="button" onClick={() => switchScreen(isLogin ? 'register' : 'login')}>{isLogin ? 'Create an account' : 'Sign in'}</button></p>
      </div>
    </section>
  </main>
}

export default App
