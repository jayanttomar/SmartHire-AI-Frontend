import { useEffect, useRef, useState } from 'react'
import './App.css'
import { beginGoogleLogin, currentUser, exchangeGoogleCode, login, register, requestPasswordReset, resetPassword } from './api/auth'
import Dashboard from './EnhancedDashboard'

const Sparkle = () => <span className="brand-mark" aria-hidden="true">✦</span>

function readStoredUser() {
  try { return JSON.parse(localStorage.getItem('smarthire_user') || 'null') }
  catch { localStorage.removeItem('smarthire_user'); return null }
}

function App() {
  const [screen, setScreen] = useState(window.location.pathname === '/reset-password' ? 'reset' : 'login')
  const [role, setRole] = useState('CANDIDATE')
  const [showPassword, setShowPassword] = useState(false)
  const [notice, setNotice] = useState(() => {
    const error = new URLSearchParams(window.location.search).get('oauthError')
    return !error ? '' : error === 'unverified_email'
      ? 'Google could not verify your email. Please use a verified Google account.'
      : 'Google sign-in was cancelled or failed. Please try again.'
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [user, setUser] = useState(readStoredUser)
  const isLogin = screen === 'login'
  const isReset = screen === 'reset'
  const authStarted = useRef(false)
  const [resetToken] = useState(() => new URLSearchParams(window.location.search).get('token') || '')

  useEffect(() => {
    if (authStarted.current) return
    authStarted.current = true
    const params = new URLSearchParams(window.location.search)
    if (window.location.pathname === '/reset-password') {
      window.history.replaceState({}, '', '/reset-password')
      return
    }
    if (params.has('oauthError')) {
      window.history.replaceState({}, '', window.location.pathname)
      return
    }
    const code = params.get('oauthCode')
    if (code) {
      window.history.replaceState({}, '', window.location.pathname)
      exchangeGoogleCode(code).then((signedInUser) => {
        localStorage.setItem('smarthire_token', signedInUser.token)
        localStorage.setItem('smarthire_user', JSON.stringify(signedInUser))
        setUser(signedInUser)
      }).catch((error) => setNotice(error.message))
      return
    }
    const token = localStorage.getItem('smarthire_token')
    if (!token) return
    currentUser().then((verified) => {
      const synced = { ...(readStoredUser() || {}), ...verified, userId: verified.id }
      localStorage.setItem('smarthire_user', JSON.stringify(synced))
      setUser(synced)
    }).catch(() => {
      localStorage.removeItem('smarthire_token')
      localStorage.removeItem('smarthire_user')
      setUser(null)
    })
  }, [])

  useEffect(() => {
    const endSession = () => setUser(null)
    window.addEventListener('smarthire:session-expired', endSession)
    return () => window.removeEventListener('smarthire:session-expired', endSession)
  }, [])

  const switchScreen = (nextScreen) => { setScreen(nextScreen); setNotice('') }
  const submitForm = async (event) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const payload = { email: form.get('email'), password: form.get('password') }
    if (!isLogin && !isReset) Object.assign(payload, { name: form.get('name'), role })

    setIsSubmitting(true)
    setNotice('')
    try {
      if (isReset) {
        if (!resetToken) throw new Error('This reset link is missing its token. Request a new link from Sign in.')
        if (payload.password !== form.get('confirmPassword')) throw new Error('Passwords do not match.')
        await resetPassword(resetToken, payload.password)
        localStorage.removeItem('smarthire_token')
        localStorage.removeItem('smarthire_user')
        setUser(null)
        window.history.replaceState({}, '', '/')
        setScreen('login')
        setNotice('Password updated. Sign in with your new password.')
        return
      }
      const result = isLogin ? await login(payload) : await register(payload)
      if (result?.token) { localStorage.setItem('smarthire_token', result.token); localStorage.setItem('smarthire_user', JSON.stringify(result)); setUser(result) }
      setNotice(isLogin ? 'Login successful.' : 'Account created successfully.')
    } catch (error) {
      setNotice(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const beginPasswordReset = async () => {
    const email = window.prompt('Enter your account email to receive password-reset instructions.')
    if (!email) return
    setIsSubmitting(true)
    setNotice('')
    try {
      await requestPasswordReset(email)
      setNotice('If an account exists for this email, password-reset instructions have been sent.')
    } catch (error) {
      setNotice(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (user && !isReset) return <Dashboard user={user} onLogout={() => { localStorage.removeItem('smarthire_token'); localStorage.removeItem('smarthire_user'); setUser(null) }} />

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
        <div className="form-heading"><p className="eyebrow">{isReset ? 'RESET PASSWORD' : isLogin ? 'WELCOME BACK' : 'CREATE YOUR ACCOUNT'}</p><h2>{isReset ? 'Choose a new password.' : isLogin ? 'Good to see you again.' : 'Let’s get you started.'}</h2><p>{isReset ? 'Use at least 8 characters for your new password.' : isLogin ? 'Sign in to continue your hiring journey.' : 'Create your SmartHire workspace in a few moments.'}</p></div>
        <form onSubmit={submitForm}>
          {!isLogin && !isReset && <><label>I want to</label><div className="role-picker">
            <button type="button" className={role === 'CANDIDATE' ? 'role-card selected' : 'role-card'} onClick={() => setRole('CANDIDATE')}><span className="role-icon">⌁</span><span><b>Find a role</b><small>I’m a candidate</small></span></button>
            <button type="button" className={role === 'RECRUITER' ? 'role-card selected' : 'role-card'} onClick={() => setRole('RECRUITER')}><span className="role-icon">✦</span><span><b>Find talent</b><small>I’m a recruiter</small></span></button>
          </div><label htmlFor="name">Full name</label><input id="name" name="name" type="text" placeholder="e.g. Alex Morgan" required /></>}
          {!isReset && <><label htmlFor="email">Work email</label><input id="email" name="email" type="email" placeholder="name@company.com" autoComplete="email" required /></>}
          <div className="label-row"><label htmlFor="password">Password</label>{isLogin && <button type="button" className="text-link" onClick={beginPasswordReset} disabled={isSubmitting}>Forgot password?</button>}</div>
          <div className="password-field"><input id="password" name="password" type={showPassword ? 'text' : 'password'} placeholder="At least 8 characters" minLength="8" maxLength="72" autoComplete={isLogin ? "current-password" : "new-password"} required /><button type="button" onClick={() => setShowPassword(!showPassword)}>{showPassword ? 'Hide' : 'Show'}</button></div>
          {isReset && <><label htmlFor="confirmPassword">Confirm password</label><input id="confirmPassword" name="confirmPassword" type="password" minLength="8" maxLength="72" autoComplete="new-password" required /></>}
          {!isLogin && !isReset && <p className="terms">By continuing, you agree to our <a href="/terms.html" target="_blank" rel="noreferrer">Terms</a> and <a href="/privacy.html" target="_blank" rel="noreferrer">Privacy Policy</a>.</p>}
          <button className="primary-button" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Please wait...' : isReset ? 'Save new password' : isLogin ? 'Continue to SmartHire' : 'Create my account'} <span>→</span></button>{notice && <p className="notice" role="status">{notice}</p>}
        </form>
        {!isReset && <><div className="form-divider"><span>or</span></div>
        <button className="google-button" type="button" onClick={() => beginGoogleLogin(role)}><span className="google-g">G</span> Continue with Google</button></>}
        <p className="switch-copy">{isLogin ? 'New to SmartHire?' : 'Already part of SmartHire?'} <button className="text-link" type="button" onClick={() => { if (isReset) window.history.replaceState({}, '', '/'); switchScreen(isLogin ? 'register' : 'login') }}>{isLogin ? 'Create an account' : 'Sign in'}</button></p>
      </div>
    </section>
  </main>
}

export default App
