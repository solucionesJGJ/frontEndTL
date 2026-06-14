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

export async function receiveOperatorBatch(id: string, notes?: string) {
    const { data } = await apiClient.patch(`/operator/batches/${id}/receive`, {
        notes,
    })

    return data.data as OperatorBatch
}

export async function evaluateOperatorBatch(
    id: string,
    can_process: boolean,
    notes?: string,
) {
    const { data } = await apiClient.patch(`/operator/batches/${id}/evaluate`, {
        can_process,
        notes,
    })

    return data.data as OperatorBatch
}

export async function changeOperatorBatchStatus(
    id: string,
    next_status_code: string,
    notes?: string,
) {
    const { data } = await apiClient.patch(
        `/operator/batches/${id}/change-status`,
        {
            next_status_code,
            notes,
        },
    )

    return data.data as OperatorBatch
}

export async function dispatchClientBatch(id: string) {
    const { data } = await apiClient.patch(`/operator/batches/${id}/dispatch`);
    return data.data as OperatorBatch;
}

export type BatchNumberPreview = {
    batch_number: string
    origin_location: string
    destination_location: string
}

export async function previewOperatorBatchNumber(client_id?: string) {
    const { data } = await apiClient.get('/operator/batches/preview-number', {
        params: {
            client_id,
        },
    })

    return data.data as BatchNumberPreview
}