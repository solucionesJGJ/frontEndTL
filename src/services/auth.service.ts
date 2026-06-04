// src/services/auth.service.ts
import { apiClient } from '../api/apiClient'

export async function login(email: string, password: string) {
    const { data } = await apiClient.post('/auth/login', {
        email,
        password,
    })

    localStorage.setItem('token', data.token)
    localStorage.setItem('user', JSON.stringify(data.user))

    return data
}

export function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
}

export function getCurrentUser() {
    const user = localStorage.getItem('user')
    return user ? JSON.parse(user) : null
}

export function isAuthenticated() {
    return Boolean(localStorage.getItem('token'))
}