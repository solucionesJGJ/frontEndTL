import { apiClient } from '../api/apiClient'

export type Role = {
    id: string
    name: string
    nameDisplay: string
}

export async function getRoles() {
    const { data } = await apiClient.get('/roles')
    return data.data as Role[]
}