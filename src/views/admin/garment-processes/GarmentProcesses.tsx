import React, { useEffect, useState } from 'react'
import {
    CButton,
    CCard,
    CCardBody,
    CCardHeader,
    CCol,
    CFormCheck,
    CFormInput,
    CRow,
    CTable,
    CTableBody,
    CTableDataCell,
    CTableHead,
    CTableHeaderCell,
    CTableRow,
} from '@coreui/react'

import {
    createGarmentProcess,
    deactivateGarmentProcess,
    getGarmentProcesses,
    updateGarmentProcess,
    type GarmentProcess,
} from '../../../services/garmentProcess.service'

const emptyForm = {
    name: '',
    code: '',
    percentage: 0,
    active: true,
}

const GarmentProcesses = () => {
    const [processes, setProcesses] = useState<GarmentProcess[]>([])
    const [form, setForm] = useState(emptyForm)
    const [editingId, setEditingId] = useState<string | null>(null)

    const loadData = async () => {
        const data = await getGarmentProcesses()
        setProcesses(data)
    }

    const handleChange = (
        field: keyof typeof emptyForm,
        value: string | number | boolean,
    ) => {
        setForm((prev) => ({
            ...prev,
            [field]: value,
        }))
    }

    const handleSubmit = async () => {
        if (!form.name.trim() || !form.code.trim()) {
            alert('Nombre y código son obligatorios')
            return
        }

        if (editingId) {
            await updateGarmentProcess(editingId, form)
        } else {
            await createGarmentProcess(form)
        }

        setForm(emptyForm)
        setEditingId(null)
        await loadData()
    }

    const handleEdit = (process: GarmentProcess) => {
        setEditingId(process.id)
        setForm({
            name: process.name,
            code: process.code,
            percentage: Number(process.percentage || 0),
            active: process.active,
        })
    }

    const handleDeactivate = async (id: string) => {
        const confirmDeactivate = window.confirm('¿Desactivar proceso?')
        if (!confirmDeactivate) return

        await deactivateGarmentProcess(id)
        await loadData()
    }

    const handleCancel = () => {
        setForm(emptyForm)
        setEditingId(null)
    }

    useEffect(() => {
        loadData()
    }, [])

    return (
        <CCard>
            <CCardHeader>
                <strong>Procesos de prenda</strong>
            </CCardHeader>

            <CCardBody>
                <CRow className="mb-3">
                    <CCol md={3}>
                        <CFormInput
                            label="Nombre"
                            value={form.name}
                            onChange={(e) => handleChange('name', e.target.value)}
                            placeholder="Ej: Manchado"
                        />
                    </CCol>

                    <CCol md={3}>
                        <CFormInput
                            label="Código"
                            value={form.code}
                            onChange={(e) => handleChange('code', e.target.value)}
                            placeholder="Ej: MANCHADO"
                        />
                    </CCol>

                    <CCol md={2}>
                        <CFormInput
                            label="Porcentaje"
                            type="number"
                            min={0}
                            value={form.percentage}
                            onChange={(e) =>
                                handleChange('percentage', Number(e.target.value))
                            }
                        />
                    </CCol>

                    <CCol md={2} className="d-flex align-items-end">
                        <CFormCheck
                            label="Activo"
                            checked={form.active}
                            onChange={(e) => handleChange('active', e.target.checked)}
                        />
                    </CCol>

                    <CCol md={2} className="d-flex align-items-end gap-2">
                        <CButton color="primary" onClick={handleSubmit}>
                            {editingId ? 'Actualizar' : 'Crear'}
                        </CButton>

                        {editingId && (
                            <CButton color="secondary" onClick={handleCancel}>
                                Cancelar
                            </CButton>
                        )}
                    </CCol>
                </CRow>

                <CTable hover responsive>
                    <CTableHead>
                        <CTableRow>
                            <CTableHeaderCell>Nombre</CTableHeaderCell>
                            <CTableHeaderCell>Código</CTableHeaderCell>
                            <CTableHeaderCell>Porcentaje</CTableHeaderCell>
                            <CTableHeaderCell>Activo</CTableHeaderCell>
                            <CTableHeaderCell>Acciones</CTableHeaderCell>
                        </CTableRow>
                    </CTableHead>

                    <CTableBody>
                        {processes.map((process) => (
                            <CTableRow key={process.id}>
                                <CTableDataCell>{process.name}</CTableDataCell>
                                <CTableDataCell>{process.code}</CTableDataCell>
                                <CTableDataCell>{process.percentage}%</CTableDataCell>
                                <CTableDataCell>
                                    {process.active ? 'Sí' : 'No'}
                                </CTableDataCell>
                                <CTableDataCell>
                                    <div className="d-flex gap-2">
                                        <CButton
                                            color="warning"
                                            size="sm"
                                            onClick={() => handleEdit(process)}
                                        >
                                            Editar
                                        </CButton>

                                        {process.active && (
                                            <CButton
                                                color="secondary"
                                                size="sm"
                                                onClick={() => handleDeactivate(process.id)}
                                            >
                                                Desactivar
                                            </CButton>
                                        )}
                                    </div>
                                </CTableDataCell>
                            </CTableRow>
                        ))}
                    </CTableBody>
                </CTable>
            </CCardBody>
        </CCard>
    )
}

export default GarmentProcesses