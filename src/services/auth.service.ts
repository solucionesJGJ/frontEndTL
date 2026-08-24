// src/services/auth.service.ts

import { apiClient } from '../api/apiClient'


export async function login(
  email: string,
  password: string,
) {
  const { data } = await apiClient.post(
    '/auth/login',
    {
      email,
      password,
    },
  )

  localStorage.setItem(
    'token',
    data.token,
  )

  localStorage.setItem(
    'user',
    JSON.stringify(data.user),
  )

  return data
}


export async function logout() {
  localStorage.removeItem('token')
  localStorage.removeItem('user')

  sessionStorage.clear()
}


export function getCurrentUser() {
  const user =
    localStorage.getItem('user')

  return user
    ? JSON.parse(user)
    : null
}


export function getCurrentRole() {
  return getCurrentUser()
    ?.role
    ?.name
}


export function isAdmin() {
  return (
    getCurrentRole() ===
    'admin'
  )
}


export function isClientOperator() {
  return (
    getCurrentRole() ===
    'client_operator'
  )
}


export function isWarehouseOperator() {
  return (
    getCurrentRole() ===
    'warehouse_operator'
  )
}


/**
 * Nuevo rol transportista.
 */
export function isTransportista() {
  return (
    getCurrentRole() ===
    'transportista'
  )
}