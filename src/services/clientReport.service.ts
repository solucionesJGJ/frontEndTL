import { apiClient } from '../api/apiClient'

export type ClientReportRow = {
  batch_id: string
  batch_number: string
  batch_date: string

  received_at?: string | null
  closed_at?: string | null

  client_id: string
  client_name?: string | null
  client_rut?: string | null

  status_id?: string | null
  status_code?: string | null
  status_name?: string | null

  garment_id: string
  garment_code?: string | null
  garment_description?: string | null
  garment_size?: string | null
  garment_color?: string | null
  garment_barcode?: string | null

  quantity_sent: number
  quantity_received: number
  quantity_processed: number
  quantity_reprocessed: number
  quantity_returned: number

  unit_value: number
  calculated_total: number

  item_notes?: string | null
}

export type ClientReportSummary = {
  batch_count: number
  line_count: number

  quantity_sent: number
  quantity_received: number
  quantity_processed: number
  quantity_reprocessed: number
  quantity_returned: number

  total_value: number
}

export type ClientReportFilters = {
  date_from?: string
  date_to?: string
  batch_id?: string
  client_id?: string
}

export type ClientReportResponse = {
  rows: ClientReportRow[]
  summary: ClientReportSummary
}

const EMPTY_SUMMARY: ClientReportSummary = {
  batch_count: 0,
  line_count: 0,

  quantity_sent: 0,
  quantity_received: 0,
  quantity_processed: 0,
  quantity_reprocessed: 0,
  quantity_returned: 0,

  total_value: 0,
}

export async function getClientBatchReport(
  filters: ClientReportFilters = {},
): Promise<ClientReportResponse> {
  const params: ClientReportFilters = {}

  if (filters.date_from) {
    params.date_from = filters.date_from
  }

  if (filters.date_to) {
    params.date_to = filters.date_to
  }

  if (filters.batch_id) {
    params.batch_id = filters.batch_id
  }

  if (filters.client_id) {
    params.client_id = filters.client_id
  }

  const { data } = await apiClient.get('/reports/client-batches', {
    params,
  })

  return {
    rows: Array.isArray(data.data) ? data.data : [],

    summary: data.summary || EMPTY_SUMMARY,
  }
}
