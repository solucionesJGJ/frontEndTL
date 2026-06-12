import { apiClient } from '../api/apiClient'

export type DashboardStatusSummary = {
    current_status_id: string
    total: string | number
    current_status: {
        id: string
        code: string
        name: string
        sort_order: number
    }
}

export type DashboardRecentBatch = {
    id: string
    batch_number: string
    client?: {
        id: string
        name: string
        rut: string | null
    }
    current_status?: {
        id: string
        code: string
        name: string
    }
    createdAt: string
    received_at?: string | null
    closed_at?: string | null
}

export type PlantDashboard = {
    totalBatches: number
    estimatedRevenue: number
    statusSummary: DashboardStatusSummary[]
    recentBatches: DashboardRecentBatch[]
}

export async function getPlantDashboard() {
    const { data } = await apiClient.get('/dashboard/plant')
    return data.data as PlantDashboard
}