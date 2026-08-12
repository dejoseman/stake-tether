import axios from 'axios'

/**
 * Shared axios instance.
 *
 * Every page previously read the token out of localStorage and hand-built an
 * Authorization header, and nothing anywhere handled a 401. An expired token
 * left users on a dashboard where every request failed silently, with no
 * redirect and no way to recover short of clearing storage manually.
 */
const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
})

export const TOKEN_KEY = 'token'

export const getToken = () => localStorage.getItem(TOKEN_KEY)
export const setToken = (token) => localStorage.setItem(TOKEN_KEY, token)
export const clearToken = () => localStorage.removeItem(TOKEN_KEY)

// Attach the bearer token to every outgoing request.
api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

let redirecting = false

// Handle expired/invalid sessions in one place.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status

    // 401 means the session is gone. 403 does NOT — that's a valid session
    // without the required role (or a locked account), and logging the user
    // out on it would be wrong.
    if (status === 401 && !redirecting) {
      redirecting = true
      clearToken()

      const onAuthPage = ['/login', '/signup', '/forgot-password']
        .some((p) => window.location.pathname.startsWith(p))

      if (!onAuthPage) {
        // Preserve where they were so login can send them back.
        const next = encodeURIComponent(window.location.pathname)
        window.location.href = `/login?expired=1&next=${next}`
      } else {
        redirecting = false
      }
    }

    return Promise.reject(error)
  }
)

/**
 * Pull a usable message out of an axios error.
 * The API returns { msg } for most failures and { errors: [{ msg }] } for
 * validation failures.
 */
export const errorMessage = (error, fallback = 'Something went wrong. Please try again.') => {
  const data = error?.response?.data
  if (!data) return error?.message === 'Network Error' ? 'Network error — check your connection.' : fallback
  if (data.msg) return data.msg
  if (Array.isArray(data.errors) && data.errors.length) return data.errors[0].msg
  return fallback
}

export default api
