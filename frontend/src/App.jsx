import { Routes, Route, Navigate } from 'react-router-dom'
import { ToastProvider } from './components/Toast'

// Auth flow
import SignIn            from './pages/auth/SignIn'
import LinkedInOAuth     from './pages/auth/LinkedInOAuth'
import OAuthCallback     from './pages/auth/OAuthCallback'
import AccountConfirmed  from './pages/auth/AccountConfirmed'
import InstallExtension  from './pages/auth/InstallExtension'
import Syncing           from './pages/auth/Syncing'

// Main app shell
import Shell       from './components/Shell'
import Dashboard   from './pages/Dashboard'
import FindPath    from './pages/FindPath'
import MyNetwork   from './pages/MyNetwork'
import SavedPaths  from './pages/SavedPaths'
import Team        from './pages/Team'
import Activity    from './pages/Activity'

export default function App() {
  return (
    <ToastProvider>
      <Routes>
        {/* Auth / onboarding */}
        <Route path="/auth/signin"            element={<SignIn />}           />
        <Route path="/auth/linkedin"          element={<LinkedInOAuth />}    />
        <Route path="/auth/oauth-callback"   element={<OAuthCallback />}    />
        <Route path="/auth/confirmed"         element={<AccountConfirmed />} />
        <Route path="/auth/install-extension" element={<InstallExtension />} />
        <Route path="/auth/syncing"           element={<Syncing />}          />

        {/* Main app (with sidebar) */}
        <Route element={<Shell />}>
          <Route path="/dashboard" element={<Dashboard />}  />
          <Route path="/find-path" element={<FindPath />}   />
          <Route path="/network"   element={<MyNetwork />}  />
          <Route path="/saved"     element={<SavedPaths />} />
          <Route path="/team"      element={<Team />}       />
          <Route path="/activity"  element={<Activity />}   />
        </Route>

        {/* Default: start at sign in */}
        <Route path="*" element={<Navigate to="/auth/signin" replace />} />
      </Routes>
    </ToastProvider>
  )
}
