import { apiClient } from '../api/apiClient'

export type OperatorBatch = {
    id: string
    client_id: string
    batch_number: string
    created_by: string
    origin_location?: string | null
    destination_location?: string | null
    current_status_id?: string | null
    received_at?: string | null
    closed_at?: string | null
    notes?: string | null
    createdAt: string
    updatedAt: string
    client?: {
        id: string
        name: string
        rut: string | null
    }
    creator?: {
        id: string
        name: string
        email: string
    }
    current_status?: {
        id: string
        code: string
        name: string
    }
}

export type CreateOperatorBatchPayload = {
    client_id: string
    batch_number: string
    origin_location?: string
    destination_location?: string
    notes?: string
}

export async function getOperatorBatches() {
    const { data } = await apiClient.get('/operator/batches')
    return data.data as OperatorBatch[]
}

export async function getOperatorBatchById(id: string) {
    const { data } = await apiClient.get(`/operator/batches/${id}`)
    return data.data as OperatorBatch
}

export async function createOperatorBatch(
    payload: CreateOperatorBatchPayload,
) {
    const { data } = await apiClient.post('/operator/batches', payload)
    return data.data as OperatorBatch
}