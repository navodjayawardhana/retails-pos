import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Image } from "react-bootstrap-v5";
import * as EmailValidator from "email-validator";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEnvelope, faLock, faEye, faEyeSlash, faSpinner } from "@fortawesome/free-solid-svg-icons";
import { loginAction } from "../../store/action/authAction";
import AuthBrandPanel from "../../shared/auth/AuthBrandPanel";
import TabTitle from "../../shared/tab-title/TabTitle";
import { fetchFrontSetting } from "../../store/action/frontSettingAction";
import { Tokens } from "../../constants";
import { createBrowserHistory } from "history";
import {
    getFormattedMessage,
    placeholderText,
} from "../../shared/sharedMethod";

const Login = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const history = createBrowserHistory();
    const { frontSetting } = useSelector((state) => state);
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const token = localStorage.getItem(Tokens.ADMIN);

    const [loginInputs, setLoginInputs] = useState({
        email: "",
        password: "",
    });

    useEffect(() => {
        dispatch(fetchFrontSetting());
        if (token) {
            history.push(window.location.pathname);
        }
    }, []);

    const [errors, setErrors] = useState({
        email: "",
        password: "",
    });

    const handleValidation = () => {
        let errorss = {};
        let isValid = false;
        if (!EmailValidator.validate(loginInputs["email"])) {
            if (!loginInputs["email"]) {
                errorss["email"] = getFormattedMessage(
                    "globally.input.email.validate.label"
                );
            } else {
                errorss["email"] = getFormattedMessage(
                    "globally.input.email.valid.validate.label"
                );
            }
        } else if (!loginInputs["password"]) {
            errorss["password"] = getFormattedMessage(
                "user.input.password.validate.label"
            );
        } else {
            isValid = true;
        }
        setErrors(errorss);
        setLoading(false);
        return isValid;
    };

    const prepareFormData = () => {
        const formData = new FormData();
        formData.append("email", loginInputs.email);
        formData.append("password", loginInputs.password);
        formData.append(
            "language_code",
            localStorage.getItem("updated_language")
        );
        return formData;
    };

    const onLogin = async (e) => {
        e.preventDefault();
        const valid = handleValidation();
        if (valid) {
            setLoading(true);
            dispatch(
                loginAction(prepareFormData(loginInputs), navigate, setLoading)
            );
            const dataBlank = {
                email: "",
                password: "",
            };
            setLoginInputs(dataBlank);
        }
    };

    const handleChange = (e) => {
        e.persist();
        setLoginInputs((inputs) => ({
            ...inputs,
            [e.target.name]: e.target.value,
        }));
        setErrors("");
    };

    return (
        <div className="auth-page">
            <AuthBrandPanel />
            <div className="auth-page__form">
            <div className="auth-card">
                <TabTitle
                    title={placeholderText("login-form.login-btn.label")}
                />
                <div className="text-center d-lg-none">
                    <a href="#" className="image">
                        <Image
                            className="logo-height image login-company-logo auth-card__logo mb-6"
                            src={
                                frontSetting &&
                                frontSetting.value &&
                                frontSetting.value.logo
                            }
                        />
                    </a>
                </div>
                <h1 className="auth-card__title">
                    {getFormattedMessage("login-form.title")}
                </h1>
                <form>
                    <div className="auth-field mb-4">
                        <label className="form-label">
                            {getFormattedMessage(
                                "globally.input.email.label"
                            )}
                            <span className="required" />
                        </label>
                        <div className="auth-field__control">
                            <FontAwesomeIcon
                                icon={faEnvelope}
                                className="auth-field__icon"
                            />
                            <input
                                placeholder={placeholderText(
                                    "globally.input.email.placeholder.label"
                                )}
                                required
                                value={loginInputs.email}
                                className="form-control auth-field__input"
                                type="text"
                                name="email"
                                autoComplete="off"
                                onChange={(e) => handleChange(e)}
                            />
                        </div>
                        <span className="text-danger d-block fw-400 fs-small mt-2">
                            {errors["email"] ? errors["email"] : null}
                        </span>
                    </div>

                    <div className="auth-field mb-4">
                        <div className="d-flex justify-content-between w-100">
                            <label className="form-label">
                                {getFormattedMessage(
                                    "user.input.password.label"
                                )}
                                <span className="required" />
                            </label>
                            <Link
                                to="/forgot-password"
                                className="auth-card__forgot-link"
                            >
                                {getFormattedMessage(
                                    "login-form.forgot-password.label"
                                )}
                            </Link>
                        </div>
                        <div className="auth-field__control">
                            <FontAwesomeIcon
                                icon={faLock}
                                className="auth-field__icon"
                            />
                            <input
                                className="form-control auth-field__input"
                                type={showPassword ? "text" : "password"}
                                name="password"
                                placeholder={placeholderText(
                                    "user.input.password.placeholder.label"
                                )}
                                autoComplete="off"
                                required
                                value={loginInputs.password}
                                onChange={(e) => handleChange(e)}
                            />
                            <button
                                type="button"
                                className="auth-field__toggle"
                                onClick={() => setShowPassword(!showPassword)}
                                tabIndex={-1}
                                aria-label={
                                    showPassword
                                        ? "Hide password"
                                        : "Show password"
                                }
                            >
                                <FontAwesomeIcon
                                    icon={showPassword ? faEyeSlash : faEye}
                                />
                            </button>
                        </div>
                        <span className="text-danger d-block fw-400 fs-small mt-2">
                            {errors["password"]
                                ? errors["password"]
                                : null}
                        </span>
                    </div>
                    <div className="text-center">
                        <button
                            type="submit"
                            className="btn btn-primary auth-card__submit w-100"
                            onClick={(e) => onLogin(e)}
                            disabled={loading}
                        >
                            {loading ? (
                                <span className="d-inline-flex align-items-center justify-content-center gap-2">
                                    <FontAwesomeIcon
                                        icon={faSpinner}
                                        spin
                                    />
                                    {getFormattedMessage(
                                        "globally.loading.label"
                                    )}
                                </span>
                            ) : (
                                <span>
                                    {getFormattedMessage(
                                        "login-form.login-btn.label"
                                    )}
                                </span>
                            )}
                        </button>
                    </div>
                </form>
                <div className="auth-card__footer">
                    All Rights Reserved ©{new Date().getFullYear()}
                    <a href="#" className="text-decoration-none">
                        {" "}
                        {frontSetting &&
                            frontSetting.value &&
                            frontSetting.value.company_name}
                    </a>
                </div>
            </div>
            </div>
        </div>
    );
};

export default Login;
