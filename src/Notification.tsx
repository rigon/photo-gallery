import { Fragment, useMemo } from "react";
import { useSnackbar, SnackbarKey, VariantType, OptionsWithExtraProps } from 'notistack';

import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";

const useNotification = () => {
    const { enqueueSnackbar, closeSnackbar } = useSnackbar();

    const defaultOptions = useMemo((): OptionsWithExtraProps<VariantType> => {
        const action = (key: SnackbarKey) => (
            <Fragment>
                <IconButton size="small" aria-label="close" color="inherit" onClick={() => { closeSnackbar(key) }}>
                    <CloseIcon />
                </IconButton>
            </Fragment>
        );
        return {
            autoHideDuration: 3000,
            action,
        };
    }, [closeSnackbar]);

    const renderFunction = (type: VariantType) =>
        (message: string, options?: OptionsWithExtraProps<VariantType>) =>
            enqueueSnackbar(message, {
                ...defaultOptions,
                ...options,
                variant: type
            });

    return {
        defaultNotification: renderFunction('default'),
        infoNotification: renderFunction('info'),
        errorNotification: renderFunction('error'),
        successNotification: renderFunction('success'),
        warningNotification: renderFunction('warning'),
    }
};

export default useNotification;
