import { apiClient } from '../api/apiClient'

export type User = {
  id: string
  name: string
  email: string
  role_id: string
  client_id?: string | null
  active: boolean
  role?: {
    id: string
    name: string
  }
  client?: {
    id: string
    name: string
    rut: string | null
  } | null
}

export type UserPayload = {
  name: string
  email: string
  password?: string
  role_id: string
  client_id?: string | null
  active?: boolean
}

export async function getUsers() {
  const { data } = await apiClient.get('/users')
  return data.data as User[]
}

export async function createUser(payload: UserPayload) {
  const { data } = await apiClient.post('/users', payload)
  return data.data as User
}

export async function updateUser(id: string, payload: UserPayload) {
  const { data } = await apiClient.put(`/users/${id}`, payload)
  return data.data as User
}

export async function deactivateUser(id: string) {
  const { data } = await apiClient.patch(`/users/${id}/deactivate`)
  return data
}