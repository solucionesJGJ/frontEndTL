import { apiClient } from '../api/apiClient'

export type DispatchGuideItem = {
  id: string

  dispatch_guide_id: string

  movement_id?: string | null

  garment_id: string

  garment_code?: string | null

  garment_description: string

  quantity: number | string

  unit_value: number | string
}

export type DispatchGuide = {
  id: string

  batch_id: string

  client_id: string

  driver_shift_id?: string | null

  driver_user_id?: string | null

  vehicle_id?: string | null

  receiver_rut: string

  receiver_name: string

  receiver_activity?: string | null

  destination_address: string

  destination_commune: string

  destination_city?: string | null

  driver_rut?: string | null

  driver_name?: string | null

  vehicle_plate?: string | null

  carrier_rut?: string | null

  transfer_indicator: number

  dispatch_type?: number | null

  departure_date: string

  departure_time: string

  arrival_date: string

  engine_document_id?: string | null

  engine_status?: string | null

  engine_folio?: number | null

  engine_track_id?: string | null

  engine_error?: string | null

  status: string

  requested_by: string

  requested_at: string

  processed_at?: string | null

  createdAt: string

  updatedAt: string

  batch?: {
    id: string

    batch_number: string
  }

  client?: {
    id: string

    name: string

    rut?: string | null
  }

  assigned_driver?: {
    id: string

    name: string

    rut?: string | null
  }

  vehicle?: {
    id: string

    plate?: string | null

    brand?: string | null

    model?: string | null
  }

  items?: DispatchGuideItem[]
}

/**
 * =========================================================
 * LISTAR
 * =========================================================
 */

export async function getDispatchGuides() {
  const { data } = await apiClient.get('/dispatch-guides')

  return data.data as DispatchGuide[]
}

/**
 * =========================================================
 * DETALLE
 * =========================================================
 */

export async function getDispatchGuide(id: string) {
  const { data } = await apiClient.get(`/dispatch-guides/${id}`)

  return data.data as DispatchGuide
}

/**
 * =========================================================
 * GUÍA POR LOTE
 * =========================================================
 */

export async function getDispatchGuideByBatch(batchId: string) {
  const { data } = await apiClient.get(`/dispatch-guides/batch/${batchId}`)

  return data.data as DispatchGuide
}

/**
 * =========================================================
 * REINTENTAR
 * =========================================================
 */

export async function retryDispatchGuide(id: string) {
  const { data } = await apiClient.post(`/dispatch-guides/${id}/retry`)

  return data.data as DispatchGuide
}

/**
 * =========================================================
 * PDF
 * =========================================================
 */

export async function getDispatchGuidePdf(id: string) {
  const response = await apiClient.get(`/dispatch-guides/${id}/pdf`, {
    responseType: 'blob',
  })

  return response.data as Blob
}
