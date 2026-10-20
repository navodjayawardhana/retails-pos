import React, { useEffect, useState } from 'react'
import TabTitle from '../../shared/tab-title/TabTitle';
import * as EmailValidator from 'email-validator';
import { forgotPassword } from '../../store/action/authAction';
import AuthBrandPanel from '../../shared/auth/AuthBrandPanel';
import { useDispatch, useSelector } from 'react-redux';
import { fetchFrontSetting } from '../../store/action/frontSettingAction';
import { getFormattedMessage, placeholderText } from '../../shared/sharedMethod';
import { Image } from "react-bootstrap-v5";
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEnvelope, faSpinner } from '@fortawesome/free-solid-svg-icons';

const ForgotPassword = () => {
    const { loginUser, frontSetting } = useSelector(state => state)
    const [disable, setDisable] = useState(true);
    const Dispatch = useDispatch()
    const [forgotValue, setForgotValue] = useState({ email: '' });
    const [errors, setErrors] = useState({ email: '' });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        clearEmail();
        Dispatch(fetchFrontSetting());
        if (!loginUser.errorMessage) {
            if (loginUser) {
                setLoading(false);
                setForgotValue({ email: '' })
            }
        } else {
            setLoading(false);
        }
    }, [loginUser, forgotPassword]);

    const handleChange = (e) => {
        e.persist();
        setForgotValue(inputs => ({ ...inputs, [e.target.name]: e.target.value }));
        setDisable(false);
        setErrors('');
    };

    const prepareFormData = () => {
        const formData = new FormData();
        formData.append('email', forgotValue.email);
        return formData;
    };

    const handleValidation = () => {
        let errorss = {};
        let isValid = false;
        if (!EmailValidator.validate(forgotValue['email'])) {
            if (!forgotValue['email']) {
                errorss['email'] = getFormattedMessage('globally.input.email.validate.label');
            } else {
                errorss['email'] = getFormattedMessage('globally.input.email.valid.validate.label');
            }
        } else {
            isValid = true;
        }
        setErrors(errorss);
        return isValid;
    };

    const clearEmail = () => {
        if (loginUser && loginUser === 'We have emailed your password reset link!') {
            setForgotValue({ email: '' });
        }
    };

    const onSubmit = (e) => {
        e.preventDefault();
        setLoading(true)
        const valid = handleValidation();
        !valid && setLoading(false);
        if (valid) {
            Dispatch(forgotPassword(prepareFormData(forgotValue)));
            setDisable(true);
        }
    };

    return (
        <div className='auth-page'>
            <AuthBrandPanel />
            <div className='auth-page__form'>
            <div className='auth-card'>
                <TabTitle title='Forgot Password' />
                <div className="text-center d-lg-none">
                    <a href="#" className="image">
                        <Image className='logo-height image login-company-logo auth-card__logo mb-6'
                            src={frontSetting && frontSetting.value && frontSetting.value.logo} />
                    </a>
                </div>
                <h1 className='auth-card__title'>{getFormattedMessage('login-form.forgot-password.label')}</h1>
                <form className='form w-100'>
                    <div className='auth-field mb-10'>
                        <div className='d-flex justify-content-between w-100'>
                            <label
                                className='form-label'>{getFormattedMessage('globally.input.email.label')}
                                <span className='required' /></label>
                            <Link
                                to='/login'
                                className='auth-card__forgot-link'
                            >
                                {getFormattedMessage('login-form.go-to-sign-in.label')}
                            </Link>
                        </div>
                        <div className='auth-field__control'>
                            <FontAwesomeIcon icon={faEnvelope} className='auth-field__icon' />
                            <input
                                placeholder={placeholderText('globally.input.email.placeholder.label')} required
                                value={forgotValue.email} type='text' name='email' autoComplete='on'
                                className='form-control auth-field__input'
                                onChange={(e) => handleChange(e)}
                            />
                        </div>
                        <span className='text-danger d-block fw-400 fs-small mt-2'>{errors['email'] ? errors['email'] : null}</span>
                    </div>
                    <div className='text-center'>
                        <button className='btn btn-primary auth-card__submit w-100' type='submit'
                            onClick={(e) => onSubmit(e)} disabled={disable}>
                            {loading ?
                                <span className='d-inline-flex align-items-center justify-content-center gap-2'>
                                    <FontAwesomeIcon icon={faSpinner} spin />
                                    {getFormattedMessage('globally.loading.label')}
                                </span> :
                                <span>
                                    {getFormattedMessage('forgot-password-form.reset-link-btn.label')}
                                </span>
                            }
                        </button>
                    </div>
                </form>
                <div className='auth-card__footer'>
                    All Rights Reserved ©{new Date().getFullYear()}
                    <a href="#" className="text-decoration-none">
                        {" "}
                        {frontSetting && frontSetting.value && frontSetting.value.company_name}
                    </a>
                </div>
            </div>
            </div>
        </div>
    )
};

export default ForgotPassword;

