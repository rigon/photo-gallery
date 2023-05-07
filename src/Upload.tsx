
import { useState, useCallback, useRef, MouseEvent, FC } from 'react';
import { useParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';

import Uploady, {
    useUploady,
    BatchItem,
    FILE_STATES,
    useItemAbortListener,
    useItemCancelListener,
    useItemErrorListener,
    useItemFinalizeListener,
    useItemFinishListener,
    useItemProgressListener,
    useItemStartListener,
    useBatchFinalizeListener,
    useBatchAddListener,
    useAbortAll,
} from '@rpldy/uploady';
import UploadPreview, {
    PreviewComponentProps,
    PreviewItem,
    PreviewMethods
} from "@rpldy/upload-preview";
import UploadDropZone from "@rpldy/upload-drop-zone";
import withPasteUpload from "@rpldy/upload-paste";

import { styled } from '@mui/material';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ButtonGroup from '@mui/material/ButtonGroup';
import CircularProgress from '@mui/material/CircularProgress';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import DangerousIcon from '@mui/icons-material/Dangerous';
import DoneIcon from '@mui/icons-material/Done';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import ImageNotSupportedIcon from '@mui/icons-material/ImageNotSupported';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';

import api from './services/api';

const PasteUploadDropZone = withPasteUpload(styled(UploadDropZone)({
    height: "100vh"
}));

const StyledCircularProgress = styled(CircularProgress)({
    position: 'absolute',
    top: -2,
    left: -2,
    zIndex: 1,
});

const StyledIcon = styled("div")({
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 1,
    padding: "8px",
    filter: "drop-shadow(0px 0px 1px white)",
});

function UploadButton() {
    const uploady = useUploady();

    const handleUpload = () => {
        uploady.showFileUpload();
    };

    return (
        <Button startIcon={<FileUploadIcon />} onClick={handleUpload} aria-label="upload photos" color="inherit" component='label'>
            Upload
        </Button>
    );
}

const UploadEntry = ({ type, url, id, name, size }: PreviewComponentProps) => {
    const [ item, setItem ] = useState<BatchItem>({} as BatchItem);

    const st = item.state;
    const isPending = (st === FILE_STATES.PENDING || st === FILE_STATES.ADDED || st === undefined);
    const isUploading = (st === FILE_STATES.UPLOADING);
    const isDone = (st === FILE_STATES.FINISHED);
    const isError = (st === FILE_STATES.ABORTED || st === FILE_STATES.CANCELLED || st === FILE_STATES.ERROR);
    
    // Catch all item updates
    useItemAbortListener((item) => setItem(item), id);
    useItemCancelListener((item) => setItem(item), id);
    useItemErrorListener((item) => setItem(item), id);
    useItemFinalizeListener((item) => setItem(item), id);
    useItemFinishListener((item) => setItem(item), id);
    useItemProgressListener((item) => setItem(item), id);
    useItemStartListener((item) => setItem(item), id);
    
    return (
        <ListItem>
            <ListItemAvatar>
                <Box sx={{ position: "relative" }}>
                    <Avatar variant="circular" src={url}>
                        <ImageNotSupportedIcon color="disabled" />
                    </Avatar>
                    {isPending && <StyledCircularProgress size={44} thickness={2} disableShrink color='warning' />}
                    {isUploading && <StyledCircularProgress size={44} thickness={2} variant="determinate" value={item.completed} />}
                    {isDone && <StyledIcon><DoneIcon color="success" /></StyledIcon>}
                    {isError && <StyledIcon><ErrorOutlineIcon color="error" /></StyledIcon>}
                </Box>
            </ListItemAvatar>
            <ListItemText primary={name} secondary={type + " (" + size + " bytes)"} />
        </ListItem>
    );
}

export const Upload: FC = () => {
    const { collection, album } = useParams();
    const dispatch = useDispatch();
    const abortAll = useAbortAll();
    const dropdownRef = useRef(null);
    const previewMethodsRef = useRef<PreviewMethods>(null);
    const [open, setOpen] = useState<boolean>(false);
    const [inProgress, setInProgress] = useState<boolean>(false);
    const [isEmpty, setIsEmpty] = useState<boolean>(false);

    // Open menu when new uploads are added
    useBatchAddListener((batch, options) => {
        setOpen(true);
        setInProgress(true);
    });
    // Reload album after uploading
    useBatchFinalizeListener((batch) => {
        dispatch(api.util.invalidateTags([{ type: 'Album', id: `${collection}-${album}` }]));
        setInProgress(false);
    });

    const handleOpenMenu = (event: MouseEvent<HTMLElement>) => {
        setOpen(true);
    };

    const handleCloseMenu = () => {
        setOpen(false);
    };

    const onAbortOrClear = () => {
        if(inProgress)
            abortAll();
        else
            previewMethodsRef.current?.clear();
    };
    
    const onPreviewsChanged = (items: PreviewItem[]) => {
        setIsEmpty(items.length === 0);
    };

    // Do not add the upload button when not in a album
    if(!collection || !album)
        return null;

    return (<>
        <ButtonGroup ref={dropdownRef} variant="text" aria-label="split button" onClick={handleOpenMenu}>
            <UploadButton />
            <Button
                size="small"
                color="inherit"
                aria-controls={open ? 'split-button-menu' : undefined}
                aria-expanded={open ? 'true' : undefined}
                aria-label="select merge strategy"
                aria-haspopup="menu"
            >
                <ArrowDropDownIcon />
            </Button>
        </ButtonGroup>

        <Menu
            open={open}
            anchorEl={dropdownRef.current}
            onClose={handleCloseMenu}
            keepMounted={true}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            transformOrigin={{ vertical: 'top', horizontal: 'center' }}
            MenuListProps={{
                'aria-labelledby': 'lock-button',
                role: 'listbox',
            }}
        >
            {isEmpty &&
                <ListItem>
                    <ListItemText
                        primary={<em>No items for uploading</em>}
                        secondary={<em>Use the Upload button <b>or</b> drag & drop files here</em>} />
                </ListItem>}

            {!isEmpty &&
                <MenuItem onClick={onAbortOrClear}>
                    <ListItemIcon>
                        {inProgress && <DangerousIcon />}
                        {!inProgress && <ClearAllIcon />}
                    </ListItemIcon>
                    <ListItemText>
                        {inProgress && <>Stop current uploads</>}
                        {!inProgress && <>Clear all</>}
                    </ListItemText>
                </MenuItem>}
            
            <UploadPreview
                rememberPreviousBatches
                PreviewComponent={UploadEntry}
                previewMethodsRef={previewMethodsRef}
                onPreviewsChanged={onPreviewsChanged}
            />
        </Menu>
    </>);
}

interface UploadProviderProps {
    children?: JSX.Element | JSX.Element[];
}

export const UploadProvider: FC<UploadProviderProps> = ({children}) => {
    const { collection, album } = useParams();
    
    const uploadUrl = (!collection || !album) ? undefined :
        `/api/collections/${collection}/albums/${album}/photos`;

    return (
        <Uploady destination={{ url: uploadUrl }}>
            <PasteUploadDropZone>
                {children}
            </PasteUploadDropZone>
        </Uploady>
    );
};
