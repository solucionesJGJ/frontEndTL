import { apiClient } from '../api/apiClient'

export type Client = {
    id: string
    name: string
    rut: string | null
    address?: string | null
    contact_name?: string | null
    contact_email?: string | null
    contact_phone?: string | null
    active: boolean
}

export async function getClients() {
    const { data } = await apiClient.get('/clients')
    return data.data as Client[]
}

export async function createClient(payload: Partial<Client>) {
    const { data } = await apiClient.post('/clients', payload)
    return data.data as Client
}

export async function updateClient(id: string, payload: Partial<Client>) {
    const { data } = await apiClient.put(`/clients/${id}`, payload)
    return data.data as Client
}

export async function deleteClient(id: string) {
    const { data } = await apiClient.delete(`/clients/${id}`)
    return data
}