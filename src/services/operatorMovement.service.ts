import { apiClient } from '../api/apiClient'

export type OperatorIncidentReason =
  | 'NOT_RECEIVED'
  | 'MISSING'
  | 'DAMAGED'
  | 'DISPATCH_DIFFERENCE'
  | 'OTHER'

export type OperatorIncidentBillingResolution = 'PENDING_REVIEW' | 'BILLABLE' | 'NON_BILLABLE'

export type OperatorIncident = {
  id: string
  batch_id: string
  garment_id: string
  movement_id: string
  origin_status_id: string
  quantity: number
  reason: OperatorIncidentReason
  description?: string | null
  resolution_status: 'OPEN' | 'RESOLVED'
  billing_resolution: OperatorIncidentBillingResolution
  created_by: string
  resolved_at?: string | null
  createdAt: string
  updatedAt: string
}

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
  incident?: OperatorIncident | null
}

export type CreateMovementPayload = {
  garment_id: string
  from_status_id?: string | null
  to_status_id: string
  quantity: number
  movement_type: string
  notes?: string
}

export type CreateIncidentPayload = {
  garment_id: string
  origin_status_id: string
  quantity: number
  reason: OperatorIncidentReason
  description?: string
}

export type CreateIncidentResponse = {
  incident: OperatorIncident
  movement: OperatorMovement
  batch_resolved: boolean
}

export async function getBatchMovements(batchId: string) {
  const { data } = await apiClient.get(`/operator/batches/${batchId}/movements`)

  return data.data as OperatorMovement[]
}

export async function createBatchMovement(batchId: string, payload: CreateMovementPayload) {
  const { data } = await apiClient.post(`/operator/batches/${batchId}/movements`, payload)

  return data.data as OperatorMovement
}

export async function createBatchIncident(batchId: string, payload: CreateIncidentPayload) {
  const { data } = await apiClient.post(`/operator/batches/${batchId}/incidents`, payload)

  return data.data as CreateIncidentResponse
}
