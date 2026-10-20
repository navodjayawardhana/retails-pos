import React from 'react';
import { FiInbox } from 'react-icons/fi';
import { getFormattedMessage } from '../../shared/sharedMethod';
import Spinner from "../../shared/components/loaders/Spinner";

const EmptyComponent = (props) => {
    const { isLoading } = props;

    return (
        <>
            {isLoading ? <Spinner /> :
                <div className='empty-state'>
                    <span className='empty-state__icon'><FiInbox /></span>
                    <div className='empty-state__text'>
                        {getFormattedMessage('react-data-table.no-record-found.label')}
                    </div>
                </div>
            }
        </>
    );
};

export default EmptyComponent;
