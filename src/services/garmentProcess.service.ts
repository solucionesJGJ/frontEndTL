import { apiClient } from '../api/apiClient'

export type GarmentProcess = {
    id: string
    name: string
    code: string
    percentage: number
    active: boolean
}

export async function getGarmentProcesses() {
    const { data } = await apiClient.get('/garment-processes')
    return data.data as GarmentProcess[]
}

export async function createGarmentProcess(payload: Partial<GarmentProcess>) {
    const { data } = await apiClient.post('/garment-processes', payload)
    return data.data as GarmentProcess
}

export async function updateGarmentProcess(
    id: string,
    payload: Partial<GarmentProcess>,
) {
    const { data } = await apiClient.put(`/garment-processes/${id}`, payload)
    return data.data as GarmentProcess
}

export async function deactivateGarmentProcess(id: string) {
    const { data } = await apiClient.patch(`/garment-processes/${id}/deactivate`)
    return data.data as GarmentProcess
}