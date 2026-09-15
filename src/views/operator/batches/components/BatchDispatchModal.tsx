import React, { useEffect, useMemo, useState } from 'react'
import {
  CAlert,
  CButton,
  CFormCheck,
  CFormSelect,
  CFormTextarea,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
} from '@coreui/react'

import {
  type DispatchDriverShift,
  type OperatorBatch,
} from '../../../../services/operatorBatch.service'

export type BatchDispatchModalSubmit = {
  generateGuide: boolean
  driverShiftId: string | null
  notes: string
}

type BatchDispatchModalProps = {
  visible: boolean
  batch: OperatorBatch | null
  shifts: DispatchDriverShift[]
  loadingShifts: boolean
  submitting: boolean
  onClose: () => void
  onSubmit: (payload: BatchDispatchModalSubmit) => void | Promise<void>
}

const BatchDispatchModal = ({
  visible,
  batch,
  shifts,
  loadingShifts,
  submitting,
  onClose,
  onSubmit,
}: BatchDispatchModalProps) => {
  const [generateGuide, setGenerateGuide] = useState(true)
  const [driverShiftId, setDriverShiftId] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (visible) {
      setGenerateGuide(true)

      setDriverShiftId('')

      setNotes('')
    }
  }, [visible])

  const selectedShift = useMemo(() => {
    return shifts.find((shift) => shift.id === driverShiftId) || null
  }, [shifts, driverShiftId])

  const getVehiclePlate = (shift: DispatchDriverShift) => {
    return shift.vehicle?.plate || shift.vehicle?.license_plate || shift.vehicle?.patente || '-'
  }

  const getVehicleName = (shift: DispatchDriverShift) => {
    const description = [shift.vehicle?.brand, shift.vehicle?.model, shift.vehicle?.name]
      .filter(Boolean)
      .join(' ')

    return description || 'Vehículo'
  }

  const canSubmit = !submitting && (!generateGuide || Boolean(driverShiftId))

  return (
    <CModal visible={visible} onClose={submitting ? undefined : onClose} backdrop="static">
      <CModalHeader>
        <CModalTitle>Despachar lote a cliente</CModalTitle>
      </CModalHeader>

      <CModalBody>
        <CAlert color="info">
          Las prendas disponibles en <strong>EN PROCESO</strong> serán enviadas a{' '}
          <strong>EN TRASLADO</strong>.
        </CAlert>

        <div className="mb-3">
          <strong>Lote:</strong> {batch?.batch_number || '-'}
        </div>

        <div className="mb-4">
          <strong>Cliente:</strong> {batch?.client?.name || '-'}
        </div>

        <div className="mb-3">
          <strong>¿GENERAR GUIA DE DESPACHO?</strong>
        </div>

        <CFormCheck
          type="radio"
          name="dispatch-guide-option"
          id="dispatch-with-guide"
          label="Sí, generar guía de despacho"
          checked={generateGuide}
          disabled={submitting}
          onChange={() => setGenerateGuide(true)}
        />

        <CFormCheck
          className="mb-4"
          type="radio"
          name="dispatch-guide-option"
          id="dispatch-without-guide"
          label="No, despachar sin guía"
          checked={!generateGuide}
          disabled={submitting}
          onChange={() => setGenerateGuide(false)}
        />

        {generateGuide && (
          <>
            {loadingShifts && <CAlert color="secondary">Cargando jornadas activas...</CAlert>}

            {!loadingShifts && shifts.length === 0 && (
              <CAlert color="warning">
                No existen jornadas activas de transportistas.
                <br />
                Para generar la guía debe existir una jornada iniciada.
              </CAlert>
            )}

            <CFormSelect
              className="mb-3"
              label="Jornada / transporte"
              value={driverShiftId}
              disabled={loadingShifts || submitting}
              onChange={(event) => setDriverShiftId(event.target.value)}
            >
              <option value="">Seleccione una jornada activa</option>

              {shifts.map((shift) => (
                <option key={shift.id} value={shift.id}>
                  {shift.driver?.name || 'Conductor'}

                  {' — '}

                  {getVehicleName(shift)}

                  {' — '}

                  {getVehiclePlate(shift)}
                </option>
              ))}
            </CFormSelect>

            {selectedShift && (
              <CAlert color="secondary">
                <strong>Conductor:</strong> {selectedShift.driver?.name || '-'}
                <br />
                <strong>RUT:</strong> {selectedShift.driver?.rut || '-'}
                <br />
                <strong>Vehículo:</strong> {getVehicleName(selectedShift)}
                <br />
                <strong>Patente:</strong> {getVehiclePlate(selectedShift)}
              </CAlert>
            )}
          </>
        )}

        {!generateGuide && (
          <CAlert color="warning">
            El lote puede continuar su flujo logístico sin DTE52.
            <br />
            Antes de realizar el despacho se solicitará una <strong>segunda confirmación</strong>.
          </CAlert>
        )}

        <CFormTextarea
          label="Observaciones del despacho"
          rows={3}
          value={notes}
          disabled={submitting}
          placeholder="Observación opcional"
          onChange={(event) => setNotes(event.target.value)}
        />
      </CModalBody>

      <CModalFooter>
        <CButton color="secondary" variant="outline" disabled={submitting} onClick={onClose}>
          Cancelar
        </CButton>

        <CButton
          color={generateGuide ? 'success' : 'warning'}
          disabled={!canSubmit}
          onClick={() =>
            void onSubmit({
              generateGuide,
              driverShiftId: generateGuide ? driverShiftId : null,
              notes: notes.trim(),
            })
          }
        >
          {submitting
            ? 'Despachando...'
            : generateGuide
              ? 'Generar guía y despachar'
              : 'Despachar sin guía'}
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

export default BatchDispatchModal
