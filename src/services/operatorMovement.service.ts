import { apiClient } from '../api/apiClient'


export type OperatorMovement = {
    id: string

    batch_id: string
    garment_id: string

    from_status_id?: string | null
    to_status_id: string

    quantity: number

    movement_type: string

    notes?: string | null

    createdAt: string

    garment?: {
        id: string
        code: string
        description?: string | null
    }

    from_status?: {
        id: string
        code: string
        name: string
    } | null

    to_status?: {
        id: string
        code: string
        name: string
    }

    creator?: {
        id: string
        name: string
        email: string
    }
}


export type CreateMovementPayload = {
    garment_id: string

    from_status_id?: string | null

    to_status_id: string

    quantity: number

    movement_type: string

    notes?: string
}


/**
 * Obtener movimientos del lote.
 */
export async function getBatchMovements(
    batchId: string,
) {

    const { data } =
        await apiClient.get(
            `/operator/batches/${batchId}/movements`,
        )

    return data.data as OperatorMovement[]
}


/**
 * Crear movimiento.
 */
export async function createBatchMovement(
    batchId: string,
    payload: CreateMovementPayload,
) {

    const { data } =
        await apiClient.post(
            `/operator/batches/${batchId}/movements`,
            payload,
        )

    return data.data as OperatorMovement
}