import React, { createContext, useContext, useState } from 'react'
import {
    CAlert,
    CButton,
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

type ConfirmOptions = {
    title?: string
    message?: string
    fields?: ConfirmField[]
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
    confirmAction: (options: ConfirmOptions) => Promise<boolean>
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
    const [resolver, setResolver] = useState<((value: boolean) => void) | null>(null)

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

        return new Promise<boolean>((resolve) => {
            setResolver(() => resolve)
        })
    }

    const handleConfirm = () => {
        setConfirmVisible(false)
        resolver?.(true)
        setResolver(null)
    }

    const handleCancel = () => {
        setConfirmVisible(false)
        resolver?.(false)
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
                </CModalBody>

                <CModalFooter>
                    <CButton color="secondary" onClick={handleCancel}>
                        {confirmOptions.cancelText}
                    </CButton>

                    <CButton color={confirmOptions.color} onClick={handleConfirm}>
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