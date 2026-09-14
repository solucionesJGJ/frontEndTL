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
    code_prefix?: string | null
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

  reception_summary?: {
    status: 'ZERO' | 'PARTIAL' | 'COMPLETE'

    total_sent: number
    total_received: number
    total_pending: number
    percentage: number
  }
}

export type CreateOperatorBatchPayload = {
  client_id: string
  notes?: string
}

/**
 * =========================================================
 * JORNADAS PARA DESPACHO
 * =========================================================
 */

export type DispatchDriverShift = {
  id: string

  user_id: string

  vehicle_id: string

  status: string

  createdAt: string

  updatedAt: string

  driver?: {
    id: string
    name: string
    rut?: string | null
    email?: string
  }

  vehicle?: {
    id: string
    plate?: string | null
    license_plate?: string | null
    patente?: string | null
    brand?: string | null
    model?: string | null
    name?: string | null
  }
}

export type DispatchBatchToClientResult = {
  batch: OperatorBatch

  guide: unknown | null

  guide_requested: boolean

  guide_processed: boolean

  guide_error: string | null
}

export type DispatchBatchToClientResponse = {
  ok: boolean

  message: string

  data: DispatchBatchToClientResult
}

export type DispatchBatchToClientPayload = {
  generate_guide: boolean

  confirm_without_guide?: boolean

  driver_shift_id?: string | null

  driver_user_id?: string | null

  vehicle_id?: string | null

  transfer_indicator?: number

  dispatch_type?: number

  departure_date?: string

  departure_time?: string

  arrival_date?: string

  notes?: string | null
}

/**
 * =========================================================
 * PLANTA -> CLIENTE
 *
 * EN_PROCESO -> EN_TRASLADO
 * =========================================================
 */

export async function dispatchBatchToClient(id: string, payload: DispatchBatchToClientPayload) {
  const { data } = await apiClient.patch(`/operator/batches/${id}/dispatch-to-client`, payload)

  return data as DispatchBatchToClientResponse
}

/**
 * Listar lotes.
 */
export async function getOperatorBatches() {
  const { data } = await apiClient.get('/operator/batches')

  return data.data as OperatorBatch[]
}

/**
 * Obtener lote por ID.
 */
export async function getOperatorBatchById(id: string) {
  const { data } = await apiClient.get(`/operator/batches/${id}`)

  return data.data as OperatorBatch
}

/**
 * Crear lote.
 */
export async function createOperatorBatch(payload: CreateOperatorBatchPayload) {
  const { data } = await apiClient.post('/operator/batches', payload)

  return data.data as OperatorBatch
}

/**
 * Recibir lote en planta.
 */
export async function receiveOperatorBatch(id: string, notes?: string) {
  const { data } = await apiClient.patch(`/operator/batches/${id}/receive`, {
    notes,
  })

  return data.data as OperatorBatch
}

/**
 * Evaluar si el lote puede procesarse.
 */
export async function evaluateOperatorBatch(id: string, can_process: boolean, notes?: string) {
  const { data } = await apiClient.patch(`/operator/batches/${id}/evaluate`, {
    can_process,
    notes,
  })

  return data.data as OperatorBatch
}

/**
 * Cambiar estado del lote.
 */
export async function changeOperatorBatchStatus(
  id: string,
  next_status_code: string,
  notes?: string,
) {
  const { data } = await apiClient.patch(`/operator/batches/${id}/change-status`, {
    next_status_code,
    notes,
  })

  return data.data as OperatorBatch
}

/**
 * Despachar lote desde cliente.
 */
export async function dispatchClientBatch(id: string) {
  const { data } = await apiClient.patch(`/operator/batches/${id}/dispatch`)

  return data.data as OperatorBatch
}

/**
 * =========================================================
 * JORNADAS ACTIVAS PARA DESPACHO
 * =========================================================
 */

export async function getDispatchDriverShifts() {
  const { data } = await apiClient.get('/operator/dispatch-driver-shifts')

  return data.data as DispatchDriverShift[]
}

export type BatchNumberPreview = {
  batch_number: string
  origin_location: string
  destination_location: string
}

/**
 * Obtener preview del número de lote.
 */
export async function previewOperatorBatchNumber(client_id?: string) {
  const { data } = await apiClient.get('/operator/batches/preview-number', {
    params: {
      client_id,
    },
  })

  return data.data as BatchNumberPreview
}
