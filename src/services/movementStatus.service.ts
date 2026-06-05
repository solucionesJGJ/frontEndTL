import { apiClient } from '../api/apiClient'

export type MovementStatus = {
    id: string
    code: string
    name: string
    sort_order: number
}

export async function getMovementStatuses() {
    const { data } = await apiClient.get('/movement-statuses')
    return data.data as MovementStatus[]
}