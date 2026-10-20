import { toast, Slide } from 'react-toastify';

let id = 0;
const defaultOptions = {
    config: {
        position: toast.POSITION.BOTTOM_LEFT,
        closeButton: false,
        transition: Slide,
        autoClose: 5000,
        hideProgressBar: true,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
    }
};

export default ( options = {} ) => {
    return { ...defaultOptions, ...options, id: id++ }
};
