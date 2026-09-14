import React from 'react'
import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormInput,
  CFormSelect,
  CFormTextarea,
  CRow,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'

import { type OperatorBatch } from '../../../../services/operatorBatch.service'
import { type OperatorBatchItem } from '../../../../services/operatorBatchItem.service'
import { type Garment } from '../../../../services/garment.service'
import { type OperatorBatchItemForm } from '../hooks/useOperatorBatchDetail'

type BatchItemsProps = {
  batch: OperatorBatch | null
  items: OperatorBatchItem[]
  availableGarments: Garment[]
  selectedItemGarment: Garment | null
  itemForm: OperatorBatchItemForm
  editingItemId: string | null
  itemPreviewTotal: number
  batchTotal: number
  canManageBatchItems: boolean
  canManageItems: boolean
  isClient: boolean
  onItemChange: (field: keyof OperatorBatchItemForm, value: string | number) => void
  onSubmitItem: () => void | Promise<void>
  onEditItem: (item: OperatorBatchItem) => void
  onRemoveItem: (itemId: string) => void | Promise<void>
  onCancelItem: () => void
}

const BatchItems = ({
  batch,
  items,
  availableGarments,
  selectedItemGarment,
  itemForm,
  editingItemId,
  itemPreviewTotal,
  batchTotal,
  canManageBatchItems,
  canManageItems,
  isClient,
  onItemChange,
  onSubmitItem,
  onEditItem,
  onRemoveItem,
  onCancelItem,
}: BatchItemsProps) => {
  if (!canManageBatchItems) {
    return null
  }

  const isDraft = batch?.current_status?.code === 'BORRADOR_CLIENTE'

  return (
    <CCard className="mb-4">
      <CCardHeader>
        <strong>Prendas del lote</strong>
      </CCardHeader>

      <CCardBody>
        {/*
         * =================================================
         * FORMULARIO
         * =================================================
         */}

        {isDraft && (
          <>
            <CRow className="mb-3">
              <CCol md={4}>
                <CFormSelect
                  label="Prenda"
                  value={itemForm.garment_id}
                  disabled={Boolean(editingItemId)}
                  onChange={(e) => onItemChange('garment_id', e.target.value)}
                >
                  <option value="">Seleccione prenda</option>

                  {editingItemId && selectedItemGarment && (
                    <option value={selectedItemGarment.id}>
                      {selectedItemGarment.code}

                      {' - '}

                      {selectedItemGarment.size || selectedItemGarment.description || 'Sin nombre'}
                    </option>
                  )}

                  {!editingItemId &&
                    availableGarments.map((garment) => (
                      <option key={garment.id} value={garment.id}>
                        {garment.code}

                        {' - '}

                        {garment.size || garment.description || 'Sin nombre'}

                        {' - '}

                        {`$${Number(garment.value || 0).toLocaleString('es-CL')}`}
                      </option>
                    ))}
                </CFormSelect>
              </CCol>

              <CCol md={2}>
                <CFormInput
                  label="Cant. enviada"
                  type="number"
                  min={1}
                  value={itemForm.quantity_sent}
                  onChange={(e) => onItemChange('quantity_sent', Number(e.target.value))}
                />
              </CCol>

              {!isClient && (
                <CCol md={2}>
                  <CFormInput
                    label="Cant. recibida"
                    type="number"
                    min={0}
                    value={itemForm.quantity_received}
                    onChange={(e) => onItemChange('quantity_received', Number(e.target.value))}
                  />
                </CCol>
              )}

              <CCol md={4}>
                <CFormTextarea
                  label="Notas"
                  rows={1}
                  value={itemForm.notes}
                  onChange={(e) => onItemChange('notes', e.target.value)}
                />
              </CCol>
            </CRow>

            {/*
             * =====================================
             * PREVIEW
             * =====================================
             */}

            {selectedItemGarment && (
              <CAlert color="info">
                <strong>Prenda:</strong> {selectedItemGarment.code}
                {' | '}
                <strong>Precio vigente:</strong> $
                {Number(selectedItemGarment.value || 0).toLocaleString('es-CL')}
                {' | '}
                <strong>Total estimado:</strong> ${Number(itemPreviewTotal).toLocaleString('es-CL')}
                {editingItemId && (
                  <>
                    <br />

                    <small>
                      Al editar, el backend conserva el precio histórico con que esta prenda ingresó
                      al lote.
                    </small>
                  </>
                )}
              </CAlert>
            )}

            <CRow className="mb-4">
              <CCol md={12} className="d-flex gap-2">
                <CButton color="primary" onClick={() => void onSubmitItem()}>
                  {editingItemId ? 'Actualizar prenda' : 'Agregar prenda'}
                </CButton>

                {editingItemId && (
                  <CButton color="secondary" onClick={onCancelItem}>
                    Cancelar
                  </CButton>
                )}
              </CCol>
            </CRow>
          </>
        )}

        {/*
         * =================================================
         * TOTAL
         * =================================================
         */}

        <div className="mb-3">
          <strong>Total valorizado del lote:</strong> ${batchTotal.toLocaleString('es-CL')}
        </div>

        {/*
         * =================================================
         * TABLA
         * =================================================
         */}

        <CTable hover responsive>
          <CTableHead>
            <CTableRow>
              <CTableHeaderCell>Código</CTableHeaderCell>

              <CTableHeaderCell>Nombre</CTableHeaderCell>

              <CTableHeaderCell>Descripción</CTableHeaderCell>

              <CTableHeaderCell>Enviada</CTableHeaderCell>

              <CTableHeaderCell>Recibida</CTableHeaderCell>

              <CTableHeaderCell>Procesada</CTableHeaderCell>

              <CTableHeaderCell>Reproceso</CTableHeaderCell>

              <CTableHeaderCell>Retornada</CTableHeaderCell>

              <CTableHeaderCell>Valor unit.</CTableHeaderCell>

              <CTableHeaderCell>Total</CTableHeaderCell>

              <CTableHeaderCell>Notas</CTableHeaderCell>

              <CTableHeaderCell>Acciones</CTableHeaderCell>
            </CTableRow>
          </CTableHead>

          <CTableBody>
            {items.map((item) => (
              <CTableRow key={item.id}>
                <CTableDataCell>
                  <strong>{item.garment?.code || '-'}</strong>
                </CTableDataCell>

                <CTableDataCell>{item.garment?.size || '-'}</CTableDataCell>

                <CTableDataCell>{item.garment?.description || '-'}</CTableDataCell>

                <CTableDataCell>{item.quantity_sent}</CTableDataCell>

                <CTableDataCell>{item.quantity_received}</CTableDataCell>

                <CTableDataCell>{item.quantity_processed}</CTableDataCell>

                <CTableDataCell>{item.quantity_reprocessed}</CTableDataCell>

                <CTableDataCell>{item.quantity_returned}</CTableDataCell>

                <CTableDataCell>
                  ${Number(item.unit_value || 0).toLocaleString('es-CL')}
                </CTableDataCell>

                <CTableDataCell>
                  <strong>${Number(item.calculated_total || 0).toLocaleString('es-CL')}</strong>
                </CTableDataCell>

                <CTableDataCell>{item.notes || '-'}</CTableDataCell>

                <CTableDataCell>
                  {canManageItems && isDraft && (
                    <div className="d-flex gap-2">
                      <CButton color="warning" size="sm" onClick={() => onEditItem(item)}>
                        Editar
                      </CButton>

                      <CButton color="danger" size="sm" onClick={() => void onRemoveItem(item.id)}>
                        Eliminar
                      </CButton>
                    </div>
                  )}
                </CTableDataCell>
              </CTableRow>
            ))}

            {items.length === 0 && (
              <CTableRow>
                <CTableDataCell colSpan={12} className="text-center">
                  No hay prendas agregadas al lote
                </CTableDataCell>
              </CTableRow>
            )}
          </CTableBody>
        </CTable>
      </CCardBody>
    </CCard>
  )
}

export default BatchItems
