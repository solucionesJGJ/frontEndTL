import { apiClient } from '../api/apiClient'
import type { Garment } from './garment.service'


export type OperatorBatchItem = {
    id: string

    batch_id: string
    garment_id: string

    quantity_sent: number
    quantity_received: number
    quantity_processed: number
    quantity_reprocessed: number
    quantity_returned: number

    /**
     * Precio congelado de la prenda
     * al momento de agregarla al lote.
     */
    unit_value: number

    /**
     * Total histórico del item.
     *
     * quantity_sent × unit_value
     */
    calculated_total: number

    notes?: string | null

    garment?: Garment
}


/**
 * Payload para agregar una prenda al lote.
 *
 * Ya no existe garment_process_id.
 */
export type CreateBatchItemPayload = {
    garment_id: string

    quantity_sent: number

    /**
     * Normalmente será informado posteriormente
     * por planta.
     */
    quantity_received?: number

    notes?: string
}


/**
 * Payload para actualizar un item existente.
 *
 * IMPORTANTE:
 * No enviamos unit_value.
 * El precio histórico lo controla el backend.
 */
export type UpdateBatchItemPayload = {
    quantity_sent?: number
    quantity_received?: number
    quantity_processed?: number
    quantity_reprocessed?: number
    quantity_returned?: number

    notes?: string
}


/**
 * Obtener items del lote.
 */
export async function getBatchItems(
    batchId: string,
) {
    const { data } =
        await apiClient.get(
            `/operator/batches/${batchId}/items`,
        )

    return data.data as OperatorBatchItem[]
}


/**
 * Agregar prenda al lote.
 */
export async function addBatchItem(
    batchId: string,
    payload: CreateBatchItemPayload,
) {
    const { data } =
        await apiClient.post(
            `/operator/batches/${batchId}/items`,
            payload,
        )

    return data.data as OperatorBatchItem
}


/**
 * Actualizar item del lote.
 */
export async function updateBatchItem(
    batchId: string,
    itemId: string,
    payload: UpdateBatchItemPayload,
) {
    const { data } =
        await apiClient.put(
            `/operator/batches/${batchId}/items/${itemId}`,
            payload,
        )

    return data.data as OperatorBatchItem
}


/**
 * Eliminar item del lote.
 */
export async function removeBatchItem(
    batchId: string,
    itemId: string,
) {
    const { data } =
        await apiClient.delete(
            `/operator/batches/${batchId}/items/${itemId}`,
        )

    return data
}