
import { FC, useState, useRef } from 'react';
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

import { Divider, styled } from '@mui/material';
import AddToPhotosIcon from '@mui/icons-material/AddToPhotos';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
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
import { ToolbarItem } from './Toolbar';

const StyledUploadDropZone = styled(UploadDropZone)({
    "&.drag-over": {
        backgroundColor: "rgba(128,128,128,0.6)",
    }
});

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


interface UploadMenuProps {
    open: boolean;
    anchorEl: Element | null;
    onOpen: () => void;
    onClose: () => void;
}

const UploadMenu: FC<UploadMenuProps> = ({ open, anchorEl, onOpen, onClose }) => {
    const { collection, album } = useParams();
    const dispatch = useDispatch();
    const uploady = useUploady();
    const abortAll = useAbortAll();
    const previewMethodsRef = useRef<PreviewMethods>(null);
    const [inProgress, setInProgress] = useState<boolean>(false);
    const [isEmpty, setIsEmpty] = useState<boolean>(false);

    const handleUpload = () => {
        uploady.showFileUpload();
    };

    // Open menu when new uploads are added
    useBatchAddListener(() => {
        onOpen();
        setInProgress(true);
    });
    // Reload album after uploading
    useBatchFinalizeListener(() => {
        dispatch(api.util.invalidateTags([{ type: 'Album', id: `${collection}:${album}` }]));
        setInProgress(false);
    });

    const onAbortOrClear = () => {
        if(inProgress)
            abortAll();
        else
            previewMethodsRef.current?.clear();
    };
    
    const onPreviewsChanged = (items: PreviewItem[]) => {
        setIsEmpty(items.length === 0);
    };

    return (
        <Menu
            open={open}
            anchorEl={anchorEl}
            onClose={onClose}
            keepMounted={true}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            transformOrigin={{ vertical: 'top', horizontal: 'left' }}
            MenuListProps={{
                'aria-labelledby': 'lock-button',
                role: 'listbox',
            }}
        >
            <MenuItem onClick={handleUpload}>
                <ListItemIcon><AddToPhotosIcon /></ListItemIcon>
                <ListItemText>Add photos</ListItemText>
            </MenuItem>
            <Divider />

            {!isEmpty &&
                // Button to clear uploading the list
                <MenuItem onClick={onAbortOrClear}>
                    <ListItemIcon>
                        {inProgress ? <DangerousIcon /> : <ClearAllIcon />}
                    </ListItemIcon>
                    <ListItemText>
                        {inProgress ? "Stop current uploads": "Clear all" }
                    </ListItemText>
                </MenuItem>
            }
            <StyledUploadDropZone onDragOverClassName="drag-over">
                <>
                    {isEmpty &&
                        // Empty list for upload
                        <ListItem onClick={handleUpload} sx={{ cursor: 'pointer', p: 5 }}>
                            <ListItemText sx={{ textAlign: "center" }}
                                primary={<em>No items for uploading</em>}
                                secondary={<em>Use the button above &uarr; to add more photos <br/><b>Or</b><br/>Drag and drop files here!</em>} />
                        </ListItem>
                    }
                
                    <UploadPreview
                        rememberPreviousBatches
                        PreviewComponent={UploadEntry}
                        previewMethodsRef={previewMethodsRef}
                        onPreviewsChanged={onPreviewsChanged}
                    />
                </>
            </StyledUploadDropZone>
        </Menu>
    );
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
            {children}
        </Uploady>
    );
};

export const Upload: FC = () => {
    const { collection, album } = useParams();
    const dropdownRef = useRef(null);
    const [open, setOpen] = useState<boolean>(false);
    
    const handleOpenMenu = () => {
        setOpen(true);
    };

    const handleCloseMenu = () => {
        setOpen(false);
    };
    

    // Do not add the upload button when not in a album
    if(!collection || !album)
        return null;

    return (<>
        <ToolbarItem
            ref={dropdownRef}
            icon={<FileUploadIcon />}
            onClick={handleOpenMenu}
            title="Upload"
            aria-label="upload photos"
            tooltip="Upload photos to this album"
            subMenu
            showTitle
        />

        <UploadMenu
            open={open}
            anchorEl={dropdownRef.current}
            onOpen={handleOpenMenu}
            onClose={handleCloseMenu}
         />
    </>);
}
