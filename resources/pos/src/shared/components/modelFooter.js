import React from 'react';
import { Modal } from 'react-bootstrap-v5';
import { Link } from 'react-router-dom';
import { FiCheck } from 'react-icons/fi';
import { getFormattedMessage, placeholderText } from "../sharedMethod";
import { useSelector } from "react-redux";

const ModelFooter = ( props ) => {
    const { onEditRecord, onSubmit, editDisabled, clearField, addDisabled, link, ref, modelhide, cancelNotShow } = props;
    const { isSaving } = useSelector( state => state )

    return (
        <>
            {
                link ? <div className='form-action-bar'>
                    {modelhide ?
                        <Link to={link} onClick={() => modelhide( false )}
                            className='btn btn-outline-secondary'>
                            {getFormattedMessage( "globally.cancel-btn" )}
                        </Link>
                        :
                        <Link to={link}
                            className='btn btn-outline-secondary'>
                            {getFormattedMessage( "globally.cancel-btn" )}
                        </Link>
                    }
                    <button onClick={( event ) => onSubmit( event )} className='btn btn-primary' type='submit'
                        disabled={( onEditRecord ? editDisabled : addDisabled ) || isSaving} ref={ref}>
                        <FiCheck />
                        {isSaving ? placeholderText( "globally-saving-btn-label" ) : placeholderText( "globally.save-btn" )}
                    </button>
                </div> :
                    <Modal.Footer className='modal-action-bar'>
                        {!cancelNotShow ? <button onClick={() => clearField( false )}
                            className='btn btn-outline-secondary'>
                            {getFormattedMessage( "globally.cancel-btn" )}
                        </button> : null}
                        <button onClick={( event ) => onSubmit( event )} className='btn btn-primary' type='submit'
                            disabled={onEditRecord ? editDisabled : addDisabled}>
                            <FiCheck />
                            {placeholderText( "globally.save-btn" )}
                        </button>
                    </Modal.Footer>
            }
        </>
    )
};
export default ModelFooter;
