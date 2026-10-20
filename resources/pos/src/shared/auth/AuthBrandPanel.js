import React from 'react';
import { Image } from 'react-bootstrap-v5';
import { useSelector } from 'react-redux';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faCashRegister,
    faWarehouse,
    faArrowsRotate,
    faChartLine,
} from '@fortawesome/free-solid-svg-icons';
import { getFormattedMessage } from '../sharedMethod';

const features = [
    { icon: faCashRegister, key: 'auth-brand.feature.pos.label' },
    { icon: faWarehouse, key: 'auth-brand.feature.inventory.label' },
    { icon: faArrowsRotate, key: 'auth-brand.feature.transactions.label' },
    { icon: faChartLine, key: 'auth-brand.feature.reports.label' },
];

const AuthBrandPanel = () => {
    const { frontSetting } = useSelector((state) => state);

    return (
        <div className="auth-page__brand">
            <div className="auth-page__blob auth-page__blob--one" />
            <div className="auth-page__blob auth-page__blob--two" />
            <span className="auth-page__bubble auth-page__bubble--one" />
            <span className="auth-page__bubble auth-page__bubble--two" />
            <span className="auth-page__bubble auth-page__bubble--three" />
            <span className="auth-page__bubble auth-page__bubble--four" />
            <FontAwesomeIcon
                icon={faCashRegister}
                className="auth-page__float-icon auth-page__float-icon--one"
            />
            <FontAwesomeIcon
                icon={faChartLine}
                className="auth-page__float-icon auth-page__float-icon--two"
            />
            <div className="auth-page__brand-content">
                <Image
                    className="auth-page__brand-logo"
                    src={frontSetting && frontSetting.value && frontSetting.value.logo}
                />
                <h2 className="auth-page__brand-name">
                    {frontSetting && frontSetting.value && frontSetting.value.company_name}
                </h2>
                <p className="auth-page__brand-tagline">
                    {getFormattedMessage('auth-brand.tagline.label')}
                </p>
                <p className="auth-page__brand-subtitle">
                    {getFormattedMessage('auth-brand.subtitle.label')}
                </p>
                <ul className="auth-page__brand-features">
                    {features.map((feature) => (
                        <li key={feature.key}>
                            <span className="auth-page__brand-feature-icon">
                                <FontAwesomeIcon icon={feature.icon} />
                            </span>
                            {getFormattedMessage(feature.key)}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default AuthBrandPanel;
