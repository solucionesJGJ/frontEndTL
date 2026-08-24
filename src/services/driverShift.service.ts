import { apiClient } from '../api/apiClient'


export type Vehicle = {
  id: string
  plate: string
  brand?: string | null
  model?: string | null
  year?: number | null
  active: boolean
}


export type DriverChecklistDefinition = {
  category:
    | 'vehicle'
    | 'driver'

  code: string
  label: string
  required: boolean
}


export type DriverShiftCheck = {
  id: string

  shift_id: string

  category: string
  code: string
  label: string

  checked: boolean

  observations?: string | null

  createdAt?: string
  updatedAt?: string
}


export type DriverShift = {
  id: string

  user_id: string
  vehicle_id: string

  status:
    | 'started'
    | 'completed'
    | 'cancelled'

  started_at: string

  ended_at?: string | null

  initial_mileage: number

  final_mileage?: number | null

  start_observations?: string | null

  end_observations?: string | null

  ticket_number: string

  ticket_pdf_path?: string | null

  createdAt?: string
  updatedAt?: string

  driver?: {
    id: string
    name: string
    email: string
  }

  vehicle?: Vehicle

  checks?: DriverShiftCheck[]
}


export type StartDriverShiftPayload = {
  vehicle_id: string

  initial_mileage: number

  observations?: string

  checklist: {
    code: string
    checked: boolean
    observations?: string
  }[]
}


export type FinishDriverShiftPayload = {
  final_mileage: number
  observations?: string
}

export type DriverShiftAdminFilters = {
  user_id?: string
  vehicle_id?: string
  status?: string
}

/**
 * Vehículos disponibles.
 */
export async function getActiveVehicles() {
  const { data } =
    await apiClient.get(
      '/vehicles/active',
    )

  return data.data as Vehicle[]
}


/**
 * Definición del checklist actual.
 */
export async function getDriverChecklist() {
  const { data } =
    await apiClient.get(
      '/driver-shifts/checklist',
    )

  return data.data as DriverChecklistDefinition[]
}


/**
 * Jornada activa.
 *
 * Retorna null si no existe.
 */
export async function getCurrentDriverShift() {
  const { data } =
    await apiClient.get(
      '/driver-shifts/current',
    )

  return data.data as DriverShift | null
}


/**
 * Historial personal.
 */
export async function getDriverShiftHistory() {
  const { data } =
    await apiClient.get(
      '/driver-shifts/history',
    )

  return data.data as DriverShift[]
}


/**
 * Iniciar jornada.
 */
export async function startDriverShift(
  payload: StartDriverShiftPayload,
) {
  const { data } =
    await apiClient.post(
      '/driver-shifts/start',
      payload,
    )

  return data.data as DriverShift
}


/**
 * Finalizar jornada.
 */
export async function finishDriverShift(
  payload: FinishDriverShiftPayload,
) {
  const { data } =
    await apiClient.patch(
      '/driver-shifts/finish',
      payload,
    )

  return data.data as DriverShift
}


/**
 * Descargar comprobante PDF.
 *
 * Solicitamos blob porque el endpoint
 * devuelve directamente el archivo.
 */
export async function downloadDriverShiftTicket(
  shiftId: string,
  ticketNumber: string,
) {
  const response =
    await apiClient.get(
      `/driver-shifts/${shiftId}/ticket`,
      {
        responseType: 'blob',
      },
    )


  const blob =
    new Blob(
      [response.data],
      {
        type: 'application/pdf',
      },
    )


  const url =
    window.URL
      .createObjectURL(blob)


  const link =
    document.createElement('a')


  link.href = url

  link.download =
    `${ticketNumber}.pdf`


  document.body
    .appendChild(link)


  link.click()

  link.remove()


  window.URL
    .revokeObjectURL(url)
}

export async function getAllDriverShifts(
  filters: DriverShiftAdminFilters = {},
) {
  const { data } =
    await apiClient.get(
      '/driver-shifts/admin/history',
      {
        params: filters,
      },
    )

  return data.data as DriverShift[]
}