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

export type ClientDashboardBatch = {
    id: string
    batch_number: string
    client_id: string
    received_at?: string | null
    closed_at?: string | null
    createdAt: string
    notes?: string | null
    current_status?: {
        id: string
        code: string
        name: string
        sort_order: number
    }
}

export type ClientDashboard = {
    client: {
        id: string
        name: string
        rut: string | null
    }
    totalBatches: number
    openBatches: number
    closedBatches: number
    estimatedTotal: number
    statusSummary: DashboardStatusSummary[]
    batches: ClientDashboardBatch[]
}

export async function getClientDashboard(client_id?: string) {
    const { data } = await apiClient.get('/dashboard/client', {
        params: {
            client_id,
        },
    })

    return data.data as ClientDashboard
}