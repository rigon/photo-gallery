import { FC, CSSProperties } from "react";
import Box, { BoxProps } from "@mui/material/Box";

interface BoxBarProps {
    /** Align vertically to the top */
    top?: boolean;
    /** Align vertically to the middle */
    middle?: boolean;
    /** Align vertically to the bottom */
    bottom?: boolean;
    /** Align horizontally to the left */
    left?: boolean;
    /** Align horizontally to the center */
    center?: boolean;
    /** Align horizontally to the right */
    right?: boolean;
    
    children?: React.ReactNode;
    sx?: BoxProps["sx"];
}

const BoxBar: FC<BoxBarProps> = (props) => {
    let inset: CSSProperties["inset"];
    let transform: CSSProperties["transform"];
    let textAlign: CSSProperties["textAlign"];
    
    // Vertical align
    if(props.top === true)
        inset = "0 0 auto 0";
    else if(props.middle === true) {
        inset = "50% auto auto 50%";
        transform = "translate(-50%, -50%)";
    }
    else if(props.bottom === true)
        inset = "auto 0 0 0";

    // Horizontal align
    if(props.left === true)
        textAlign = "left";
    else if(props.center === true)
        textAlign = "center";
    else if(props.right === true)
        textAlign = "right";

    return (
        <Box sx={{
            position: "absolute",
            overflow: "hidden",
            padding: 1,
            inset,
            transform,
            textAlign,
            ...props.sx
        }}>
            {props.children}
        </Box>
    );
}

export default BoxBar;
