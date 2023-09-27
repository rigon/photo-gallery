import { FC } from "react";
import { useParams } from "react-router-dom";

import BottomNavigation from "@mui/material/BottomNavigation";
import BottomNavigationAction from "@mui/material/BottomNavigationAction";
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import DeselectIcon from '@mui/icons-material/Deselect';
import DriveFileMoveIcon from '@mui/icons-material/DriveFileMove';

import { PhotoImageType } from "./types";
import { useDialog } from "./dialogs";
import { useSelection } from "./Selection";

const SelectionToolbar: FC = () => {
    const { collection = "", album = "" } = useParams();
    const { get, cancel, isSelecting } = useSelection<PhotoImageType>();
    const dialog = useDialog();

    const handleMove = () => {
        dialog.move(collection, album, get());
    }
    const handleDelete = () => {
        dialog.delete(collection, album, get());
    }

    if(!isSelecting)
        return null;

    return (
        <div style={{position: "relative", height: 56, margin: "15px 0" }}>
            <BottomNavigation showLabels sx={{ position: "fixed", left: 0, right: 0, bottom: 15, width: 300, margin: "0 auto" }}>
                <BottomNavigationAction onClick={cancel} label="Clear selection" icon={<DeselectIcon />} />
                <BottomNavigationAction onClick={handleMove} label="Move photos" icon={<DriveFileMoveIcon />} />
                <BottomNavigationAction onClick={handleDelete} label="Delete photos" icon={<DeleteForeverIcon />} />
            </BottomNavigation>
        </div>
    );
}

export default SelectionToolbar;
