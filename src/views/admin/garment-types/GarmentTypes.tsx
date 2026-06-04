import React, { useEffect, useState } from 'react'
import {
    CButton,
    CCard,
    CCardBody,
    CCardHeader,
    CCol,
    CFormCheck,
    CFormInput,
    CFormTextarea,
    CRow,
    CTable,
    CTableBody,
    CTableDataCell,
    CTableHead,
    CTableHeaderCell,
    CTableRow,
} from '@coreui/react'

import {
    createGarmentType,
    deactivateGarmentType,
    deleteGarmentType,
    getGarmentTypes,
    updateGarmentType,
    type GarmentType,
} from '../../../services/garmentType.service'

const emptyForm = {
    name: '',
    description: '',
    active: true,
}

const GarmentTypes = () => {
    const [garmentTypes, setGarmentTypes] = useState<GarmentType[]>([])
    const [form, setForm] = useState(emptyForm)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false);

    const loadGarmentTypes = async () => {
        const data = await getGarmentTypes()
        setGarmentTypes(data)
    }

    const handleChange = (
        field: keyof typeof emptyForm,
        value: string | boolean,
    ) => {
        setForm((prev) => ({
            ...prev,
            [field]: value,
        }))
    }

    const handleSubmit = async () => {
        if (!form.name.trim()) {
            alert('El nombre del tipo de prenda es obligatorio')
            return
        }

        if (editingId) {
            await updateGarmentType(editingId, form)
        } else {
            await createGarmentType(form)
        }

        setForm(emptyForm)
        setEditingId(null)
        await loadGarmentTypes()
    }

    const handleEdit = (garmentType: GarmentType) => {
        setEditingId(garmentType.id)

        setForm({
            name: garmentType.name || '',
            description: garmentType.description || '',
            active: garmentType.active,
        })
    }

    const handleDelete = async (id: string) => {
        const confirmDelete = window.confirm('¿Eliminar tipo de prenda?')

        if (!confirmDelete) return

        await deleteGarmentType(id)
        await loadGarmentTypes()
    }

    const handleDeactivate = async (id: string) => {
        const confirmDeactivate = window.confirm('¿Desactivar tipo de prenda?')

        if (!confirmDeactivate) return

        await deactivateGarmentType(id)
        await loadGarmentTypes()
    }

    const handleCancel = () => {
        setForm(emptyForm)
        setEditingId(null)
    }

    useEffect(() => {
        const load = async () => {
            setIsLoading(true)
            await loadGarmentTypes()
            setIsLoading(false)
        }
        if (!isLoading)
            load()
    }, [])

    return (
        <CCard>
            <CCardHeader>
                <strong>Tipos de prenda</strong>
            </CCardHeader>

            <CCardBody>
                <CRow className="mb-3">
                    <CCol md={4}>
                        <CFormInput
                            label="Nombre"
                            value={form.name}
                            onChange={(e) => handleChange('name', e.target.value)}
                            placeholder="Ej: Sábana, Toalla, Bata"
                        />
                    </CCol>

                    <CCol md={6}>
                        <CFormTextarea
                            label="Descripción"
                            rows={1}
                            value={form.description}
                            onChange={(e) => handleChange('description', e.target.value)}
                            placeholder="Descripción opcional"
                        />
                    </CCol>

                    <CCol md={2} className="d-flex align-items-end">
                        <CFormCheck
                            label="Activo"
                            checked={form.active}
                            onChange={(e) => handleChange('active', e.target.checked)}
                        />
                    </CCol>
                </CRow>

                <CRow className="mb-4">
                    <CCol md={12} className="d-flex gap-2">
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
                            <CTableHeaderCell>Descripción</CTableHeaderCell>
                            <CTableHeaderCell>Activo</CTableHeaderCell>
                            <CTableHeaderCell>Acciones</CTableHeaderCell>
                        </CTableRow>
                    </CTableHead>

                    <CTableBody>
                        {garmentTypes && garmentTypes.map((garmentType) => (
                            <CTableRow key={garmentType.id}>
                                <CTableDataCell>{garmentType.name}</CTableDataCell>
                                <CTableDataCell>
                                    {garmentType.description || '-'}
                                </CTableDataCell>
                                <CTableDataCell>
                                    {garmentType.active ? 'Sí' : 'No'}
                                </CTableDataCell>
                                <CTableDataCell>
                                    <div className="d-flex gap-2">
                                        <CButton
                                            color="warning"
                                            size="sm"
                                            onClick={() => handleEdit(garmentType)}
                                        >
                                            Editar
                                        </CButton>

                                        {garmentType.active && (
                                            <CButton
                                                color="secondary"
                                                size="sm"
                                                onClick={() => handleDeactivate(garmentType.id)}
                                            >
                                                Desactivar
                                            </CButton>
                                        )}

                                        <CButton
                                            color="danger"
                                            size="sm"
                                            onClick={() => handleDelete(garmentType.id)}
                                        >
                                            Eliminar
                                        </CButton>
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

export default GarmentTypes