import React from 'react'
import {
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'

import { type StockItem } from '../../../../services/stock.service'

type StockTableProps = {
  stock: StockItem[]
  loading: boolean
}

const StockTable = ({ stock, loading }: StockTableProps) => {
  return (
    <CTable hover responsive>
      <CTableHead>
        <CTableRow>
          <CTableHeaderCell>Cliente</CTableHeaderCell>

          <CTableHeaderCell>Código</CTableHeaderCell>

          <CTableHeaderCell>Nombre</CTableHeaderCell>

          <CTableHeaderCell>Descripción</CTableHeaderCell>

          <CTableHeaderCell>Color</CTableHeaderCell>

          <CTableHeaderCell>Estado</CTableHeaderCell>

          <CTableHeaderCell>Cantidad</CTableHeaderCell>
        </CTableRow>
      </CTableHead>

      <CTableBody>
        {stock.map((item) => (
          <CTableRow key={item.id}>
            <CTableDataCell>{item.client?.name || '-'}</CTableDataCell>

            <CTableDataCell>
              <strong>{item.garment?.code || '-'}</strong>
            </CTableDataCell>

            <CTableDataCell>{item.garment?.size || '-'}</CTableDataCell>

            <CTableDataCell>{item.garment?.description || '-'}</CTableDataCell>

            <CTableDataCell>{item.garment?.color || '-'}</CTableDataCell>

            <CTableDataCell>{item.status?.name || '-'}</CTableDataCell>

            <CTableDataCell>
              <strong>{item.quantity}</strong>
            </CTableDataCell>
          </CTableRow>
        ))}

        {stock.length === 0 && (
          <CTableRow>
            <CTableDataCell colSpan={7} className="text-center">
              {loading ? 'Cargando stock...' : 'No hay stock registrado'}
            </CTableDataCell>
          </CTableRow>
        )}
      </CTableBody>
    </CTable>
  )
}

export default StockTable
