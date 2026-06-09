import { apiClient } from '../api/apiClient'
import type { Garment } from './garment.service'

export type OperatorBatchItem = {
    id: string
    batch_id: string
    garment_id: string
    garment_process_id?: string | null
    quantity_sent: number
    quantity_received: number
    quantity_processed: number
    quantity_reprocessed: number
    quantity_returned: number
    unit_value: number
    process_percentage: number
    calculated_unit_value: number
    calculated_total: number
    notes?: string | null
    garment?: Garment
    process?: {
        id: string
        name: string
        code: string
        percentage: number
    } | null
}

export type CreateBatchItemPayload = {
    garment_id: string
    garment_process_id?: string | null
    quantity_sent: number
    quantity_received?: number
    notes?: string
}

export type UpdateBatchItemPayload = {
    garment_process_id?: string | null
    quantity_sent?: number
    quantity_received?: number
    quantity_processed?: number
    quantity_reprocessed?: number
    quantity_returned?: number
    notes?: string
}

export async function getBatchItems(batchId: string) {
    const { data } = await apiClient.get(`/operator/batches/${batchId}/items`)
    return data.data as OperatorBatchItem[]
}

export async function addBatchItem(
    batchId: string,
    payload: CreateBatchItemPayload,
) {
    const { data } = await apiClient.post(
        `/operator/batches/${batchId}/items`,
        payload,
    )

    return data.data as OperatorBatchItem
}

export async function updateBatchItem(
    batchId: string,
    itemId: string,
    payload: UpdateBatchItemPayload,
) {
    const { data } = await apiClient.put(
        `/operator/batches/${batchId}/items/${itemId}`,
        payload,
    )

    return data.data as OperatorBatchItem
}

export async function removeBatchItem(batchId: string, itemId: string) {
    const { data } = await apiClient.delete(
        `/operator/batches/${batchId}/items/${itemId}`,
    )

    return data
}