import React from 'react'
import { CButton, CCol, CFormSelect, CRow } from '@coreui/react'

import { type Client } from '../../../../services/client.service'
import { type MovementStatus } from '../../../../services/movementStatus.service'

type StockFiltersProps = {
  clients: Client[]
  statuses: MovementStatus[]
  clientId: string
  statusId: string
  loading: boolean
  onClientChange: (value: string) => void
  onStatusChange: (value: string) => void
  onClear: () => void
}

const StockFilters = ({
  clients,
  statuses,
  clientId,
  statusId,
  loading,
  onClientChange,
  onStatusChange,
  onClear,
}: StockFiltersProps) => {
  return (
    <CRow className="mb-4">
      <CCol md={4}>
        <CFormSelect
          label="Cliente"
          value={clientId}
          onChange={(e) => onClientChange(e.target.value)}
        >
          <option value="">Todos los clientes</option>

          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}

              {client.rut ? ` (${client.rut})` : ''}
            </option>
          ))}
        </CFormSelect>
      </CCol>

      <CCol md={4}>
        <CFormSelect
          label="Estado"
          value={statusId}
          onChange={(e) => onStatusChange(e.target.value)}
        >
          <option value="">Todos los estados</option>

          {statuses.map((status) => (
            <option key={status.id} value={status.id}>
              {status.name}
            </option>
          ))}
        </CFormSelect>
      </CCol>

      <CCol md={4} className="d-flex align-items-end gap-2">
        <CButton color="secondary" onClick={onClear} disabled={loading}>
          Limpiar filtros
        </CButton>
      </CCol>
    </CRow>
  )
}

export default StockFilters
