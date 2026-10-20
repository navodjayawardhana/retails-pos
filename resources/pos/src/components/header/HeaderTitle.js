import React, { useContext, useEffect } from 'react';
import {Link} from 'react-router-dom';
import {FiArrowLeft, FiEdit2} from 'react-icons/fi';
import {getFormattedMessage} from '../../shared/sharedMethod';
import PageHeaderContext from '../../shared/page-header/PageHeaderContext';

const HeaderTitle = (props) => {
    const {title, to, editLink} = props;
    const setPageHeader = useContext(PageHeaderContext);
    const titleId = typeof title === 'string' ? title : title?.props?.id;

    // Inside MasterLayout the page header renders the title; register ours there.
    useEffect(() => {
        if (!setPageHeader) return undefined;
        setPageHeader({title, to, editLink});
        return () => setPageHeader(null);
    }, [setPageHeader, titleId, to, editLink]);

    if (setPageHeader) return null;

    return (
        <div className='page-header'>
            <div className='page-header__main'>
                {title ? <h1 className='page-header__title'>{title}</h1> : ''}
            </div>
            <div className='page-header__actions'>
                {editLink ? <Link to={editLink} className='btn btn-outline-primary'>
                    <FiEdit2/>{getFormattedMessage('globally.edit-btn')}</Link> : null}
                {to ? <Link to={to} className='btn btn-outline-secondary'>
                    <FiArrowLeft/>{getFormattedMessage('globally.back-btn')}</Link> : null}
            </div>
        </div>
    )
};

export default HeaderTitle;
