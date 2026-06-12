import { apiClient } from '../api/apiClient'

export type Garment = {
  id: string
  garment_type_id: string
  code: string
  value:number
  description?: string | null
  size?: string | null
  color?: string | null
  barcode?: string | null
  active: boolean
  type?: {
    id: string
    name: string
  }
}

export async function getGarments() {
  const { data } = await apiClient.get('/garments')
  return data.data as Garment[]
}

export async function createGarment(payload: Partial<Garment>) {
  const { data } = await apiClient.post('/garments', payload)
  return data.data as Garment
}

export async function updateGarment(id: string, payload: Partial<Garment>) {
  const { data } = await apiClient.put(`/garments/${id}`, payload)
  return data.data as Garment
}

export async function deactivateGarment(id: string) {
  const { data } = await apiClient.patch(`/garments/${id}/deactivate`)
  return data.data as Garment
}