const getStorage = () => localStorage

export const saveUser = (token, user) => {
  const storage = localStorage
  const otherStorage = sessionStorage

  otherStorage.removeItem('token')
  otherStorage.removeItem('user')

  if (token) storage.setItem('token', token)
  if (user) storage.setItem('user', JSON.stringify(user))
}

export const getUser = () => {
  try {
    const user = getStorage().getItem('user')
    return user ? JSON.parse(user) : null
  } catch {
    return null
  }
}

export const getToken = () => localStorage.getItem('token')

export const clearUser = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  sessionStorage.removeItem('token')
  sessionStorage.removeItem('user')
}

export const isLoggedIn = () => !!getToken()

export const isPro = () => {
  const user = getUser()
  return user?.plan === 'pro' || user?.plan === 'premium'
}

export const isPremium = () => {
  const user = getUser()
  return user?.plan === 'premium'
}

export const canAccessFeature = (requiredPlan) => {
  const user = getUser()
  if (!user) return false
  const hierarchy = { free: 0, pro: 1, premium: 2 }
  return hierarchy[user.plan] >= hierarchy[requiredPlan]
}
