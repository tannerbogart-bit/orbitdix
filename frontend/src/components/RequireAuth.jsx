import { Navigate, Outlet } from 'react-router-dom'

function isTokenExpired(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    // exp is in seconds, Date.now() is ms
    return payload.exp * 1000 < Date.now()
  } catch {
    return true
  }
}

export default function RequireAuth() {
  const accessToken  = localStorage.getItem('access_token')
  const refreshToken = localStorage.getItem('refresh_token')

  // If we have a valid (non-expired) access token, let them in
  if (accessToken && !isTokenExpired(accessToken)) {
    return <Outlet />
  }

  // If access token is expired but refresh token is still valid, let them in —
  // the first API call will silently refresh via client.js
  if (refreshToken && !isTokenExpired(refreshToken)) {
    return <Outlet />
  }

  // Both tokens missing or expired — send to login
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  return <Navigate to="/auth/signin" replace />
}
