import React from 'react';
import PropTypes from 'prop-types';
import {toastType} from '../../constants/index';
import {faCheck, faClose, faExclamation, faXmark} from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {placeholderText} from "../sharedMethod";

const toastVariants = {
    [toastType.ERROR]: {
        iconColor: 'toast-card__icon--error',
        cardModifier: 'toast-card--error',
        icon: faXmark,
        titleKey: 'toast.error.title',
    },
    [toastType.WARNING]: {
        iconColor: 'toast-card__icon--warning',
        cardModifier: 'toast-card--warning',
        icon: faExclamation,
        titleKey: 'toast.warning.title',
    },
};
const defaultVariant = {
    iconColor: 'toast-card__icon--success',
    cardModifier: '',
    icon: faCheck,
    titleKey: 'toast.successful.title',
};

const ToastCard = (props) => {
    const {type, text, closeToast} = props;
    const {iconColor, cardModifier, icon, titleKey} = toastVariants[type] || defaultVariant;

    const renderCard = () => {
        return (
            <div className='d-flex align-items-center'>
                <div className={`${iconColor}`}>
                    <FontAwesomeIcon icon={icon} className='fs-1'/>
                </div>
                <div className='mx-3'>
                    <h2 className='toast-card__toast-title'>
                        {placeholderText(titleKey)}
                    </h2>
                    <p className='toast-card__toast-message'>{text}</p>
                </div>
            </div>
        );
    };

    return (
        <div className={`toast-card ${cardModifier}`}>
            <FontAwesomeIcon icon={faClose} className='fs-3 toast-card__close-btn' onClick={closeToast}/>
            {renderCard()}
        </div>
    )
};

ToastCard.propTypes = {
    text: PropTypes.oneOfType([
        PropTypes.object,
        PropTypes.string,
    ]),
    type: PropTypes.string,
    closeToast: PropTypes.func,
};

export default ToastCard;
