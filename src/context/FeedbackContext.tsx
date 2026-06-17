import React, { createContext, useContext, useState } from 'react'
import {
    CAlert,
    CButton,
    CFormCheck,
    CFormLabel,
    CFormTextarea,
    CModal,
    CModalBody,
    CModalFooter,
    CModalHeader,
    CModalTitle,
} from '@coreui/react'

type AlertColor = 'success' | 'danger' | 'warning' | 'info'

type ConfirmField = {
    label: string
    value: string | number | boolean | null | undefined
}

type ConfirmDetail = {
    item: string
    quantity: string | number
}

type ConfirmOptions = {
    title?: string
    message?: string
    fields?: ConfirmField[]
    details?: ConfirmDetail[]
    showConformityCheck?: boolean
    observationRequired?: boolean
    observationLabel?: string
    observationPlaceholder?: string
    confirmText?: string
    cancelText?: string
    color?: 'primary' | 'danger' | 'warning' | 'success'
}

type AlertState = {
    visible: boolean
    message: string
    color: AlertColor
}

type FeedbackContextType = {
    showAlert: (message: string, color?: AlertColor) => void
    showBackendError: (error: any, fallback?: string) => void
    confirmAction: (options: ConfirmOptions) => Promise<{
        confirmed: boolean
        observation?: string
        isConform?:boolean
    }>
}

const FeedbackContext = createContext<FeedbackContextType | null>(null)

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
    const [alert, setAlert] = useState<AlertState>({
        visible: false,
        message: '',
        color: 'info',
    })

    const [confirmVisible, setConfirmVisible] = useState(false)
    const [confirmOptions, setConfirmOptions] = useState<ConfirmOptions>({})
    const [resolver, setResolver] = useState<((value: { confirmed: boolean; observation?: string; isConform?: boolean }) => void) | null>(null)
    const [observation, setObservation] = useState('')
    const [isConform, setIsConform] = useState(true)

    const showAlert = (message: string, color: AlertColor = 'info') => {
        setAlert({
            visible: true,
            message,
            color,
        })

        setTimeout(() => {
            setAlert((prev) => ({
                ...prev,
                visible: false,
            }))
        }, 4000)
    }

    const showBackendError = (error: any, fallback = 'Ocurrió un error') => {
        const message =
            error?.response?.data?.message ||
            error?.response?.data?.error ||
            error?.message ||
            fallback

        showAlert(message, 'danger')
    }

    const confirmAction = (options: ConfirmOptions) => {
        setConfirmOptions({
            title: 'Confirmar acción',
            message: '¿Deseas continuar?',
            confirmText: 'Confirmar',
            cancelText: 'Cancelar',
            color: 'primary',
            ...options,
        })

        setConfirmVisible(true)
        setIsConform(true)
        setObservation('')

        return new Promise<{
            confirmed: boolean
            observation?: string
            isConform?: boolean
        }>((resolve) => {
            // store resolver function (wrap to avoid React treating it as updater)
            setResolver(() => resolve)
        })
    }

    const handleConfirm = () => {
        setConfirmVisible(false)
        resolver?.({
            confirmed: true,
            observation,
            isConform,
        })
        setResolver(null)
    }

    const handleCancel = () => {
        setConfirmVisible(false)
        resolver?.({ confirmed: false })
        setResolver(null)
    }

    return (
        <FeedbackContext.Provider
            value={{
                showAlert,
                showBackendError,
                confirmAction,
            }}
        >
            {children}

            {alert.visible && (
                <div
                    style={{
                        position: 'fixed',
                        top: '80px',
                        right: '20px',
                        zIndex: 9999,
                        minWidth: '320px',
                        maxWidth: '480px',
                    }}
                >
                    <CAlert
                        color={alert.color}
                        dismissible
                        onClose={() =>
                            setAlert((prev) => ({
                                ...prev,
                                visible: false,
                            }))
                        }
                    >
                        {alert.message}
                    </CAlert>
                </div>
            )}

            <CModal visible={confirmVisible} onClose={handleCancel}>
                <CModalHeader>
                    <CModalTitle>{confirmOptions.title}</CModalTitle>
                </CModalHeader>

                <CModalBody>
                    <p>{confirmOptions.message}</p>

                    {confirmOptions.fields && confirmOptions.fields.length > 0 && (
                        <div className="border rounded p-3 bg-body-tertiary">
                            {confirmOptions.fields.map((field, index) => (
                                <div
                                    key={index}
                                    className="d-flex justify-content-between border-bottom py-1"
                                >
                                    <strong>{field.label}</strong>
                                    <span>{String(field.value ?? '-')}</span>
                                </div>
                            ))}
                        </div>
                    )}
                    {confirmOptions.details && confirmOptions.details.length > 0 && (
                        <div className="mt-3">
                            <strong>Detalle del lote</strong>

                            <div className="table-responsive mt-2">
                                <table className="table table-sm table-bordered mb-0">
                                    <thead>
                                        <tr>
                                            <th>Artículo</th>
                                            <th className="text-end">Cantidad</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {confirmOptions.details.map((detail, index) => (
                                            <tr key={index}>
                                                <td>{detail.item}</td>
                                                <td className="text-end">{detail.quantity}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                    {confirmOptions.showConformityCheck && (
                        <div className="mt-3">
                            <CFormCheck
                                id="conformity-check"
                                label="Pedido recibido conforme"
                                checked={isConform}
                                onChange={(e) => setIsConform(e.target.checked)}
                            />
                        </div>
                    )}
                    {(!isConform || !confirmOptions.showConformityCheck) && (
                        <div className="mt-3">
                            <CFormLabel>
                                {confirmOptions.observationLabel || 'Observaciones'}
                            </CFormLabel>

                            <CFormTextarea
                                rows={4}
                                value={observation}
                                placeholder={
                                    confirmOptions.observationPlaceholder ||
                                    'Ingrese observaciones'
                                }
                                onChange={(e) => setObservation(e.target.value)}
                            />
                            {!isConform && !observation.trim() && (
                                <small className="text-danger">
                                    Debe indicar una observación si el pedido no fue recibido conforme.
                                </small>
                            )}
                        </div>
                    )}
                </CModalBody>

                <CModalFooter>
                    <CButton color="secondary" onClick={handleCancel}>
                        {confirmOptions.cancelText}
                    </CButton>

                    <CButton color={confirmOptions.color} onClick={handleConfirm} disabled={
                        !isConform &&
                        !observation.trim()
                    }>
                        {confirmOptions.confirmText}
                    </CButton>
                </CModalFooter>
            </CModal>
        </FeedbackContext.Provider>
    )
}

export function useFeedback() {
    const context = useContext(FeedbackContext)

    if (!context) {
        throw new Error('useFeedback debe usarse dentro de FeedbackProvider')
    }

    return context
}