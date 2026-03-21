import { Routes, Route, Navigate } from 'react-router-dom'
import { ToastProvider } from './components/Toast'
import ErrorBoundary from './components/ErrorBoundary'

// Public pages
import Pricing        from './pages/Pricing'
import PricingSuccess from './pages/PricingSuccess'

// Auth flow
import SignIn            from './pages/auth/SignIn'
import SignUp            from './pages/auth/SignUp'
import LinkedInOAuth     from './pages/auth/LinkedInOAuth'
import OAuthCallback     from './pages/auth/OAuthCallback'
import AccountConfirmed  from './pages/auth/AccountConfirmed'
import ForgotPassword    from './pages/auth/ForgotPassword'
import ResetPassword     from './pages/auth/ResetPassword'
import VerifyEmail       from './pages/auth/VerifyEmail'
import InstallExtension  from './pages/auth/InstallExtension'
import Syncing           from './pages/auth/Syncing'

// Onboarding
import Onboarding from './pages/onboarding/Onboarding'

// Main app shell
import Shell       from './components/Shell'
import RequireAuth from './components/RequireAuth'
import Agent      from './pages/Agent'
import Dashboard   from './pages/Dashboard'
import FindPath    from './pages/FindPath'
import MyNetwork   from './pages/MyNetwork'
import SavedPaths  from './pages/SavedPaths'
import Settings    from './pages/Settings'
import Team        from './pages/Team'
import Activity    from './pages/Activity'
import Targets     from './pages/Targets'

export default function App() {
  return (
    <ErrorBoundary>
    <ToastProvider>
      <Routes>
        {/* Public */}
        <Route path="/"                       element={<Pricing />}         />
        <Route path="/pricing"                element={<Pricing />}         />
        <Route path="/pricing/success"        element={<PricingSuccess />}  />

        {/* Auth / onboarding */}
        <Route path="/auth/signin"              element={<SignIn />}            />
        <Route path="/auth/signup"              element={<SignUp />}            />
        <Route path="/auth/linkedin"          element={<LinkedInOAuth />}    />
        <Route path="/auth/oauth-callback"    element={<OAuthCallback />}    />
        <Route path="/auth/confirmed"         element={<AccountConfirmed />} />
        <Route path="/auth/forgot-password"   element={<ForgotPassword />}   />
        <Route path="/auth/reset-password"    element={<ResetPassword />}    />
        <Route path="/auth/verify-email"      element={<VerifyEmail />}      />
        <Route path="/auth/install-extension" element={<InstallExtension />} />
        <Route path="/auth/syncing"           element={<Syncing />}          />
        <Route path="/onboarding"             element={<Onboarding />}       />

        {/* Main app (with sidebar) — requires auth */}
        <Route element={<RequireAuth />}>
        <Route element={<Shell />}>
          <Route path="/agent"     element={<Agent />}      />
          <Route path="/dashboard" element={<Dashboard />}  />
          <Route path="/find-path" element={<FindPath />}   />
          <Route path="/network"   element={<MyNetwork />}  />
          <Route path="/saved"     element={<SavedPaths />} />
          <Route path="/settings"  element={<Settings />}   />
          <Route path="/targets"   element={<Targets />}    />
          <Route path="/team"      element={<Team />}       />
          <Route path="/activity"  element={<Activity />}   />
        </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/pricing" replace />} />
      </Routes>
    </ToastProvider>
    </ErrorBoundary>
  )
}
