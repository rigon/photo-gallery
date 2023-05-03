
import { useState, useCallback, useRef, MouseEvent, FC } from 'react';
import { useParams } from 'react-router-dom';

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
    useItemStartListener
} from '@rpldy/uploady';
import UploadPreview, {
    PreviewComponentProps,
    PreviewMethods
} from "@rpldy/upload-preview";

import { styled } from '@mui/material';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ButtonGroup from '@mui/material/ButtonGroup';
import CircularProgress from '@mui/material/CircularProgress';
import ClearAllIcon from '@mui/icons-material/ClearAll';
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
            <ListItemText primary={name} secondary={item.state + " - " + type + " (" + size + " bytes)"} />
        </ListItem>
    );
}
const PreviewsWithClear = () => {
    const previewMethodsRef = useRef<PreviewMethods>(null);

    const onClear = useCallback(() => {
        if (previewMethodsRef.current?.clear) {
            previewMethodsRef.current.clear();
        }
    }, [previewMethodsRef]);

    return <>
        <UploadPreview
            rememberPreviousBatches
            PreviewComponent={UploadEntry}
            previewMethodsRef={previewMethodsRef}
        />
        <MenuItem onClick={onClear}>
            <ListItemIcon>
                <ClearAllIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Cancel and Clear All</ListItemText>
        </MenuItem>
    </>;
};

const Upload: FC = () => {
    const { collection, album } = useParams();
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const open = Boolean(anchorEl);

    const handleOpenMenu = (event: MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleCloseMenu = () => {
        setAnchorEl(null);
    };

    return (
        <Uploady destination={{ url: `/collection/${collection}/album/${album}` }}>
            <ButtonGroup variant="text" aria-label="split button" onClick={handleOpenMenu}>
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
                anchorEl={anchorEl}
                onClose={handleCloseMenu}
                keepMounted={true}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                transformOrigin={{ vertical: 'top', horizontal: 'center' }}
                MenuListProps={{
                    'aria-labelledby': 'lock-button',
                    role: 'listbox',
                }}
            >
                <PreviewsWithClear />
            </Menu>
        </Uploady>);
}

export default Upload;
