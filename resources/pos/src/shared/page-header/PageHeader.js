import React, { Fragment } from "react";
import { Link, useLocation } from "react-router-dom";
import { FiChevronRight, FiArrowLeft, FiEdit2 } from "react-icons/fi";
import asideConfig from "../../config/asideConfig";
import { getFormattedMessage } from "../sharedMethod";

const label = (title) =>
    typeof title === "string" ? getFormattedMessage(title) : title;

const titleKey = (title) =>
    typeof title === "string" ? title : title?.props?.id;

// Finds the deepest menu entry whose path matches the current URL.
const matchRoute = (pathname) => {
    let best = null;
    asideConfig.forEach((section) => {
        const candidates = [
            ...(section.subMenu || []).map((item) => ({ to: item.to, title: item.title })),
            ...(section.items || []).map((item) => ({ to: item.to, title: item.title })),
            { to: section.to, title: section.title },
        ];
        candidates.forEach((candidate) => {
            if (!candidate.to) return;
            const matches =
                pathname === candidate.to ||
                pathname.startsWith(candidate.to + "/");
            if (matches && (!best || candidate.to.length > best.to.length)) {
                best = { ...candidate, section };
            }
        });
    });
    return best;
};

const PageHeader = ({ override }) => {
    const location = useLocation();
    const match = matchRoute(location.pathname);

    const crumbs = [];
    if (match) {
        const sectionKey = titleKey(match.section.title);
        const pageKey = titleKey(match.title);
        if (sectionKey && sectionKey !== pageKey) {
            crumbs.push({ title: match.section.title });
        }
        crumbs.push({
            title: match.title,
            to: override && match.to !== location.pathname ? match.to : null,
        });
    }

    const title = override ? override.title : match && match.title;
    if (!title) return null;

    if (override && titleKey(override.title) !== titleKey(match?.title)) {
        crumbs.push({ title: override.title });
    }

    return (
        <div className="page-header">
            <div className="page-header__main">
                {crumbs.length > 1 && (
                    <nav className="page-header__crumbs" aria-label="breadcrumb">
                        {crumbs.map((crumb, index) => (
                            <Fragment key={index}>
                                {index > 0 && <FiChevronRight className="page-header__sep" />}
                                {crumb.to ? (
                                    <Link to={crumb.to}>{label(crumb.title)}</Link>
                                ) : (
                                    <span>{label(crumb.title)}</span>
                                )}
                            </Fragment>
                        ))}
                    </nav>
                )}
                <h1 className="page-header__title">{label(title)}</h1>
            </div>
            {override && (override.to || override.editLink) && (
                <div className="page-header__actions">
                    {override.editLink && (
                        <Link to={override.editLink} className="btn btn-outline-primary">
                            <FiEdit2 />
                            {getFormattedMessage("globally.edit-btn")}
                        </Link>
                    )}
                    {override.to && (
                        <Link to={override.to} className="btn btn-outline-secondary">
                            <FiArrowLeft />
                            {getFormattedMessage("globally.back-btn")}
                        </Link>
                    )}
                </div>
            )}
        </div>
    );
};

export default PageHeader;
