import { apiClient } from '../api/apiClient'

export type ClientEconomicActivity = {
  id: string
  client_id: string
  economic_activity_id: string
  is_dte_default: boolean
  economic_activity?: {
    id: string
    code: string
    description: string
    vat_affected?: string | null
    tax_category?: string | null
    internet_available?: string | null
    active: boolean
  }
}

export type Client = {
  id: string
  name: string

  rut?: string | null

  legal_name?: string | null
  business_activity?: string | null

  address?: string | null
  commune?: string | null
  city?: string | null

  dte_email?: string | null

  contact_name?: string | null
  contact_email?: string | null
  contact_phone?: string | null

  code_prefix?: string | null

  active: boolean

  economic_activity_links?: ClientEconomicActivity[]

  createdAt?: string
  updatedAt?: string
}

export type ClientPayload = {
  name: string
  rut?: string | null
  legal_name?: string | null
  address?: string | null
  commune?: string | null
  city?: string | null
  dte_email?: string | null
  contact_name?: string | null
  contact_email?: string | null
  contact_phone?: string | null
  code_prefix?: string | null
  active?: boolean
  economic_activity_ids?: string[]
  dte_economic_activity_id?: string | null
}

export async function getClients() {
  const { data } = await apiClient.get('/clients')

  return data.data as Client[]
}

export async function createClient(payload: ClientPayload) {
  const { data } = await apiClient.post('/clients', payload)

  return data.data as Client
}

export async function updateClient(id: string, payload: ClientPayload) {
  const { data } = await apiClient.put(`/clients/${id}`, payload)

  return data.data as Client
}

export async function deleteClient(id: string) {
  const { data } = await apiClient.delete(`/clients/${id}`)

  return data
}