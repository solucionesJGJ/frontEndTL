import { apiClient } from '../api/apiClient'

export type BillingClientInfo = {
  id: string
  name: string
  rut?: string | null
  legal_name?: string | null
  business_activity?: string | null
  address?: string | null
  commune?: string | null
  city?: string | null
  dte_email?: string | null

  billing_ready: boolean
  missing_fields: string[]
}

export type BillingIncidentResolution = 'PENDING_REVIEW' | 'BILLABLE' | 'NON_BILLABLE'

export type AvailableBillingIncident = {
  id: string
  quantity: number
  reason: string
  description?: string | null
  billing_resolution: BillingIncidentResolution
}

export type AvailableBillingItem = {
  batch_item_id: string

  garment_id: string
  garment_code?: string | null
  garment_description?: string | null

  quantity: number
  quantity_sent: number
  quantity_processed: number

  // Precio histórico TL con IVA incluido.
  gross_unit_value: number

  // Precio neto tributario calculado por backend.
  unit_value: number

  closed_quantity: number
  billable_incident_quantity: number
  non_billable_incident_quantity: number
  pending_review_quantity: number
  billable_quantity: number
  billing_ready: boolean

  line_subtotal: number
  incidents: AvailableBillingIncident[]
}

export type AvailableBillingBatch = {
  id: string
  batch_number: string

  created_at: string
  closed_at?: string | null

  item_count: number
  estimated_net: number

  billing_ready: boolean
  pending_review_quantity: number
  billable_quantity: number

  items: AvailableBillingItem[]

  status?: {
    id: string
    code: string
    name: string
  } | null
}

export type BillingDocumentItem = {
  id: string

  billing_document_id: string
  batch_id: string
  garment_id: string

  garment_code: string
  garment_description: string

  quantity: number
  unit_value: number

  line_subtotal: number

  discount_percentage: number
  discount_amount: number

  line_total: number

  batch?: {
    id: string
    batch_number: string
  }

  garment?: {
    id: string
    code: string
    description?: string | null
  }
}

export type BillingDocumentBatch = {
  id: string
  billing_document_id: string
  batch_id: string

  batch?: {
    id: string
    batch_number: string
    createdAt: string
    closed_at?: string | null
  }
}

export type BillingDocument = {
  id: string
  client_id: string
  created_by: string

  status: string

  receiver_rut: string
  receiver_legal_name: string
  receiver_business_activity: string
  receiver_address: string
  receiver_commune: string
  receiver_city: string
  receiver_email?: string | null

  subtotal: number
  discount_total: number
  net_amount: number

  tax_rate: number
  tax_amount: number

  total_amount: number

  notes?: string | null

  confirmed_at?: string | null
  sent_to_engine_at?: string | null

  engine_document_id?: string | null
  engine_status?: string | null
  engine_error?: string | null

  createdAt?: string
  updatedAt?: string

  items?: BillingDocumentItem[]
  batches?: BillingDocumentBatch[]

  client?: {
    id: string
    name: string
    rut?: string | null
    legal_name?: string | null
  }
}

export type CreateBillingDraftPayload = {
  client_id: string
  batch_ids: string[]
  notes?: string
}

export type BillingListFilters = {
  client_id?: string
  status?: string
}

export async function getAvailableBillingBatches(clientId: string) {
  const { data } = await apiClient.get(`/billing/available-batches/${clientId}`)

  return {
    client: data.client as BillingClientInfo,

    batches: data.data as AvailableBillingBatch[],
  }
}

export async function createBillingDraft(payload: CreateBillingDraftPayload) {
  const { data } = await apiClient.post('/billing', payload)

  return data.data as {
    id: string
  }
}

export async function getBillingDocument(id: string) {
  const { data } = await apiClient.get(`/billing/${id}`)

  return data.data as BillingDocument
}

export async function updateBillingItemDiscount(
  billingDocumentId: string,
  itemId: string,
  discountPercentage: number,
) {
  const { data } = await apiClient.patch(`/billing/${billingDocumentId}/items/${itemId}/discount`, {
    discount_percentage: discountPercentage,
  })

  return data.data
}

export async function confirmBillingDocument(id: string) {
  const { data } = await apiClient.post(`/billing/${id}/confirm`)

  return data.data
}

export async function cancelBillingDraft(id: string) {
  const { data } = await apiClient.patch(`/billing/${id}/cancel`)

  return data.data
}

export async function getBillingDocuments(filters: BillingListFilters = {}) {
  const { data } = await apiClient.get('/billing', {
    params: filters,
  })

  return data.data as BillingDocument[]
}

export type BillingEngineResult = {
  billing_document_id: string
  status: string

  engine: {
    document_id: string
    folio: number
    status: string
    net_amount: number
    tax_amount: number
    total_amount: number

    sii: {
      mode: string
      track_id: string | null
      status: string
    }
  }
}

export async function sendBillingDocumentToEngine(id: string) {
  const { data } = await apiClient.post(`/billing/${id}/send-to-engine`)

  return data.data as BillingEngineResult
}

export async function getBillingPdf(id: string) {
  const response = await apiClient.get(`/billing/${id}/pdf`, {
    responseType: 'blob',
  })

  return response.data as Blob
}

export async function updateIncidentBillingResolution(
  incidentId: string,
  billingResolution: Exclude<BillingIncidentResolution, 'PENDING_REVIEW'>,
) {
  const { data } = await apiClient.patch(`/billing/incidents/${incidentId}/resolution`, {
    billing_resolution: billingResolution,
  })

  return data.data
}
