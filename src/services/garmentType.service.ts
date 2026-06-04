import { apiClient } from '../api/apiClient'

export type GarmentType = {
    id: string
    name: string
    description?: string | null
    active: boolean
    createdAt?: string
    updatedAt?: string
}

export async function getGarmentTypes() {
    const { data } = await apiClient.get('/garment-types')
    return data.data as GarmentType[]
}

export async function createGarmentType(payload: Partial<GarmentType>) {
    const { data } = await apiClient.post('/garment-types', payload)
    return data.data as GarmentType
}

export async function updateGarmentType(
    id: string,
    payload: Partial<GarmentType>,
) {
    const { data } = await apiClient.put(`/garment-types/${id}`, payload)
    return data.data as GarmentType
}

export async function deleteGarmentType(id: string) {
    const { data } = await apiClient.delete(`/garment-types/${id}`)
    return data
}

export async function deactivateGarmentType(id: string) {
    const { data } = await apiClient.patch(`/garment-types/${id}/deactivate`)
    return data.data as GarmentType
}