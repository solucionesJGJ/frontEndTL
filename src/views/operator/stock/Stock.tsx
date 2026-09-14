import React from 'react'
import { CCard, CCardBody, CCardHeader } from '@coreui/react'

import StockFilters from './components/StockFilters'
import StockTable from './components/StockTable'
import { useStock } from './hooks/useStock'

const Stock = () => {
  const {
    stock,
    clients,
    statuses,
    clientId,
    statusId,
    loading,
    totalQuantity,
    handleClientChange,
    handleStatusChange,
    clearFilters,
  } = useStock()

  return (
    <CCard>
      <CCardHeader>
        <strong>Stock actual</strong>
      </CCardHeader>

      <CCardBody>
        <StockFilters
          clients={clients}
          statuses={statuses}
          clientId={clientId}
          statusId={statusId}
          loading={loading}
          onClientChange={handleClientChange}
          onStatusChange={handleStatusChange}
          onClear={clearFilters}
        />

        <div className="mb-3">
          <strong>Total unidades:</strong> {totalQuantity}
        </div>

        <StockTable stock={stock} loading={loading} />
      </CCardBody>
    </CCard>
  )
}

export default Stock
